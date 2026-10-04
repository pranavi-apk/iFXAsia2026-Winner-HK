"""Shapes shared by every check."""
import hashlib


def finding(module: str, code: str, title: str, detail: str, severity: str, evidence: list[dict]) -> dict:
    digest = hashlib.sha1(f"{module}|{code}|{title}".encode()).hexdigest()[:10]
    return {
        "id": f"{module}-{code}-{digest}",
        "module": module,
        "code": code,
        "title": title,
        "detail": detail,
        "severity": severity,
        "evidence": evidence,
        "officer": None,
    }


def checklist_evidence(classified: list[dict], rule_text: str) -> list[dict]:
    names = ", ".join(item["filename"] for item in classified) or "none"
    quote = f"{rule_text} Documents in the pack: {names}."
    return [{
        "document": "Checklist rule",
        "quote": quote,
        "context": "The checklist is code. This finding is the absence of a required document, so the source is the rule and the file list.",
        "verified": True,
        "kind": "checklist",
    }]


def public_list_evidence(entry: dict, candidate: str, program: str, context: str) -> dict:
    return {
        "document": entry.get("source", "Sanctions list"),
        "quote": f"Listed name: {candidate}. Program: {program}.",
        "context": context,
        "verified": True,
        "kind": "list",
    }
