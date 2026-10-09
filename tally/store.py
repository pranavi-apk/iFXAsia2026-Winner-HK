import json
import uuid
from datetime import datetime, timezone

from tally.config import CASES, UPLOADS

_MEMORY: dict[str, dict] = {}


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def case_dir(case_id: str):
    folder = UPLOADS / case_id
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def save(case: dict) -> dict:
    CASES.mkdir(parents=True, exist_ok=True)
    path = CASES / f"{case['id']}.json"
    path.write_text(json.dumps(case, indent=2))
    _MEMORY[case["id"]] = case
    return case


def stamp_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load(case_id: str) -> dict:
    if case_id in _MEMORY:
        return _MEMORY[case_id]
    path = CASES / f"{case_id}.json"
    if not path.exists():
        raise FileNotFoundError(case_id)
    case = json.loads(path.read_text())
    _MEMORY[case_id] = case
    return case


def stamp_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_audit(case: dict, action: str, detail: str) -> None:
    case.setdefault("audit", []).append({
        "at": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "detail": detail,
    })


def stamp(case_id: str, title: str, assessment: dict) -> dict:
    case = {
        "id": case_id,
        "title": title,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "decision": None,
        "audit": [],
        **assessment,
    }
    append_audit(case, "opened", f"Case opened for {title}.")
    return save(case)


def list_all() -> list[dict]:
    CASES.mkdir(parents=True, exist_ok=True)
    results = []
    for path in sorted(CASES.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            case = json.loads(path.read_text())
            results.append({
                "id": case.get("id"),
                "title": case.get("title") or (case.get("entity") or {}).get("legal_name") or "KYC Case",
                "created_at": case.get("created_at"),
                "decision": case.get("decision"),
            })
        except Exception:
            continue
    return results

