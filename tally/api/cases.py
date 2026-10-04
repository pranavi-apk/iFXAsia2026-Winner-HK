"""Opening cases and reading them back."""
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pypdf import PdfReader

from tally.api.deps import load_case
from tally.assessment import assess, read_pdf
from tally.assessment.risk_rating import build_risk_rating
from tally.demo_pack import write_sample
from tally.store import case_dir, new_id, stamp

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _texts(folder: Path) -> dict[str, str]:
    documents = {}
    for path in sorted(folder.glob("*.pdf")):
        documents[path.name] = read_pdf(path)
    if not documents:
        raise HTTPException(status_code=400, detail="Upload at least one PDF.")
    return documents


@router.post("/sample")
def sample_case():
    case_id = "harbour-lantern"
    folder = case_dir(case_id)
    for old in folder.glob("*.pdf"):
        old.unlink()
    write_sample(folder)
    assessment = assess(_texts(folder))
    title = (assessment.get("entity") or {}).get("legal_name") or "Harbour Lantern Trading Limited"
    return stamp(case_id, title, assessment)


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


@router.get("/{case_id}/risk-rating")
def get_risk_rating(case_id: str):
    case = load_case(case_id)
    return build_risk_rating(case, case_dir(case_id))


@router.get("/{case_id}/risk-rating/report")
def get_risk_report(case_id: str):
    case = load_case(case_id)
    try:
        from tally.assessment.risk_report import build_report
    except ImportError:
        raise HTTPException(status_code=503, detail="Report generation needs reportlab: pip install -r requirements.txt") from None
    pdf = build_report(case, build_risk_rating(case, case_dir(case_id)))
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Tracy_Risk_Report_{case_id}.pdf"'},
    )


@router.get("/{case_id}/files/{filename}")
def get_file(case_id: str, filename: str):
    path = case_dir(case_id) / Path(filename).name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="application/pdf")
