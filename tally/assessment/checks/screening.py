"""Sanctions & PEP section: names against the prototype lists and the public
UN list, plus nationality against the high-risk country list."""
from tally.assessment.findings import finding, public_list_evidence
from tally.assessment.people import forms
from tally.fatf import match_jurisdiction
from tally.opensanctions import screen_opensanctions
from tally.sanctions_data import screen_public
from tally.screening import best_match


def _best(query_forms: list[str], entries: list[dict], threshold: float) -> dict | None:
    hit = None
    for entry in entries:
        match = best_match(query_forms, entry, threshold)
        if match and (hit is None or match["score"] > hit["score"]):
            hit = match
    return hit


def screen_parties(people: list[dict], companies: list[dict], policy: dict, lists: dict) -> tuple[list[dict], list[dict]]:
    """Returns one screening record per person and company, and the findings."""
    screened = []
    findings = []
    parties = [*people, *[{**company, "kind": "company", "roles": company.get("roles", [])} for company in companies]]
    threshold = policy["match_threshold"]
    for party in parties:
        party_forms = [form for form in forms(party) if form]
        sanctions_hit = _best(party_forms, lists["sanctions"]["entries"], threshold)
        pep_hit = None
        if party.get("kind") != "company":
            pep_hit = _best(party_forms, lists["pep"]["entries"], threshold)
        screened.append({
            "name": party["name"],
            "aliases": party.get("aliases") or [],
            "sanctions": sanctions_hit,
            "pep": pep_hit,
        })
        public_hit = screen_public(party_forms)
        aggregated = screen_opensanctions(party_forms)
        if public_hit:
            program = public_hit["entry"].get("program") or public_hit["entry"].get("source")
            also = ""
            if aggregated:
                also = (
                    f" OpenSanctions also lists '{aggregated['candidate']}'"
                    f" ({aggregated['entry'].get('dataset') or aggregated['entry'].get('program')})."
                    " That file is CC BY-NC 4.0 for this demo, not a production license."
                )
            findings.append(finding(
                "screening", "sanctions", f"Possible sanctions match: {party['name']}",
                (
                    f"'{public_hit['query']}' scored {public_hit['score']:.2f} against "
                    f"'{public_hit['candidate']}' on {public_hit['entry'].get('source')} ({program})."
                    + also
                ),
                "high", (party.get("evidence") or []) + [public_list_evidence(
                    public_hit["entry"], public_hit["candidate"], program,
                    "Public consolidated list. This is a possible match for the officer to confirm.",
                )],
            ))
        elif aggregated:
            program = aggregated["entry"].get("dataset") or aggregated["entry"].get("program")
            findings.append(finding(
                "screening", "sanctions", f"Possible sanctions match: {party['name']}",
                (
                    f"'{aggregated['query']}' scored {aggregated['score']:.2f} against "
                    f"'{aggregated['candidate']}' on OpenSanctions ({program}). "
                    "This is the aggregated sanctions file, not the Hong Kong legal list. "
                    "CC BY-NC 4.0, for this non-commercial demo. A business needs a data license."
                ),
                "high", (party.get("evidence") or []) + [public_list_evidence(
                    aggregated["entry"], aggregated["candidate"], program,
                    "OpenSanctions sanctions collection. Not the Hong Kong UN list.",
                )],
            ))
        elif sanctions_hit:
            findings.append(finding(
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
            findings.append(finding(
                "screening", "pep", f"Possible PEP match: {party['name']}",
                f"'{pep_hit['query']}' scored {pep_hit['score']:.2f} against '{pep_hit['candidate']}' on the {lists['pep']['label']}",
                "medium", party.get("evidence") or [],
            ))
    return screened, findings


def check_jurisdiction(people: list[dict], policy: dict, entity: dict | None = None) -> list[dict]:
    """FATF call-for-action and increased-monitoring, not the old sample country list."""
    del policy
    findings = []
    seen = set()
    subjects = [(person.get("name") or "A person", person.get("nationality") or "", person.get("evidence") or []) for person in people]
    if entity:
        subjects.append((
            entity.get("legal_name") or "The applicant",
            entity.get("jurisdiction") or "",
            entity.get("evidence") or [],
        ))
    for label, place, evidence in subjects:
        hit = match_jurisdiction(place)
        if not hit or (label, hit["matched"]) in seen:
            continue
        seen.add((label, hit["matched"]))
        if hit["tier"] == "blacklist":
            findings.append(finding(
                "screening", "jurisdiction", f"FATF call for action: {label}",
                f"{place} is on the FATF high-risk list (call for action) as of {hit['as_of']}. {hit['source']}",
                "high", evidence,
            ))
        else:
            findings.append(finding(
                "screening", "fatf-monitoring", f"FATF increased monitoring: {label}",
                f"{place} is on the FATF increased-monitoring list as of {hit['as_of']}. {hit['source']}",
                "medium", evidence,
            ))
    return findings


def check_introducer(business: dict, policy: dict, lists: dict) -> list[dict]:
    introducer = business.get("introducer") or ""
    if not introducer:
        return []
    findings = []
    for entry in lists["pep"]["entries"]:
        match = best_match([introducer], entry, policy["match_threshold"])
        if match:
            findings.append(finding(
                "screening", "pep-introducer", f"Introducer matches the sample PEP list: {introducer}",
                f"'{match['query']}' scored {match['score']:.2f} against '{match['candidate']}'. {lists['pep']['label']}",
                "medium", business.get("evidence") or [],
            ))
    return findings
