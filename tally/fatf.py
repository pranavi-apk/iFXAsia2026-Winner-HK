"""FATF call-for-action and increased-monitoring names.

The official FATF pages blocked a direct download, so this is the list recorded
on the Wikipedia FATF page on 4 October 2026, with the dates that page states.
"""
import json

from tally.config import DATA


def lists() -> dict:
    return json.loads((DATA / "fatf.json").read_text())


def match_jurisdiction(text: str) -> dict | None:
    folded = (text or "").lower()
    if not folded:
        return None
    data = lists()
    for name in data["blacklist"]:
        if name in folded:
            return {"tier": "blacklist", "matched": name, "as_of": data["blacklist_as_of"], "source": data["source"]}
    for name in data["increased_monitoring"]:
        if name in folded:
            return {"tier": "increased_monitoring", "matched": name, "as_of": data["greylist_as_of"], "source": data["source"]}
    return None
