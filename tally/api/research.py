"""Adverse-media search, source-of-funds background search, and lead decisions.

Only the party's name is sent to the search service.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tally.api.deps import load_case
from tally.assessment.memo import draft_memo
from tally.research import research_name
from tally.store import append_audit, save

router = APIRouter(prefix="/api/cases/{case_id}", tags=["research"])


class LeadDecision(BaseModel):
    disposition: str
    note: str = ""


def _hints(party: dict) -> dict:
    roles = party.get("roles") or []
    return {
        "nationality": party.get("nationality") or party.get("jurisdiction") or "",
        "role": roles[0] if roles else party.get("kind") or "",
        "kind": party.get("kind") or "",
    }


def _parties(case: dict) -> list[dict]:
    people = [{**person, "kind": "person"} for person in case.get("people") or []]
    companies = [{**company, "kind": "company"} for company in case.get("companies") or []]
    named = [party for party in [*people, *companies] if party.get("name")]
    return named[:8]


def attach_adverse_media(case: dict) -> dict:
    """Search public mentions for the names already on the case. Only those names are sent."""
    parties = _parties(case)
    leads = []
    for party in parties:
        leads.extend(research_name(party["name"], _hints(party)))
    same = sum(1 for item in leads if item.get("same_person"))
    case["adverse_media"] = {
        "label": "Web search leads. Not a licensed adverse-media feed. The officer confirms or dismisses each one.",
        "searched_at": leads[0]["retrieved_at"] if leads else "",
        "names": [party["name"] for party in parties],
        "leads": leads,
    }
    append_audit(case, "adverse_media", f"Searched {len(parties)} names. {len(leads)} public mentions, {same} classified as the same party.")
    return save(case)


def ensure_adverse_media(case: dict) -> dict:
    """Run the search once, as soon as the case has names, and keep an officer's earlier decisions."""
    if case.get("adverse_media") or not _parties(case):
        return case
    return attach_adverse_media(case)


@router.post("/adverse-media")
def adverse_media(case_id: str):
    return attach_adverse_media(load_case(case_id))


@router.post("/background")
def background(case_id: str):
    """Public mentions of the applicant name, for the source-of-funds screen."""
    case = load_case(case_id)
    name = (case.get("entity") or {}).get("legal_name") or case.get("title") or ""
    if not name:
        raise HTTPException(status_code=400, detail="This case has no legal name to search.")
    purpose = (case.get("business") or {}).get("purpose") or ""
    leads = research_name(name, {"kind": "company", "role": purpose[:180]})
    case["background"] = {
        "label": "Public web mentions of the company name only. Compared with the declared purpose by the model. The officer decides.",
        "name": name,
        "declared_purpose": purpose,
        "leads": leads,
    }
    append_audit(case, "background", f"Searched public mentions of {name}. {len(leads)} results.")
    return save(case)


@router.post("/leads/{lead_id}")
def decide_lead(case_id: str, lead_id: str, body: LeadDecision):
    if body.disposition not in {"confirmed", "dismissed"}:
        raise HTTPException(status_code=400, detail="Disposition must be confirmed or dismissed.")
    case = load_case(case_id)
    found = None
    for bucket in ("adverse_media", "background"):
        block = case.get(bucket) or {}
        for lead in block.get("leads") or []:
            if lead.get("id") == lead_id:
                lead["officer"] = body.model_dump()
                found = lead
    if found is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    append_audit(case, "lead_decision", f"{body.disposition}: {found.get('title') or found.get('name')}. {body.note}".strip())
    return save(case)


@router.post("/memo/redraft")
def redraft_memo(case_id: str):
    case = load_case(case_id)
    subject = (case.get("entity") or {}).get("legal_name") or case.get("title") or "This applicant"
    findings = case.get("findings") or []
    outstanding = [item["title"] for item in findings if "Missing" in item["title"] or item.get("code") in {"gap", "expired-id", "missing-id"}]
    memo, request = draft_memo(subject, findings, (case.get("risk") or {}).get("rating") or "", outstanding)
    case["memo"] = memo
    case["customer_request"] = request
    append_audit(case, "memo", "Redrafted the approval memo and the customer request from the current findings.")
    return save(case)
