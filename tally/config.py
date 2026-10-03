import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CASES = DATA / "cases"
UPLOADS = DATA / "uploads"


def load_env() -> None:
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def llm_settings() -> dict:
    load_env()
    endpoint = os.environ.get("ALIBABA_LLM_ENDPOINT", "").strip()
    if endpoint.endswith("/chat/completions"):
        endpoint = endpoint[: -len("/chat/completions")]
    return {
        "api_key": os.environ.get("ALIBABA_LLM_API_KEY", "").strip(),
        "base_url": endpoint.rstrip("/"),
        "model": os.environ.get("ALIBABA_LLM_MODEL", "qwen3.6-plus").strip(),
    }


def rules() -> dict:
    return json.loads((DATA / "rules.json").read_text())


def screening_lists() -> dict:
    return json.loads((DATA / "screening_lists.json").read_text())
