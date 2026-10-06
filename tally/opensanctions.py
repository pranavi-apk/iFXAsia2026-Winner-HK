"""OpenSanctions sanctions collection, used as an extra aggregate.

The bulk file is free for non-commercial use under Creative Commons BY-NC 4.0.
A business screening customers with it needs a data license. The hosted API
needs a key, so this demo reads the published CSV instead. It does not replace
the Hong Kong UN list.
"""
import csv
import json
from datetime import datetime, timezone

import httpx

from tally.config import runtime_dir
from tally.screening import _tokens, list_score, name_forms

CACHE = runtime_dir("sanctions_cache")
CSV_NAME = "opensanctions_sanctions.csv"
URL = "https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv"
SOURCE = "OpenSanctions sanctions collection"
LICENSE = (
    "Creative Commons BY-NC 4.0. Free for this non-commercial demo. "
    "A business needs a data license. Not the Hong Kong legal list."
)
STOP = {
    "limited", "company", "holdings", "trading", "ltd", "inc", "llc", "corp",
    "the", "and", "international", "group", "sa", "co",
}
_INDEX = None


def _ensure_file() -> dict:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / CSV_NAME
    meta_path = CACHE / "opensanctions_sanctions.meta.json"
    if path.exists() and path.stat().st_size > 1_000_000:
        if meta_path.exists():
            return json.loads(meta_path.read_text())
        meta = {
            "retrieved_at": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).date().isoformat(),
            "url": URL,
            "license": "CC BY-NC 4.0",
        }
        meta_path.write_text(json.dumps(meta))
        return meta
    try:
        response = httpx.get(URL, timeout=120, follow_redirects=True)
        response.raise_for_status()
        path.write_bytes(response.content)
    except Exception as exc:
        return {"retrieved_at": "", "url": URL, "error": type(exc).__name__}
    meta = {
        "retrieved_at": datetime.now(timezone.utc).date().isoformat(),
        "url": URL,
        "license": "CC BY-NC 4.0",
    }
    meta_path.write_text(json.dumps(meta))
    return meta


def _aliases(value: str) -> list[str]:
    parts = []
    for chunk in (value or "").split(";"):
        name = " ".join(chunk.split())
        if name and name not in parts:
            parts.append(name)
        if len(parts) == 4:
            break
    return parts


def load_index() -> dict:
    global _INDEX
    if _INDEX is not None:
        return _INDEX
    meta = _ensure_file()
    path = CACHE / CSV_NAME
    entries = []
    if path.exists() and path.stat().st_size > 1_000_000 and not meta.get("error"):
        with path.open(newline="", encoding="utf-8", errors="replace") as handle:
            for row in csv.DictReader(handle):
                name = " ".join((row.get("name") or "").split())
                if len(name) < 2:
                    continue
                dataset = " ".join((row.get("dataset") or "").split())
                program = (row.get("program_ids") or dataset or "OpenSanctions").split(";")[0].strip()
                entity_id = (row.get("id") or "").strip()
                entries.append({
                    "name": name,
                    "aliases": _aliases(row.get("aliases") or ""),
                    "source": SOURCE,
                    "program": program,
                    "dataset": dataset[:180],
                    "list_url": f"https://www.opensanctions.org/entities/{entity_id}" if entity_id else "https://www.opensanctions.org/datasets/sanctions/",
                })
    token_map: dict[str, list[int]] = {}
    for index, entry in enumerate(entries):
        seen = set()
        for value in [entry["name"], *entry.get("aliases", [])]:
            for form in name_forms(value):
                for token in _tokens(form):
                    if len(token) < 4 or token in STOP or token in seen:
                        continue
                    seen.add(token)
                    bucket = token_map.setdefault(token, [])
                    if len(bucket) < 40:
                        bucket.append(index)
    _INDEX = {
        "entries": entries,
        "token_map": token_map,
        "retrieved_at": meta.get("retrieved_at") or "",
        "summary": (
            f"{SOURCE}: {len(entries)} names"
            + (f", file retrieved {meta.get('retrieved_at')}" if meta.get("retrieved_at") else "")
            + f". {LICENSE}"
            if entries else
            f"{SOURCE} is not loaded ({meta.get('error') or 'file missing'}). {LICENSE}"
        ),
    }
    return _INDEX


def screen_opensanctions(forms: list[str], threshold: float = 0.92) -> dict | None:
    index = load_index()
    if not index["entries"]:
        return None
    expanded: list[str] = []
    for form in forms:
        expanded.extend(name_forms(form))
    candidate_ids: set[int] = set()
    for form in expanded:
        for token in _tokens(form):
            if len(token) < 4 or token in STOP:
                continue
            candidate_ids.update(index["token_map"].get(token, []))
    best = None
    for entry_id in candidate_ids:
        entry = index["entries"][entry_id]
        for query in expanded:
            for candidate in [entry.get("name", ""), *entry.get("aliases", [])]:
                score = list_score(query, candidate)
                if score < threshold:
                    continue
                if best is None or score > best["score"]:
                    best = {"score": score, "query": query, "candidate": candidate, "entry": entry}
    return best


def opensanctions_summary() -> str:
    return load_index()["summary"]
