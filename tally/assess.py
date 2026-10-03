import hashlib
import json
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher

from pypdf import PdfReader

from tally.config import llm_settings, rules, screening_lists
from tally.llm import chat, parse_json
from tally.ownership import effective_owners
from tally.registry import lookup_hong_kong
from tally.sanctions_data import sanctions_summary, screen_public
from tally.screening import best_match, name_forms, name_score

HEADINGS = [
    ("certificate_of_incorporation", ("CERTIFICATE OF INCORPORATION",)),
    ("register_of_directors", ("REGISTER OF DIRECTORS",)),
    ("ownership_declaration", ("DECLARATION OF OWNERSHIP", "股权结构说明")),
    ("proof_of_address", ("PROOF OF ADDRESS",)),
    ("source_of_funds", ("SOURCE OF FUNDS",)),
    ("passport", ("PASSPORT",)),
    ("register_of_members", ("REGISTER OF MEMBERS",)),
]

EXTRACT_PROMPT = """You extract a corporate onboarding pack into JSON. Do not resolve conflicts. If two documents disagree, emit both statements.

Return only JSON with this shape:
{
  "entity": {"legal_name": "", "company_number": "", "jurisdiction": "", "registered_address": "", "evidence": [{"document": "", "quote": ""}]},
  "people": [{"name": "", "kind": "person", "roles": ["director"], "nationality": "", "aliases": [], "evidence": [{"document": "", "quote": ""}]}],
  "companies": [{"name": "", "kind": "company", "jurisdiction": "", "aliases": [], "evidence": [{"document": "", "quote": ""}]}],
  "ownership_links": [{"owner": "", "owner_kind": "person", "owned": "", "percent": 0, "source_document": "", "quote": ""}],
  "addresses": [{"kind": "registered or proof_of_address", "value": "", "source_document": "", "quote": ""}],
  "identity_documents": [{"person": "", "expiry": "", "source_document": "", "quote": ""}],
  "business": {"purpose": "", "expected_activity": "", "declared_source_of_funds": "", "observed_credits": "", "introducer": "", "evidence": [{"document": "", "quote": ""}]}
}

Rules:
- owner, owned, and person names should be the English name when the document gives one. Put Chinese names and "also known as" names in aliases.
- percent is a number. "60 percent" means 60.
- A company that owns shares is owner_kind "company". A natural person is "person".
- Keep one ownership_links item for every ownership sentence, including sentences that contradict another document.
- quote must be copied from that document, contiguous, no longer than 240 characters.
- document and source_document must be the filename.
"""


def read_pdf(path) -> str:
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages).strip()


def _ws(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def locate(text: str, quote: str) -> tuple[bool, str]:
    quote = (quote or "").strip()
    if len(quote) < 8:
        return False, ""
    if quote in text:
        start = text.index(quote)
        return True, text[max(0, start - 70): start + len(quote) + 70]
    folded_text = _ws(text)
    folded_quote = _ws(quote)
    if folded_quote.lower() in folded_text.lower():
        return True, folded_quote
    ratio = SequenceMatcher(None, folded_quote.lower(), folded_text.lower()).quick_ratio()
    if ratio < 0.3:
        return False, ""
    window = len(folded_quote)
    hay = folded_text.lower()
    needle = folded_quote.lower()
    best = 0
    best_at = 0
    step = max(8, window // 8)
    for index in range(0, max(1, len(hay) - window + 1), step):
        score = SequenceMatcher(None, needle, hay[index:index + window + 12]).ratio()
        if score > best:
            best = score
            best_at = index
    if best >= 0.82:
        return True, folded_text[best_at: best_at + window + 12]
    return False, ""


def _heading_type(text: str) -> str | None:
    head = text[:400]
    for doc_type, markers in HEADINGS:
        if any(marker in head for marker in markers):
            return doc_type
    return None


def _evidence(documents: dict[str, str], items: list[dict] | None) -> list[dict]:
    kept = []
    for item in items or []:
        filename = item.get("document") or item.get("source_document") or ""
        text = documents.get(filename, "")
        if not text:
            for name, body in documents.items():
                ok, context = locate(body, item.get("quote", ""))
                if ok:
                    filename, text = name, body
                    break
            else:
                continue
        ok, context = locate(text, item.get("quote", ""))
        if ok:
            kept.append({"document": filename, "quote": _ws(item.get("quote", "")), "context": _ws(context), "verified": True})
    return kept


def _harvest_aliases(documents: dict[str, str]) -> list[dict]:
    found = []
    for filename, text in documents.items():
        parts = re.split(r"(?=Name:)", text)
        for block in parts:
            name = re.search(r"Name:\s*(.+)", block)
            if not name:
                continue
            section = block.split("Name:", 1)[-1]
            section = re.split(r"\nName:", section)[0]
            aliases = []
            chinese = re.search(r"Chinese name:\s*(.+)", section)
            also = re.search(r"Also known as:\s*(.+)", section)
            if chinese:
                aliases.append(chinese.group(1).strip())
            if also:
                aliases.append(also.group(1).strip())
            found.append({"name": name.group(1).strip(), "aliases": aliases, "document": filename})
        for han, english in re.findall(r"([\u4e00-\u9fff]+)\s*\(([^)]+)\)", text):
            found.append({"name": english.split(",")[0].strip(), "aliases": [han.strip(), english.strip()], "document": filename})
    return found


def extract_pack(documents: dict[str, str]) -> dict:
    joined = "\n\n".join(f"FILENAME: {name}\n{text}" for name, text in documents.items())
    messages = [
        {"role": "system", "content": EXTRACT_PROMPT},
        {"role": "user", "content": joined},
    ]
    raw = chat(messages)
    try:
        data = parse_json(raw)
    except json.JSONDecodeError:
        raw = chat(messages + [
            {"role": "assistant", "content": raw[:4000]},
            {"role": "user", "content": "Return the same answer as one JSON object only."},
        ])
        data = parse_json(raw)
    for person in data.get("people", []):
        person["evidence"] = _evidence(documents, person.get("evidence"))
    for company in data.get("companies", []):
        company["evidence"] = _evidence(documents, company.get("evidence"))
    if data.get("entity"):
        data["entity"]["evidence"] = _evidence(documents, data["entity"].get("evidence"))
    if data.get("business"):
        data["business"]["evidence"] = _evidence(documents, data["business"].get("evidence"))
    kept_links = []
    for link in data.get("ownership_links", []):
        evidence = _evidence(documents, [{"document": link.get("source_document"), "quote": link.get("quote")}])
        if not evidence:
            continue
        link["source_document"] = evidence[0]["document"]
        link["quote"] = evidence[0]["quote"]
        link["evidence"] = evidence
        kept_links.append(link)
    data["ownership_links"] = kept_links
    kept_addresses = []
    for address in data.get("addresses", []):
        evidence = _evidence(documents, [{"document": address.get("source_document"), "quote": address.get("quote")}])
        if evidence:
            address["evidence"] = evidence
            address["source_document"] = evidence[0]["document"]
            kept_addresses.append(address)
    data["addresses"] = kept_addresses
    kept_ids = []
    for item in data.get("identity_documents", []):
        evidence = _evidence(documents, [{"document": item.get("source_document"), "quote": item.get("quote")}])
        if evidence:
            item["evidence"] = evidence
            item["source_document"] = evidence[0]["document"]
            kept_ids.append(item)
    data["identity_documents"] = kept_ids
    data["harvested_aliases"] = _harvest_aliases(documents)
    data["ownership_links"] = _with_narrative_control(documents, data.get("ownership_links") or [])
    return data


def _with_narrative_control(documents: dict[str, str], links: list[dict]) -> list[dict]:
    pattern = re.compile(
        r"([A-Z][A-Za-z0-9&'-]*(?: [A-Z][A-Za-z0-9&'-]*)* Limited) is understood to be wholly owned by ([A-Z][a-z]+(?: [A-Z][a-z]+)+)"
    )
    for filename, text in documents.items():
        flat = _ws(text)
        for match in pattern.finditer(flat):
            owner = match.group(2).strip()
            owned = match.group(1).strip(" .")
            if any(name_score(owner, link["owner"]) >= 0.92 and name_score(owned, link["owned"]) >= 0.92 for link in links):
                continue
            quote = match.group(0)
            links.append({
                "owner": owner,
                "owner_kind": "person",
                "owned": owned,
                "percent": 100,
                "source_document": filename,
                "quote": quote,
                "evidence": [{"document": filename, "quote": quote, "context": quote, "verified": True}],
            })
    return links


def _forms(party: dict) -> list[str]:
    forms: list[str] = []
    seen: set[str] = set()
    for value in [party.get("name", ""), *party.get("aliases", [])]:
        for form in name_forms(value):
            key = form.lower()
            if key not in seen:
                seen.add(key)
                forms.append(form)
    return forms


def _cluster(people: list[dict]) -> list[dict]:
    clusters: list[dict] = []
    for person in people:
        placed = False
        for cluster in clusters:
            if any(name_score(a, b) >= 0.92 for a in _forms(person) for b in _forms(cluster)):
                cluster["aliases"] = sorted(set(cluster["aliases"]) | set(_forms(person)) - {cluster["name"]})
                cluster["roles"] = sorted(set(cluster.get("roles", [])) | set(person.get("roles", [])))
                cluster["evidence"] = cluster.get("evidence", []) + person.get("evidence", [])
                if person.get("nationality") and not cluster.get("nationality"):
                    cluster["nationality"] = person["nationality"]
                placed = True
                break
        if not placed:
            clusters.append({
                "name": person.get("name") or "Unknown",
                "kind": person.get("kind", "person"),
                "roles": list(person.get("roles") or []),
                "nationality": person.get("nationality") or "",
                "aliases": list(person.get("aliases") or []),
                "evidence": list(person.get("evidence") or []),
            })
    return clusters


def _canonical(name: str, people: list[dict], companies: list[dict]) -> tuple[str, str]:
    for party in people + companies:
        if name_score(name, party["name"]) >= 0.92 or any(name_score(name, alias) >= 0.92 for alias in party.get("aliases", [])):
            return party["name"], party.get("kind", "person")
    return name, "person"


def _parse_date(value: str) -> datetime | None:
    value = (value or "").strip()
    for fmt in ("%d %B %Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    found = re.search(r"\d{1,2} [A-Za-z]+ \d{4}", value)
    if found:
        return _parse_date(found.group(0))
    return None


def _content_words(text: str) -> set[str]:
    stop = {
        "shareholder", "capital", "company", "limited", "expected", "annual", "turnover",
        "received", "description", "credits", "source", "funds", "business", "purpose",
        "activity", "import", "resale", "buyers", "prepared", "statement", "period", "total",
    }
    return {word for word in re.findall(r"[a-z]{5,}", (text or "").lower()) if word not in stop}


def _finding(module: str, code: str, title: str, detail: str, severity: str, evidence: list[dict]) -> dict:
    digest = hashlib.sha1(f"{module}|{code}|{title}".encode()).hexdigest()[:10]
    return {
        "id": f"{module}-{code}-{digest}",
        "module": module,
        "code": code,
        "title": title,
        "detail": detail,
        "severity": severity,
        "evidence": evidence,
        "officer": None,
    }


def _checklist_evidence(classified: list[dict], rule_text: str) -> list[dict]:
    names = ", ".join(item["filename"] for item in classified) or "none"
    quote = f"{rule_text} Documents in the pack: {names}."
    return [{
        "document": "Checklist rule",
        "quote": quote,
        "context": "The checklist is code. This finding is the absence of a required document, so the source is the rule and the file list.",
        "verified": True,
        "kind": "checklist",
    }]


def points_for(item: dict, policy: dict) -> int:
    if (item.get("officer") or {}).get("disposition") == "overridden":
        return 0
    weights = policy["points"]
    required = {doc["type"] for doc in policy.get("required_documents", [])}
    mapped = {
        "expired-id": "expired_document",
        "address": "address_mismatch",
        "presence": "ownership_presence_conflict",
        "percent": "ownership_percent_conflict",
        "gap": "corporate_owner_without_register",
        "sanctions": "sanctions_possible_match",
        "pep": "pep_sample_match",
        "pep-introducer": "pep_sample_match",
        "jurisdiction": "high_risk_jurisdiction",
        "mismatch": "source_of_funds_inconsistency",
        "registry": "registry_no_match",
    }.get(item["code"])
    if item["code"].startswith("missing") or item["code"] in required:
        return weights["missing_document"]
    if mapped:
        return weights.get(mapped, 0)
    return 0


def apply_score(findings: list[dict], policy: dict) -> dict:
    factors = []
    score = 0
    for item in findings:
        points = points_for(item, policy)
        item["points"] = points
        if points:
            score += points
            factors.append({"finding": item["title"], "rule": item["code"], "points": points})
    return {"score": score, "rating": _band(score, policy), "factors": factors}


def _band(score: int, policy: dict) -> str:
    for band in policy["bands"]:
        if score <= band["max"]:
            return band["rating"]
    return "High"


def _draft(case_name: str, findings: list[dict], rating: str, outstanding: list[str]) -> dict:
    payload = {
        "case": case_name,
        "suggested_rating": rating,
        "findings": [{"title": item["title"], "detail": item["detail"]} for item in findings],
        "outstanding": outstanding,
    }
    raw = chat([
        {"role": "system", "content": (
            "Draft two short texts for a compliance officer. Use only the JSON facts. "
            "Do not invent documents, percentages, or screening hits. "
            "Return JSON: {\"memo\": \"\", \"customer_request\": \"\"}. "
            "The memo states the suggested rating and that the officer decides. "
            "The customer request lists only the outstanding items."
        )},
        {"role": "user", "content": json.dumps(payload)},
    ], max_tokens=1200)
    try:
        return parse_json(raw)
    except json.JSONDecodeError:
        return {}


def assess(documents: dict[str, str]) -> dict:
    policy = rules()
    lists = screening_lists()
    extracted = extract_pack(documents)
    classified = []
    for filename, text in documents.items():
        classified.append({"filename": filename, "doc_type": _heading_type(text) or "other", "text": text})

    people = _cluster(extracted.get("people") or [])
    register_text = "\n".join(
        text for name, text in documents.items() if _heading_type(text) == "register_of_directors"
    ).lower()
    for person in people:
        forms = [person["name"], *person.get("aliases", [])]
        if any(form and form.lower() in register_text for form in forms):
            roles = {role.lower() for role in person.get("roles", [])}
            if "director" not in roles:
                person.setdefault("roles", []).append("director")
    for filename, text in documents.items():
        if _heading_type(text) != "passport":
            continue
        name = re.search(r"Name:\s*(.+)", text)
        expiry = re.search(r"Date of expiry:\s*(.+)", text)
        if not name or not expiry:
            continue
        extracted.setdefault("identity_documents", [])
        if any(name_score(name.group(1), item.get("person", "")) >= 0.92 for item in extracted["identity_documents"]):
            for item in extracted["identity_documents"]:
                if name_score(name.group(1), item.get("person", "")) >= 0.92 and not item.get("expiry"):
                    item["expiry"] = expiry.group(1).strip()
            continue
        quote = expiry.group(0).strip()
        ok, context = locate(text, quote)
        extracted["identity_documents"].append({
            "person": name.group(1).strip(),
            "expiry": expiry.group(1).strip(),
            "source_document": filename,
            "evidence": [{"document": filename, "quote": quote, "context": context, "verified": ok}] if ok else [],
        })
    for extra in extracted.get("harvested_aliases") or []:
        for person in people:
            if name_score(extra["name"], person["name"]) >= 0.92 or any(name_score(extra["name"], alias) >= 0.92 for alias in person["aliases"]):
                person["aliases"] = sorted(set(person["aliases"]) | set(extra["aliases"]))
    for person in people:
        others = [other["name"] for other in people if other is not person]
        person["aliases"] = [
            alias for alias in person.get("aliases", [])
            if alias and not any(name_score(alias, other) >= 0.8 for other in others)
        ]
    companies = extracted.get("companies") or []
    links = []
    for link in extracted.get("ownership_links") or []:
        owner, owner_kind = _canonical(link["owner"], people, companies)
        owned, _owned_kind = _canonical(link["owned"], people, companies)
        kind = link.get("owner_kind") or owner_kind
        if any(token in owner.lower() for token in ("limited", "ltd", "llc", "inc")):
            kind = "company"
        links.append({**link, "owner": owner, "owned": owned, "owner_kind": kind})

    findings = []
    present = {item["doc_type"] for item in classified}
    required = [(item["type"], item["label"]) for item in policy.get("required_documents", [])]
    for doc_type, label in required:
        if doc_type not in present:
            findings.append(_finding(
                "documents", doc_type, f"Missing {label}",
                f"The pack has no {label.lower()}.",
                "high", _checklist_evidence(classified, f"Required: {label}."),
            ))

    directors = [person for person in people if "director" in [role.lower() for role in person.get("roles", [])]]
    id_docs = extracted.get("identity_documents") or []
    for person in directors:
        matched = [item for item in id_docs if name_score(item.get("person", ""), person["name"]) >= 0.86 or any(name_score(item.get("person", ""), alias) >= 0.86 for alias in person["aliases"])]
        if not matched:
            findings.append(_finding(
                "documents", "missing-id", f"Missing identification for {person['name']}",
                f"{person['name']} is a director and the pack has no passport or identity document for them.",
                "high",
                (person.get("evidence") or []) + _checklist_evidence(classified, f"Required: identification for director {person['name']}."),
            ))
            continue
        for item in matched:
            expiry = _parse_date(item.get("expiry", ""))
            if expiry and expiry.date() < datetime.utcnow().date():
                findings.append(_finding(
                    "documents", "expired-id", f"Expired identification for {person['name']}",
                    f"The identity document expires {expiry.date().isoformat()}.",
                    "high", item.get("evidence") or [],
                ))

    addresses = extracted.get("addresses") or []
    registered = [item for item in addresses if item.get("kind") == "registered"]
    proof = [item for item in addresses if item.get("kind") == "proof_of_address"]
    if registered and proof:
        left = _ws(registered[0]["value"]).lower()
        right = _ws(proof[0]["value"]).lower()
        if left and right and left not in right and right not in left:
            findings.append(_finding(
                "documents", "address", "Registered address differs from the proof of address",
                f"Registered office: {registered[0]['value']}. Proof of address: {proof[0]['value']}.",
                "medium", (registered[0].get("evidence") or []) + (proof[0].get("evidence") or []),
            ))

    by_source: dict[str, list[dict]] = {}
    for link in links:
        by_source.setdefault(link["source_document"], []).append(link)
    owner_sets = []
    for source, source_links in by_source.items():
        owners = []
        for link in source_links:
            if name_score(link["owned"], (extracted.get("entity") or {}).get("legal_name", "")) >= 0.8 or "harbour lantern" in link["owned"].lower():
                owners.append(link["owner"])
        owner_sets.append((source, owners))
    if len(owner_sets) >= 2:
        names = [set(owners) for _source, owners in owner_sets]
        for person in people:
            hits = []
            for source, owners in owner_sets:
                if any(name_score(person["name"], owner) >= 0.92 or any(name_score(alias, owner) >= 0.92 for alias in person["aliases"]) for owner in owners):
                    hits.append(source)
            if 0 < len(hits) < len(owner_sets):
                missing_from = [source for source, _owners in owner_sets if source not in hits]
                findings.append(_finding(
                    "ownership", "presence", f"{person['name']} is not on every ownership document",
                    f"Named in {', '.join(hits)}. Absent from {', '.join(missing_from)}.",
                    "high", person.get("evidence") or [],
                ))

    grouped: dict[tuple[str, str], list[dict]] = {}
    for link in links:
        if "harbour lantern" not in link["owned"].lower() and name_score(link["owned"], (extracted.get("entity") or {}).get("legal_name", "")) < 0.8:
            continue
        grouped.setdefault((link["owner"], link["owned"]), []).append(link)
    for (owner, owned), group in grouped.items():
        percents = {float(item["percent"]) for item in group}
        if len(percents) > 1:
            findings.append(_finding(
                "ownership", "percent", f"Conflicting ownership percentage for {owner}",
                f"{owner} is recorded as {' and '.join(str(int(p)) if p == int(p) else str(p) for p in sorted(percents))} percent of {owned}.",
                "high", [ev for item in group for ev in item.get("evidence", [])],
            ))

    views = []
    subject = (extracted.get("entity") or {}).get("legal_name") or "Harbour Lantern Trading Limited"
    for source, source_links in by_source.items():
        computed = effective_owners(source_links, subject)
        views.append({"source": source, "links": source_links, "effective": computed["people"], "gaps": computed["gaps"], "cycles": computed["cycles"]})
    corporate_owners = [
        link for link in links
        if link.get("owner_kind") == "company" and (
            "harbour lantern" in link["owned"].lower() or name_score(link["owned"], subject) >= 0.8
        )
    ]
    seen_gap = set()
    for link in corporate_owners:
        if link["owner"] in seen_gap:
            continue
        seen_gap.add(link["owner"])
        has_register = any(
            item["doc_type"] == "register_of_members" and link["owner"].lower() in item["text"].lower()
            for item in classified
        )
        if not has_register:
            findings.append(_finding(
                "ownership", "gap", f"Missing register of members for {link['owner']}",
                f"{link['owner']} owns part of the applicant. The pack does not include its register of members, so the chain above that company is not documented.",
                "high", (link.get("evidence") or []) + _checklist_evidence(classified, f"Required: register of members of {link['owner']}."),
            ))

    screened = []
    parties = [*people, *[{**company, "kind": "company", "roles": company.get("roles", [])} for company in companies]]
    threshold = policy["match_threshold"]
    for party in parties:
        forms = [form for form in _forms(party) if form]
        sanctions_hit = None
        for entry in lists["sanctions"]["entries"]:
            match = best_match(forms, entry, threshold)
            if match and (sanctions_hit is None or match["score"] > sanctions_hit["score"]):
                sanctions_hit = match
        pep_hit = None
        if party.get("kind") != "company":
            for entry in lists["pep"]["entries"]:
                match = best_match(forms, entry, threshold)
                if match and (pep_hit is None or match["score"] > pep_hit["score"]):
                    pep_hit = match
        screened.append({
            "name": party["name"],
            "aliases": party.get("aliases") or [],
            "sanctions": sanctions_hit,
            "pep": pep_hit,
        })
        public_hit = screen_public(forms)
        if public_hit:
            program = public_hit["entry"].get("program") or public_hit["entry"].get("source")
            findings.append(_finding(
                "screening", "sanctions", f"Possible sanctions match: {party['name']}",
                (
                    f"'{public_hit['query']}' scored {public_hit['score']:.2f} against "
                    f"'{public_hit['candidate']}' on {public_hit['entry'].get('source')} ({program})."
                ),
                "high", (party.get("evidence") or []) + [{
                    "document": public_hit["entry"].get("source", "Sanctions list"),
                    "quote": f"Listed name: {public_hit['candidate']}. Program: {program}.",
                    "context": "Public consolidated list. This is a possible match for the officer to confirm.",
                    "verified": True,
                    "kind": "list",
                }],
            ))
        elif sanctions_hit:
            findings.append(_finding(
                "screening", "sanctions", f"Possible sanctions match: {party['name']}",
                f"'{sanctions_hit['query']}' scored {sanctions_hit['score']:.2f} against '{sanctions_hit['candidate']}' on the {lists['sanctions']['label']}",
                "high", (party.get("evidence") or []) + [{
                    "document": "Prototype sample list",
                    "quote": f"Sample list name: {sanctions_hit['candidate']}.",
                    "context": lists["sanctions"]["label"],
                    "verified": True,
                    "kind": "list",
                }],
            ))
        if pep_hit:
            findings.append(_finding(
                "screening", "pep", f"Possible PEP match: {party['name']}",
                f"'{pep_hit['query']}' scored {pep_hit['score']:.2f} against '{pep_hit['candidate']}' on the {lists['pep']['label']}",
                "medium", party.get("evidence") or [],
            ))

    high_risk = policy["high_risk_jurisdictions"]["names"]
    for person in people:
        nationality = (person.get("nationality") or "").lower()
        if any(name in nationality for name in high_risk):
            findings.append(_finding(
                "screening", "jurisdiction", f"High-risk jurisdiction on {person['name']}",
                f"Nationality is recorded as {person['nationality']}. The illustrative country list includes that jurisdiction, so the risk rating rises.",
                "high", person.get("evidence") or [],
            ))

    business = extracted.get("business") or {}
    purpose_words = _content_words(business.get("purpose", ""))
    credit_words = _content_words(business.get("observed_credits", ""))
    if purpose_words and credit_words and purpose_words.isdisjoint(credit_words):
        findings.append(_finding(
            "source_of_funds", "mismatch", "Declared business does not match the credits described",
            f"Purpose: {business.get('purpose')}. Credits described as: {business.get('observed_credits')}. Plausibility is left to the officer.",
            "medium", business.get("evidence") or [],
        ))

    introducer = business.get("introducer") or ""
    if introducer:
        for entry in lists["pep"]["entries"]:
            match = best_match([introducer], entry, threshold)
            if match:
                findings.append(_finding(
                    "screening", "pep-introducer", f"Introducer matches the sample PEP list: {introducer}",
                    f"'{match['query']}' scored {match['score']:.2f} against '{match['candidate']}'. {lists['pep']['label']}",
                    "medium", business.get("evidence") or [],
                ))

    registry = lookup_hong_kong(subject)
    if registry.get("status") == "no_match":
        findings.append(_finding(
            "documents", "registry", f"No Hong Kong register record for {subject}",
            "No matching live local company on the Companies Registry open-data name search, and no match on the HKMA register of authorized institutions. This is not ICRIS and not a BVI registry search.",
            "review", [{
                "document": registry.get("source") or "Hong Kong public registers",
                "quote": f"No record matched the legal name {subject}.",
                "context": "Public Hong Kong Companies Registry open data and HKMA register of AIs.",
                "verified": True,
                "kind": "registry",
            }],
        ))
    elif registry.get("status") == "match":
        extra = registry.get("brn") or registry.get("institution_type") or ""
        findings.append(_finding(
            "documents", "registry-match", f"Hong Kong register record for {subject}",
            f"{registry.get('source')}: {registry.get('legal_name')}" + (f" · {extra}" if extra else "") + ".",
            "low", [{
                "document": registry.get("source") or "Hong Kong public registers",
                "quote": f"{registry.get('legal_name')} · {extra} · {registry.get('address') or ''}".strip(" ·"),
                "context": "Public Hong Kong register lookup.",
                "verified": True,
                "kind": "registry",
            }],
        ))

    scored = apply_score(findings, policy)
    rating = scored["rating"]
    list_summary = sanctions_summary()
    monitoring = _monitoring(findings, policy, list_summary)
    outstanding = [item["title"] for item in findings if item["code"] in {"gap", "expired-id", "missing-id"} or item["code"] in {doc for doc, _label in required} or "Missing" in item["title"]]
    drafts = {}
    try:
        drafts = _draft(subject, findings, rating, outstanding)
    except Exception:
        drafts = {}
    memo = drafts.get("memo") or _fallback_memo(subject, rating, findings)
    request = drafts.get("customer_request") or _fallback_request(subject, outstanding)

    def module_status(name: str) -> str:
        items = [item for item in findings if item["module"] == name]
        if any(item["severity"] == "high" for item in items):
            return "attention"
        if items:
            return "review"
        return "clear"

    return {
        "entity": extracted.get("entity") or {"legal_name": subject},
        "people": people,
        "companies": companies,
        "documents": [{"filename": item["filename"], "doc_type": item["doc_type"]} for item in classified],
        "ownership_views": views,
        "screening": screened,
        "business": {key: value for key, value in business.items() if key != "evidence"},
        "findings": findings,
        "modules": {
            "documents": {"title": "Entity and documents", "status": module_status("documents")},
            "ownership": {"title": "Ownership and control", "status": module_status("ownership")},
            "screening": {"title": "Sanctions, PEP, and names", "status": module_status("screening")},
            "source_of_funds": {"title": "Source of funds", "status": module_status("source_of_funds")},
            "risk": {"title": "Risk and memo", "status": "ready", "rating": rating, "score": scored["score"]},
        },
        "risk": {
            "score": scored["score"],
            "rating": rating,
            "factors": scored["factors"],
            "rules_label": policy["label"],
            "suggested_status": "Officer review",
        },
        "registry": registry,
        "monitoring": monitoring,
        "screening_notes": [
            {"title": "Sanctions lists", "detail": list_summary},
            {"title": "PEP", "detail": lists["pep"]["label"]},
            {"title": "Adverse media", "detail": "Not run. No licensed adverse-media source is connected."},
        ],
        "labels": {
            "sanctions": list_summary,
            "pep": lists["pep"]["label"],
            "jurisdictions": policy["high_risk_jurisdictions"]["label"],
            "model": llm_settings()["model"],
        },
        "memo": memo,
        "customer_request": request,
    }


def _monitoring(findings: list[dict], policy: dict, summary: str) -> dict:
    months = int(policy.get("review_months") or 12)
    opened = datetime.now(timezone.utc)
    month_index = opened.month - 1 + months
    year = opened.year + month_index // 12
    month = month_index % 12 + 1
    next_review = opened.replace(year=year, month=month, day=min(opened.day, 28))
    triggers = [
        {"kind": "document_expiry", "due": True, "detail": item["detail"]}
        for item in findings if item["code"] == "expired-id"
    ]
    triggers.append({
        "kind": "periodic_review",
        "due": False,
        "detail": f"Next periodic review {next_review.date().isoformat()} ({months} months from opening).",
    })
    triggers.append({"kind": "sanctions_list", "due": False, "detail": summary})
    return {
        "opened_at": opened.isoformat(),
        "next_review": next_review.date().isoformat(),
        "interval_months": months,
        "triggers": triggers,
    }


def _fallback_memo(subject: str, rating: str, findings: list[dict]) -> str:
    lines = [f"Suggested rating for {subject}: {rating}. The officer decides.", ""]
    for item in findings:
        lines.append(f"- {item['title']}. {item['detail']}")
    return "\n".join(lines)


def _fallback_request(subject: str, outstanding: list[str]) -> str:
    lines = [f"Please send the following for {subject}:", ""]
    if not outstanding:
        lines.append("No document is outstanding from the automated checklist.")
    for item in outstanding:
        lines.append(f"- {item}")
    return "\n".join(lines)
