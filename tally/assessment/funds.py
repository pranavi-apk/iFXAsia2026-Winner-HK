"""Source-of-funds profile built from the pack text.

Figures, names, and dates are taken from the documents and from the
extracted business fields. Nothing here is a sample narrative.
"""
import re
from datetime import date

from tally.assessment.pack import locate

_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}
_SCALES = {"million": 1_000_000, "m": 1_000_000, "billion": 1_000_000_000, "bn": 1_000_000_000}
_AMOUNT = re.compile(
    r"(?P<cur>USD|US\$|SGD|HKD|EUR|GBP|CNY|RMB|\$|£|€)\s*(?P<num>\d[\d,]*(?:\.\d+)?)\s*(?P<scale>million|billion|bn|m\b)?",
    re.I,
)
_LONG_DATE = re.compile(
    r"\b(?P<d>\d{1,2})\s+(?P<m>January|February|March|April|May|June|July|August|September|October|November|December)\s+(?P<y>\d{4})\b",
    re.I,
)
_ISO_DATE = re.compile(r"\b(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})\b")
_SUFFIXES = {
    "llc": "LLC", "ltd": "Ltd", "limited": "Limited", "pte": "Pte", "inc": "Inc",
    "plc": "PLC", "bvi": "BVI", "sa": "SA", "ag": "AG", "gmbh": "GmbH",
}
_TYPE_LABELS = {
    "source_of_funds": "Source of funds statement",
    "certificate_of_incorporation": "Certificate of incorporation",
    "ownership_declaration": "Ownership declaration",
    "register_of_directors": "Register of directors",
    "register_of_members": "Register of members",
    "proof_of_address": "Proof of address",
    "passport": "Passport",
}
_FUNDS_HINTS = (
    "source of funds", "bank statement", "dividend", "invoice", "business plan",
    "total credits", "turnover", "sale and purchase", "tax clearance",
)


def build_funds_profile(
    documents: dict[str, str],
    business: dict | None,
    entity: dict | None,
    classified: list[dict],
    findings: list[dict],
    companies: list[dict] | None = None,
    model_sources: list[dict] | None = None,
    model_events: list[dict] | None = None,
) -> dict:
    """Assemble the source-of-funds screen from pack text and extracted fields."""
    business = business or {}
    entity = entity or {}
    classified = classified or []
    sof_findings = [item for item in findings or [] if item.get("module") == "source_of_funds"]
    by_name = {item["filename"]: item for item in classified}
    funds_docs = [item for item in classified if _is_funds_doc(item)]

    declared = _clean(business.get("declared_source_of_funds")) or _labeled(documents, r"declared source of funds")
    credits = _clean(business.get("observed_credits")) or _labeled(documents, r"description of credits")
    purpose = _clean(business.get("purpose")) or _labeled(documents, r"business purpose")
    expected = _clean(business.get("expected_activity")) or _labeled(documents, r"expected activity")
    introducer = _clean(business.get("introducer")) or _introducer(documents)
    markets = _clean(business.get("target_markets")) or _markets(expected, entity.get("jurisdiction") or "")
    volume_phrase = _clean(business.get("expected_annual_volume")) or _volume_phrase(expected, documents)

    sources = _declared_sources(declared, funds_docs)
    observed = _observed_source(credits, funds_docs)
    if observed and not _same_source(observed, sources):
        sources.append(observed)
    sources.extend(_itemised_sources(funds_docs, sources))
    sources.extend(_model_sources(model_sources or [], sources))
    _attach_total_credits(sources, funds_docs)

    applicant = _clean(entity.get("legal_name")) or _labeled(documents, r"company") or "Applicant"
    total = _total(sources, volume_phrase, documents)
    timeline = _timeline(documents, applicant, funds_docs, model_events or [])
    known_companies = {_key(item.get("name") or "") for item in companies or []}

    return {
        "total": total,
        "source_count": len(sources),
        "consistent": not sof_findings,
        "sources": [_public_source(item, known_companies) for item in sources],
        "recipient": {"name": applicant, "role": "Onboarded entity"},
        "intermediary": _intermediary(documents, applicant),
        "timeline": timeline,
        "purpose": {
            "business_activity": purpose,
            "expected_transactions": _activity_without_volume(expected),
            "target_markets": markets,
            "expected_annual_volume": volume_phrase,
            "introducer": introducer,
        },
        "documents": [_public_doc(item, sources, sof_findings) for item in funds_docs],
        "note": "Amounts and names are read from the pack. A share is shown only when that inflow states a figure.",
    }


def _public_source(item: dict, known_companies: set[str]) -> dict:
    kind = item["kind"]
    if _key(item["name"]) in known_companies:
        kind = "company"
    return {
        "id": item["id"],
        "name": item["name"],
        "category": item["category"],
        "detail": item["detail"],
        "origin": item["origin"],
        "kind": kind,
        "amount": item["amount"],
        "currency": item["currency"],
        "document": item["document"],
    }


def _public_doc(item: dict, sources: list[dict], findings: list[dict]) -> dict:
    filename = item["filename"]
    related = next((source for source in sources if source.get("document") == filename and source.get("amount")), None)
    cited = any(filename == (ev.get("document") or "") for finding in findings for ev in finding.get("evidence") or [])
    mismatch_doc = item.get("doc_type") == "source_of_funds" and bool(findings)
    if cited or mismatch_doc:
        badge, tone = "Requires review", "review"
    elif related:
        badge, tone = "Confirms inflow", "ok"
    elif any(source.get("document") == filename and source.get("origin") == "declared" for source in sources):
        badge, tone = "States declared sources", "ok"
    else:
        badge, tone = "Supports purpose", "ok"
    return {
        "filename": filename,
        "title": _TYPE_LABELS.get(item.get("doc_type")) or _heading(item.get("text") or "", filename),
        "date": _first_date(item.get("text") or ""),
        "badge": badge,
        "tone": tone,
        "doc_type": item.get("doc_type") or "other",
    }


def _declared_sources(text: str, funds_docs: list[dict]) -> list[dict]:
    sources = []
    for phrase in _split_phrases(text):
        name, category = _name_and_category(phrase, "Declared source")
        amount, currency = _phrase_amount(phrase)
        sources.append(_source(name, category, phrase, "declared", amount, currency, _doc_for(phrase, funds_docs), "company" if _looks_corporate(name) else _kind(phrase)))
    return sources


def _observed_source(text: str, funds_docs: list[dict]) -> dict | None:
    phrase = _clean(text)
    if not phrase:
        return None
    name, category = _name_and_category(phrase, "Credits described")
    amount, currency = _phrase_amount(phrase)
    kind = "company" if _looks_corporate(name) else _kind(phrase)
    return _source(name, category, phrase, "observed", amount, currency, _doc_for(phrase, funds_docs), kind)


def _itemised_sources(funds_docs: list[dict], existing: list[dict]) -> list[dict]:
    found = []
    for item in funds_docs:
        for sentence in re.split(r"(?<=[.])\s+|\n+", item.get("text") or ""):
            sentence = sentence.strip()
            if not sentence or re.match(r"total\b", sentence, re.I):
                continue
            if re.search(r"\b(turnover|expected activity|business purpose)\b", sentence, re.I) and not re.search(r"\bfrom\b", sentence, re.I):
                continue
            monies = _amounts(sentence)
            who = re.search(r"\bfrom\s+([A-Z][^.,\n]{2,80})", sentence)
            if not monies or not who:
                continue
            name = _title(who.group(1).strip(" ."))
            category = _title(re.sub(r"\bfrom\s+.+$", "", sentence, flags=re.I).strip(" .:-")) or "Inflow"
            category = re.sub(r"^(USD|SGD|HKD|EUR|GBP)\s*[\d,.]+\s*(million|billion|m|bn)?\s*", "", category, flags=re.I).strip() or "Inflow"
            candidate = _source(name, category, sentence, "stated", monies[0][1], monies[0][0], item["filename"], _kind(sentence))
            if _same_source(candidate, existing) or _same_source(candidate, found):
                continue
            found.append(candidate)
    return found


def _model_sources(rows: list[dict], existing: list[dict]) -> list[dict]:
    found = []
    for row in rows:
        quote = row.get("quote") or ""
        name = _title(row.get("name") or "") or _title(row.get("category") or "")
        if not name:
            continue
        monies = _amounts(quote)
        amount = monies[0][1] if monies else None
        currency = monies[0][0] if monies else ""
        candidate = _source(
            name,
            _title(row.get("category") or "") or "Stated source",
            _clean(row.get("description")) or quote,
            "stated",
            amount,
            currency,
            row.get("document") or "",
            _kind(f"{row.get('category') or ''} {name}"),
        )
        if _same_source(candidate, existing) or _same_source(candidate, found):
            continue
        found.append(candidate)
    return found


def _attach_total_credits(sources: list[dict], funds_docs: list[dict]) -> None:
    observed = [item for item in sources if item["origin"] == "observed" and not item["amount"]]
    if len(observed) != 1:
        return
    for item in funds_docs:
        for line in (item.get("text") or "").splitlines():
            if re.match(r"\s*total credits\b", line, re.I):
                monies = _amounts(line)
                if monies:
                    observed[0]["amount"] = monies[0][1]
                    observed[0]["currency"] = monies[0][0]
                    observed[0]["document"] = observed[0]["document"] or item["filename"]
                    return


def _total(sources: list[dict], volume_phrase: str, documents: dict[str, str]) -> dict:
    declared = [item for item in sources if item["origin"] == "declared" and item["amount"]]
    observed = [item for item in sources if item["origin"] != "declared" and item["amount"]]
    if declared:
        return _total_row(declared, "declared", "Total declared funds")
    if observed:
        return _total_row(observed, "credits", "Total credits in the pack")
    monies = _amounts(volume_phrase)
    if monies:
        return {"amount": monies[0][1], "currency": monies[0][0], "basis": "expected", "label": "Expected annual turnover"}
    for text in documents.values():
        match = re.search(r"total credits\s*[:\-]\s*(.+)", text, re.I)
        if match:
            monies = _amounts(match.group(1))
            if monies:
                return {"amount": monies[0][1], "currency": monies[0][0], "basis": "credits", "label": "Total credits in the pack"}
    return {"amount": None, "currency": "", "basis": "unknown", "label": "Not stated in the pack"}


def _total_row(items: list[dict], basis: str, label: str) -> dict:
    currency = next((item["currency"] for item in items if item["currency"]), "USD")
    return {"amount": sum(item["amount"] for item in items), "currency": currency, "basis": basis, "label": label}


def _timeline(documents: dict[str, str], applicant: str, funds_docs: list[dict], model_events: list[dict]) -> list[dict]:
    events = []
    for text in documents.values():
        match = re.search(r"date of incorporation\s*[:\-]?\s*(\d{1,2}\s+\w+\s+\d{4})", text, re.I)
        if match:
            iso = _parse_date(match.group(1))
            if iso:
                events.append({"date": iso, "amount": None, "currency": "", "detail": f"Incorporation of {applicant}"})
                break
    for item in funds_docs:
        text = item.get("text") or ""
        prepared = re.search(r"\bprepared\s+(\d{1,2}\s+\w+\s+\d{4})", text, re.I)
        if prepared:
            iso = _parse_date(prepared.group(1))
            if iso:
                events.append({"date": iso, "amount": None, "currency": "", "detail": "Source of funds statement prepared"})
        for sentence in re.split(r"(?<=[.])\s+|\n+", text):
            iso = _first_date(sentence)
            monies = _amounts(sentence)
            if not iso or not monies:
                continue
            if re.search(r"date of incorporation|\bprepared\b|total credits|turnover", sentence, re.I):
                continue
            detail = re.sub(r"\s+", " ", sentence).strip(" .")
            events.append({"date": iso, "amount": monies[0][1], "currency": monies[0][0], "detail": detail[:140]})
    for row in model_events:
        iso = _parse_date(row.get("date") or "") or _first_date(row.get("quote") or "")
        if not iso:
            continue
        monies = _amounts(row.get("quote") or "")
        events.append({
            "date": iso,
            "amount": monies[0][1] if monies else None,
            "currency": monies[0][0] if monies else "",
            "detail": _clean(row.get("description")) or _clean(row.get("quote")) or "Dated event in the pack",
        })
    unique = []
    seen = set()
    for event in sorted(events, key=lambda item: item["date"]):
        key = (event["date"], event["detail"].lower())
        if key in seen:
            continue
        seen.add(key)
        unique.append(event)
    return unique


def _intermediary(documents: dict[str, str], applicant: str) -> dict | None:
    pattern = re.compile(
        r"(?:funds|proceeds|credits)\s+(?:are|were)\s+received by\s+([A-Z][^.,\n]{2,80})",
        re.I,
    )
    for text in documents.values():
        match = pattern.search(text)
        if not match:
            continue
        name = _title(match.group(1).strip(" ."))
        if _key(name) and _key(name) != _key(applicant):
            return {"name": name, "role": "Receives the funds"}
    return None


def _source(name: str, category: str, detail: str, origin: str, amount, currency: str, document: str, kind: str) -> dict:
    return {
        "id": _key(f"{origin}-{name}-{category}")[:24] or origin,
        "name": name or category or "Unnamed source",
        "category": category or "Source",
        "detail": _clean(detail),
        "origin": origin,
        "kind": kind,
        "amount": amount,
        "currency": currency or "",
        "document": document or "",
    }


def _is_funds_doc(item: dict) -> bool:
    if item.get("doc_type") == "source_of_funds":
        return True
    text = (item.get("text") or "")[:1800].lower()
    return any(hint in text for hint in _FUNDS_HINTS)


def _labeled(documents: dict[str, str], label: str) -> str:
    pattern = re.compile(label + r"\s*[:\-]\s*(.+)", re.I)
    for text in documents.values():
        match = pattern.search(text)
        if match:
            return match.group(1).split("\n")[0].strip(" .")
    return ""


def _introducer(documents: dict[str, str]) -> str:
    for text in documents.values():
        match = re.search(r"introduced by\s+([A-Z][^.\n]{2,80})", text)
        if match:
            return match.group(1).strip(" .")
    return ""


def _volume_phrase(expected: str, documents: dict[str, str]) -> str:
    blob = "\n".join(part for part in (expected, *documents.values()) if part)
    for match in _AMOUNT.finditer(blob):
        window = blob[max(0, match.start() - 80): match.end() + 40]
        if not re.search(r"turnover|annual volume|a year|per year", window, re.I):
            continue
        phrase = match.group(0).strip()
        period = re.match(r"\s*(a year|per year|annually)", blob[match.end(): match.end() + 24], re.I)
        if period:
            return f"{phrase} {period.group(1)}"
        return phrase
    return ""


def _activity_without_volume(expected: str) -> str:
    text = _clean(expected)
    if not text:
        return ""
    cut = re.split(r",?\s*expected turnover\b|,?\s*expected annual\b", text, maxsplit=1, flags=re.I)[0]
    return cut.strip(" .")


def _markets(expected: str, jurisdiction: str) -> str:
    found = []
    for match in re.finditer(r"\b(?:in|across|throughout)\s+((?:[A-Z][A-Za-z]+\s*){1,4})", expected or ""):
        place = match.group(1).strip(" .")
        place = re.split(r"\s+(?:expected|with|and|for)\b", place)[0].strip()
        if place and place not in found:
            found.append(place)
    if not found and jurisdiction:
        found.append(jurisdiction)
    return ", ".join(found)


def _split_phrases(text: str) -> list[str]:
    if not text:
        return []
    parts = re.split(r"\s*,\s*|\s+and\s+", text.strip(" ."), flags=re.I)
    return [part.strip(" .") for part in parts if len(part.strip(" .")) > 2]


def _name_and_category(phrase: str, fallback: str) -> tuple[str, str]:
    match = re.search(r"\bfrom\s+(.+)$", phrase, re.I)
    if not match:
        return _title(phrase), fallback
    who = _title(match.group(1).strip(" ."))
    category = phrase[: match.start()].strip(" .")
    category = re.sub(r"\breceived\b", "", category, flags=re.I)
    category = re.sub(
        r"^(?:USD|US\$|SGD|HKD|EUR|GBP|CNY|RMB|\$|£|€)\s*\d[\d,]*(?:\.\d+)?(?:\s*(?:million|billion|bn|m))?\s*",
        "",
        category,
        flags=re.I,
    ).strip(" .")
    return who, _title(category) or fallback


def _phrase_amount(phrase: str):
    monies = _amounts(phrase)
    if not monies:
        return None, ""
    return monies[0][1], monies[0][0]


def _amounts(text: str) -> list[tuple[str, float]]:
    found = []
    for match in _AMOUNT.finditer(text or ""):
        number = float(match.group("num").replace(",", ""))
        scale = (match.group("scale") or "").lower()
        if scale:
            number *= _SCALES[scale]
        found.append((_currency(match.group("cur")), number))
    return found


def _currency(token: str) -> str:
    token = token.upper()
    return {"US$": "USD", "$": "USD", "£": "GBP", "€": "EUR", "RMB": "CNY"}.get(token, token)


def _first_date(text: str) -> str:
    match = _LONG_DATE.search(text or "") or _ISO_DATE.search(text or "")
    if not match:
        return ""
    return _parse_date(match.group(0))


def _parse_date(value: str) -> str:
    value = (value or "").strip()
    iso = _ISO_DATE.search(value)
    if iso and value[:4].isdigit() and len(value) >= 10 and value[4] == "-":
        try:
            return date(int(iso.group("y")), int(iso.group("m")), int(iso.group("d"))).isoformat()
        except ValueError:
            return ""
    match = _LONG_DATE.search(value)
    if not match:
        return ""
    try:
        return date(int(match.group("y")), _MONTHS[match.group("m").lower()], int(match.group("d"))).isoformat()
    except (ValueError, KeyError):
        return ""


def _doc_for(phrase: str, funds_docs: list[dict]) -> str:
    needle = phrase[:80]
    for item in funds_docs:
        ok, _context = locate(item.get("text") or "", needle)
        if ok:
            return item["filename"]
    return funds_docs[0]["filename"] if len(funds_docs) == 1 else ""


def _heading(text: str, filename: str) -> str:
    for line in text.splitlines():
        line = line.strip()
        if len(line) >= 8 and line.upper() == line and not line.endswith(":"):
            return line.capitalize()
    stem = re.sub(r"^\d+[-_]", "", filename.rsplit(".", 1)[0])
    stem = stem.replace("-", " ").replace("_", " ").strip()
    return stem[:1].upper() + stem[1:] if stem else filename


def _kind(phrase: str) -> str:
    text = phrase.lower()
    if any(word in text for word in ("personal", "savings", "individual", "salary", "ubo")):
        return "person"
    if any(word in text for word in ("dividend", "investment", "interest income")):
        return "investment"
    return "company"


def _looks_corporate(name: str) -> bool:
    return bool(re.search(r"\b(Ltd|Limited|LLC|Pte|Inc|PLC|GmbH|SA|AG)\b", name))


def _same_source(candidate: dict, others: list[dict]) -> bool:
    key = _key(candidate["name"])
    return any(_key(item["name"]) == key for item in others)


def _title(value: str) -> str:
    small = {"of", "and", "the", "from", "for", "a"}
    words = []
    for index, word in enumerate(value.split()):
        bare = word.strip(".,;:")
        suffix = _SUFFIXES.get(bare.lower())
        if suffix and bare.isalpha():
            words.append(suffix)
        elif bare.isupper() or any(char.isdigit() for char in bare):
            words.append(word)
        elif index and bare.lower() in small:
            words.append(bare.lower())
        elif bare:
            words.append(bare[:1].upper() + bare[1:])
        else:
            words.append(word)
    return " ".join(words)


def _key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")


def _clean(value) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip(" .")
