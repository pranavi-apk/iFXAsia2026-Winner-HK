"""Source of Funds section: does the declared business match the credits described?"""
import re

from tally.assessment.findings import finding

_STOP_WORDS = {
    "shareholder", "capital", "company", "limited", "expected", "annual", "turnover",
    "received", "description", "credits", "source", "funds", "business", "purpose",
    "activity", "import", "resale", "buyers", "prepared", "statement", "period", "total",
}


def _content_words(text: str) -> set[str]:
    return {word for word in re.findall(r"[a-z]{5,}", (text or "").lower()) if word not in _STOP_WORDS}


def check_source_of_funds(business: dict) -> list[dict]:
    purpose_words = _content_words(business.get("purpose", ""))
    credit_words = _content_words(business.get("observed_credits", ""))
    if purpose_words and credit_words and purpose_words.isdisjoint(credit_words):
        return [finding(
            "source_of_funds", "mismatch", "Declared business does not match the credits described",
            f"Purpose: {business.get('purpose')}. Credits described as: {business.get('observed_credits')}. Plausibility is left to the officer.",
            "medium", business.get("evidence") or [],
        )]
    return []
