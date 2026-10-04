import { pageHeader } from "../../components/page-header.js";
import { escapeHtml } from "../../core/dom.js";
import { DOC_STATUS_LABEL, buildDocumentsView } from "./view-model.js";

const CELL = "padding: 1rem;";
const MUTED = `${CELL} color: #64748b;`;

const fileLink = (caseId, file) =>
  `/api/cases/${encodeURIComponent(caseId || "")}/files/${encodeURIComponent(file)}`;

// One table row. `row.file` is empty when there is no PDF for the item.
function tableRow(row, caseId) {
  const name = row.file
    ? `<a href="${fileLink(caseId, row.file)}" target="_blank" rel="noopener" style="color: #2563eb; text-decoration: none;">${escapeHtml(row.file)}</a>`
    : "";
  return `
    <tr style="border-bottom: 1px solid #e2e8f0;${ROW_STYLE[row.status] || ""}">
      <td style="${CELL} padding-left: 2rem;">
        <div style="font-weight: 500; color: #334155;">${escapeHtml(row.title)}</div>
        ${row.note ? `<div class="doc-note">${escapeHtml(row.note)}</div>` : ""}
      </td>
      <td style="${MUTED} font-size: 0.8rem;">${name}</td>
      <td style="${MUTED} white-space: nowrap;">${escapeHtml(row.date)}</td>
      <td style="${MUTED} white-space: nowrap;">${row.pages ? `${row.pages} ${row.pages === 1 ? "Page" : "Pages"}` : ""}</td>
      <td style="${CELL}"><span class="doc-badge doc-${escapeHtml(row.status)}">${escapeHtml(DOC_STATUS_LABEL[row.status] || row.status)}</span></td>
    </tr>`;
}

const COLUMNS = 5;

// Rows that need attention are tinted to match their status badge.
const ROW_STYLE = {
  stale: " background: #fffbeb;",
  expired: " background: #fef2f2;",
  missing: " background: #fef2f2;",
};

const groupRow = (group) => `
    <tr>
      <td colspan="${COLUMNS}" style="padding: 0.7rem 1rem; background: #eff6ff; border-left: 4px solid #2563eb; border-top: 2px solid #ffffff;">
        <span style="font-size: 0.95rem; font-weight: 800; color: #1d4ed8;">${escapeHtml(group.title)}</span>
        <span style="margin-left: 0.6rem; font-size: 0.75rem; font-weight: 600; color: #64748b;">${group.rows.length} ${group.rows.length === 1 ? "document" : "documents"}</span>
      </td>
    </tr>`;

export default {
  id: "documents",
  step: 1,
  label: "Documents",
  done: true,

  mount(container, caseData) {
    if (!caseData?.intake) {
      container.innerHTML = pageHeader({ title: "Documents", subtitle: "This case has no structured intake. Open the sample case." });
      return;
    }
    const { groups, total, withFile } = buildDocumentsView(caseData);

    container.innerHTML = `
      ${pageHeader({
        title: "Document Repository & Extraction Pack",
        subtitle: `Verifiable corporate filings and parsed documents for case: ${escapeHtml(caseData.title || caseData.id)}`
      })}

      <div class="documents-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1rem;">
        <div class="card-panel" style="background: #ffffff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem;">Uploaded Onboarding Pack</h3>
            <p style="font-size: 0.88rem; color: #64748b; margin: 0;">${withFile} of ${total} checklist items have a PDF in the pack.</p>
          </div>
          <label class="btn btn-primary" style="padding: 0.6rem 1.25rem; background: #2563eb; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
            <span>Upload Additional File</span>
            <input type="file" accept="application/pdf" style="display:none;" />
          </label>
        </div>

        <div class="card-panel" style="background: #ffffff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
            <thead>
              <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">
                <th style="padding: 0.75rem 1rem;">Document</th>
                <th style="padding: 0.75rem 1rem;">PDF</th>
                <th style="padding: 0.75rem 1rem;">Issued</th>
                <th style="padding: 0.75rem 1rem;">Pages</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
              </tr>
            </thead>
            <tbody>${groups.map((group) => groupRow(group) + group.rows.map((row) => tableRow(row, caseData.id)).join("")).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  }
};
