"""Opening cases and reading them back."""
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pypdf import PdfReader

from tally.api.deps import load_case
from tally.assessment import assess, read_pdf
from tally.intake import build_intake, pack_documents
from tally.mock_pack import PACK_DIR, write_pack
from tally.store import case_dir, new_id, stamp

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _texts(folder: Path) -> dict[str, str]:
    documents = {}
    for path in sorted(folder.glob("*.pdf")):
        documents[path.name] = read_pdf(path)
    if not documents:
        raise HTTPException(status_code=400, detail="Upload at least one PDF.")
    return documents


SAMPLE_ID = "silver-oak"


@router.post("/sample")
def sample_case():
    """Open the mock Silver Oak pack. The PDFs in demo/silver-oak-pack are read in code, with no model call."""
    if not any(PACK_DIR.glob("*.pdf")):
        write_pack()
    folder = case_dir(SAMPLE_ID)
    for old in folder.glob("*.pdf"):
        old.unlink()
    for path in PACK_DIR.glob("*.pdf"):
        shutil.copy(path, folder / path.name)
    texts = _texts(folder)
    intake = build_intake(texts)
    profile = intake["company"]["profile"]
    pages = {path.name: len(PdfReader(str(path)).pages) for path in folder.glob("*.pdf")}
    assessment = {
        "entity": {
            "legal_name": profile["legalName"], "company_number": profile["registrationNumber"],
            "jurisdiction": profile["jurisdiction"], "registered_address": profile["registeredOffice"],
        },
        "people": [{"name": d["name"], "kind": "person", "roles": [d["role"].lower()], "nationality": d["nationality"]}
                   for d in intake["management"]["directors"]],
        "companies": [{"name": row["name"], "kind": "company"} for row in intake["screening"] if row["kind"] == "company"],
        "documents": pack_documents(texts, pages, intake),
        "findings": intake["findings"],
        "business": {"turnover": f"USD {intake['business']['financialStatements']['turnoverUsd'] / 1_000_000:.1f}M"},
        "intake": intake,
    }
    return stamp(SAMPLE_ID, profile["legalName"], assessment)


@router.post("")
async def create_case(files: list[UploadFile] = File(...)):
    case_id = new_id()
    folder = case_dir(case_id)
    for upload in files:
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            continue
        target = folder / Path(upload.filename).name
        target.write_bytes(await upload.read())
        PdfReader(str(target))
    assessment = assess(_texts(folder))
    title = (assessment.get("entity") or {}).get("legal_name") or "Uploaded case"
    return stamp(case_id, title, assessment)


@router.get("/{case_id}")
def get_case(case_id: str):
    return load_case(case_id)


@router.get("/{case_id}/files/{filename}")
def get_file(case_id: str, filename: str):
    path = case_dir(case_id) / Path(filename).name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="application/pdf")
