"""The risk policy: points, bands, thresholds and the document checklist."""
import json

from fastapi import APIRouter, HTTPException

from tally.config import DATA
from tally.config import rules as load_rules

router = APIRouter(prefix="/api/policy", tags=["policy"])

REQUIRED_FIELDS = {"label", "points", "bands", "match_threshold", "high_risk_jurisdictions", "required_documents", "review_months"}


@router.get("")
def get_policy():
    return load_rules()


@router.put("")
def put_policy(body: dict):
    if not REQUIRED_FIELDS <= set(body):
        raise HTTPException(status_code=400, detail="Policy is missing fields.")
    path = DATA / "rules.json"
    path.write_text(json.dumps(body, indent=2))
    return body
