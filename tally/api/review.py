"""The officer's decisions: on the case, on single findings, and re-scoring."""
from fastapi import APIRouter, HTTPException

from tally.api.deps import load_case
from tally.api.schemas import Decision, FindingDecision
from tally.assessment import apply_risk
from tally.store import append_audit, save

router = APIRouter(prefix="/api/cases/{case_id}", tags=["review"])


@router.post("/decision")
def decide(case_id: str, body: Decision):
    case = load_case(case_id)
    if body.status not in {"approved", "returned", "overridden"}:
        raise HTTPException(status_code=400, detail="Status must be approved, returned, or overridden.")
    case["decision"] = body.model_dump()
    append_audit(case, "case_decision", f"Officer set status to {body.status}, rating {body.rating or 'unchanged'}. {body.note}".strip())
    return save(case)


@router.post("/findings/{finding_id}")
def decide_finding(case_id: str, finding_id: str, body: FindingDecision):
    case = load_case(case_id)
    if body.disposition not in {"accepted", "overridden"}:
        raise HTTPException(status_code=400, detail="Disposition must be accepted or overridden.")
    target = next((item for item in case.get("findings") or [] if item["id"] == finding_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    target["officer"] = body.model_dump()
    apply_risk(case)
    append_audit(case, "finding_decision", f"{body.disposition}: {target['title']}. {body.note}".strip())
    return save(case)


@router.post("/rescore")
def rescore(case_id: str):
    case = load_case(case_id)
    apply_risk(case)
    append_audit(case, "rescore", f"Risk recalculated from the current rules: {case['risk']['rating']} ({case['risk']['score']} points).")
    return save(case)
