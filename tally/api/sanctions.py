"""Sanctions & PEP screening API.

Returns structured screening results for all individuals and entities in a
case, including match confidence, matched list records, and status labels
(Potential Match / PEP Identified / Clear) drawn from the assessment data.
Also exposes a POST endpoint for single-name live look-ups.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tally.api.deps import load_case
from tally.api.research import ensure_adverse_media
from tally.assessment.checks.screening import screen_parties
from tally.assessment.people import forms as person_forms
from tally.config import rules, screening_lists
from tally.opensanctions import screen_opensanctions
from tally.sanctions_data import sanctions_summary, screen_public
from tally.screening import best_match

router = APIRouter(prefix="/api/cases/{case_id}/sanctions", tags=["sanctions"])

_STATUS_ORDER = {"potential_match": 0, "pep": 1, "clear": 2}


def _status_label(rec: dict) -> str:
    """Derive a display status from a screening record."""
    if rec.get("sanctions"):
        return "potential_match"
    if rec.get("pep"):
        return "pep"
    return "clear"


def _adverse_note(name: str, media: dict) -> str:
    names = media.get("names")
    if not media:
        return "Adverse media search has not run."
    if names is None or name in names:
        return "Searched when the names were added. No public mention of this name."
    return "This name was not in the names sent to search."


def _matched_records(rec: dict, party: dict, leads: list[dict], media: dict) -> list[dict]:
    """Build the matched-records list shown in the right panel."""
    records = []

    if rec.get("sanctions"):
        hit = rec["sanctions"]
        score_pct = round(hit["score"] * 100)
        entry = hit["entry"]
        records.append({
            "list": entry.get("source") or "Sanctions list",
            "score": score_pct,
            "match": score_pct >= 80,
            "candidate": hit.get("candidate", ""),
            "source": entry.get("source", ""),
            "program": entry.get("program", ""),
            "url": entry.get("list_url") or "",
            "snippet": f"Listed name: {hit.get('candidate', '')}. Program: {entry.get('program', '')}.",
        })

    if rec.get("pep"):
        hit = rec["pep"]
        score_pct = round(hit["score"] * 100)
        entry = hit["entry"]
        records.append({
            "list": "Sample PEP list",
            "score": score_pct,
            "match": score_pct >= 80,
            "candidate": hit.get("candidate", ""),
            "source": entry.get("role") or "Illustrative sample. Not a licensed PEP database.",
            "program": entry.get("role", ""),
            "url": "",
            "snippet": entry.get("role") or "Sample PEP entry.",
        })

    own_leads = [item for item in leads if item.get("name") == rec.get("name")]
    if not own_leads:
        note = _adverse_note(rec.get("name") or "", media)
        records.append({
            "list": "Adverse media",
            "score": 0,
            "match": False,
            "candidate": "",
            "source": note,
            "url": "",
            "snippet": note,
        })
    for lead in own_leads:
        dismissed = (lead.get("officer") or {}).get("disposition") == "dismissed"
        records.append({
            "list": "Adverse media lead",
            "score": 70 if lead.get("same_person") and not dismissed else 0,
            "match": bool(lead.get("same_person")) and not dismissed,
            "candidate": lead.get("title") or "",
            "source": lead.get("source") or "",
            "program": (lead.get("officer") or {}).get("disposition") or lead.get("label") or "",
            "url": lead.get("url") or "",
            "snippet": lead.get("supporting_sentence") or lead.get("allegation") or lead.get("snippet") or "",
            "lead_id": lead.get("id"),
        })
    return records


def _build_party_result(rec: dict, party: dict, leads: list[dict], media: dict) -> dict:
    """Assemble the full result object for one party."""
    status = _status_label(rec)
    kind = party.get("kind", "person")
    nationality = party.get("nationality") or party.get("jurisdiction") or ""
    roles = party.get("roles") or []
    role_label = roles[0] if roles else ("Entity" if kind == "company" else "Individual")

    # Primary hit details (for right-panel overview)
    primary_hit = rec.get("pep") or rec.get("sanctions")
    hit_entry = (primary_hit or {}).get("entry", {}) if primary_hit else {}
    confidence = round((primary_hit or {}).get("score", 0) * 100) if primary_hit else 0
    also_known_as = ", ".join(rec.get("aliases") or [])

    return {
        "name": rec["name"],
        "kind": kind,
        "role": role_label,
        "nationality": nationality,
        "status": status,
        "aliases": rec.get("aliases") or [],
        "also_known_as": also_known_as,
        "date_of_birth": party.get("date_of_birth", ""),
        "confidence": confidence,
        "position": hit_entry.get("position", ""),
        "organisation": hit_entry.get("organisation", ""),
        "pep_type": hit_entry.get("type", ""),
        "matched_records": _matched_records(rec, party, leads, media),
    }


@router.get("")
def get_screening(case_id: str):
    """Return full screening results for a case."""
    case = ensure_adverse_media(load_case(case_id))
    people = case.get("people") or []
    companies = case.get("companies") or []

    # Re-run screening so we always have live data
    policy = rules()
    lists = screening_lists()
    screened, _ = screen_parties(people, companies, policy, lists)

    # Build a lookup of party details by name for enrichment
    party_map: dict[str, dict] = {}
    for p in people:
        party_map[p["name"]] = {**p, "kind": "person"}
    for c in companies:
        party_map[c["name"]] = {**c, "kind": "company"}

    media = case.get("adverse_media") or {}
    leads = media.get("leads") or []
    results = []
    for rec in screened:
        party = party_map.get(rec["name"], {"name": rec["name"], "kind": "person"})
        results.append(_build_party_result(rec, party, leads, media))

    # Sort: potential_match first, then pep, then clear
    results.sort(key=lambda r: _STATUS_ORDER.get(r["status"], 99))

    counts = {
        "total": len(results),
        "potential_match": sum(1 for r in results if r["status"] == "potential_match"),
        "pep": sum(1 for r in results if r["status"] == "pep"),
        "clear": sum(1 for r in results if r["status"] == "clear"),
    }

    return {
        "counts": counts,
        "results": results,
        "sources": sanctions_summary(),
        "pep_label": lists["pep"]["label"],
        "adverse_media": media.get("label") or "No names on this case to search.",
    }


class LiveLookupRequest(BaseModel):
    name: str


@router.post("/lookup")
def live_lookup(case_id: str, body: LiveLookupRequest):
    """Live single-name look-up against public UN list."""
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    hit = screen_public([name])
    aggregated = screen_opensanctions([name])
    sample = None
    for entry in screening_lists()["sanctions"]["entries"] + screening_lists()["pep"]["entries"]:
        match = best_match([name], entry, rules()["match_threshold"])
        if match and (sample is None or match["score"] > sample["score"]):
            sample = match
    return {
        "query": name,
        "hit": hit,
        "opensanctions": aggregated,
        "sample": sample,
        "status": "match" if hit or aggregated or sample else "clear",
        "note": sanctions_summary(),
    }
