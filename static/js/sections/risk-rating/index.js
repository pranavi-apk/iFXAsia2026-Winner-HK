import { api } from "../../core/api.js";
import { escapeHtml } from "../../core/dom.js";
import { pageHeader } from "../../components/page-header.js";

const PDFJS_BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/";
const PDFJS_URL = PDFJS_BASE + "build/pdf.min.mjs";
const PDFJS_VIEWER_URL = PDFJS_BASE + "web/pdf_viewer.mjs";
const PDFJS_VIEWER_CSS = PDFJS_BASE + "web/pdf_viewer.css";
const PDFJS_WORKER_URL = PDFJS_BASE + "build/pdf.worker.min.mjs";

const state = {
  data: null,
  selectedDocument: null,
  page: 1,
  zoom: 1,
  pdf: null,
  highlightFinding: null,
  renderToken: 0,
  pageView: null,
  resizeObserver: null,
  renderedStageWidth: null,
};

const severityRank = { critical: 4, high: 3, medium: 2, review: 1, low: 0 };

function level(value) {
  return (value || "low").toLowerCase();
}

function riskLabel(value) {
  return level(value).toUpperCase();
}

function displayName(document) {
  return (document?.filename || "").replace(/^\d+-/, "").replace(/\.pdf$/i, "").replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Untitled document";
}

function documentFindings(documentId) {
  return (state.data?.findings || []).filter((finding) =>
    finding.document_id === documentId || (finding.evidence || []).some((item) => item.document === documentId)
  );
}

function scoreSummary(risk, findings, documents) {
  const high = findings.filter((item) => level(item.severity) === "high" || level(item.severity) === "critical").length;
  const medium = findings.filter((item) => level(item.severity) === "medium").length;
  const low = findings.filter((item) => !["high", "critical", "medium"].includes(level(item.severity))).length;
  return `
    <div class="risk-summary">
      <article class="risk-score-card">
        <div class="risk-gauge" style="--risk-progress:${Math.min(100, Math.max(0, risk.score || 0))}%">
          <div class="risk-gauge-inner"><span>${risk.score || 0}</span><small>${riskLabel(risk.level)} RISK</small></div>
        </div>
        <div class="risk-score-copy">
          <p class="eyebrow">Risk score</p>
          <h2>${riskLabel(risk.level)}</h2>
          <p>${findings.length ? `${high} high-risk findings across ${documents.length} documents.` : "No AI findings detected."}</p>
        </div>
      </article>
      ${[
        ["High risk", high, "high"],
        ["Medium risk", medium, "medium"],
        ["Low risk", low, "low"],
        ["Total documents", documents.length, "neutral"],
      ].map(([label, count, tone]) => `
        <article class="risk-stat-card ${tone}">
          <strong>${count}</strong><span>${label}</span>
        </article>`).join("")}
    </div>`;
}

function renderDocumentList(documents) {
  if (!documents.length) return `<div class="risk-empty">No documents were returned for this case.</div>`;
  return documents.map((document) => {
    const findings = documentFindings(document.id);
    const topSeverity = findings.sort((a, b) => severityRank[level(b.severity)] - severityRank[level(a.severity)])[0]?.severity;
    return `
      <button class="risk-document${document.id === state.selectedDocument ? " active" : ""}" data-document="${escapeHtml(document.id)}">
        <span class="document-file-icon">PDF</span>
        <span class="document-copy">
          <strong>${escapeHtml(displayName(document))}</strong>
          <small>${document.pages ? `${document.pages} page${document.pages === 1 ? "" : "s"}` : "Page count unavailable"} · ${findings.length} finding${findings.length === 1 ? "" : "s"}</small>
        </span>
        ${topSeverity ? `<span class="severity-dot ${level(topSeverity)}" title="${riskLabel(topSeverity)} risk"></span>` : ""}
      </button>`;
  }).join("");
}

function renderFindings(findings) {
  if (!findings.length) return `<div class="risk-empty"><strong>No AI findings detected</strong><span>The assessment did not produce any findings for this case.</span></div>`;
  return findings.map((finding, index) => `
    <button class="risk-finding-card ${level(finding.severity)}" data-finding="${escapeHtml(finding.id)}">
      <span class="finding-number">${index + 1}</span>
      <span class="finding-copy">
        <span class="finding-heading"><strong>${escapeHtml(finding.title)}</strong><em>${riskLabel(finding.severity)} RISK</em></span>
        <span>${escapeHtml(finding.description)}</span>
        ${finding.document_id ? `<small>${escapeHtml(displayName({ filename: finding.document_id }))}${finding.page ? ` · page ${finding.page}` : ""}</small>` : `<small>Document location unavailable</small>`}
      </span>
    </button>`).join("");
}

function renderComparison(rows) {
  if (!rows.length) return `<div class="risk-empty"><strong>No cross-source fields available</strong><span>Extracted values from multiple sources will appear here when available.</span></div>`;
  return `
    <div class="comparison-scroll">
      <table class="comparison-table">
        <thead><tr><th>Field</th><th>Sources and extracted values</th><th>Status</th></tr></thead>
        <tbody>${rows.map((row) => `
          <tr class="${row.consistent ? "" : "inconsistent"}" data-comparison="${escapeHtml(row.finding_id || "")}">
            <th>${escapeHtml(row.label)}</th>
            <td>${row.values.map((item) => `
              <button class="comparison-value" data-document="${escapeHtml(item.document_id)}" ${item.finding_id ? `data-finding="${escapeHtml(item.finding_id)}"` : ""}>
                <span>${escapeHtml(displayName({ filename: item.document_id }))}</span>
                <strong>${escapeHtml(item.value)}</strong>
              </button>`).join("")}</td>
            <td><span class="comparison-status ${row.consistent ? "consistent" : "inconsistent"}">${row.consistent ? "Consistent" : "Inconsistency"}</span></td>
          </tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function viewerMarkup() {
  return `
    <div class="viewer-header">
      <div><strong id="viewer-title">Select a document</strong><small id="viewer-status">PDF viewer</small></div>
      <span id="viewer-page">Page 1 / —</span>
    </div>
    <div class="viewer-toolbar">
      <button type="button" data-viewer-action="prev" aria-label="Previous page">←</button>
      <button type="button" data-viewer-action="next" aria-label="Next page">→</button>
      <span class="toolbar-divider"></span>
      <button type="button" data-viewer-action="zoom-out" aria-label="Zoom out">−</button>
      <span id="viewer-zoom">100%</span>
      <button type="button" data-viewer-action="zoom-in" aria-label="Zoom in">+</button>
      <button type="button" data-viewer-action="fullscreen" aria-label="Fullscreen viewer">⛶</button>
    </div>
    <div class="pdf-stage" id="pdf-stage"><div class="viewer-empty">Select a document to review.</div></div>`;
}

// Core, worker, viewer components and viewer CSS all come from the same pdfjs-dist 4.10.38 package.
async function loadPdfJs() {
  if (window.__tallyPdfJs) return window.__tallyPdfJs;
  window.__tallyPdfJs = (async () => {
    const pdfjsLib = await import(PDFJS_URL);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    globalThis.pdfjsLib = pdfjsLib;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = PDFJS_VIEWER_CSS;
    document.head.append(link);
    const pdfjsViewer = await import(PDFJS_VIEWER_URL);
    return { pdfjsLib, pdfjsViewer, eventBus: new pdfjsViewer.EventBus() };
  })();
  return window.__tallyPdfJs;
}

function normalizePdfText(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function locateQuoteRects(textDivs, quote, overlay) {
  const needle = normalizePdfText(quote);
  if (!needle) return [];
  let text = "";
  const map = [];
  const separator = () => {
    if (text && !text.endsWith(" ")) {
      text += " ";
      map.push(null);
    }
  };
  textDivs.forEach((div) => {
    const node = div.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    for (let offset = 0; offset < node.data.length; offset += 1) {
      const lowered = node.data[offset].normalize("NFKC").toLowerCase();
      for (const character of lowered) {
        if (/[\p{L}\p{N}]/u.test(character)) {
          text += character;
          map.push({ node, offset });
        } else separator();
      }
    }
    separator();
  });
  const start = text.indexOf(needle);
  if (start < 0) return [];
  const spans = new Map();
  map.slice(start, start + needle.length).forEach((entry) => {
    if (!entry) return;
    const span = spans.get(entry.node) || { from: entry.offset, to: entry.offset + 1 };
    span.from = Math.min(span.from, entry.offset);
    span.to = Math.max(span.to, entry.offset + 1);
    spans.set(entry.node, span);
  });
  const origin = overlay.getBoundingClientRect();
  const rects = [];
  spans.forEach((span, node) => {
    const range = document.createRange();
    range.setStart(node, span.from);
    range.setEnd(node, span.to);
    for (const rect of range.getClientRects()) {
      if (rect.width < 1 || rect.height < 1) continue;
      rects.push({ left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height });
    }
  });
  return rects;
}
async function waitForTextLayer(pageDiv) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const layer = pageDiv.querySelector(".textLayer");
    if (layer?.querySelector("span")) return layer;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return pageDiv.querySelector(".textLayer");
}

async function renderPdf() {
  const selectedDocument = state.data?.documents.find((item) => item.id === state.selectedDocument);
  const stage = document.querySelector("#pdf-stage");
  if (!selectedDocument) {
    stage.innerHTML = `<div class="viewer-empty">Select a document to review.</div>`;
    return;
  }
  const token = ++state.renderToken;
  document.querySelector("#viewer-title").textContent = displayName(selectedDocument);
  document.querySelector("#viewer-zoom").textContent = `${Math.round(state.zoom * 100)}%`;
  state.renderedStageWidth = stage.clientWidth;
  if (!state.pageView) stage.innerHTML = `<div class="viewer-loading">Loading document…</div>`;
  try {
    const { pdfjsLib, pdfjsViewer, eventBus } = await loadPdfJs();
    if (!state.pdf || state.pdf._tallyDocumentUrl !== selectedDocument.file_url) {
      state.pdf = await pdfjsLib.getDocument({ url: selectedDocument.file_url }).promise;
      state.pdf._tallyDocumentUrl = selectedDocument.file_url;
    }
    state.page = Math.min(Math.max(1, state.page), state.pdf.numPages);
    const pdfPage = await state.pdf.getPage(state.page);
    if (token !== state.renderToken) return;
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const stageStyle = window.getComputedStyle(stage);
    const horizontalPadding = parseFloat(stageStyle.paddingLeft) + parseFloat(stageStyle.paddingRight);
    const availableWidth = Math.max(1, stage.clientWidth - horizontalPadding);
    // PDFPageView scale 1 means 96 dpi (PDF points x 96/72), so convert from CSS px per PDF point.
    const cssScale = Math.min(Math.max(availableWidth / baseViewport.width, 0.5), 2) * state.zoom;
    const scale = cssScale / (96 / 72);

    const host = document.createElement("div");
    host.className = "pdfViewer pdf-host";
    state.pageView?.destroy();
    stage.replaceChildren(host);
    const pageView = new pdfjsViewer.PDFPageView({
      container: host,
      id: state.page,
      scale,
      defaultViewport: pdfPage.getViewport({ scale }),
      eventBus,
      textLayerMode: 1, // TextLayerMode.ENABLE (not exported by the viewer bundle)
      annotationMode: 0,
    });
    state.pageView = pageView;
    pageView.setPdfPage(pdfPage);
    await pageView.draw();
    if (token !== state.renderToken) return;

    let located = 0;
    const pageFindings = (state.data.findings || []).filter((item) => item.document_id === selectedDocument.id && (!item.page || item.page === state.page));
    const finding = state.highlightFinding || pageFindings[0];
    const textLayerDiv = await waitForTextLayer(pageView.div);
    if (token !== state.renderToken) return;
    if (finding?.matched_text && (!finding.page || finding.page === state.page) && textLayerDiv) {
      const overlay = document.createElement("div");
      overlay.className = "finding-highlights";
      pageView.div.append(overlay);
      const textDivs = [...textLayerDiv.querySelectorAll("span:not(.markedContent)")];
      locateQuoteRects(textDivs, finding.matched_text, overlay).forEach((rect) => {
        const mark = document.createElement("div");
        mark.className = `finding-highlight-rect ${level(finding.severity)}`;
        Object.assign(mark.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
        overlay.append(mark);
        located += 1;
      });
    }
    document.querySelector("#viewer-page").textContent = `Page ${state.page} / ${state.pdf.numPages}`;
    document.querySelector("#viewer-status").textContent = located ? "Finding highlighted where text was located" : "Original document rendered";
  } catch (error) {
    if (token !== state.renderToken) return;
    state.pageView = null;
    stage.innerHTML = `<div class="viewer-error"><strong>PDF unavailable</strong><span>${escapeHtml(error.message || "The document could not be rendered.")}</span><a href="${escapeHtml(selectedDocument.file_url)}" target="_blank" rel="noreferrer">Open document separately</a></div>`;
    document.querySelector("#viewer-status").textContent = "Fallback link available";
  }
}

function selectDocument(documentId, finding = null) {
  state.selectedDocument = documentId;
  state.page = finding?.page || 1;
  state.highlightFinding = finding;
  document.querySelectorAll(".risk-document").forEach((item) => item.classList.toggle("active", item.dataset.document === documentId));
  renderPdf();
}

function bind(container) {
  container.addEventListener("click", (event) => {
    const documentButton = event.target.closest("[data-document]");
    const findingButton = event.target.closest("[data-finding]");
    const viewerAction = event.target.closest("[data-viewer-action]");
    if (findingButton && !viewerAction) {
      const finding = state.data.findings.find((item) => item.id === findingButton.dataset.finding);
      if (finding?.document_id) selectDocument(finding.document_id, finding);
      return;
    }
    if (documentButton && !findingButton) {
      selectDocument(documentButton.dataset.document);
      return;
    }
    if (viewerAction) {
      if (viewerAction.dataset.viewerAction === "prev") state.page -= 1;
      if (viewerAction.dataset.viewerAction === "next") state.page += 1;
      if (viewerAction.dataset.viewerAction === "zoom-out") state.zoom = Math.max(0.6, state.zoom - 0.2);
      if (viewerAction.dataset.viewerAction === "zoom-in") state.zoom = Math.min(2.4, state.zoom + 0.2);
      if (viewerAction.dataset.viewerAction === "fullscreen") container.querySelector(".pdf-viewer").requestFullscreen?.();
      renderPdf();
    }
  });
  container.querySelector("#risk-search").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    container.querySelectorAll(".risk-finding-card, .risk-document").forEach((item) => {
      item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query);
    });
  });
  const exportButton = container.querySelector("#btn-risk-export");
  exportButton.addEventListener("click", async () => {
    const label = exportButton.textContent;
    exportButton.disabled = true;
    exportButton.textContent = "Generating AI Risk Report...";
    try {
      const blob = await api.riskReport(state.caseId);
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: `Tracy_Risk_Report_${state.caseId}.pdf` });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      exportButton.textContent = "Report generated";
    } catch {
      exportButton.textContent = "Unable to generate the risk report. Please try again.";
    }
    setTimeout(() => {
      exportButton.textContent = label;
      exportButton.disabled = false;
    }, 2500);
  });
}

async function loadData(container, caseData) {
  try {
    state.caseId = caseData.intake ? "silver-oak" : caseData.id;
    state.data = await api.riskRating(caseData.id, caseData);
  } catch (error) {
    container.querySelector("#risk-content").innerHTML = `<div class="risk-panel-error"><strong>Risk Rating could not be loaded</strong><span>${escapeHtml(error.message)}</span></div>`;
    return;
  }
  const { risk_score: risk, documents, findings, cross_source: comparison } = state.data;
  state.selectedDocument = documents[0]?.id || null;
  container.querySelector("#risk-content").innerHTML = `
    ${scoreSummary(risk, findings, documents)}
    <div class="risk-review-grid">
      <section class="risk-panel documents-panel"><div class="risk-panel-heading"><h2>Documents</h2><span>${documents.length}</span></div><div class="risk-document-list">${renderDocumentList(documents)}</div></section>
      <section class="risk-panel pdf-viewer">${viewerMarkup()}</section>
      <section class="risk-panel findings-panel"><div class="risk-panel-heading"><h2>AI Findings</h2><span>${findings.length} issue${findings.length === 1 ? "" : "s"}</span></div><div class="risk-findings-list">${renderFindings(findings)}</div></section>
    </div>
    <section class="risk-panel comparison-panel"><div class="risk-panel-heading"><h2>Cross-Source Comparison</h2><span>Extracted values</span></div>${renderComparison(comparison)}</section>`;
  bind(container);
  state.resizeObserver?.disconnect();
  const stage = container.querySelector("#pdf-stage");
  state.resizeObserver = new ResizeObserver(() => {
    if (stage.clientWidth !== state.renderedStageWidth && state.selectedDocument) renderPdf();
  });
  state.resizeObserver.observe(stage);
  if (state.selectedDocument) renderPdf();
}

export default {
  id: "risk-rating",
  step: 5,
  label: "Risk Rating",
  mount(container, caseData) {
    state.resizeObserver?.disconnect();
    state.resizeObserver = null;
    state.data = null;
    state.pdf = null;
    state.renderedStageWidth = null;
    container.innerHTML = `
      ${pageHeader({
        title: "Risk Rating",
        subtitle: "Review submitted documents with AI-detected risks, inconsistencies and cross-source findings.",
        actions: `<input id="risk-search" class="risk-search" type="search" placeholder="Search within case" aria-label="Search within case"><button class="btn-export-top" id="btn-risk-export">Export Report</button>`,
      })}
      <div id="risk-content"><div class="risk-loading">Loading risk assessment…</div></div>`;
    loadData(container, caseData);
  },
};
