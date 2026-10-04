"""Documents section: required documents, identification, address, and the
Hong Kong public registers."""
import re
from datetime import datetime

from tally.assessment.findings import checklist_evidence, finding
from tally.assessment.pack import ws
from tally.registry import gleif_search, lookup_hong_kong
from tally.screening import name_score


def required_documents(policy: dict) -> list[tuple[str, str]]:
    return [(item["type"], item["label"]) for item in policy.get("required_documents", [])]


def parse_date(value: str) -> datetime | None:
    value = (value or "").strip()
    for fmt in ("%d %B %Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    found = re.search(r"\d{1,2} [A-Za-z]+ \d{4}", value)
    if found:
        return parse_date(found.group(0))
    return None


def _missing_documents(classified: list[dict], policy: dict) -> list[dict]:
    findings = []
    present = {item["doc_type"] for item in classified}
    for doc_type, label in required_documents(policy):
        if doc_type not in present:
            findings.append(finding(
                "documents", doc_type, f"Missing {label}",
                f"The pack has no {label.lower()}.",
                "high", checklist_evidence(classified, f"Required: {label}."),
            ))
    return findings


def _director_identification(classified: list[dict], people: list[dict], extracted: dict) -> list[dict]:
    findings = []
    directors = [person for person in people if "director" in [role.lower() for role in person.get("roles", [])]]
    id_docs = extracted.get("identity_documents") or []
    for person in directors:
        matched = [
            item for item in id_docs
            if name_score(item.get("person", ""), person["name"]) >= 0.86
            or any(name_score(item.get("person", ""), alias) >= 0.86 for alias in person["aliases"])
        ]
        if not matched:
            findings.append(finding(
                "documents", "missing-id", f"Missing identification for {person['name']}",
                f"{person['name']} is a director and the pack has no passport or identity document for them.",
                "high",
                (person.get("evidence") or []) + checklist_evidence(classified, f"Required: identification for director {person['name']}."),
            ))
            continue
        for item in matched:
            expiry = parse_date(item.get("expiry", ""))
            if expiry and expiry.date() < datetime.utcnow().date():
                findings.append(finding(
                    "documents", "expired-id", f"Expired identification for {person['name']}",
                    f"The identity document expires {expiry.date().isoformat()}.",
                    "high", item.get("evidence") or [],
                ))
    return findings


def _address_mismatch(extracted: dict) -> list[dict]:
    addresses = extracted.get("addresses") or []
    registered = [item for item in addresses if item.get("kind") == "registered"]
    proof = [item for item in addresses if item.get("kind") == "proof_of_address"]
    if not (registered and proof):
        return []
    left = ws(registered[0]["value"]).lower()
    right = ws(proof[0]["value"]).lower()
    if left and right and left not in right and right not in left:
        return [finding(
            "documents", "address", "Registered address differs from the proof of address",
            f"Registered office: {registered[0]['value']}. Proof of address: {proof[0]['value']}.",
            "medium", (registered[0].get("evidence") or []) + (proof[0].get("evidence") or []),
        )]
    return []


def check_documents(classified: list[dict], people: list[dict], extracted: dict, policy: dict) -> list[dict]:
    return [
        *_missing_documents(classified, policy),
        *_director_identification(classified, people, extracted),
        *_address_mismatch(extracted),
    ]


def check_registry(subject: str) -> tuple[dict, list[dict]]:
    """Look the company up on the public Hong Kong registers and GLEIF."""
    registry = lookup_hong_kong(subject)
    gleif = gleif_search(subject)
    registry = {**registry, "gleif": gleif}
    findings = []
    if registry.get("status") == "no_match":
        lei_note = gleif.get("note") or ""
        if gleif.get("status") == "no_match":
            lei_note = "GLEIF returned no LEI for this name. " + lei_note
        findings.append(finding(
            "documents", "registry", f"No Hong Kong register record for {subject}",
            "No matching live local company on the Companies Registry open-data name search, and no match on the HKMA register of authorized institutions. This is not ICRIS. The British Virgin Islands has no public shareholder register, so offshore ownership is taken from the customer documents only. " + lei_note,
            "review", [{
                "document": registry.get("source") or "Hong Kong public registers",
                "quote": f"No record matched the legal name {subject}.",
                "context": "Public Hong Kong Companies Registry open data, HKMA register of AIs, and GLEIF. Not a BVI shareholder search.",
                "verified": True,
                "kind": "registry",
            }],
        ))
    elif registry.get("status") == "match":
        extra = registry.get("brn") or registry.get("institution_type") or ""
        findings.append(finding(
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
    if gleif.get("status") == "match":
        status = gleif.get("registration_status") or gleif.get("entity_status") or ""
        findings.append(finding(
            "documents", "lei", f"GLEIF LEI for {subject}",
            (
                f"GLEIF {gleif.get('lei')} · {gleif.get('legal_name')} · "
                f"{gleif.get('jurisdiction') or gleif.get('country') or 'jurisdiction not stated'}"
                + (f" · {status}" if status else "")
                + f". {gleif.get('note')}"
            ),
            "low", [{
                "document": "GLEIF",
                "quote": f"{gleif.get('lei')} · {gleif.get('legal_name')}",
                "context": gleif.get("note") or "GLEIF LEI index.",
                "verified": True,
                "kind": "registry",
            }],
        ))
    return registry, findings
