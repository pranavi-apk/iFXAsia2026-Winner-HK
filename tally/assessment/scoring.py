"""Risk Rating section: findings to points, points to a rating band."""
from tally.config import rules

# Finding code -> the key in the policy's "points" table.
POINTS_KEY = {
    "expired-id": "expired_document",
    "address": "address_mismatch",
    "presence": "ownership_presence_conflict",
    "percent": "ownership_percent_conflict",
    "gap": "corporate_owner_without_register",
    "sanctions": "sanctions_possible_match",
    "pep": "pep_sample_match",
    "pep-introducer": "pep_sample_match",
    "jurisdiction": "high_risk_jurisdiction",
    "mismatch": "source_of_funds_inconsistency",
    "registry": "registry_no_match",
}


def points_for(item: dict, policy: dict) -> int:
    if (item.get("officer") or {}).get("disposition") == "overridden":
        return 0
    weights = policy["points"]
    required = {doc["type"] for doc in policy.get("required_documents", [])}
    if item["code"].startswith("missing") or item["code"] in required:
        return weights["missing_document"]
    key = POINTS_KEY.get(item["code"])
    if key:
        return weights.get(key, 0)
    return 0


def band(score: int, policy: dict) -> str:
    for candidate in policy["bands"]:
        if score <= candidate["max"]:
            return candidate["rating"]
    return "High"


def apply_score(findings: list[dict], policy: dict) -> dict:
    factors = []
    score = 0
    for item in findings:
        points = points_for(item, policy)
        item["points"] = points
        if points:
            score += points
            factors.append({"finding": item["title"], "rule": item["code"], "points": points})
    return {"score": score, "rating": band(score, policy), "factors": factors}


def apply_risk(case: dict) -> None:
    """Re-score a stored case against the current policy, in place."""
    scored = apply_score(case.get("findings") or [], rules())
    case.setdefault("risk", {}).update({
        "score": scored["score"],
        "rating": scored["rating"],
        "factors": scored["factors"],
    })
    case.setdefault("modules", {}).setdefault("risk", {})
    case["modules"]["risk"]["rating"] = scored["rating"]
    case["modules"]["risk"]["score"] = scored["score"]
