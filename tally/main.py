from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pypdf import PdfReader

import json

from tally.assess import apply_score, assess, read_pdf
from tally.config import DATA, ROOT
from tally.config import rules as load_rules
from tally.demo_pack import write_sample
from tally.sanctions_data import sanctions_summary, screen_public
from tally.store import append_audit, case_dir, load, new_id, save, stamp

app = FastAPI(title="Tally")
STATIC = ROOT / "static"
app.mount("/static", StaticFiles(directory=STATIC), name="static")


class Decision(BaseModel):
    status: str
    rating: str | None = None
    note: str = ""


class FindingDecision(BaseModel):
    disposition: str
    note: str = ""


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


def _texts(folder: Path) -> dict[str, str]:
    documents = {}
    for path in sorted(folder.glob("*.pdf")):
        documents[path.name] = read_pdf(path)
    if not documents:
        raise HTTPException(status_code=400, detail="Upload at least one PDF.")
    return documents


@app.post("/api/cases/sample")
def sample_case():
    case_id = "harbour-lantern"
    folder = case_dir(case_id)
    for old in folder.glob("*.pdf"):
        old.unlink()
    write_sample(folder)
    assessment = assess(_texts(folder))
    title = (assessment.get("entity") or {}).get("legal_name") or "Harbour Lantern Trading Limited"
    return stamp(case_id, title, assessment)


@app.post("/api/cases")
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


@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    try:
        return load(case_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found") from None


@app.get("/api/cases/{case_id}/files/{filename}")
def get_file(case_id: str, filename: str):
    path = case_dir(case_id) / Path(filename).name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="application/pdf")


@app.post("/api/cases/{case_id}/decision")
def decide(case_id: str, body: Decision):
    try:
        case = load(case_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found") from None
    if body.status not in {"approved", "returned", "overridden"}:
        raise HTTPException(status_code=400, detail="Status must be approved, returned, or overridden.")
    case["decision"] = body.model_dump()
    append_audit(case, "case_decision", f"Officer set status to {body.status}, rating {body.rating or 'unchanged'}. {body.note}".strip())
    return save(case)


def _apply_risk(case: dict) -> None:
    scored = apply_score(case.get("findings") or [], load_rules())
    case.setdefault("risk", {}).update({
        "score": scored["score"],
        "rating": scored["rating"],
        "factors": scored["factors"],
    })
    case.setdefault("modules", {}).setdefault("risk", {})
    case["modules"]["risk"]["rating"] = scored["rating"]
    case["modules"]["risk"]["score"] = scored["score"]


@app.post("/api/cases/{case_id}/findings/{finding_id}")
def decide_finding(case_id: str, finding_id: str, body: FindingDecision):
    try:
        case = load(case_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found") from None
    if body.disposition not in {"accepted", "overridden"}:
        raise HTTPException(status_code=400, detail="Disposition must be accepted or overridden.")
    target = next((item for item in case.get("findings") or [] if item["id"] == finding_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    target["officer"] = body.model_dump()
    _apply_risk(case)
    append_audit(case, "finding_decision", f"{body.disposition}: {target['title']}. {body.note}".strip())
    return save(case)


@app.post("/api/cases/{case_id}/rescore")
def rescore(case_id: str):
    try:
        case = load(case_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found") from None
    _apply_risk(case)
    append_audit(case, "rescore", f"Risk recalculated from the current rules: {case['risk']['rating']} ({case['risk']['score']} points).")
    return save(case)


@app.get("/api/policy")
def get_policy():
    return load_rules()


@app.put("/api/policy")
def put_policy(body: dict):
    needed = {"label", "points", "bands", "match_threshold", "high_risk_jurisdictions", "required_documents", "review_months"}
    if not needed <= set(body):
        raise HTTPException(status_code=400, detail="Policy is missing fields.")
    path = DATA / "rules.json"
    path.write_text(json.dumps(body, indent=2))
    return body


@app.post("/api/cases/{case_id}/monitor")
def monitor(case_id: str):
    try:
        case = load(case_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found") from None
    titles = {item["title"] for item in case.get("findings") or []}
    added = 0
    parties = [*(case.get("people") or []), *(case.get("companies") or [])]
    for party in parties:
        forms = [party.get("name") or "", *(party.get("aliases") or [])]
        hit = screen_public([form for form in forms if form])
        title = f"Possible sanctions match: {party.get('name')}"
        if not hit or title in titles:
            continue
        program = hit["entry"].get("program") or hit["entry"].get("source")
        case["findings"].append({
            "id": f"screening-sanctions-monitor-{added}",
            "module": "screening",
            "code": "sanctions",
            "title": title,
            "detail": f"'{hit['query']}' scored {hit['score']:.2f} against '{hit['candidate']}' on {hit['entry'].get('source')} ({program}) during monitoring.",
            "severity": "high",
            "officer": None,
            "evidence": [{
                "document": hit["entry"].get("source", "Sanctions list"),
                "quote": f"Listed name: {hit['candidate']}. Program: {program}.",
                "context": "Public consolidated list, re-checked after the case was opened.",
                "verified": True,
                "kind": "list",
            }],
        })
        titles.add(title)
        added += 1
    summary = sanctions_summary()
    monitoring = case.setdefault("monitoring", {"triggers": []})
    replaced = False
    for trigger in monitoring.get("triggers") or []:
        if trigger.get("kind") == "sanctions_list":
            trigger["detail"] = summary
            trigger["due"] = added > 0
            replaced = True
    if not replaced:
        monitoring.setdefault("triggers", []).append({"kind": "sanctions_list", "due": added > 0, "detail": summary})
    _apply_risk(case)
    append_audit(case, "monitoring", f"Re-screened {len(parties)} names. New public-list hits: {added}.")
    return save(case)
