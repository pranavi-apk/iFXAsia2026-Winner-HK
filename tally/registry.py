"""Hong Kong public-register lookups.

Companies Registry open data supports a name begins-with search of live local
companies. The HKMA register of authorized institutions and local representative
offices is a public JSON API. ICRIS paid search is not used.
"""

from pathlib import Path

import httpx
import json

from tally.config import DATA
from tally.screening import _tokens, list_score

CACHE = DATA / "registry_cache"
CR_URL = "https://data.cr.gov.hk/cr/api/api/v1/api_builder/json/local/search"
HKMA_URL = "https://api.hkma.gov.hk/public/bank-svf-info/register-ais-lros"
STOP = {"limited", "ltd", "company", "holdings", "trading", "the", "and", "hong", "kong"}
_HKMA = None


def _search_token(legal_name: str) -> str:
    words = [token for token in _tokens(legal_name) if token not in STOP]
    if len(words) >= 2:
        return f"{words[0]} {words[1]}".upper()
    if words:
        return words[0].upper()
    return (legal_name or "").strip()[:12]


def companies_registry_search(legal_name: str) -> dict:
    name = (legal_name or "").strip()
    if not name:
        return {"status": "skipped", "source": "Hong Kong Companies Registry"}
    token = _search_token(name)
    try:
        response = httpx.get(
            CR_URL,
            params={
                "query[0][key1]": "Comp_name",
                "query[0][key2]": "begins_with",
                "query[0][key3]": token,
            },
            timeout=25,
        )
        if response.status_code == 400:
            return {"status": "no_match", "source": "Hong Kong Companies Registry", "query": name, "token": token}
        response.raise_for_status()
        rows = response.json()
        if not isinstance(rows, list):
            return {"status": "no_match", "source": "Hong Kong Companies Registry", "query": name, "token": token}
    except Exception as exc:
        return {"status": "unavailable", "source": "Hong Kong Companies Registry", "detail": type(exc).__name__}
    best = None
    for row in rows[:200]:
        candidate = row.get("English_Company_Name") or ""
        score = list_score(name, candidate)
        if best is None or score > best["score"]:
            best = {"score": score, "row": row, "candidate": candidate}
    if not best or best["score"] < 0.92:
        return {"status": "no_match", "source": "Hong Kong Companies Registry", "query": name, "token": token}
    row = best["row"]
    return {
        "status": "match",
        "source": "Hong Kong Companies Registry",
        "query": name,
        "score": best["score"],
        "legal_name": row.get("English_Company_Name") or name,
        "chinese_name": row.get("Chinese_Company_Name") or "",
        "brn": row.get("Brn") or "",
        "address": row.get("Address_of_Registered_Office") or "",
    }


def _hkma_records() -> list[dict]:
    global _HKMA
    if _HKMA is not None:
        return _HKMA
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / "hkma_ais.json"
    if path.exists() and path.stat().st_size > 100:
        records = json.loads(path.read_text())
        _HKMA = records
        return records
    records = []
    offset = 0
    while offset < 5000:
        try:
            response = httpx.get(
                HKMA_URL,
                params={"lang": "en", "pagesize": 50, "offset": offset},
                timeout=25,
            )
        except Exception:
            break
        if response.status_code != 200:
            if offset == 0:
                try:
                    response = httpx.get(HKMA_URL, params={"lang": "en"}, timeout=25)
                    response.raise_for_status()
                    records = (response.json().get("result") or {}).get("records") or []
                except Exception:
                    records = []
            break
        page = (response.json().get("result") or {}).get("records") or []
        if not page:
            break
        records.extend(page)
        if len(page) < 50:
            break
        offset += 50
    path.write_text(json.dumps(records))
    _HKMA = records
    return records


def hkma_search(legal_name: str) -> dict:
    name = (legal_name or "").strip()
    if not name:
        return {"status": "skipped", "source": "HKMA register of AIs"}
    try:
        records = _hkma_records()
    except Exception as exc:
        return {"status": "unavailable", "source": "HKMA register of AIs", "detail": type(exc).__name__}
    best = None
    for row in records:
        candidate = row.get("name") or ""
        score = list_score(name, candidate)
        if best is None or score > best["score"]:
            best = {"score": score, "row": row, "candidate": candidate}
    if not best or best["score"] < 0.92:
        return {"status": "no_match", "source": "HKMA register of AIs", "query": name}
    row = best["row"]
    return {
        "status": "match",
        "source": "HKMA register of AIs",
        "query": name,
        "score": best["score"],
        "legal_name": row.get("name") or name,
        "institution_type": row.get("type") or "",
        "address": row.get("local_address") or "",
    }


def lookup_hong_kong(legal_name: str) -> dict:
    cr = companies_registry_search(legal_name)
    hkma = hkma_search(legal_name)
    hits = [item for item in (cr, hkma) if item.get("status") == "match"]
    if hits:
        primary = hits[0]
        return {
            **primary,
            "status": "match",
            "source": " · ".join(item["source"] for item in hits),
            "hits": hits,
        }
    if cr.get("status") == "unavailable" and hkma.get("status") == "unavailable":
        return {
            "status": "unavailable",
            "source": "Hong Kong Companies Registry and HKMA",
            "detail": f"{cr.get('detail')}; {hkma.get('detail')}",
            "query": legal_name,
        }
    return {
        "status": "no_match",
        "source": "Hong Kong Companies Registry open data and HKMA register of AIs",
        "query": legal_name,
        "cr": cr,
        "hkma": hkma,
    }
