import { $, $$, escapeHtml } from "../../core/dom.js";
import { api } from "../../core/api.js";
import { state } from "../../core/state.js";
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
          ${rec.match || rec.score > 0 ? snippet : (rec.snippet ? `<p>${escapeHtml(rec.snippet)}</p>` : "<p>No match found on this list.</p>")}
          <div class="matched-record-source">
            ${source}
            ${program}
          </div>
          ${rec.url ? `<a class="view-source-link" href="${escapeHtml(rec.url)}" target="_blank" rel="noopener">${icon("external-link", 12)} View source</a>` : ""}
          ${rec.lead_id ? `<button type="button" class="btn-filter lead-dismiss" data-lead="${escapeHtml(rec.lead_id)}">Dismiss lead</button>` : ""}
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
        subtitle: "Hong Kong UN sanctions (CEDB and the Security Bureau), plus OFAC, EU and UK. OpenSanctions is an extra non-commercial file, not a production license. PEP is a labelled sample. Adverse media is a name-only web search.",
      })}
      <div class="sanctions-loading">
        <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        Screening the names and searching adverse media…
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
        subtitle: "Hong Kong UN sanctions (CEDB and the Security Bureau), plus OFAC, EU and UK. OpenSanctions is an extra non-commercial file, not a production license. PEP is a labelled sample. Adverse media is a name-only web search.",
      })}

      <div class="sanctions-actions" style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin:0.75rem 0;">
        <input id="live-lookup-name" type="text" placeholder="Look up one name" style="padding:0.45rem 0.7rem;border:1px solid #cbd5e1;border-radius:8px;min-width:220px;" />
        <button type="button" id="live-lookup-btn" class="btn-filter">Look up</button>
        <button type="button" id="adverse-btn" class="btn-filter">Search again</button>
        <span id="lookup-result" style="font-size:0.82rem;color:#475569;"></span>
      </div>
      <p style="font-size:0.78rem;color:#64748b;margin:0 0 0.75rem;">${escapeHtml(data.sources || "")} ${escapeHtml(data.pep_label || "")}</p>

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
              <button type="button" id="status-filter" class="btn-filter">${icon("filter", 13)} Filter</button>
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
  _bindTools(container, caseData);
}

function _bindTools(container, caseData) {
  const caseId = caseData?.id;
  const lookupBtn = $("#live-lookup-btn", container);
  const lookupInput = $("#live-lookup-name", container);
  const result = $("#lookup-result", container);
  lookupBtn?.addEventListener("click", () => {
    const name = lookupInput?.value.trim();
    if (!caseId || !name) return;
    result.textContent = "Checking lists…";
    api.liveLookup(caseId, name).then((payload) => {
      if (payload.hit) {
        const entry = payload.hit.entry || {};
        result.textContent = `${payload.hit.candidate} on ${entry.source || "a public list"} (${Math.round(payload.hit.score * 100)}%).`;
      } else if (payload.opensanctions) {
        const entry = payload.opensanctions.entry || {};
        result.textContent = `${payload.opensanctions.candidate} on OpenSanctions (${entry.dataset || entry.program || "aggregate"}, ${Math.round(payload.opensanctions.score * 100)}%). Non-commercial demo file, not the Hong Kong list.`;
      } else if (payload.sample) {
        result.textContent = `${payload.sample.candidate} on the sample list only (${Math.round(payload.sample.score * 100)}%).`;
      } else {
        result.textContent = `No list hit for ${name}.`;
      }
    }).catch((error) => {
      result.textContent = error.message;
    });
  });
  $("#adverse-btn", container)?.addEventListener("click", () => {
    if (!caseId) return;
    result.textContent = "Searching public mentions. Only names are sent…";
    api.adverseMedia(caseId).then((saved) => {
      state.case = saved;
      api.getScreening(caseId).then((fresh) => _render(container, saved, fresh));
    }).catch((error) => {
      result.textContent = error.message;
    });
  });
  $("#status-filter", container)?.addEventListener("click", (event) => {
    const order = ["", "potential_match", "pep", "clear"];
    const current = container.dataset.filter || "";
    const next = order[(order.indexOf(current) + 1) % order.length];
    container.dataset.filter = next;
    event.currentTarget.lastChild.textContent = next ? ` ${next.replaceAll("_", " ")}` : " Filter";
    $$(".result-row", container).forEach((row) => {
      const status = row.querySelector(".status-badge")?.classList.contains("potential-match")
        ? "potential_match"
        : row.querySelector(".status-badge")?.classList.contains("pep")
          ? "pep"
          : "clear";
      row.style.display = !next || status === next ? "" : "none";
    });
  });
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
      } else if (tabName === "match-details") {
        body.innerHTML = renderOverviewTab(results[idx]);
        _bindRecordAccordion(detail);
        _bindLeadButtons(detail);
      } else if (tabName === "sources") {
        const lines = (results[idx].matched_records || []).map((rec) =>
          `<p><strong>${escapeHtml(rec.list)}</strong> ${escapeHtml(rec.source || "")} ${rec.url ? `<a href="${escapeHtml(rec.url)}" target="_blank" rel="noopener">${escapeHtml(rec.url)}</a>` : ""}</p>`
        ).join("");
        body.innerHTML = lines || "<p>No sources for this name.</p>";
      } else {
        body.innerHTML = `<p style="color:#475569;font-size:0.85rem;">${escapeHtml(dataNote(results[idx]))}</p>`;
      }
    });
  });

  _bindRecordAccordion(detail);
  _bindLeadButtons(detail);
}

function dataNote(party) {
  const pep = (party.matched_records || []).some((rec) => rec.list === "Sample PEP list");
  return pep
    ? "This PEP hit is from the labelled sample list, not a licensed PEP database."
    : "Confirm the list source on the Sources tab. Adverse-media rows are leads until you dismiss or keep them.";
}

function _bindLeadButtons(detail) {
  $$(".lead-dismiss", detail).forEach((button) => {
    button.addEventListener("click", () => {
      const caseId = state.case?.id;
      if (!caseId) return;
      button.disabled = true;
      api.decideLead(caseId, button.dataset.lead, "dismissed", "Officer dismissed this lead.").then((saved) => {
        state.case = saved;
        button.textContent = "Dismissed";
      });
    });
  });
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
