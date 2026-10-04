"""Ongoing monitoring: when the case is next reviewed, and re-screening an
open case against the public sanctions list."""
from datetime import datetime, timezone

from tally.assessment.findings import finding, public_list_evidence
from tally.sanctions_data import sanctions_summary, screen_public


def initial_monitoring(findings: list[dict], policy: dict, summary: str) -> dict:
    months = int(policy.get("review_months") or 12)
    opened = datetime.now(timezone.utc)
    month_index = opened.month - 1 + months
    year = opened.year + month_index // 12
    month = month_index % 12 + 1
    next_review = opened.replace(year=year, month=month, day=min(opened.day, 28))
    triggers = [
        {"kind": "document_expiry", "due": True, "detail": item["detail"]}
        for item in findings if item["code"] == "expired-id"
    ]
    triggers.append({
        "kind": "periodic_review",
        "due": False,
        "detail": f"Next periodic review {next_review.date().isoformat()} ({months} months from opening).",
    })
    triggers.append({"kind": "sanctions_list", "due": False, "detail": summary})
    return {
        "opened_at": opened.isoformat(),
        "next_review": next_review.date().isoformat(),
        "interval_months": months,
        "triggers": triggers,
    }


def rescreen(case: dict) -> tuple[int, int]:
    """Re-check every person and company against the public list, adding a
    finding for each new hit. Returns (names checked, new hits). The caller
    re-scores and saves."""
    titles = {item["title"] for item in case.get("findings") or []}
    added = 0
    parties = [*(case.get("people") or []), *(case.get("companies") or [])]
    for party in parties:
        forms = [party.get("name") or "", *(party.get("aliases") or [])]
        hit = screen_public([form for form in forms if form])
        title = f"Possible sanctions match: {party.get('name')}"
        if not hit or title in titles:
            continue
        program = hit["entry"].get("program") or hit["entry"].get("source")
        new = finding(
            "screening", "sanctions", title,
            f"'{hit['query']}' scored {hit['score']:.2f} against '{hit['candidate']}' on {hit['entry'].get('source')} ({program}) during monitoring.",
            "high",
            [public_list_evidence(hit["entry"], hit["candidate"], program, "Public consolidated list, re-checked after the case was opened.")],
        )
        # Monitoring hits keep their own id scheme so they never collide with the original findings.
        new["id"] = f"screening-sanctions-monitor-{added}"
        case["findings"].append(new)
        titles.add(title)
        added += 1

    summary = sanctions_summary()
    monitoring = case.setdefault("monitoring", {"triggers": []})
    replaced = False
    for trigger in monitoring.get("triggers") or []:
        if trigger.get("kind") == "sanctions_list":
            trigger["detail"] = summary
            trigger["due"] = added > 0
            replaced = True
    if not replaced:
        monitoring.setdefault("triggers", []).append({"kind": "sanctions_list", "due": added > 0, "detail": summary})
    return len(parties), added
