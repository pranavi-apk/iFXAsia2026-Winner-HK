"""Public mentions for adverse media and source-of-funds background.

The search request sends a name and a few risk words. It does not send the
pack. The model only classifies the snippets that come back. Every hit is a
lead until an officer confirms or dismisses it.
"""
import hashlib
import html
import json
import re
from datetime import datetime, timezone
from urllib.parse import parse_qs, unquote, urlparse

import httpx

from tally.llm import chat, parse_json

SEARCH_URL = "https://html.duckduckgo.com/html/"
RISK_QUERY = "fraud OR sanctions OR investigation OR laundering"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _lead_id(url: str, name: str) -> str:
    return hashlib.sha1(f"{name}|{url}".encode()).hexdigest()[:12]


def _clean(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def _result_url(href: str) -> str:
    if href.startswith("//"):
        href = "https:" + href
    parsed = urlparse(href)
    target = parse_qs(parsed.query).get("uddg", [""])[0]
    return unquote(target) if target else href


def search_mentions(name: str, limit: int = 5) -> list[dict]:
    """Search the public web for this name only. Returns title, url, snippet."""
    query_name = (name or "").strip()
    if not query_name:
        return []
    retrieved = _now()
    try:
        response = httpx.get(
            SEARCH_URL,
            params={"q": f'"{query_name}" {RISK_QUERY}'},
            headers={"User-Agent": "TallyDemo/1.0"},
            timeout=20,
            follow_redirects=True,
        )
        response.raise_for_status()
        if "result__a" not in response.text:
            response = httpx.get(
                SEARCH_URL,
                params={"q": f'"{query_name}"'},
                headers={"User-Agent": "TallyDemo/1.0"},
                timeout=20,
                follow_redirects=True,
            )
            response.raise_for_status()
    except Exception as exc:
        return [{
            "id": _lead_id("search-error", query_name),
            "name": query_name,
            "title": "Search unavailable",
            "url": "",
            "snippet": type(exc).__name__,
            "retrieved_at": retrieved,
            "source": "DuckDuckGo web search",
            "status": "unavailable",
        }]
    titles = re.findall(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', response.text, re.S)
    snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</(?:a|td|div)>', response.text, re.S)
    mentions = []
    for index, (href, title) in enumerate(titles[:limit]):
        url = _result_url(href)
        snippet = _clean(snippets[index]) if index < len(snippets) else ""
        mentions.append({
            "id": _lead_id(url, query_name),
            "name": query_name,
            "title": _clean(title),
            "url": url,
            "snippet": snippet,
            "retrieved_at": retrieved,
            "source": "DuckDuckGo web search",
            "query": query_name,
            "status": "lead",
        })
    return mentions


def classify_mentions(name: str, hints: dict, mentions: list[dict]) -> list[dict]:
    """Ask the model whether each snippet is the same party, and which sentence says so."""
    usable = [item for item in mentions if item.get("url") and item.get("snippet")]
    if not usable:
        return mentions
    payload = {
        "name": name,
        "hints": {key: hints.get(key) for key in ("nationality", "role", "kind") if hints.get(key)},
        "results": [{"id": item["id"], "title": item["title"], "snippet": item["snippet"], "url": item["url"]} for item in usable],
    }
    try:
        raw = chat([
            {"role": "system", "content": (
                "You triage news leads for a compliance officer. Use only the snippets. "
                "A common Chinese or English name is often a different person. "
                "Return JSON: {\"leads\": [{\"id\": \"\", \"same_person\": false, \"allegation\": \"\", \"supporting_sentence\": \"\"}]}. "
                "same_person is true only when the snippet identifies this party by company, nationality, or role. "
                "supporting_sentence must be copied from the snippet."
            )},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ], max_tokens=900)
        parsed = parse_json(raw).get("leads") or []
    except Exception:
        parsed = []
    by_id = {item.get("id"): item for item in parsed}
    for item in mentions:
        verdict = by_id.get(item["id"]) or {}
        item["same_person"] = bool(verdict.get("same_person"))
        item["allegation"] = verdict.get("allegation") or ""
        item["supporting_sentence"] = verdict.get("supporting_sentence") or ""
        item["label"] = "Lead only. The officer confirms or dismisses it."
    return mentions


def research_name(name: str, hints: dict | None = None) -> list[dict]:
    hints = hints or {}
    return classify_mentions(name, hints, search_mentions(name))
