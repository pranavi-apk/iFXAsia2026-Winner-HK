"""Approval Memo section: the officer's draft memo and the customer request."""
import json

from tally.llm import chat, parse_json


def _draft(case_name: str, findings: list[dict], rating: str, outstanding: list[str]) -> dict:
    payload = {
        "case": case_name,
        "suggested_rating": rating,
        "findings": [{"title": item["title"], "detail": item["detail"]} for item in findings],
        "outstanding": outstanding,
    }
    raw = chat([
        {"role": "system", "content": (
            "Draft two short texts for a compliance officer. Use only the JSON facts. "
            "Do not invent documents, percentages, or screening hits. "
            "Return JSON: {\"memo\": \"\", \"customer_request\": \"\"}. "
            "The memo states the suggested rating and that the officer decides. "
            "The customer request lists only the outstanding items."
        )},
        {"role": "user", "content": json.dumps(payload)},
    ], max_tokens=1200)
    try:
        return parse_json(raw)
    except json.JSONDecodeError:
        return {}


def _fallback_memo(subject: str, rating: str, findings: list[dict]) -> str:
    lines = [f"Suggested rating for {subject}: {rating}. The officer decides.", ""]
    for item in findings:
        lines.append(f"- {item['title']}. {item['detail']}")
    return "\n".join(lines)


def _fallback_request(subject: str, outstanding: list[str]) -> str:
    lines = [f"Please send the following for {subject}:", ""]
    if not outstanding:
        lines.append("No document is outstanding from the automated checklist.")
    for item in outstanding:
        lines.append(f"- {item}")
    return "\n".join(lines)


def draft_memo(subject: str, findings: list[dict], rating: str, outstanding: list[str]) -> tuple[str, str]:
    """Returns (memo, customer_request). Falls back to plain text if the model fails."""
    try:
        drafts = _draft(subject, findings, rating, outstanding)
    except Exception:
        drafts = {}
    memo = drafts.get("memo") or _fallback_memo(subject, rating, findings)
    request = drafts.get("customer_request") or _fallback_request(subject, outstanding)
    return memo, request
