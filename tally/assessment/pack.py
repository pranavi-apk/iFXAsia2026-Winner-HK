"""Reading the onboarding pack: PDF text, document types, and quote lookup."""
import re
from difflib import SequenceMatcher

from pypdf import PdfReader

HEADINGS = [
    ("certificate_of_incorporation", ("CERTIFICATE OF INCORPORATION",)),
    ("register_of_directors", ("REGISTER OF DIRECTORS",)),
    ("ownership_declaration", ("DECLARATION OF OWNERSHIP", "股权结构说明")),
    ("proof_of_address", ("PROOF OF ADDRESS",)),
    ("source_of_funds", ("SOURCE OF FUNDS",)),
    ("passport", ("PASSPORT",)),
    ("register_of_members", ("REGISTER OF MEMBERS",)),
]


def read_pdf(path) -> str:
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages).strip()


def ws(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def locate(text: str, quote: str) -> tuple[bool, str]:
    quote = (quote or "").strip()
    if len(quote) < 8:
        return False, ""
    if quote in text:
        start = text.index(quote)
        return True, text[max(0, start - 70): start + len(quote) + 70]
    folded_text = ws(text)
    folded_quote = ws(quote)
    if folded_quote.lower() in folded_text.lower():
        return True, folded_quote
    ratio = SequenceMatcher(None, folded_quote.lower(), folded_text.lower()).quick_ratio()
    if ratio < 0.3:
        return False, ""
    window = len(folded_quote)
    hay = folded_text.lower()
    needle = folded_quote.lower()
    best = 0
    best_at = 0
    step = max(8, window // 8)
    for index in range(0, max(1, len(hay) - window + 1), step):
        score = SequenceMatcher(None, needle, hay[index:index + window + 12]).ratio()
        if score > best:
            best = score
            best_at = index
    if best >= 0.82:
        return True, folded_text[best_at: best_at + window + 12]
    return False, ""


def heading_type(text: str) -> str | None:
    head = text[:400]
    for doc_type, markers in HEADINGS:
        if any(marker in head for marker in markers):
            return doc_type
    return None


def classify(documents: dict[str, str]) -> list[dict]:
    return [
        {"filename": filename, "doc_type": heading_type(text) or "other", "text": text}
        for filename, text in documents.items()
    ]
