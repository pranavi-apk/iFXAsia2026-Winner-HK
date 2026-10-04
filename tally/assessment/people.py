"""Merging the model's people and companies into one record each, and
resolving names in the ownership links to those records."""
import re

from tally.assessment.pack import heading_type, locate
from tally.screening import name_forms, name_score


def forms(party: dict) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in [party.get("name", ""), *party.get("aliases", [])]:
        for form in name_forms(value):
            key = form.lower()
            if key not in seen:
                seen.add(key)
                result.append(form)
    return result


def cluster(people: list[dict]) -> list[dict]:
    clusters: list[dict] = []
    for person in people:
        placed = False
        for existing in clusters:
            if any(name_score(a, b) >= 0.92 for a in forms(person) for b in forms(existing)):
                existing["aliases"] = sorted(set(existing["aliases"]) | set(forms(person)) - {existing["name"]})
                existing["roles"] = sorted(set(existing.get("roles", [])) | set(person.get("roles", [])))
                existing["evidence"] = existing.get("evidence", []) + person.get("evidence", [])
                if person.get("nationality") and not existing.get("nationality"):
                    existing["nationality"] = person["nationality"]
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


def canonical(name: str, people: list[dict], companies: list[dict]) -> tuple[str, str]:
    for party in people + companies:
        if name_score(name, party["name"]) >= 0.92 or any(name_score(name, alias) >= 0.92 for alias in party.get("aliases", [])):
            return party["name"], party.get("kind", "person")
    return name, "person"


def _mark_listed_directors(people: list[dict], documents: dict[str, str]) -> None:
    register_text = "\n".join(
        text for text in documents.values() if heading_type(text) == "register_of_directors"
    ).lower()
    for person in people:
        names = [person["name"], *person.get("aliases", [])]
        if any(name and name.lower() in register_text for name in names):
            roles = {role.lower() for role in person.get("roles", [])}
            if "director" not in roles:
                person.setdefault("roles", []).append("director")


def _add_passport_expiry(extracted: dict, documents: dict[str, str]) -> None:
    """Read the passport pages directly, so an expiry date does not depend on the model."""
    for filename, text in documents.items():
        if heading_type(text) != "passport":
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


def _add_harvested_aliases(people: list[dict], extracted: dict) -> None:
    for extra in extracted.get("harvested_aliases") or []:
        for person in people:
            if name_score(extra["name"], person["name"]) >= 0.92 or any(name_score(extra["name"], alias) >= 0.92 for alias in person["aliases"]):
                person["aliases"] = sorted(set(person["aliases"]) | set(extra["aliases"]))


def _drop_aliases_that_name_someone_else(people: list[dict]) -> None:
    for person in people:
        others = [other["name"] for other in people if other is not person]
        person["aliases"] = [
            alias for alias in person.get("aliases", [])
            if alias and not any(name_score(alias, other) >= 0.8 for other in others)
        ]


def resolve_people(extracted: dict, documents: dict[str, str]) -> list[dict]:
    """Merge duplicates, then enrich from the documents. Also fills in
    `extracted["identity_documents"]` from passport pages."""
    people = cluster(extracted.get("people") or [])
    _mark_listed_directors(people, documents)
    _add_passport_expiry(extracted, documents)
    _add_harvested_aliases(people, extracted)
    _drop_aliases_that_name_someone_else(people)
    return people


def resolve_links(extracted: dict, people: list[dict], companies: list[dict]) -> list[dict]:
    links = []
    for link in extracted.get("ownership_links") or []:
        owner, owner_kind = canonical(link["owner"], people, companies)
        owned, _owned_kind = canonical(link["owned"], people, companies)
        kind = link.get("owner_kind") or owner_kind
        if any(token in owner.lower() for token in ("limited", "ltd", "llc", "inc")):
            kind = "company"
        links.append({**link, "owner": owner, "owned": owned, "owner_kind": kind})
    return links
