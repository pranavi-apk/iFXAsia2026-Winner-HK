import json
import uuid
from datetime import datetime, timezone

from tally.config import CASES, UPLOADS


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
    return case


def load(case_id: str) -> dict:
    path = CASES / f"{case_id}.json"
    if not path.exists():
        raise FileNotFoundError(case_id)
    return json.loads(path.read_text())


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
