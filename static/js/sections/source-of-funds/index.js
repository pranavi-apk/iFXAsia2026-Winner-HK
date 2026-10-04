import { $, escapeHtml } from "../../core/dom.js";
import { api } from "../../core/api.js";
import { state } from "../../core/state.js";
import { pageHeader } from "../../components/page-header.js";
import { icon } from "../../lib/icons.js";

const SLICE_COLORS = ["#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PURPOSE_FIELDS = [
  ["business_activity", "Business activity", "briefcase"],
  ["expected_transactions", "Expected transactions", "trending"],
  ["target_markets", "Target markets", "globe"],
  ["expected_annual_volume", "Expected annual volume", "coins"],
  ["introducer", "Introducer", "user"],
];

export default {
  id: "source-of-funds",
  step: 4,
  label: "Source of Funds",
  done: true,

  mount(container, caseData) {
    const view = buildView(caseData);
    const editing = container.dataset.editing === "1";

    container.innerHTML = `
      ${pageHeader({
        title: "Source of Funds & Business Purpose",
        subtitle: "Analyse the origin of funds, expected activity and business purpose across all available documents.",
        actions: `
          <label class="sof-search">
            ${icon("search", 15)}
            <input type="search" id="sof-search" placeholder="Search within this section" />
          </label>
          <button type="button" class="btn-export-top" id="sof-export">${icon("download", 15)} Export</button>`,
      })}
      <div class="sof-container">
        <div class="sof-metrics-row">
          ${metric("blue", "coins", view.totalText, view.totalLabel)}
          ${metric("indigo", "chart", String(view.sources.length), "Funding Sources Identified")}
          ${metric(view.consistent ? "green" : "amber", view.consistent ? "check-circle" : "alert-circle", view.consistent ? "Consistent" : "Review", "With business purpose", view.consistent ? "good" : "warn")}
          <button type="button" class="sof-metric-card sof-metric-button" id="sof-clarify" aria-expanded="false">
            <span class="sof-metric-icon amber">${icon("alert-circle", 18)}</span>
            <span class="sof-metric-body">
              <span class="sof-metric-value">${view.clarifications.length}</span>
              <span class="sof-metric-label">Items Require Clarification</span>
            </span>
            ${icon("chevron-right", 16)}
          </button>
        </div>

        <div class="sof-clarify-panel" id="sof-clarify-panel" hidden>
          <div class="sof-panel-header">
            <div>
              <div class="sof-panel-title">Clarifications</div>
              <div class="sof-panel-sub">Findings from the pack, plus public mentions of the applicant name.</div>
            </div>
            <button type="button" class="btn-export-top" id="background-btn">${icon("search", 14)} Search public mentions</button>
          </div>
          <p id="background-status" class="sof-status">${escapeHtml(view.backgroundLabel)}</p>
          <div class="sof-clarify-list">
            ${view.clarifications.map((item) => clarifyCard(item)).join("") || `<p class="sof-empty">Nothing in the pack asks for clarification.</p>`}
          </div>
        </div>

        <div class="sof-split">
          <section class="sof-panel">
            <div class="sof-panel-header">
              <div>
                <div class="sof-panel-title">Funds Flow Visualisation <span title="${escapeHtml(view.note)}">${icon("info", 15)}</span></div>
                <div class="sof-panel-sub">Trace the inflows named in the pack into the applicant.</div>
              </div>
            </div>
            ${view.sources.length ? flowBoard(view) : `<p class="sof-empty">No funding sources were stated in the pack.</p>`}
            <p class="sof-footnote">${escapeHtml(view.note)}</p>
          </section>

          <section class="sof-panel">
            <div class="sof-panel-header">
              <div>
                <div class="sof-panel-title">Source Breakdown</div>
                <div class="sof-panel-sub">Composition of the inflows that state an amount.</div>
              </div>
            </div>
            ${breakdown(view)}
          </section>
        </div>

        <div class="sof-split">
          <section class="sof-panel">
            <div class="sof-panel-header">
              <div>
                <div class="sof-panel-title">Timeline of Key Transactions ${icon("info", 15)}</div>
                <div class="sof-panel-sub">Dates and amounts written in the pack.</div>
              </div>
            </div>
            ${view.timeline.length ? timeline(view.timeline) : `<p class="sof-empty">No dated events were found in the pack.</p>`}
          </section>

          <section class="sof-panel" id="sof-purpose">
            <div class="sof-panel-header">
              <div class="sof-panel-title">Declared Business Purpose</div>
              <span class="sof-purpose-actions">
                ${editing ? `<button type="button" class="sof-text-btn" id="sof-cancel">Cancel</button>` : ""}
                <button type="button" class="btn-export-top" id="sof-edit">${icon(editing ? "check" : "pencil", 14)} ${editing ? "Save" : "Edit"}</button>
              </span>
            </div>
            ${editing ? purposeForm(view.purpose) : purposeList(view.purpose)}
            <p class="sof-form-error" id="sof-purpose-error"></p>
          </section>
        </div>

        <section class="sof-panel">
          <div class="sof-panel-header">
            <div>
              <div class="sof-panel-title">Key Supporting Documents</div>
              <div class="sof-panel-sub">Documents used to read the source of funds and business purpose.</div>
            </div>
            <button type="button" class="sof-text-btn" id="sof-all-docs">View all documents</button>
          </div>
          ${view.documents.length ? `<div class="docs-cards-row">${view.documents.map((doc) => docCard(caseData.id, doc)).join("")}</div>` : `<p class="sof-empty">No source-of-funds document was classified in this pack.</p>`}
        </section>
      </div>`;

    const search = $("#sof-search", container);
    if (container.dataset.query) {
      search.value = container.dataset.query;
      applySearch(container, container.dataset.query);
    }
    search.addEventListener("input", () => {
      container.dataset.query = search.value;
      applySearch(container, search.value);
      drawFlow(container);
    });

    $("#sof-export", container).addEventListener("click", () => window.print());
    $("#sof-all-docs", container).addEventListener("click", () => {
      document.querySelector('.nav-item[data-section="documents"]')?.click();
    });

    const panel = $("#sof-clarify-panel", container);
    $("#sof-clarify", container).addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      $("#sof-clarify", container).setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    });

    $("#background-btn", container).addEventListener("click", () => {
      const status = $("#background-status", container);
      status.textContent = "Searching the company name…";
      api.background(caseData.id).then((saved) => {
        state.case = saved;
        container.dataset.clarify = "1";
        this.mount(container, saved);
        const next = $("#sof-clarify-panel", container);
        if (next) next.hidden = false;
      }).catch((error) => {
        status.textContent = error.message;
      });
    });

    container.querySelectorAll(".lead-dismiss").forEach((button) => {
      button.addEventListener("click", () => {
        api.decideLead(caseData.id, button.dataset.lead, "dismissed", "Officer dismissed this public mention.").then((saved) => {
          state.case = saved;
          container.dataset.clarify = "1";
          this.mount(container, saved);
          const next = $("#sof-clarify-panel", container);
          if (next) next.hidden = false;
        });
      });
    });

    $("#sof-cancel", container)?.addEventListener("click", () => {
      delete container.dataset.editing;
      this.mount(container, caseData);
    });
    $("#sof-purpose-form", container)?.addEventListener("submit", (event) => {
      event.preventDefault();
      $("#sof-edit", container).click();
    });

    $("#sof-edit", container).addEventListener("click", () => {
      if (!editing) {
        container.dataset.editing = "1";
        this.mount(container, caseData);
        return;
      }
      const body = Object.fromEntries(PURPOSE_FIELDS.map(([key]) => [key, $(`#purpose-${key}`, container).value.trim()]));
      const error = $("#sof-purpose-error", container);
      error.textContent = "Saving…";
      api.updatePurpose(caseData.id, body).then((saved) => {
        state.case = saved;
        delete container.dataset.editing;
        this.mount(container, saved);
      }).catch((err) => {
        error.textContent = err.message;
      });
    });

    requestAnimationFrame(() => drawFlow(container));
    const board = container.querySelector("[data-flow-board]");
    if (board && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => drawFlow(container));
      observer.observe(board);
      container._sofObserver?.disconnect();
      container._sofObserver = observer;
    }
  },
};

function buildView(caseData) {
  const funds = caseData?.funds || {};
  const purpose = {
    business_activity: funds.purpose?.business_activity || caseData?.business?.purpose || "",
    expected_transactions: funds.purpose?.expected_transactions || caseData?.business?.expected_activity || "",
    target_markets: funds.purpose?.target_markets || caseData?.business?.target_markets || "",
    expected_annual_volume: funds.purpose?.expected_annual_volume || caseData?.business?.expected_annual_volume || "",
    introducer: funds.purpose?.introducer || caseData?.business?.introducer || "",
  };
  const sources = withShares(funds.sources || []);
  const findings = (caseData?.findings || []).filter((item) => item.module === "source_of_funds" && item.officer?.disposition !== "overridden");
  const leads = (caseData?.background?.leads || []).filter((lead) => lead.officer?.disposition !== "dismissed");
  const clarifications = [
    ...findings.map((item) => ({
      kind: "finding",
      title: item.title,
      detail: item.detail || "",
      tone: item.severity === "high" ? "review" : "review",
    })),
    ...leads.map((lead) => ({
      kind: "lead",
      id: lead.id,
      title: lead.title || lead.name || "Public mention",
      detail: lead.supporting_sentence || lead.snippet || lead.allegation || "",
      url: lead.url || "",
      tone: "review",
    })),
  ];
  const total = funds.total || {};
  const slices = sources.filter((item) => item.share != null);
  return {
    sources,
    slices,
    recipient: funds.recipient || { name: caseData?.entity?.legal_name || caseData?.title || "Applicant", role: "Onboarded entity" },
    intermediary: funds.intermediary || null,
    timeline: funds.timeline || [],
    documents: funds.documents || [],
    purpose,
    note: funds.note || "",
    totalText: total.amount == null ? "—" : formatMoney(total.amount, total.currency),
    totalLabel: total.label || "Not stated in the pack",
    totalBasis: total.basis || "unknown",
    consistent: findings.length === 0,
    clarifications,
    backgroundLabel: caseData?.background?.label || "Not searched yet.",
  };
}

function withShares(sources) {
  const known = sources.filter((item) => Number(item.amount) > 0);
  const total = known.reduce((sum, item) => sum + Number(item.amount), 0);
  if (!total) return sources.map((item) => ({ ...item, share: null, color: "" }));
  const parts = known.map((item) => ({ id: item.id, exact: (Number(item.amount) / total) * 100, pct: 0 }));
  parts.forEach((item) => {
    item.pct = Math.floor(item.exact);
  });
  let left = 100 - parts.reduce((sum, item) => sum + item.pct, 0);
  [...parts].sort((a, b) => (b.exact - b.pct) - (a.exact - a.pct)).forEach((item) => {
    if (left <= 0) return;
    item.pct += 1;
    left -= 1;
  });
  const byId = Object.fromEntries(parts.map((item) => [item.id, item.pct]));
  let colorIndex = 0;
  return sources.map((item) => {
    const share = byId[item.id];
    if (share == null) return { ...item, share: null, color: "" };
    const color = SLICE_COLORS[colorIndex % SLICE_COLORS.length];
    colorIndex += 1;
    return { ...item, share, color };
  });
}

function metric(tone, glyph, value, label, valueTone = "") {
  return `
    <div class="sof-metric-card">
      <span class="sof-metric-icon ${tone}">${icon(glyph, 18)}</span>
      <span class="sof-metric-body">
        <span class="sof-metric-value ${valueTone}">${escapeHtml(value)}</span>
        <span class="sof-metric-label">${escapeHtml(label)}</span>
      </span>
    </div>`;
}

function flowBoard(view) {
  const mid = view.intermediary
    ? `<div class="flow-slot" data-flow-mid>${flowCard(view.intermediary.name, view.intermediary.role, "", "building", true)}</div>`
    : "";
  return `
    <div class="flow-board${view.intermediary ? " has-mid" : ""}" data-flow-board>
      <svg class="flow-ribbons" data-flow-svg aria-hidden="true"></svg>
      <div class="flow-sources">
        ${view.sources.map((item) => `
          <div data-flow-source data-sof-text="${escapeHtml(searchText(item))}">
            ${flowCard(item.name, item.category, amountLine(item), item.kind === "person" ? "user" : item.kind === "investment" ? "chart" : "buildingFull", false, item.origin)}
          </div>`).join("")}
      </div>
      ${mid}
      <div class="flow-slot" data-flow-end>
        ${flowCard(view.recipient.name, view.recipient.role, "", "buildingFull", true)}
      </div>
    </div>`;
}

function flowCard(name, meta, value, glyph, target, origin) {
  const tag = origin === "observed" ? "Observed" : origin === "declared" && !/declared/i.test(meta) ? "Declared" : "";
  return `
    <div class="flow-node-card${target ? " target" : ""}">
      <div class="flow-node-icon">${icon(glyph, 16)}</div>
      <div class="flow-node-info">
        <div class="flow-node-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div class="flow-node-meta">${escapeHtml(meta)}${tag ? ` · ${tag}` : ""}</div>
        ${value ? `<div class="flow-node-val">${escapeHtml(value)}</div>` : ""}
      </div>
    </div>`;
}

function amountLine(item) {
  if (item.amount == null) return "";
  const money = formatMoney(item.amount, item.currency);
  return item.share == null ? money : `${money} (${item.share}%)`;
}

function breakdown(view) {
  const center = view.totalText === "—" ? "—" : view.totalText;
  const centerLabels = { declared: "Total funds", credits: "Total credits", expected: "Expected", unknown: "Not stated" };
  const centerLabel = centerLabels[view.totalBasis] || view.totalLabel;
  return `
    <div class="source-breakdown-wrap">
      <div class="donut-chart-box">
        ${donutSvg(view.slices)}
        <div class="donut-center-text">
          <div class="donut-val">${escapeHtml(center)}</div>
          <div class="donut-lbl">${escapeHtml(centerLabel)}</div>
        </div>
      </div>
      <div class="breakdown-legend">
        ${view.sources.length ? view.sources.map((item) => `
          <div class="legend-item" data-sof-text="${escapeHtml(searchText(item))}">
            <div class="legend-left">
              <span class="legend-dot" style="background:${item.color || "#e2e8f0"}"></span>
              <div>
                <div class="legend-title">${escapeHtml(item.category)}${item.share == null ? "" : ` <span class="legend-pct">${item.share}%</span>`}</div>
                <div class="legend-sub">${escapeHtml(sentence(item.detail || item.name))}</div>
              </div>
            </div>
            <div class="legend-val">${item.amount == null ? "Not stated" : escapeHtml(formatMoney(item.amount, item.currency))}</div>
          </div>`).join("") : `<p class="sof-empty">No inflows to break down.</p>`}
      </div>
    </div>`;
}

function donutSvg(slices) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  if (!slices.length) {
    return `<svg class="donut-chart-svg" viewBox="0 0 140 140"><circle cx="70" cy="70" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="14" /></svg>`;
  }
  const gap = slices.length > 1 ? 4 : 0;
  let offset = 0;
  const rings = slices.map((slice) => {
    const full = (slice.share / 100) * circ;
    const len = slices.length === 1 ? circ - 0.01 : Math.max(0, full - gap);
    const node = `<circle cx="70" cy="70" r="${radius}" fill="none" stroke="${slice.color}" stroke-width="14" stroke-dasharray="${len} ${circ}" stroke-dashoffset="${-offset}" />`;
    offset += full;
    return node;
  }).join("");
  return `<svg class="donut-chart-svg" viewBox="0 0 140 140">${rings}</svg>`;
}

function timeline(events) {
  return `
    <div class="timeline-track">
      ${events.map((event) => `
        <div class="timeline-node" data-sof-text="${escapeHtml(`${event.date} ${event.detail}`)}">
          <div class="timeline-date">${escapeHtml(formatMonth(event.date))}</div>
          <div class="timeline-dot"></div>
          ${event.amount == null ? "" : `<div class="timeline-val">${escapeHtml(formatMoney(event.amount, event.currency))}</div>`}
          <div class="timeline-desc">${escapeHtml(event.detail)}</div>
        </div>`).join("")}
    </div>`;
}

function purposeList(purpose) {
  const rows = PURPOSE_FIELDS.filter(([key]) => key !== "introducer" || purpose.introducer);
  return `
    <div class="purpose-list">
      ${rows.map(([key, label, glyph]) => `
        <div class="purpose-item" data-sof-text="${escapeHtml(`${label} ${purpose[key] || ""}`)}">
          <span class="purpose-icon">${icon(glyph, 14)}</span>
          <span class="purpose-label">${label}</span>
          <span class="purpose-value">${escapeHtml(purpose[key] || "Not stated in the pack")}</span>
        </div>`).join("")}
    </div>`;
}

function purposeForm(purpose) {
  return `
    <form class="purpose-form" id="sof-purpose-form">
      ${PURPOSE_FIELDS.map(([key, label]) => `
        <label class="purpose-field">
          <span>${label}</span>
          <input id="purpose-${key}" type="text" value="${escapeHtml(purpose[key] || "")}" />
        </label>`).join("")}
    </form>`;
}

function docCard(caseId, doc) {
  const href = caseId ? `/api/cases/${encodeURIComponent(caseId)}/files/${encodeURIComponent(doc.filename)}` : "";
  const tone = doc.tone === "review" ? "warn" : "check";
  const pill = doc.tone === "review" ? "amber" : "green";
  return `
    <a class="doc-card" data-sof-text="${escapeHtml(`${doc.title} ${doc.badge} ${doc.filename}`)}" href="${escapeHtml(href)}" target="_blank" rel="noopener">
      <div class="doc-card-top">
        <div class="doc-preview-thumb">${icon("doc", 18)}</div>
        <span class="doc-status-icon ${tone}">${tone === "check" ? "✓" : "!"}</span>
      </div>
      <div class="doc-card-title">${escapeHtml(doc.title)}</div>
      <div class="doc-card-date">${escapeHtml(doc.date ? formatDay(doc.date) : doc.filename)}</div>
      <span class="doc-pill-badge ${pill}">${escapeHtml(doc.badge)}</span>
    </a>`;
}

function clarifyCard(item) {
  return `
    <div class="purpose-item sof-clarify-item" data-sof-text="${escapeHtml(`${item.title} ${item.detail}`)}">
      <span class="purpose-icon">${icon("alert-circle", 14)}</span>
      <span class="purpose-label">${escapeHtml(item.title)}</span>
      <span class="purpose-value">${escapeHtml(item.detail)}</span>
      ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Source</a>` : ""}
      ${item.kind === "lead" && item.id ? `<button type="button" class="btn-export-top lead-dismiss" data-lead="${escapeHtml(item.id)}">Dismiss</button>` : ""}
    </div>`;
}

function drawFlow(root) {
  const board = root.querySelector("[data-flow-board]");
  const svg = root.querySelector("[data-flow-svg]");
  if (!board || !svg) return;
  const sources = [...board.querySelectorAll("[data-flow-source]")].filter((node) => !node.hidden);
  const mid = board.querySelector("[data-flow-mid]");
  const end = board.querySelector("[data-flow-end]");
  const into = mid || end;
  const width = board.clientWidth;
  const height = board.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  if (!into || !sources.length || !width || !height) {
    svg.innerHTML = "";
    return;
  }
  const origin = board.getBoundingClientRect();
  const point = (el, side) => {
    const rect = el.getBoundingClientRect();
    return {
      x: (side === "left" ? rect.left : rect.right) - origin.left,
      y: rect.top - origin.top + rect.height / 2,
    };
  };
  const dest = point(into, "left");
  const ribbons = sources.map((node) => {
    const card = node.querySelector(".flow-node-card") || node;
    const start = point(card, "right");
    const dx = Math.max(28, dest.x - start.x);
    const bend = dx * 0.5;
    return `<path d="M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${(start.x + bend).toFixed(1)} ${start.y.toFixed(1)}, ${(dest.x - bend).toFixed(1)} ${dest.y.toFixed(1)}, ${dest.x.toFixed(1)} ${dest.y.toFixed(1)}" />`;
  }).join("");
  let hop = "";
  if (mid && end) {
    const from = point(mid.querySelector(".flow-node-card") || mid, "right");
    const to = point(end.querySelector(".flow-node-card") || end, "left");
    hop = `<line class="flow-hop" x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}" x2="${(to.x - 6).toFixed(1)}" y2="${to.y.toFixed(1)}" marker-end="url(#sof-arrow)" />`;
  }
  svg.innerHTML = `
    <defs>
      <marker id="sof-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"></path>
      </marker>
    </defs>
    ${ribbons}${hop}`;
}

function applySearch(root, query) {
  const needle = query.trim().toLowerCase();
  root.querySelectorAll("[data-sof-text]").forEach((node) => {
    const hay = (node.dataset.sofText || "").toLowerCase();
    node.hidden = Boolean(needle) && !hay.includes(needle);
  });
}

function sentence(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function searchText(item) {
  return `${item.name || ""} ${item.category || ""} ${item.detail || ""} ${item.origin || ""}`;
}

function formatMoney(amount, currency = "USD") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  const cur = currency || "USD";
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    const tenths = Math.round(millions * 10) / 10;
    const digits = Math.abs(millions - tenths) < 0.001 ? 1 : 2;
    return `${cur} ${millions.toFixed(digits)}M`;
  }
  return `${cur} ${Math.round(value).toLocaleString("en-US")}`;
}

function formatMonth(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return iso || "";
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

function formatDay(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return iso || "";
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}
