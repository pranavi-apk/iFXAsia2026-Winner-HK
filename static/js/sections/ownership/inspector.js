import { escapeHtml } from "../../core/dom.js";
import { flagImg } from "../../lib/flags.js";
import { icon } from "../../lib/icons.js";

const FINDING_STYLE = {
  warning: { glyph: "⚠️", color: "#d97706" },
  info: { glyph: "ℹ️", color: "#2563eb" },
};

function profileCard(view) {
  const { counts } = view;
  const rows = view.info
    .map((row) => {
      const flag = row.flag ? `${flagImg(row.flag, "flag-inline")} ` : "";
      const style = row.small ? ' style="font-size: 0.75rem; line-height: 1.2;"' : "";
      return `
        <tr>
          <td class="lbl">${escapeHtml(row.label)}</td>
          <td class="val"${style}>${flag}${escapeHtml(row.value)}</td>
        </tr>`;
    })
    .join("");

  return `
    <div class="card-panel">
      <div class="entity-header-card">
        ${flagImg(view.jurisdiction, "entity-flag")}
        <div class="entity-title-box">
          <h3>${escapeHtml(view.legalName)}</h3>
          <div class="entity-subtitle">${escapeHtml(view.jurisdiction)} · <span class="node-tag" style="background: #e0e7ff; color: #3730a3;">${escapeHtml(view.companyType)}</span></div>
        </div>
      </div>

      <div class="sub-nav-tabs">
        <button class="sub-tab-btn active">Overview</button>
        <button class="sub-tab-btn">Related Entities (${counts.related})</button>
        <button class="sub-tab-btn">Documents (${counts.documents})</button>
        <button class="sub-tab-btn">Findings (${counts.findings})</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h4 style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">Basic Information</h4>
        <button class="btn btn-secondary btn-sm" style="padding: 1px 8px; font-size: 0.72rem;">Edit</button>
      </div>

      <table class="info-table">${rows}</table>
    </div>`;
}

function ubosCard(view) {
  const items = view.ubos
    .map(
      (u) => `
      <div class="ubo-list-item">
        <div class="ubo-name">
          ${icon("user", 14)}
          ${escapeHtml(u.name)}
        </div>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <span class="ubo-percent">${u.pct}%</span>
          <span style="font-size: 0.78rem; color: #64748b;">${escapeHtml(u.country)}</span>
        </div>
      </div>`
    )
    .join("");
  return `
    <div class="card-panel">
      <div class="right-section-title">
        <span>Ultimate Beneficial Owners</span>
        <a href="#" class="link-action">View All</a>
      </div>
      ${items}
    </div>`;
}

function documentsCard(view) {
  const items = view.sourceDocuments
    .map(
      (title) => `
      <div class="doc-list-item">
        <div class="doc-left">
          ${icon("doc", 18, { className: "doc-icon" })}
          <div>
            <div class="doc-title">${escapeHtml(title)}</div>
            <div class="doc-sub">${escapeHtml(view.legalName)}</div>
          </div>
        </div>
        <span class="badge-extracted">Extracted</span>
      </div>`
    )
    .join("");
  return `
    <div class="card-panel">
      <div class="right-section-title">
        <span>Source Documents</span>
        <a href="#" class="link-action">View All</a>
      </div>
      ${items}
    </div>`;
}

function findingsCard(view) {
  const items = view.keyFindings
    .map((f) => {
      const style = FINDING_STYLE[f.kind] || FINDING_STYLE.info;
      return `
      <div class="finding-alert-card ${f.kind}">
        <span style="color: ${style.color};">${style.glyph}</span>
        <div>
          <div class="finding-alert-title">${escapeHtml(f.title)}</div>
          <div class="finding-alert-sub">${escapeHtml(f.sub)}</div>
        </div>
      </div>`;
    })
    .join("");
  return `
    <div class="card-panel">
      <div class="right-section-title">
        <span>Key Findings for this Entity</span>
        <span style="font-size: 0.7rem; font-weight: 700; background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px;">${view.keyFindings.length} findings</span>
      </div>
      ${items}
    </div>`;
}

export function renderInspector(view) {
  return profileCard(view) + ubosCard(view) + documentsCard(view) + findingsCard(view);
}
