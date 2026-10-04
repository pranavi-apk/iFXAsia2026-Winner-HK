"""Sanctions & PEP screening API.

Returns structured screening results for all individuals and entities in a
case, including match confidence, matched list records, and status labels
(Potential Match / PEP Identified / Clear) drawn from the assessment data.
Also exposes a POST endpoint for single-name live look-ups.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tally.api.deps import load_case
from tally.assessment.checks.screening import screen_parties
from tally.assessment.people import forms as person_forms
from tally.config import rules, screening_lists
from tally.sanctions_data import screen_public

router = APIRouter(prefix="/api/cases/{case_id}/sanctions", tags=["sanctions"])

_STATUS_ORDER = {"potential_match": 0, "pep": 1, "clear": 2}


def _status_label(rec: dict) -> str:
    """Derive a display status from a screening record."""
    if rec.get("sanctions"):
        return "potential_match"
    if rec.get("pep"):
        return "pep"
    return "clear"


def _matched_records(rec: dict, party: dict) -> list[dict]:
    """Build the matched-records list shown in the right panel."""
    records = []

    # Sanctions hit
    if rec.get("sanctions"):
        hit = rec["sanctions"]
        score_pct = round(hit["score"] * 100)
        records.append({
            "list": "Sanctions List (Global)",
            "score": score_pct,
            "match": score_pct >= 80,
            "candidate": hit.get("candidate", ""),
            "source": hit["entry"].get("source", ""),
            "program": hit["entry"].get("program", ""),
            "snippet": None,
        })

    # PEP hit
    if rec.get("pep"):
        hit = rec["pep"]
        score_pct = round(hit["score"] * 100)
        entry = hit["entry"]
        records.append({
            "list": "PEP List",
            "score": score_pct,
            "match": score_pct >= 80,
            "candidate": hit.get("candidate", ""),
            "source": entry.get("source", ""),
            "program": entry.get("program", entry.get("position", "")),
            "snippet": entry.get("description", None),
            "position": entry.get("position", ""),
            "organisation": entry.get("organisation", ""),
            "pep_type": entry.get("type", ""),
        })

    # Adverse media placeholder
    records.append({
        "list": "Adverse Media (News)",
        "score": 0,
        "match": False,
        "candidate": "",
        "source": "No licensed adverse-media source connected",
        "snippet": None,
    })

    return records


def _build_party_result(rec: dict, party: dict) -> dict:
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
        "matched_records": _matched_records(rec, party),
    }


@router.get("")
def get_screening(case_id: str):
    """Return full screening results for a case."""
    case = load_case(case_id)
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

    results = []
    for rec in screened:
        party = party_map.get(rec["name"], {"name": rec["name"], "kind": "person"})
        results.append(_build_party_result(rec, party))

    # Sort: potential_match first, then pep, then clear
    results.sort(key=lambda r: _STATUS_ORDER.get(r["status"], 99))

    counts = {
        "total": len(results),
        "potential_match": sum(1 for r in results if r["status"] == "potential_match"),
        "pep": sum(1 for r in results if r["status"] == "pep"),
        "clear": sum(1 for r in results if r["status"] == "clear"),
    }

    return {"counts": counts, "results": results}


class LiveLookupRequest(BaseModel):
    name: str


@router.post("/lookup")
def live_lookup(case_id: str, body: LiveLookupRequest):
    """Live single-name look-up against public UN list."""
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    hit = screen_public([name])
    return {
        "query": name,
        "hit": hit,
        "status": "match" if hit else "clear",
    }
