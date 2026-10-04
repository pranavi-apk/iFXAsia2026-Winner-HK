"""Turning the pack's text into structured data with the model, then checking
every quote the model gives against the documents."""
import json
import re

from tally.assessment.pack import locate, ws
from tally.llm import chat, parse_json
from tally.screening import name_score

EXTRACT_PROMPT = """You extract a corporate onboarding pack into JSON. Do not resolve conflicts. If two documents disagree, emit both statements.

Return only JSON with this shape:
{
  "entity": {"legal_name": "", "company_number": "", "jurisdiction": "", "registered_address": "", "evidence": [{"document": "", "quote": ""}]},
  "people": [{"name": "", "kind": "person", "roles": ["director"], "nationality": "", "aliases": [], "evidence": [{"document": "", "quote": ""}]}],
  "companies": [{"name": "", "kind": "company", "jurisdiction": "", "aliases": [], "evidence": [{"document": "", "quote": ""}]}],
  "ownership_links": [{"owner": "", "owner_kind": "person", "owned": "", "percent": 0, "source_document": "", "quote": ""}],
  "addresses": [{"kind": "registered or proof_of_address", "value": "", "source_document": "", "quote": ""}],
  "identity_documents": [{"person": "", "expiry": "", "source_document": "", "quote": ""}],
  "business": {"purpose": "", "expected_activity": "", "declared_source_of_funds": "", "observed_credits": "", "introducer": "", "evidence": [{"document": "", "quote": ""}]}
}

Rules:
- owner, owned, and person names should be the English name when the document gives one. Put Chinese names and "also known as" names in aliases.
- percent is a number. "60 percent" means 60.
- A company that owns shares is owner_kind "company". A natural person is "person".
- Keep one ownership_links item for every ownership sentence, including sentences that contradict another document.
- quote must be copied from that document, contiguous, no longer than 240 characters.
- document and source_document must be the filename.
"""


def grounded_evidence(documents: dict[str, str], items: list[dict] | None) -> list[dict]:
    """Keep only the quotes that really appear in a document."""
    kept = []
    for item in items or []:
        filename = item.get("document") or item.get("source_document") or ""
        text = documents.get(filename, "")
        if not text:
            for name, body in documents.items():
                ok, context = locate(body, item.get("quote", ""))
                if ok:
                    filename, text = name, body
                    break
            else:
                continue
        ok, context = locate(text, item.get("quote", ""))
        if ok:
            kept.append({"document": filename, "quote": ws(item.get("quote", "")), "context": ws(context), "verified": True})
    return kept


def harvest_aliases(documents: dict[str, str]) -> list[dict]:
    found = []
    for filename, text in documents.items():
        parts = re.split(r"(?=Name:)", text)
        for block in parts:
            name = re.search(r"Name:\s*(.+)", block)
            if not name:
                continue
            section = block.split("Name:", 1)[-1]
            section = re.split(r"\nName:", section)[0]
            aliases = []
            chinese = re.search(r"Chinese name:\s*(.+)", section)
            also = re.search(r"Also known as:\s*(.+)", section)
            if chinese:
                aliases.append(chinese.group(1).strip())
            if also:
                aliases.append(also.group(1).strip())
            found.append({"name": name.group(1).strip(), "aliases": aliases, "document": filename})
        for han, english in re.findall(r"([一-鿿]+)\s*\(([^)]+)\)", text):
            found.append({"name": english.split(",")[0].strip(), "aliases": [han.strip(), english.strip()], "document": filename})
    return found


def with_narrative_control(documents: dict[str, str], links: list[dict]) -> list[dict]:
    """Add 'X Limited is understood to be wholly owned by Y' sentences as ownership links."""
    pattern = re.compile(
        r"([A-Z][A-Za-z0-9&'-]*(?: [A-Z][A-Za-z0-9&'-]*)* Limited) is understood to be wholly owned by ([A-Z][a-z]+(?: [A-Z][a-z]+)+)"
    )
    for filename, text in documents.items():
        flat = ws(text)
        for match in pattern.finditer(flat):
            owner = match.group(2).strip()
            owned = match.group(1).strip(" .")
            if any(name_score(owner, link["owner"]) >= 0.92 and name_score(owned, link["owned"]) >= 0.92 for link in links):
                continue
            quote = match.group(0)
            links.append({
                "owner": owner,
                "owner_kind": "person",
                "owned": owned,
                "percent": 100,
                "source_document": filename,
                "quote": quote,
                "evidence": [{"document": filename, "quote": quote, "context": quote, "verified": True}],
            })
    return links


def extract_pack(documents: dict[str, str]) -> dict:
    joined = "\n\n".join(f"FILENAME: {name}\n{text}" for name, text in documents.items())
    messages = [
        {"role": "system", "content": EXTRACT_PROMPT},
        {"role": "user", "content": joined},
    ]
    raw = chat(messages)
    try:
        data = parse_json(raw)
    except json.JSONDecodeError:
        raw = chat(messages + [
            {"role": "assistant", "content": raw[:4000]},
            {"role": "user", "content": "Return the same answer as one JSON object only."},
        ])
        data = parse_json(raw)
    for person in data.get("people", []):
        person["evidence"] = grounded_evidence(documents, person.get("evidence"))
    for company in data.get("companies", []):
        company["evidence"] = grounded_evidence(documents, company.get("evidence"))
    if data.get("entity"):
        data["entity"]["evidence"] = grounded_evidence(documents, data["entity"].get("evidence"))
    if data.get("business"):
        data["business"]["evidence"] = grounded_evidence(documents, data["business"].get("evidence"))
    kept_links = []
    for link in data.get("ownership_links", []):
        evidence = grounded_evidence(documents, [{"document": link.get("source_document"), "quote": link.get("quote")}])
        if not evidence:
            continue
        link["source_document"] = evidence[0]["document"]
        link["quote"] = evidence[0]["quote"]
        link["evidence"] = evidence
        kept_links.append(link)
    data["ownership_links"] = kept_links
    kept_addresses = []
    for address in data.get("addresses", []):
        evidence = grounded_evidence(documents, [{"document": address.get("source_document"), "quote": address.get("quote")}])
        if evidence:
            address["evidence"] = evidence
            address["source_document"] = evidence[0]["document"]
            kept_addresses.append(address)
    data["addresses"] = kept_addresses
    kept_ids = []
    for item in data.get("identity_documents", []):
        evidence = grounded_evidence(documents, [{"document": item.get("source_document"), "quote": item.get("quote")}])
        if evidence:
            item["evidence"] = evidence
            item["source_document"] = evidence[0]["document"]
            kept_ids.append(item)
    data["identity_documents"] = kept_ids
    data["harvested_aliases"] = harvest_aliases(documents)
    data["ownership_links"] = with_narrative_control(documents, data.get("ownership_links") or [])
    return data
