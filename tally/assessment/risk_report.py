"""One-page risk report the officer can download from the Risk Rating screen."""
from fpdf import FPDF


def build_report(case: dict, rating: dict) -> bytes:
    risk = rating.get("risk_score") or {}
    name = (case.get("entity") or {}).get("legal_name") or case.get("title") or "Applicant"
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "Tracy risk report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, _safe(name), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _safe(f"Score {risk.get('score', 0)} / 100  ·  {risk.get('level', 'Low')} risk"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Findings", new_x="LMARGIN", new_y="NEXT")
    findings = rating.get("findings") or []
    if not findings:
        _line(pdf, "No findings on this case.")
    for index, item in enumerate(findings, start=1):
        _line(pdf, f"{index}. {item.get('title', '')} ({item.get('severity', '')})", bold=True, size=11)
        _line(pdf, item.get("description") or "")
        where = item.get("document_id") or ""
        if where:
            _line(pdf, f"Document: {where}")
        pdf.ln(1)
    comparison = rating.get("cross_source") or []
    if comparison:
        pdf.ln(2)
        _line(pdf, "Cross-source comparison", bold=True, size=13)
        for row in comparison:
            status = "Consistent" if row.get("consistent") else "Inconsistency"
            _line(pdf, f"{row.get('label', '')} - {status}", bold=True, size=11)
            for value in row.get("values") or []:
                _line(pdf, f"{value.get('document_id', '')}: {value.get('value', '')}")
            pdf.ln(1)
    pdf.ln(4)
    _line(pdf, "Scores follow an illustrative sample policy. The officer decides.", size=9)
    return bytes(pdf.output())


def _line(pdf: FPDF, text: str, bold: bool = False, size: int = 10) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B" if bold else "", size)
    pdf.multi_cell(pdf.epw, 6, _safe(text))


def _safe(value) -> str:
    return str(value or "").encode("latin-1", "replace").decode("latin-1")
