import { pageHeader } from "../../components/page-header.js";
import { escapeHtml } from "../../core/dom.js";

export default {
  id: "documents",
  step: 1,
  label: "Documents",
  done: true,

  mount(container, caseData) {
    const docs = caseData?.documents || [
      { filename: "Certificate_of_Incorporation.pdf", type: "Corporate Filing", date: "2024-01-15", pages: 2, size: "1.2 MB", status: "Verified" },
      { filename: "Register_of_Members.pdf", type: "Shareholder Register", date: "2024-02-10", pages: 5, size: "2.4 MB", status: "Verified" },
      { filename: "Register_of_Directors.pdf", type: "Director List", date: "2024-02-10", pages: 3, size: "1.8 MB", status: "Verified" },
      { filename: "Board_Resolution_UBO.pdf", type: "Board Minute", date: "2024-03-01", pages: 4, size: "3.1 MB", status: "Verified" }
    ];

    container.innerHTML = `
      ${pageHeader({
        title: "Document Repository & Extraction Pack",
        subtitle: `Verifiable corporate filings and parsed documents for case: ${escapeHtml(caseData?.id || "Harbour Lantern")}`
      })}

      <div class="documents-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1rem;">
        <!-- Overview Banner -->
        <div class="card-panel" style="background: #ffffff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem;">Uploaded Onboarding Pack</h3>
            <p style="font-size: 0.88rem; color: #64748b; margin: 0;">${docs.length} documents uploaded and OCR parsed with quote-level evidence indexing.</p>
          </div>
          <label class="btn btn-primary" style="padding: 0.6rem 1.25rem; background: #2563eb; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
            <span>Upload Additional File</span>
            <input type="file" accept="application/pdf" style="display:none;" />
          </label>
        </div>

        <!-- Documents Table -->
        <div class="card-panel" style="background: #ffffff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
            <thead>
              <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">
                <th style="padding: 0.75rem 1rem;">Document Name</th>
                <th style="padding: 0.75rem 1rem;">Type</th>
                <th style="padding: 0.75rem 1rem;">Date</th>
                <th style="padding: 0.75rem 1rem;">Pages</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${docs.map(d => `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 1rem; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>${escapeHtml(d.filename || d.name || "Document.pdf")}</span>
                  </td>
                  <td style="padding: 1rem; color: #475569;">${escapeHtml(d.type || "Corporate Filing")}</td>
                  <td style="padding: 1rem; color: #64748b;">${escapeHtml(d.date || "2024-02-10")}</td>
                  <td style="padding: 1rem; color: #64748b;">${d.pages || 2} Pages</td>
                  <td style="padding: 1rem;">
                    <span style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 9999px;">Verified</span>
                  </td>
                  <td style="padding: 1rem; text-align: right;">
                    <button style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 0.4rem 0.85rem; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer;">View OCR Extraction</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
