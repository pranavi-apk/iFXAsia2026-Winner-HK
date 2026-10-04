"""assess(): runs the whole review on a pack's text and returns the case.

Each sidebar section has its own module in checks/. This file only calls them
in order and assembles the result. The order matters: it is the order the
findings appear in.
"""
from tally.assessment.checks.documents import check_documents, check_registry, required_documents
from tally.assessment.checks.ownership import check_ownership
from tally.assessment.checks.screening import check_introducer, check_jurisdiction, screen_parties
from tally.assessment.checks.source_of_funds import check_source_of_funds
from tally.assessment.extraction import extract_pack
from tally.assessment.memo import draft_memo
from tally.assessment.monitoring import initial_monitoring
from tally.assessment.pack import classify
from tally.assessment.people import resolve_links, resolve_people
from tally.assessment.scoring import apply_score
from tally.config import llm_settings, rules, screening_lists
from tally.sanctions_data import sanctions_summary

DEFAULT_SUBJECT = "Harbour Lantern Trading Limited"
OUTSTANDING_CODES = {"gap", "expired-id", "missing-id"}


def _module_status(findings: list[dict], module: str) -> str:
    items = [item for item in findings if item["module"] == module]
    if any(item["severity"] == "high" for item in items):
        return "attention"
    if items:
        return "review"
    return "clear"


def assess(documents: dict[str, str]) -> dict:
    policy = rules()
    lists = screening_lists()
    extracted = extract_pack(documents)
    classified = classify(documents)

    people = resolve_people(extracted, documents)
    companies = extracted.get("companies") or []
    links = resolve_links(extracted, people, companies)
    subject = (extracted.get("entity") or {}).get("legal_name") or DEFAULT_SUBJECT
    business = extracted.get("business") or {}

    findings = []
    findings += check_documents(classified, people, extracted, policy)
    views, ownership_findings = check_ownership(classified, people, links, extracted, subject)
    findings += ownership_findings
    screened, screening_findings = screen_parties(people, companies, policy, lists)
    findings += screening_findings
    findings += check_jurisdiction(people, policy)
    findings += check_source_of_funds(business)
    findings += check_introducer(business, policy, lists)
    registry, registry_findings = check_registry(subject)
    findings += registry_findings

    scored = apply_score(findings, policy)
    rating = scored["rating"]
    list_summary = sanctions_summary()
    required_types = {doc_type for doc_type, _label in required_documents(policy)}
    outstanding = [
        item["title"] for item in findings
        if item["code"] in OUTSTANDING_CODES or item["code"] in required_types or "Missing" in item["title"]
    ]
    memo, request = draft_memo(subject, findings, rating, outstanding)

    return {
        "entity": extracted.get("entity") or {"legal_name": subject},
        "people": people,
        "companies": companies,
        "documents": [{"filename": item["filename"], "doc_type": item["doc_type"]} for item in classified],
        "ownership_views": views,
        "screening": screened,
        "business": {key: value for key, value in business.items() if key != "evidence"},
        "findings": findings,
        "modules": {
            "documents": {"title": "Entity and documents", "status": _module_status(findings, "documents")},
            "ownership": {"title": "Ownership and control", "status": _module_status(findings, "ownership")},
            "screening": {"title": "Sanctions, PEP, and names", "status": _module_status(findings, "screening")},
            "source_of_funds": {"title": "Source of funds", "status": _module_status(findings, "source_of_funds")},
            "risk": {"title": "Risk and memo", "status": "ready", "rating": rating, "score": scored["score"]},
        },
        "risk": {
            "score": scored["score"],
            "rating": rating,
            "factors": scored["factors"],
            "rules_label": policy["label"],
            "suggested_status": "Officer review",
        },
        "registry": registry,
        "monitoring": initial_monitoring(findings, policy, list_summary),
        "screening_notes": [
            {"title": "Sanctions lists", "detail": list_summary},
            {"title": "PEP", "detail": lists["pep"]["label"]},
            {"title": "Adverse media", "detail": "Not run. No licensed adverse-media source is connected."},
        ],
        "labels": {
            "sanctions": list_summary,
            "pep": lists["pep"]["label"],
            "jurisdictions": policy["high_risk_jurisdictions"]["label"],
            "model": llm_settings()["model"],
        },
        "memo": memo,
        "customer_request": request,
    }
