"""Sanctions lists used for screening.

Hong Kong implements UN designations under the United Nations Sanctions
Ordinance (Cap. 537, published by CEDB) and UNATMO (Cap. 575, published by
the Security Bureau). The machine-readable copy of that set is the UN
consolidated XML.

OFAC, the EU list, and the UK list are not required by Hong Kong law. They
are included because many banks screen them as well, and only when the
cached files are already on disk.
"""

import csv
import io
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
                    "list_url": "https://www.cedb.gov.hk/en/policies/united-nations-security-council-sanctions.html",
                    })
                parts, aliases, program = [], [], "UN"
                elem.clear()
    except ET.ParseError:
        return entries
    return entries


def _parse_ofac() -> list[dict]:
    sdn = CACHE / "sdn.csv"
    if not sdn.exists() or sdn.stat().st_size < 1000:
        return []
    by_id: dict[str, dict] = {}
    with sdn.open(newline="", encoding="utf-8", errors="replace") as handle:
        for row in csv.reader(handle):
            if len(row) < 4 or not row[1] or row[1].strip() in {"-0-", ""}:
                continue
            by_id[row[0]] = {
                "name": row[1].strip(),
                "aliases": [],
                "source": "OFAC SDN",
                "program": row[3].strip(),
                "list_url": "https://ofac.treasury.gov/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists",
            }
    alt = CACHE / "alt.csv"
    if alt.exists():
        with alt.open(newline="", encoding="utf-8", errors="replace") as handle:
            for row in csv.reader(handle):
                if len(row) < 4 or row[0] not in by_id:
                    continue
                alias = row[3].strip()
                if alias and alias != "-0-" and len(by_id[row[0]]["aliases"]) < 6:
                    by_id[row[0]]["aliases"].append(alias)
    return list(by_id.values())


def _parse_uk() -> list[dict]:
    path = CACHE / "uk.csv"
    if not path.exists() or path.stat().st_size < 1000:
        return []
    text = path.read_text(encoding="utf-8", errors="replace")
    if text.startswith("Last Updated"):
        text = text.split("\n", 1)[1]
    grouped: dict[str, dict] = {}
    for row in csv.DictReader(io.StringIO(text)):
        parts = [(row.get(f"Name {index}") or "").strip() for index in range(1, 7)]
        parts = [part for part in parts if part]
        if not parts:
            continue
        key = (row.get("Group ID") or " ".join(parts)).strip()
        alias = (row.get("Name Non-Latin Script") or "").strip()
        entry = grouped.setdefault(key, {
            "name": " ".join(parts),
            "aliases": [],
            "source": "UK sanctions list",
            "program": (row.get("Regime") or "UK").strip(),
            "list_url": "https://www.gov.uk/government/publications/the-uk-sanctions-list",
        })
        if alias and alias not in entry["aliases"] and len(entry["aliases"]) < 6:
            entry["aliases"].append(alias)
    return list(grouped.values())


def _parse_eu() -> list[dict]:
    path = CACHE / "eu.xml"
    if not path.exists() or path.stat().st_size < 1000:
        return []
    entries = []
    names: list[str] = []
    program = "EU"
    try:
        for _event, elem in ET.iterparse(path, events=("end",)):
            tag = _local(elem.tag)
            if tag == "regulation":
                program = (elem.attrib.get("programme") or program).strip() or program
            elif tag == "namealias":
                whole = (elem.attrib.get("wholeName") or "").strip()
                if whole and whole not in names and len(names) < 6:
                    names.append(whole)
            elif tag == "sanctionentity":
                if names:
                    entries.append({
                        "name": names[0],
                        "aliases": names[1:],
                        "source": "EU financial sanctions list",
                        "program": program,
                        "list_url": "https://www.sanctionsmap.eu/",
                    })
                names = []
                program = "EU"
                elem.clear()
    except ET.ParseError:
        return entries
    return entries


def load_index(refresh: bool = False) -> dict:
    global _INDEX
    if _INDEX is not None and not refresh:
        return _INDEX
    notes = _download()
    core = _parse_un()
    extras = _parse_ofac() + _parse_uk() + _parse_eu()
    entries = core + extras
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
            f"Hong Kong core ({HK_SOURCE}): {len(core)} names from the UN consolidated list. "
            f"CEDB publishes the UNSO lists and the Security Bureau publishes the UNATMO list. "
            f"Extra lists banks often also screen: {len(extras)} OFAC, EU, and UK names. "
            "The sample sanctions list and the sample PEP list are separate."
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
    from tally.opensanctions import opensanctions_summary

    return load_index()["summary"] + " " + opensanctions_summary()
