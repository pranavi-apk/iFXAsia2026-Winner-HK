"""Re-screening an open case."""
from fastapi import APIRouter

from tally.api.deps import load_case
from tally.assessment import apply_risk
from tally.assessment.monitoring import rescreen
from tally.store import append_audit, save

router = APIRouter(prefix="/api/cases/{case_id}", tags=["monitoring"])


@router.post("/monitor")
def monitor(case_id: str):
    case = load_case(case_id)
    checked, added = rescreen(case)
    apply_risk(case)
    append_audit(case, "monitoring", f"Re-screened {checked} names. New public-list hits: {added}.")
    return save(case)
