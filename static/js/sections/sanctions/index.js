import { $, $$, escapeHtml } from "../../core/dom.js";
import { api } from "../../core/api.js";
import { pageHeader } from "../../components/page-header.js";
import { icon } from "../../lib/icons.js";
import { flagImg } from "../../lib/flags.js";

// ── helpers ────────────────────────────────────────────────────────────────

function statusBadge(status) {
  if (status === "potential_match") return `<span class="status-badge potential-match">Potential Match</span>`;
  if (status === "pep")             return `<span class="status-badge pep">PEP Identified</span>`;
  return `<span class="status-badge clear">Clear</span>`;
}

function avatarIcon(kind) {
  return kind === "company"
    ? icon("building", 18)
    : icon("user", 18);
}

function confidenceColor(pct) {
  if (pct >= 70) return "";        // red (default gradient)
  if (pct >= 40) return "amber";
  return "green";
}

function matchPctClass(score) {
  if (score >= 70) return "high-match";
  if (score >= 30) return "mid-match";
  return "no-match";
}

function matchPctLabel(score, hasHit) {
  if (!hasHit || score === 0) return "No match";
  return `${score}% match`;
}

// ── render helpers ─────────────────────────────────────────────────────────

function renderResultRow(party, idx, selected) {
  const flag = party.nationality ? flagImg(party.nationality, "node-flag") : "";
  return `
    <div class="result-row${selected ? " selected" : ""}" data-idx="${idx}">
      <div class="result-avatar${party.kind === "company" ? " company" : ""}">
        ${avatarIcon(party.kind)}
      </div>
      <div class="result-info">
        <div class="result-name">${escapeHtml(party.name)}</div>
        <div class="result-role">${escapeHtml(party.role)}</div>
      </div>
      <div class="result-country">${flag}${escapeHtml(party.nationality || "")}</div>
      ${statusBadge(party.status)}
      <span class="result-chevron">${icon("chevron-right", 14)}</span>
    </div>`;
}

function renderDetailEmpty() {
  return `
    <div class="detail-empty">
      ${icon("search", 32)}
      <p>Select a person or entity on the left to see screening details.</p>
    </div>`;
}

function renderAlertBanner(party) {
  if (party.status === "potential_match") {
    return `
      <div class="match-alert red">
        <span class="match-alert-icon">${icon("alert-triangle", 16)}</span>
        <div>
          <strong>Potential match to sanctions list</strong>
          This individual may appear on a sanctions list. Please review the details and evidence.
        </div>
      </div>`;
  }
  if (party.status === "pep") {
    return `
      <div class="match-alert amber">
        <span class="match-alert-icon">${icon("alert-triangle", 16)}</span>
        <div>
          <strong>Potential match to PEP list</strong>
          This individual may match a politically exposed person in a public list. Please review the details and evidence.
        </div>
      </div>`;
  }
  return "";
}

function renderOverviewTab(party) {
  const flag = party.nationality ? flagImg(party.nationality, "node-flag") : "";
  const confidenceBar = party.confidence > 0 ? `
    <div class="confidence-bar-wrap">
      <div class="confidence-bar-track">
        <div class="confidence-bar-fill ${confidenceColor(party.confidence)}" style="width:${party.confidence}%"></div>
      </div>
    </div>` : "";

  const rows = [
    ["Name",          party.name],
    ["Position",      party.position || "—"],
    ["Also known as", party.also_known_as || "—"],
    ["Organisation",  party.organisation || "—"],
    ["Date of Birth", party.date_of_birth || "—"],
    ["Type",          party.pep_type || "—"],
    ["Nationality",   party.nationality || "—"],
    ["Match Confidence", party.confidence > 0 ? `${party.confidence}%` : "—"],
  ];

  const grid = rows.map(([label, value], i) => {
    const isConf = label === "Match Confidence";
    return `
      <div class="party-detail-label">${label}</div>
      <div class="party-detail-value">
        ${label === "Nationality" && flag ? `${flag} ` : ""}${escapeHtml(String(value))}
        ${isConf ? confidenceBar : ""}
      </div>`;
  }).join("");

  const records = (party.matched_records || []).map((rec, i) => {
    const pctClass = matchPctClass(rec.score);
    const pctLabel = matchPctLabel(rec.score, rec.match || rec.score > 0);
    const snippet  = rec.snippet
      ? `<p>${escapeHtml(rec.snippet)}</p>`
      : rec.candidate
        ? `<p>${escapeHtml(rec.candidate)}</p>`
        : "";
    const source   = rec.source ? `<span>Source: ${escapeHtml(rec.source)}</span>` : "";
    const program  = rec.program ? `<span>${escapeHtml(rec.program)}</span>` : "";

    return `
      <div class="matched-record-card">
        <div class="matched-record-header" data-rec="${i}">
          <div>
            <span class="matched-record-name">${i + 1}. ${escapeHtml(rec.list)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span class="match-pct-badge ${pctClass}">${pctLabel}</span>
            ${icon("chevron-down", 14)}
          </div>
        </div>
        <div class="matched-record-body${i === 0 && rec.match ? " open" : ""}" id="rec-body-${i}">
          ${rec.match || rec.score > 0 ? snippet : "<p>No match found on this list.</p>"}
          <div class="matched-record-source">
            ${source}
            ${program}
          </div>
          ${rec.match ? `<a class="view-source-link" href="#" target="_blank">${icon("external-link", 12)} View Original Source</a>` : ""}
        </div>
      </div>`;
  }).join("");

  return `
    ${renderAlertBanner(party)}
    <div class="party-detail-grid">${grid}</div>
    <div class="matched-records-title">Matched Records</div>
    ${records}`;
}

function renderDetailPanel(party) {
  if (!party) return renderDetailEmpty();

  const flag = party.nationality ? flagImg(party.nationality) : "";
  const roleLabel = party.role || (party.kind === "company" ? "Entity" : "Individual");

  return `
    <div class="detail-party-header">
      <div class="detail-avatar${party.kind === "company" ? " company" : ""}">
        ${avatarIcon(party.kind)}
      </div>
      <div class="detail-name-block">
        <strong>${escapeHtml(party.name)}</strong>
        <span>${escapeHtml(roleLabel)}${party.nationality ? ` &nbsp;|&nbsp;` : ""}</span>
        ${party.nationality ? `<span class="detail-flag">${flag}${escapeHtml(party.nationality)}</span>` : ""}
      </div>
      ${statusBadge(party.status)}
    </div>

    <div class="detail-tabs">
      <button class="detail-tab active" data-tab="overview">Overview</button>
      <button class="detail-tab" data-tab="match-details">Match Details</button>
      <button class="detail-tab" data-tab="sources">Sources</button>
      <button class="detail-tab" data-tab="notes">Notes</button>
    </div>

    <div class="detail-tab-content" id="detail-tab-body">
      ${renderOverviewTab(party)}
    </div>`;
}

// ── main export ────────────────────────────────────────────────────────────

export default {
  id: "sanctions",
  step: 3,
  label: "Sanctions & PEP",
  done: false,

  mount(container, caseData) {
    // Show loading skeleton
    container.innerHTML = `
      ${pageHeader({
        title: "Sanctions, PEP & Name Screening",
        subtitle: "Automatically screen all individuals and entities in the case against global sanctions, PEP and adverse media lists.",
      })}
      <div class="sanctions-loading">
        <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        Running screening…
      </div>`;

    const caseId = caseData?.id;
    if (!caseId) return;

    // Fetch screening results
    api.getScreening(caseId)
      .then((data) => _render(container, caseData, data))
      .catch((err) => {
        container.querySelector(".sanctions-loading").innerHTML =
          `<span style="color:#dc2626">${icon("alert-triangle", 16)} Failed to load: ${escapeHtml(String(err))}</span>`;
      });
  },
};

function _render(container, caseData, data) {
  const results  = data.results  || [];
  const counts   = data.counts   || {};
  let selectedIdx = results.findIndex((r) => r.status !== "clear");
  if (selectedIdx < 0) selectedIdx = 0;

  function buildHtml(filter = "") {
    const lower = filter.toLowerCase();
    const visible = results.filter(
      (r) => !lower || r.name.toLowerCase().includes(lower) || (r.role || "").toLowerCase().includes(lower)
    );

    const rows = visible.map((party, i) =>
      renderResultRow(party, results.indexOf(party), results.indexOf(party) === selectedIdx)
    ).join("");

    return `
      ${pageHeader({
        title: "Sanctions, PEP & Name Screening",
        subtitle: "Automatically screen all individuals and entities in the case against global sanctions, PEP and adverse media lists.",
      })}

      <!-- Stats bar -->
      <div class="sanctions-stats">
        <div class="stat-cell">
          <span class="stat-num">${counts.total ?? results.length}</span>
          <span class="stat-label">Total Screened</span>
        </div>
        <div class="stat-cell">
          <span class="stat-num match-red">${counts.potential_match ?? 0}</span>
          <span class="stat-label">Potential Match</span>
        </div>
        <div class="stat-cell">
          <span class="stat-num match-amber">${counts.pep ?? 0}</span>
          <span class="stat-label">PEP Identified</span>
        </div>
        <div class="stat-cell">
          <span class="stat-num match-green">${counts.clear ?? 0}</span>
          <span class="stat-label">Clear</span>
        </div>
      </div>

      <!-- Two-col split -->
      <div class="sanctions-split">
        <!-- Left: list -->
        <div class="results-panel">
          <div class="results-panel-header">
            <h2>Screening Results</h2>
            <div class="results-search-row">
              <div class="search-box">
                ${icon("search", 14)}
                <input id="sanctions-search" type="text" placeholder="Search name or entity…" value="${escapeHtml(filter)}" />
              </div>
              <button class="btn-filter">${icon("filter", 13)} Filter</button>
            </div>
          </div>
          <div id="result-rows">${rows || `<div style="padding:2rem;text-align:center;color:#94a3b8;font-size:0.85rem;">No results match your search.</div>`}</div>
        </div>

        <!-- Right: detail -->
        <div class="detail-panel" id="detail-panel">
          ${renderDetailPanel(results[selectedIdx] || null)}
        </div>
      </div>`;
  }

  container.innerHTML = buildHtml();
  _bindEvents(container, results);
}

function _bindEvents(container, results) {
  let selectedIdx = results.findIndex((r) => r.status !== "clear");
  if (selectedIdx < 0) selectedIdx = 0;

  // Row click → update detail panel
  function selectRow(idx) {
    selectedIdx = idx;
    $$(".result-row", container).forEach((row) => {
      row.classList.toggle("selected", Number(row.dataset.idx) === idx);
    });
    const detail = $("#detail-panel", container);
    if (detail) detail.innerHTML = renderDetailPanel(results[idx] || null);
    _bindDetailEvents(container, results, idx);
  }

  container.addEventListener("click", (e) => {
    const row = e.target.closest(".result-row");
    if (row) {
      selectRow(Number(row.dataset.idx));
      return;
    }
  });

  // Search
  const searchInput = $("#sanctions-search", container);
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const filter = e.target.value;
      const lower  = filter.toLowerCase();
      $$(".result-row", container).forEach((row) => {
        const idx    = Number(row.dataset.idx);
        const party  = results[idx];
        const show   = !lower || party.name.toLowerCase().includes(lower) || (party.role || "").toLowerCase().includes(lower);
        row.style.display = show ? "" : "none";
      });
    });
  }

  // Bind detail events for initially selected row
  _bindDetailEvents(container, results, selectedIdx);
}

function _bindDetailEvents(container, results, idx) {
  const detail = $("#detail-panel", container);
  if (!detail) return;

  // Tab switching
  $$(".detail-tab", detail).forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".detail-tab", detail).forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const body = $("#detail-tab-body", detail);
      if (!body) return;
      const tabName = tab.dataset.tab;
      if (tabName === "overview") {
        body.innerHTML = renderOverviewTab(results[idx]);
        _bindRecordAccordion(detail);
      } else {
        body.innerHTML = `<p style="color:#94a3b8;font-size:0.83rem;padding:0.5rem 0">${escapeHtml(tabName)} details coming soon.</p>`;
      }
    });
  });

  _bindRecordAccordion(detail);
}

function _bindRecordAccordion(detail) {
  $$(".matched-record-header", detail).forEach((header) => {
    header.addEventListener("click", () => {
      const idx  = header.dataset.rec;
      const body = detail.querySelector(`#rec-body-${idx}`);
      if (body) body.classList.toggle("open");
    });
  });
}
