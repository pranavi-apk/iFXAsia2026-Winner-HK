"""Reading an onboarding pack into the intake the screens show.

The pack is a folder of PDFs written as `Key: value` lines (see mock_pack.py for
the format). Nothing here calls a model: statuses, ownership percentages,
screening and findings are all worked out in code, so the same pack always
gives the same intake.

The intake has one key per requirement group in data/checklist.json (company,
management, ownership, business, funds, presence, declarations, verification),
plus `screening` and `findings`.
"""
import json
import re
from datetime import date

from tally.config import DATA, rules, screening_lists
from tally.screening import best_match, name_forms

AS_OF = date(2026, 10, 4)  # the date the sample case is reviewed on

GROUP_SECTION = {
    "company": "documents", "management": "documents", "presence": "documents", "verification": "documents",
    "ownership": "ownership", "business": "source-of-funds", "funds": "source-of-funds", "declarations": "sanctions",
}
STATUS_LABEL = {"missing": "Missing", "expired": "Expired", "stale": "Out of date", "pending": "Pending"}
FINDING_SEVERITY = {"missing": "high", "expired": "high", "stale": "medium", "pending": "medium"}


def checklist() -> dict:
    return json.loads((DATA / "checklist.json").read_text(encoding="utf-8"))


# ------------------------------------------------------------------ reading

def parse(text: str) -> dict[str, list[str]]:
    """`Key: value` lines by lowercase key. The first line is the heading. A line
    that is not a key line continues the one before it (PDF text wraps)."""
    fields: dict[str, list[str]] = {}
    last = None
    for line in text.splitlines()[1:]:
        line = re.sub(r"\s+", " ", line).strip()  # extracted PDF text has doubled spaces
        if not line:
            last = None
            continue
        match = re.match(r"^([A-Z][A-Za-z ]{1,40}):\s*(.*)$", line)
        if match:
            last = fields.setdefault(match.group(1).lower(), [])
            last.append(match.group(2).strip())
        elif last:
            last[-1] = f"{last[-1]} {line}"
    return fields


def parts(value: str) -> list[str]:
    return [item.strip() for item in value.split("|")]


def clean(value: str):
    return None if value in ("", "-") else value


def one(fields: dict, key: str, default: str = "") -> str:
    return (fields.get(key) or [default])[0]


def add_months(day: date, months: int) -> date:
    total = day.month - 1 + months
    year, month = day.year + total // 12, total % 12 + 1
    return date(year, month, min(day.day, 28))


def iso(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


# ------------------------------------------------------------------ checklist

def _item_from_file(entry: dict, fields: dict, filename: str) -> dict:
    item = {"id": entry["id"], "title": entry["title"], "file": filename}
    issued, expires = iso(one(fields, "issued")), iso(one(fields, "expires"))
    status = one(fields, "review", "received")
    note = None
    max_age = int(one(fields, "max age months", "0") or 0)
    if expires and expires < AS_OF:
        status, note = "expired", f"Expired {(AS_OF - expires).days} days ago. A valid copy is needed."
    elif issued and max_age and add_months(issued, max_age) < AS_OF:
        status, note = "stale", f"Issued {(AS_OF - issued).days} days ago. The bank accepts {max_age} months."
    item["status"] = status
    for key, field in (("issued", "issued"), ("expires", "expires"), ("kind", "kind"), ("person", "person"), ("number", "number"), ("language", "language")):
        if one(fields, field):
            item[key] = one(fields, field)
    if one(fields, "apostilled"):
        item["apostilled"] = one(fields, "apostilled") == "yes"
    if note:
        item["note"] = note
    return item


def _checklist_items(packs: dict[str, dict], tracker: dict[str, dict]) -> dict[str, list[dict]]:
    groups = {}
    for group in checklist()["groups"]:
        items = []
        for entry in group["items"]:
            if entry["id"] in packs:
                item = _item_from_file(entry, packs[entry["id"]]["fields"], packs[entry["id"]]["filename"])
            elif entry["id"] in tracker:
                item = {"id": entry["id"], "title": entry["title"], **tracker[entry["id"]]}
            else:
                item = {"id": entry["id"], "title": entry["title"], "status": "missing", "note": "Required and not in the pack."}
            items.append(item)
        groups[group["key"]] = items
    return groups


def _tracker(fields: dict) -> dict[str, dict]:
    rows = {}
    for line in fields.get("item", []):
        item_id, status, entity, note = (parts(line) + ["", "", ""])[:4]
        row = {"status": status}
        if clean(entity):
            row["entity"] = entity
        if clean(note):
            row["note"] = note
        rows[item_id] = row
    return rows


# ------------------------------------------------------------------ ownership

def _structure(fields: dict) -> dict:
    nodes = {}
    for line in fields.get("node", []):
        direction, node_id, parent, kind, name, country, role, pct, tag = parts(line)
        node = {"id": node_id, "kind": kind, "name": name, "country": country, "pct": int(pct)}
        for key, value in (("role", role), ("tag", tag)):
            if clean(value):
                node[key] = value
        nodes[node_id] = (direction, parent, node)
    structure = {"owners": [], "subsidiaries": []}
    for direction, parent, node in nodes.values():
        if parent == "applicant":
            structure["owners" if direction == "up" else "subsidiaries"].append(node)
        else:
            nodes[parent][2].setdefault("children", []).append(node)
    return structure


def _beneficial_owners(owners: list[dict], threshold: float, doc_ids: set[str]) -> list[dict]:
    found = []

    def walk(nodes, share, via):
        for node in nodes:
            here = share * node["pct"] / 100
            if node["kind"] == "person":
                person_id = node["id"].removeprefix("ubo-")
                if here * 100 >= threshold:
                    found.append({
                        "personId": person_id, "name": node["name"], "country": node["country"],
                        "effectivePct": round(here * 100, 1),
                        "route": "Direct" if not via else "Via " + " > ".join(f"{n['name']} ({n['pct']}%)" for n in via),
                        **{key: f"{prefix}-{person_id}" for key, prefix in (("identity", "id"), ("address", "address")) if f"{prefix}-{person_id}" in doc_ids},
                    })
            else:
                walk(node.get("children", []), here, [*via, node])

    walk(owners, 1.0, [])
    return found


# ------------------------------------------------------------------ screening and findings

def _screen(name: str, kind: str, policy: dict, lists: dict, declared_pep: dict) -> dict:
    forms = name_forms(name)
    threshold = policy["match_threshold"]
    sanctions = next(filter(None, (best_match(forms, entry, threshold) for entry in lists["sanctions"]["entries"])), None)
    pep = None
    if kind == "person":
        pep = next(filter(None, (best_match(forms, entry, threshold) for entry in lists["pep"]["entries"])), None)
    row = {
        "name": name, "kind": kind,
        "sanctions": "possible match" if sanctions else "clear",
        "pep": "n/a" if kind == "company" else ("possible match" if pep else "clear"),
    }
    row["result"] = "review" if sanctions or pep else "clear"
    hit = sanctions or pep
    if hit:
        row["match"] = {"score": round(hit["score"], 2), "listName": hit["candidate"],
                        "detail": hit["entry"].get("role") or hit["entry"].get("program", "")}
        row["declaredPep"] = declared_pep.get(name)
    return row


def _finding(group: str, code: str, severity: str, title: str, sub: str, section: str | None = None) -> dict:
    section = section or GROUP_SECTION[group]
    return {"id": f"f-{code}", "group": group, "section": section, "module": section, "severity": severity, "title": title, "sub": sub, "detail": sub}


def _findings(intake: dict) -> list[dict]:
    found = []
    for group in GROUP_SECTION:
        for item in intake[group]["documents"]:
            if item["status"] in STATUS_LABEL:
                sub = item.get("note", "")
                found.append(_finding(group, item["id"], FINDING_SEVERITY[item["status"]], f"{STATUS_LABEL[item['status']]}: {item['title']}", sub))
    for control in intake["ownership"]["controlByOtherMeans"]:
        found.append(_finding("ownership", "control-" + control["kind"].lower().replace(" ", "-"), "medium",
                              f"{control['holder']} holds a {control['kind'].lower()}", control["detail"]))
    for other in intake["management"]["otherDirectorships"]:
        found.append(_finding("management", f"overlap-{other['personId']}", "low", f"{other['name']} is also a director of {other['company']}",
                              "Directorship overlaps with the applicant's group.", "ownership"))
    for row in intake["screening"]:
        if row["result"] == "review":
            kind = "PEP" if row["pep"] == "possible match" else "sanctions"
            declared = " Declared not a PEP." if kind == "PEP" and row.get("declaredPep") is False else ""
            found.append(_finding("declarations", f"{kind.lower()}-{row['name'].lower().replace(' ', '-')}", "high",
                                  f"Possible {kind} match for {row['name']}",
                                  f"{round(row['match']['score'] * 100)}% similar to a list entry.{declared}"))
    expected = set(intake["funds"]["expectedActivity"]["counterpartyCountries"])
    new = sorted(expected - set(intake["funds"]["observedActivity"]["counterpartyCountries"]))
    for country in new:
        found.append(_finding("funds", "new-counterparty-" + country.lower().replace(" ", "-"), "low",
                              "Expected counterparty in a country not seen before",
                              f"{country} is expected but absent from the last 6 months of statements."))
    order = {"high": 0, "medium": 1, "low": 2}
    return sorted(found, key=lambda item: order[item["severity"]])


def _risk(findings: list[dict], policy: dict) -> dict:
    """Score from the findings: each finding adds points by severity. The bands are in data/rules.json."""
    counts = {level: sum(1 for item in findings if item["severity"] == level) for level in policy["severity_points"]}
    score = min(100, sum(policy["severity_points"][level] * count for level, count in counts.items()))
    rating = next(band["rating"] for band in policy["bands"] if score <= band["max"])
    return {"score": score, "rating": rating, "counts": counts, "rules_label": policy["label"]}


# ------------------------------------------------------------------ the whole pack

def build_intake(texts: dict[str, str]) -> dict:
    """`texts` is filename -> text of each PDF in the pack."""
    packs = {}
    for filename, text in sorted(texts.items()):
        fields = parse(text)
        doc_id = one(fields, "document id")
        if doc_id:
            packs[doc_id] = {"filename": filename, "fields": fields}

    tracker_fields = packs.get("onboarding-tracker", {}).get("fields", {})
    items = _checklist_items({k: v for k, v in packs.items() if one(v["fields"], "group") != "record"}, _tracker(tracker_fields))
    doc_ids = {item["id"] for group in items.values() for item in group}
    field = lambda doc_id: packs.get(doc_id, {}).get("fields", {})  # noqa: E731

    cert, extract = field("certificate-of-incorporation"), field("registry-extract")
    capital = parts(one(cert, "share capital", "USD | 0 | 0 | 0"))
    profile = {
        "legalName": one(cert, "company"), "formerNames": [], "entityType": one(cert, "entity type"),
        "jurisdiction": one(cert, "jurisdiction"), "incorporationDate": one(cert, "date of incorporation"),
        "registrationNumber": one(cert, "company number"), "registeredOffice": one(extract, "registered office") or one(cert, "registered office"),
        "businessActivity": one(cert, "business activity"),
        "shareCapital": {"currency": capital[0], "authorised": int(capital[1]), "issued": int(capital[2]), "shares": int(capital[3])},
    }

    people_register, directors_fields = {}, field("register-of-directors")
    directors = []
    for line in directors_fields.get("director", []):
        person_id, name, role, nationality, residence, appointed = parts(line)
        directors.append({"id": person_id, "name": name, "role": role, "nationality": nationality, "residence": residence, "appointed": appointed})
        people_register[person_id] = name
    secretary = parts(one(directors_fields, "secretary", " | | "))
    other_directorships = [{"personId": parts(line)[0], "name": people_register[parts(line)[0]], "company": parts(line)[1]}
                           for line in directors_fields.get("other directorship", [])]
    signatories = []
    for line in field("board-resolution").get("signatory", []):
        person_id, name, rule, specimen = parts(line)
        signatories.append({"personId": person_id, "name": name, "rule": rule, "specimenSignature": specimen == "yes"})

    tracker_meta = packs.get("onboarding-tracker", {}).get("fields", {})
    threshold = float(one(tracker_meta, "beneficial owner threshold percent", "25"))
    structure = _structure(field("structure-chart"))
    controls = [dict(zip(("kind", "holder", "detail", "status"), parts(line))) for line in field("voting-proxy").get("control", [])]

    biz, accounts = field("business-description"), field("audited-accounts")
    basis, period, year, auditor, turnover, profit, assets = parts(one(accounts, "financials", "| | 0 | | 0 | 0 | 0"))
    share = lambda line: dict(zip(("name", "country", "sharePct"), (lambda p: (p[0], p[1], int(p[2])))(parts(line))))  # noqa: E731

    sof, activity, observed = field("sof-statement"), field("expected-activity"), field("bank-statements-other")
    low, high = parts(one(activity, "typical transaction usd", "0 | 0"))
    countries = lambda value: [c.strip() for c in value.split(",") if c.strip()]  # noqa: E731
    sow = []
    for line in sof.get("source of wealth", []):
        person_id, name, declared, support = parts(line)
        sow.append({"personId": person_id, "name": name, "declared": declared, "supportedBy": [support] if clean(support) else []})

    ops = field("evidence-operations")
    sanctions_doc = field("sanctions-declaration")
    declared_pep = {}
    pep_rows = []
    for line in field("pep-declaration").get("pep declaration", []):
        person_id, name, answer = parts(line)
        declared_pep[name] = answer == "yes"
        pep_rows.append({"personId": person_id, "name": name, "declared": answer == "yes"})
    tax = []
    for doc_id in ("crs-entity", "crs-zhang-wei", "crs-liu-mei"):
        for line in field(doc_id).get("tax residency", []):
            subject, kind, residence, fatca, crs = parts(line)
            tax.append({"subject": subject, "kind": kind, "residence": residence, "fatca": fatca, "crs": crs})

    log = field("verification-log")
    interviews = []
    for line in log.get("interview", []):
        person_id, name, mode, when, status = parts(line)
        interviews.append({"personId": person_id, "name": name, "mode": mode, "date": clean(when), "status": status})

    intake = {
        "caseRef": one(tracker_meta, "case reference"),
        "receivedOn": one(tracker_meta, "received on"),
        "asOf": AS_OF.isoformat(),
        "beneficialOwnerThresholdPct": threshold,
        "company": {"profile": profile, "documents": items["company"]},
        "management": {
            "directors": directors,
            "companySecretary": {"name": secretary[0], "kind": secretary[1], "country": secretary[2]},
            "signatories": signatories,
            "otherDirectorships": other_directorships,
            "documents": items["management"],
        },
        "ownership": {
            "structure": structure,
            "beneficialOwners": _beneficial_owners(structure["owners"], threshold, doc_ids),
            "controlByOtherMeans": controls,
            "documents": items["ownership"],
        },
        "business": {
            "description": one(biz, "description"),
            "products": biz.get("product", []),
            "mainCustomers": [share(line) for line in biz.get("customer", [])],
            "mainSuppliers": [share(line) for line in biz.get("supplier", [])],
            "financialStatements": {"basis": basis, "period": period, "year": int(year), "auditor": auditor,
                                    "turnoverUsd": int(turnover), "netProfitUsd": int(profit), "totalAssetsUsd": int(assets)},
            "licenseNote": one(biz, "licence note"),
            "documents": items["business"],
        },
        "funds": {
            "sourceOfFunds": {"declared": one(sof, "declared source of funds"), "supportedBy": [i.strip() for i in one(sof, "supported by").split(",") if i.strip()]},
            "sourceOfWealth": sow,
            "expectedActivity": {
                "monthlyCreditsUsd": int(one(activity, "expected monthly credits usd", "0")),
                "monthlyDebitsUsd": int(one(activity, "expected monthly debits usd", "0")),
                "monthlyTransactions": int(one(activity, "expected monthly transactions", "0")),
                "typicalTransactionUsd": {"min": int(low), "max": int(high)},
                "counterpartyCountries": countries(one(activity, "counterparty countries")),
            },
            "observedActivity": {
                "note": one(observed, "observed"),
                "avgMonthlyCreditsUsd": int(one(observed, "average monthly credits usd", "0")),
                "counterpartyCountries": countries(one(observed, "observed counterparty countries")),
            },
            "documents": items["funds"],
        },
        "presence": {
            "registeredOffice": {"address": one(field("proof-registered-office"), "registered office"), "kind": one(field("proof-registered-office"), "kind")},
            "businessAddress": {"address": one(field("proof-business-address"), "business address"), "kind": one(field("proof-business-address"), "kind of premises")},
            "operations": {"employees": int(one(ops, "employees", "0")), "since": one(ops, "operating since"), "evidence": ops.get("evidence", [])},
            "documents": items["presence"],
        },
        "declarations": {
            "taxResidency": tax,
            "pep": pep_rows,
            "sanctions": {
                "declaredBy": one(sanctions_doc, "declared by"), "signedOn": one(sanctions_doc, "signed on"),
                "statement": one(sanctions_doc, "statement"),
                "exposureCountries": [] if one(sanctions_doc, "exposure countries") == "none" else countries(one(sanctions_doc, "exposure countries")),
            },
            "documents": items["declarations"],
        },
        "verification": {
            "certifiedCopies": [dict(zip(("documentId", "certifiedBy", "on"), parts(line))) for line in log.get("certified copy", [])],
            "apostilles": [{"documentId": parts(line)[0], "apostilled": parts(line)[1] == "yes"} for line in log.get("apostille", [])],
            "interviews": interviews,
            "translations": [dict(zip(("documentId", "from", "to", "status"), parts(line))) for line in log.get("translation", [])],
            "documents": items["verification"],
        },
    }

    policy, lists = rules(), screening_lists()
    parties = [(profile["legalName"], "company")]
    parties += [(n["name"], "company") for n in structure["owners"] if n["kind"] == "company"]
    parties += [(n["name"], "company") for n in structure["subsidiaries"]]
    parties += [(n, "person") for n in dict.fromkeys([*people_register.values(), *(b["name"] for b in intake["ownership"]["beneficialOwners"])])]
    intake["screening"] = [_screen(name, kind, policy, lists, declared_pep) for name, kind in parties]
    intake["findings"] = _findings(intake)
    intake["risk"] = _risk(intake["findings"], policy)
    return intake


def pack_documents(texts: dict[str, str], page_counts: dict[str, int], intake: dict) -> list[dict]:
    """One row per PDF for the Documents table."""
    by_file = {item["file"]: item for group in GROUP_SECTION for item in intake[group]["documents"] if item.get("file")}
    rows = []
    for filename in sorted(texts):
        item = by_file.get(filename)
        title = item["title"] if item else filename.rsplit(".", 1)[0].split("-", 1)[-1].replace("-", " ").title()
        rows.append({
            "filename": filename, "type": title, "doc_type": title, "date": (item or {}).get("issued", ""),
            "pages": page_counts.get(filename, 1), "status": (item or {}).get("status", "received"),
        })
    return rows
