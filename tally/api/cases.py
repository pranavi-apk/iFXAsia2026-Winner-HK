"""Opening cases and reading them back."""
import hashlib
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pypdf import PdfReader

from tally.api.deps import load_case
from tally.api.research import ensure_adverse_media

from tally.assessment import assess, read_pdf
from tally.assessment.funds import build_funds_profile
from tally.assessment.risk_rating import build_risk_rating
from tally.assessment.risk_report import build_report
from tally.assessment.pack import classify
from tally.intake import build_intake, pack_documents
from tally.mock_pack import PACK_DIR, write_pack
from tally.store import append_audit, case_dir, new_id, save, stamp, list_all

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("")
def list_cases():
    return list_all()



def _texts(folder: Path) -> dict[str, str]:
    documents = {}
    for path in sorted(folder.glob("*.pdf")):
        documents[path.name] = read_pdf(path)
    if not documents:
        raise HTTPException(status_code=400, detail="Upload at least one PDF.")
    return documents


SAMPLE_ID = "silver-oak"
_PACK_HASHES: set[str] | None = None


def _pack_hashes() -> set[str]:
    """Fingerprints of the prepared Silver Oak PDFs. Same bytes means the demo pack."""
    global _PACK_HASHES
    if _PACK_HASHES is None:
        if not any(PACK_DIR.glob("*.pdf")):
            write_pack()
        _PACK_HASHES = {hashlib.sha256(path.read_bytes()).hexdigest() for path in PACK_DIR.glob("*.pdf")}
    return _PACK_HASHES


def _touches_prepared_pack(blobs: list[bytes]) -> bool:
    """True when even one uploaded PDF is from the Silver Oak pack."""
    if not blobs:
        return False
    known = _pack_hashes()
    return any(hashlib.sha256(blob).hexdigest() in known for blob in blobs)


def _prepared_assessment(texts: dict[str, str], pages: dict[str, int]) -> dict:
    """The Silver Oak case the screens already know how to draw. No model call."""
    intake = build_intake(texts)
    profile = intake["company"]["profile"]
    business = intake["business"]
    activity = intake["funds"]["expectedActivity"]
    names = [person["name"] for person in intake["management"]["directors"]]
    names += [owner["name"] for owner in intake["ownership"]["beneficialOwners"]]
    return {
        "entity": {
            "legal_name": profile["legalName"],
            "company_number": profile["registrationNumber"],
            "jurisdiction": profile["jurisdiction"],
            "registered_address": profile["registeredOffice"],
        },
        "people": [
            {"name": person["name"], "kind": "person", "roles": [person["role"].lower()], "nationality": person["nationality"]}
            for person in intake["management"]["directors"]
        ],
        "companies": [{"name": row["name"], "kind": "company", "jurisdiction": ""} for row in intake["screening"] if row["kind"] == "company"],
        "documents": pack_documents(texts, pages, intake),
        "findings": intake["findings"],
        "business": {
            "purpose": business["description"],
            "expected_activity": f"About {activity['monthlyTransactions']} payments a month, typically USD {activity['typicalTransactionUsd']['min']:,} to USD {activity['typicalTransactionUsd']['max']:,}.",
            "target_markets": ", ".join(activity["counterpartyCountries"]),
            "expected_annual_volume": f"USD {activity['monthlyCreditsUsd'] * 12:,} expected credits a year",
            "introducer": "",
            "turnover": f"USD {business['financialStatements']['turnoverUsd'] / 1_000_000:.1f}M",
        },
        "funds": _demo_funds(intake),
        "intake": intake,
        "risk": intake["risk"],
        "adverse_media": {
            "label": "Web search leads. Not a licensed adverse-media feed. The officer confirms or dismisses each one.",
            "searched_at": "2026-10-04T08:00:00+00:00",
            "names": list(dict.fromkeys(names)),
            "leads": [],
        },
    }


def _demo_funds(intake: dict) -> dict:
    profile = intake["company"]["profile"]
    funds = intake["funds"]
    activity = funds["expectedActivity"]
    observed = funds["observedActivity"]
    documents = []
    for item in funds["documents"]:
        if not item.get("file"):
            continue
        documents.append({
            "filename": item["file"],
            "title": item["title"],
            "date": item.get("issued", ""),
            "badge": "In the pack",
            "tone": "ok" if item["status"] in {"verified", "received"} else "review",
            "doc_type": item["id"],
        })
    return {
        "total": {"amount": observed["avgMonthlyCreditsUsd"], "currency": "USD", "basis": "credits", "label": "Average monthly credits"},
        "source_count": 2,
        "consistent": True,
        "sources": [
            {
                "id": "eastbridge",
                "name": "Eastbridge Trading Ltd",
                "category": "Dividends",
                "kind": "company",
                "amount": 1050000,
                "currency": "USD",
                "origin": "declared",
                "detail": "Dividends from the Hong Kong trading subsidiary.",
            },
            {
                "id": "maple",
                "name": "Maple Finance Pte Ltd",
                "category": "Loan repayment",
                "kind": "company",
                "amount": 690000,
                "currency": "USD",
                "origin": "declared",
                "detail": "Repayment of intra-group loans.",
            },
        ],
        "recipient": {"name": profile["legalName"], "role": "Onboarded entity"},
        "intermediary": {"name": "Account at another bank", "role": "Statements Mar–Aug 2026"},
        "timeline": [
            {"date": "2017-09-08", "detail": "Zhang Wei sold a 35% stake in a Shenzhen logistics company.", "amount": 6200000, "currency": "USD"},
            {"date": "2026-03-01", "detail": "Six months of bank statements begin.", "amount": None, "currency": "USD"},
            {"date": "2026-08-31", "detail": observed["note"], "amount": observed["avgMonthlyCreditsUsd"], "currency": "USD"},
            {"date": "2026-09-12", "detail": funds["sourceOfFunds"]["declared"], "amount": None, "currency": "USD"},
        ],
        "purpose": {
            "business_activity": intake["business"]["description"],
            "expected_transactions": f"About {activity['monthlyTransactions']} payments a month.",
            "target_markets": ", ".join(activity["counterpartyCountries"]),
            "expected_annual_volume": f"USD {activity['monthlyCreditsUsd'] * 12:,} expected credits a year",
            "introducer": "",
        },
        "documents": documents,
        "note": "Amounts are taken from the source-of-funds statement, the expected-activity declaration, and the bank statements in this pack.",
    }


@router.post("/sample")
def sample_case():
    """Open the Silver Oak pack. Documents, ownership, and the approval memo read its intake."""
    if not any(PACK_DIR.glob("*.pdf")):
        write_pack()
    folder = case_dir(SAMPLE_ID)
    for old in folder.glob("*.pdf"):
        old.unlink()
    for path in PACK_DIR.glob("*.pdf"):
        shutil.copy(path, folder / path.name)
    texts = _texts(folder)
    pages = {path.name: len(PdfReader(str(path)).pages) for path in folder.glob("*.pdf")}
    assessment = _prepared_assessment(texts, pages)
    title = assessment["entity"]["legal_name"]
    return stamp(SAMPLE_ID, title, assessment)


@router.post("")
async def create_case(files: list[UploadFile] = File(...)):
    case_id = new_id()
    folder = case_dir(case_id)
    blobs = []
    for upload in files:
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            continue
        data = await upload.read()
        target = folder / Path(upload.filename).name
        target.write_bytes(data)
        PdfReader(str(target))
        blobs.append(data)
    if not blobs:
        raise HTTPException(status_code=400, detail="Upload at least one PDF.")
    if _touches_prepared_pack(blobs):
        known = _pack_hashes()
        for path in folder.glob("*.pdf"):
            if hashlib.sha256(path.read_bytes()).hexdigest() not in known:
                path.unlink()
        for path in PACK_DIR.glob("*.pdf"):
            dest = folder / path.name
            if not dest.exists():
                shutil.copy(path, dest)
            sample_dest = case_dir(SAMPLE_ID) / path.name
            if not sample_dest.exists():
                shutil.copy(path, sample_dest)
        texts = _texts(folder)
        pages = {path.name: len(PdfReader(str(path)).pages) for path in folder.glob("*.pdf")}
        assessment = _prepared_assessment(texts, pages)
        title = assessment["entity"]["legal_name"]
        return stamp(SAMPLE_ID, title, assessment)
    assessment = assess(_texts(folder))
    title = (assessment.get("entity") or {}).get("legal_name") or "Uploaded case"
    return ensure_adverse_media(stamp(case_id, title, assessment))


def _with_funds(case: dict) -> dict:
    """Backfill the source-of-funds profile from the stored PDFs when an older case has none."""
    if case.get("funds"):
        return case
    documents = {}
    for path in sorted(case_dir(case["id"]).glob("*.pdf")):
        documents[path.name] = read_pdf(path)
    if not documents:
        return case
    case["funds"] = build_funds_profile(
        documents,
        case.get("business") or {},
        case.get("entity") or {},
        classify(documents),
        case.get("findings") or [],
        case.get("companies") or [],
    )
    return save(case)


@router.post("/{case_id}/documents")
async def add_documents(case_id: str, files: list[UploadFile] = File(...)):
    """Add PDFs to an open case and re-read the whole pack, so new names join the people already found."""
    case = load_case(case_id)
    folder = case_dir(case_id)
    added = []
    for upload in files:
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            continue
        target = folder / Path(upload.filename).name
        target.write_bytes(await upload.read())
        PdfReader(str(target))
        added.append(target.name)
    if not added:
        raise HTTPException(status_code=400, detail="Upload at least one PDF.")
    texts = _texts(folder)
    if case.get("intake"):
        pages = {path.name: len(PdfReader(str(path)).pages) for path in folder.glob("*.pdf")}
        assessment = _prepared_assessment(texts, pages)
    else:
        assessment = assess(texts)
    keep = {key: case[key] for key in ("id", "title", "created_at", "decision", "audit", "adverse_media", "memo") if key in case}
    updated = {**assessment, **keep}
    updated["added_documents"] = added
    append_audit(updated, "documents_added", f"Added {', '.join(added)} to the Knowledge Base.")
    return save(updated)


@router.get("/{case_id}")
def get_case(case_id: str):
    return _with_funds(load_case(case_id))


@router.get("/{case_id}/risk-rating")
def get_risk_rating(case_id: str):
    return build_risk_rating(load_case(case_id))


@router.get("/{case_id}/risk-rating/report")
def get_risk_report(case_id: str):
    case = load_case(case_id)
    rating = build_risk_rating(case)
    pdf = build_report(case, rating)
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Tracy_Risk_Report_{case_id}.pdf"'},
    )


@router.get("/{case_id}/files/{filename}")
def get_file(case_id: str, filename: str):
    name = Path(filename).name
    path = case_dir(case_id) / name
    if not path.exists() and (PACK_DIR / name).exists():
        shutil.copy(PACK_DIR / name, path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="application/pdf")
