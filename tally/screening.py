import re
import unicodedata
from difflib import SequenceMatcher

from pypinyin import lazy_pinyin

SURNAME_VARIANTS = {
    "li": ["lee", "lei"],
    "chen": ["chan", "tan"],
    "zhang": ["chang", "cheung"],
    "wang": ["wong"],
    "zhao": ["chao"],
    "zhou": ["chow", "chau"],
    "xu": ["hsu", "tsui", "hui"],
    "liu": ["lau"],
    "wu": ["ng"],
    "huang": ["wong"],
    "lin": ["lam"],
    "liang": ["leung"],
    "he": ["ho"],
    "zheng": ["cheng"],
    "luo": ["lo"],
    "yang": ["yeung"],
    "deng": ["tang"],
    "xie": ["tse"],
    "feng": ["fung"],
    "zeng": ["tsang"],
    "tan": ["tam"],
    "cai": ["choi"],
    "ye": ["yip"],
    "yuan": ["yuen"],
    "zhong": ["chung"],
}

# Common characters in Hong Kong names, spoken in Cantonese rather than Mandarin.
CANTONESE = {
    "陈": "chan", "陳": "chan", "李": "lei", "张": "cheung", "張": "cheung",
    "王": "wong", "黄": "wong", "黃": "wong", "林": "lam", "吴": "ng", "吳": "ng",
    "刘": "lau", "劉": "lau", "梁": "leung", "何": "ho", "郑": "cheng", "鄭": "cheng",
    "罗": "lo", "羅": "lo", "周": "chau", "马": "ma", "馬": "ma", "胡": "wu",
    "朱": "chu", "蔡": "choi", "杨": "yeung", "楊": "yeung", "许": "hui", "許": "hui",
    "徐": "tsui", "邓": "tang", "鄧": "tang", "谢": "tse", "謝": "tse", "冯": "fung", "馮": "fung",
    "曾": "tsang", "萧": "siu", "蕭": "siu", "潘": "poon", "谭": "tam", "譚": "tam",
    "叶": "yip", "葉": "yip", "余": "yu", "苏": "so", "蘇": "so", "吕": "lui", "呂": "lui",
    "钟": "chung", "鍾": "chung", "黎": "lai", "方": "fong", "任": "yam", "姚": "yiu",
    "伟": "wai", "偉": "wai", "明": "ming", "文": "man", "华": "wa", "華": "wa",
    "国": "gwok", "國": "gwok", "建": "gin", "志": "chi", "强": "keung", "強": "keung",
    "丽": "lai", "麗": "lai", "芳": "fong", "俊": "chun", "浩": "ho", "欣": "yan",
    "慧": "wai", "勇": "yung", "军": "kwan", "軍": "kwan", "平": "ping", "燕": "yin",
    "玲": "ling", "敏": "man", "静": "ching", "靜": "ching", "娜": "na", "涛": "to", "濤": "to",
    "鹏": "pang", "鵬": "pang", "超": "chiu", "磊": "lui", "洋": "yeung", "宇": "yu",
    "博": "bok", "凯": "hoi", "凱": "hoi", "怡": "yi", "嘉": "ka", "颖": "wing", "穎": "wing",
    "思": "si", "雨": "yu", "婷": "ting", "杰": "kit", "傑": "kit", "安": "on", "生": "sang",
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
        cantonese = [CANTONESE.get(char) for char in chunk]
        if all(cantonese):
            add(" ".join(cantonese))
        elif cantonese[0]:
            add(" ".join([cantonese[0], *syllables[1:]]))
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
