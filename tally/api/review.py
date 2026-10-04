"""The officer's decisions: on the case, on single findings, and re-scoring."""
from fastapi import APIRouter, HTTPException

from tally.api.cases import _with_funds
from tally.api.deps import load_case
from tally.api.schemas import Decision, FindingDecision, MemoDraft, PurposeEdit
from tally.assessment import apply_risk
from tally.assessment.checks.source_of_funds import check_source_of_funds
from tally.assessment.funds import build_funds_profile
from tally.assessment.pack import classify, read_pdf
from tally.store import append_audit, case_dir, save, stamp_now

router = APIRouter(prefix="/api/cases/{case_id}", tags=["review"])


@router.post("/memo")
def save_memo(case_id: str, body: MemoDraft):
    """Keep the officer's memo draft: the recommendation they chose and the text they wrote."""
    if body.recommendation not in {"Conditional Approval", "Approve", "Reject"}:
        raise HTTPException(status_code=400, detail="Recommendation must be Conditional Approval, Approve, or Reject.")
    case = load_case(case_id)
    case["memo_draft"] = {**body.model_dump(), "saved_at": stamp_now()}
    append_audit(case, "memo_draft", f"Officer saved the approval memo draft: {body.recommendation}.")
    return save(case)


@router.post("/decision")
def decide(case_id: str, body: Decision):
    case = load_case(case_id)
    if body.status not in {"approved", "returned", "overridden", "conditional", "rejected"}:
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


@router.post("/business-purpose")
def update_purpose(case_id: str, body: PurposeEdit):
    """Officer edits the declared purpose shown on the source-of-funds screen."""
    case = _with_funds(load_case(case_id))
    business = case.setdefault("business", {})
    business["purpose"] = body.business_activity.strip()
    business["expected_activity"] = body.expected_transactions.strip()
    business["target_markets"] = body.target_markets.strip()
    business["expected_annual_volume"] = body.expected_annual_volume.strip()
    business["introducer"] = body.introducer.strip()
    others = [item for item in case.get("findings") or [] if item.get("module") != "source_of_funds"]
    fresh = check_source_of_funds(business)
    case["findings"] = others + fresh
    documents = {}
    for path in sorted(case_dir(case_id).glob("*.pdf")):
        documents[path.name] = read_pdf(path)
    if documents:
        case["funds"] = build_funds_profile(
            documents,
            business,
            case.get("entity") or {},
            classify(documents),
            case["findings"],
            case.get("companies") or [],
        )
    purpose = case.setdefault("funds", {}).setdefault("purpose", {})
    purpose.update({
        "business_activity": business["purpose"],
        "expected_transactions": business["expected_activity"],
        "target_markets": business["target_markets"],
        "expected_annual_volume": business["expected_annual_volume"],
        "introducer": business["introducer"],
    })
    case["funds"]["consistent"] = not fresh
    apply_risk(case)
    append_audit(case, "purpose_edit", "Officer updated the declared business purpose.")
    return save(case)


@router.post("/rescore")
def rescore(case_id: str):
    case = load_case(case_id)
    apply_risk(case)
    append_audit(case, "rescore", f"Risk recalculated from the current rules: {case['risk']['rating']} ({case['risk']['score']} points).")
    return save(case)
