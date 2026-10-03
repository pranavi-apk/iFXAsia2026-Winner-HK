import re
import unicodedata
from difflib import SequenceMatcher

from pypinyin import lazy_pinyin

SURNAME_VARIANTS = {
    "li": ["lee"],
    "chen": ["chan", "tan"],
    "zhang": ["chang", "cheung"],
    "wang": ["wong"],
    "zhao": ["chao"],
    "zhou": ["chow"],
    "xu": ["hsu", "tsui"],
    "liu": ["lau"],
    "wu": ["ng"],
    "huang": ["wong"],
}


def _fold(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("’", "'")
    text = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokens(value: str) -> list[str]:
    return [tok for tok in _fold(value).split(" ") if tok]


def _ratio(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, left, right).ratio()


def name_forms(value: str) -> list[str]:
    forms: list[str] = []
    seen: set[str] = set()

    def add(item: str) -> None:
        item = (item or "").strip()
        key = item.lower()
        if item and key not in seen:
            seen.add(key)
            forms.append(item)

    add(value)
    for chunk in re.findall(r"[\u4e00-\u9fff]{2,}", value or ""):
        syllables = [part for part in lazy_pinyin(chunk) if part]
        if not syllables:
            continue
        add(" ".join(syllables))
        for alt in SURNAME_VARIANTS.get(syllables[0], []):
            add(" ".join([alt, *syllables[1:]]))
    return forms


def _raw_score(left: str, right: str) -> float:
    a = _fold(left)
    b = _fold(right)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    cjk_a = re.findall(r"[\u4e00-\u9fff]+", left or "")
    cjk_b = re.findall(r"[\u4e00-\u9fff]+", right or "")
    if cjk_a and cjk_b and set(cjk_a) & set(cjk_b):
        return 1.0
    ta, tb = set(_tokens(left)), set(_tokens(right))
    inter = " ".join(sorted(ta & tb))
    sa = " ".join(sorted(ta))
    sb = " ".join(sorted(tb))
    return max(_ratio(a, b), _ratio(inter, sa), _ratio(inter, sb), _ratio(sa, sb))


def name_score(left: str, right: str) -> float:
    left_forms = name_forms(left)
    right_forms = name_forms(right)
    if not left_forms or not right_forms:
        return 0.0
    return max(_raw_score(a, b) for a in left_forms for b in right_forms)


def list_score(left: str, right: str) -> float:
    best = 0.0
    for query in name_forms(left):
        for candidate in name_forms(right):
            tq, tc = set(_tokens(query)), set(_tokens(candidate))
            if not tq or not tc:
                continue
            overlap = len(tq & tc) / len(tq | tc)
            whole = _ratio(_fold(query), _fold(candidate))
            ordered = _ratio(" ".join(sorted(tq)), " ".join(sorted(tc)))
            contained = 0.94 if len(tq) >= 2 and tq <= tc else 0.0
            best = max(best, overlap, whole, ordered, contained)
    return best


def best_match(query_forms: list[str], entry: dict, threshold: float) -> dict | None:
    candidates = [entry.get("name", ""), *entry.get("aliases", [])]
    best = None
    for query in query_forms:
        for candidate in candidates:
            score = name_score(query, candidate)
            if best is None or score > best["score"]:
                best = {"score": score, "query": query, "candidate": candidate, "entry": entry}
    if best and best["score"] >= threshold:
        return best
    return None
