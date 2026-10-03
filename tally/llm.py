import json
import re

import httpx

from tally.config import llm_settings


def chat(messages: list[dict], max_tokens: int = 4096) -> str:
    settings = llm_settings()
    if not settings["api_key"] or not settings["base_url"]:
        raise RuntimeError("Alibaba LLM settings are missing from .env")
    payload = {
        "model": settings["model"],
        "messages": messages,
        "temperature": 0,
        "max_tokens": max_tokens,
        "enable_thinking": False,
    }
    response = httpx.post(
        f"{settings['base_url']}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings['api_key']}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    message = response.json()["choices"][0]["message"]
    return (message.get("content") or message.get("reasoning_content") or "").strip()


def parse_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))
