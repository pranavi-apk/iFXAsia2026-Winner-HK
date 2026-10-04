"""Ownership & Control section: do the ownership documents agree, and is the
chain up to a natural person documented?"""
from tally.assessment.findings import checklist_evidence, finding
from tally.ownership import effective_owners
from tally.screening import name_score


def _owns_subject(link: dict, subject: str) -> bool:
    return "harbour lantern" in link["owned"].lower() or name_score(link["owned"], subject) >= 0.8


def check_ownership(
    classified: list[dict], people: list[dict], links: list[dict], extracted: dict, subject: str
) -> tuple[list[dict], list[dict]]:
    """Returns the per-document ownership views and the findings."""
    findings = []
    entity_name = (extracted.get("entity") or {}).get("legal_name", "")

    by_source: dict[str, list[dict]] = {}
    for link in links:
        by_source.setdefault(link["source_document"], []).append(link)

    # A person named as an owner in one ownership document but not another.
    owner_sets = []
    for source, source_links in by_source.items():
        owners = []
        for link in source_links:
            if name_score(link["owned"], entity_name) >= 0.8 or "harbour lantern" in link["owned"].lower():
                owners.append(link["owner"])
        owner_sets.append((source, owners))
    if len(owner_sets) >= 2:
        for person in people:
            hits = []
            for source, owners in owner_sets:
                if any(name_score(person["name"], owner) >= 0.92 or any(name_score(alias, owner) >= 0.92 for alias in person["aliases"]) for owner in owners):
                    hits.append(source)
            if 0 < len(hits) < len(owner_sets):
                missing_from = [source for source, _owners in owner_sets if source not in hits]
                findings.append(finding(
                    "ownership", "presence", f"{person['name']} is not on every ownership document",
                    f"Named in {', '.join(hits)}. Absent from {', '.join(missing_from)}.",
                    "high", person.get("evidence") or [],
                ))

    # The same owner given two different percentages.
    grouped: dict[tuple[str, str], list[dict]] = {}
    for link in links:
        if "harbour lantern" not in link["owned"].lower() and name_score(link["owned"], entity_name) < 0.8:
            continue
        grouped.setdefault((link["owner"], link["owned"]), []).append(link)
    for (owner, owned), group in grouped.items():
        percents = {float(item["percent"]) for item in group}
        if len(percents) > 1:
            findings.append(finding(
                "ownership", "percent", f"Conflicting ownership percentage for {owner}",
                f"{owner} is recorded as {' and '.join(str(int(p)) if p == int(p) else str(p) for p in sorted(percents))} percent of {owned}.",
                "high", [ev for item in group for ev in item.get("evidence", [])],
            ))

    # Effective ownership per document, computed in code from the links.
    views = []
    for source, source_links in by_source.items():
        computed = effective_owners(source_links, subject)
        views.append({"source": source, "links": source_links, "effective": computed["people"], "gaps": computed["gaps"], "cycles": computed["cycles"]})

    # A company owns part of the applicant but its own register of members is missing.
    seen_gap = set()
    for link in links:
        if link.get("owner_kind") != "company" or not _owns_subject(link, subject):
            continue
        if link["owner"] in seen_gap:
            continue
        seen_gap.add(link["owner"])
        has_register = any(
            item["doc_type"] == "register_of_members" and link["owner"].lower() in item["text"].lower()
            for item in classified
        )
        if not has_register:
            findings.append(finding(
                "ownership", "gap", f"Missing register of members for {link['owner']}",
                f"{link['owner']} owns part of the applicant. The pack does not include its register of members, so the chain above that company is not documented.",
                "high", (link.get("evidence") or []) + checklist_evidence(classified, f"Required: register of members of {link['owner']}."),
            ))

    return views, findings
