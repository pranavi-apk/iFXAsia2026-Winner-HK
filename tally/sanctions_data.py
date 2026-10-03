"""Hong Kong targeted financial sanctions.

Hong Kong implements UN designations under the United Nations Sanctions
Ordinance (Cap. 537) and UNATMO (Cap. 575). CEDB publishes those lists as
PDFs; the machine-readable source is the UN consolidated XML, which is the
same set of names. OFAC, EU, and UK lists are not used.
"""

import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx

from tally.config import DATA
from tally.screening import _tokens, list_score, name_forms

CACHE = DATA / "sanctions_cache"
UN_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml"
STOP = {
    "limited", "company", "holdings", "trading", "ltd", "inc", "llc", "corp",
    "the", "and", "international", "group", "sa", "co",
}
HK_SOURCE = "Hong Kong TFS (UNSO Cap. 537 / UNATMO Cap. 575)"
_INDEX = None


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _download() -> dict[str, str]:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / "un.xml"
    if path.exists() and path.stat().st_size > 1000:
        return {"un.xml": "cached"}
    try:
        response = httpx.get(UN_URL, timeout=60, follow_redirects=True)
        response.raise_for_status()
        path.write_bytes(response.content)
        return {"un.xml": "downloaded"}
    except Exception as exc:
        return {"un.xml": f"unavailable ({type(exc).__name__})"}


def _parse_un() -> list[dict]:
    path = CACHE / "un.xml"
    if not path.exists() or path.stat().st_size < 1000:
        return []
    entries = []
    parts: list[str] = []
    aliases: list[str] = []
    program = "UN"
    try:
        for _event, elem in ET.iterparse(path, events=("end",)):
            tag = _local(elem.tag)
            text = " ".join((elem.text or "").split())
            if tag == "un_list_type" and text:
                program = text
            elif tag in {"first_name", "second_name", "third_name", "fourth_name"} and text:
                parts.append(text)
            elif tag in {"alias_name", "name_original_script"} and text:
                aliases.append(text)
            elif tag in {"individual", "entity"}:
                full = " ".join(parts).strip()
                if full:
                    entries.append({
                        "name": full,
                        "aliases": aliases[:8],
                        "source": HK_SOURCE,
                        "program": program,
                    })
                parts, aliases, program = [], [], "UN"
                elem.clear()
    except ET.ParseError:
        return entries
    return entries


def load_index(refresh: bool = False) -> dict:
    global _INDEX
    if _INDEX is not None and not refresh:
        return _INDEX
    notes = _download()
    entries = _parse_un()
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
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "files": notes,
        "summary": (
            f"{HK_SOURCE}: {len(entries)} names from the UN consolidated list "
            f"as implemented in Hong Kong. CEDB publishes the same designations. "
            "Sample list is separate."
        ),
    }
    return _INDEX


def screen_public(forms: list[str], threshold: float = 0.92) -> dict | None:
    index = load_index()
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


def sanctions_summary() -> str:
    return load_index()["summary"]
