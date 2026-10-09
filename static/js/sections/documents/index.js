import { api } from "../../core/api.js";
import { escapeHtml } from "../../core/dom.js";
import { state } from "../../core/state.js";
import { buildKnowledgeGraph, filterGraph, MODES } from "./knowledge-graph.js";
import { buildDocumentsView, buildUploadedView, DOC_STATUS_LABEL } from "./view-model.js";

const COLORS = {
  person: { bg: "#eff6ff", border: "#3b82f6", font: "#1e3a8a", shape: "dot" },
  company: { bg: "#f0fdf4", border: "#22c55e", font: "#14532d", shape: "box" },
  document: { bg: "#ffffff", border: "#64748b", font: "#0f172a", shape: "box" },
  alias: { bg: "#faf5ff", border: "#a855f7", font: "#581c87", shape: "ellipse" },
  conflict: { bg: "#fef2f2", border: "#ef4444", font: "#7f1d1d", shape: "box" },
};
const TYPE_LABEL = { person: "Person", company: "Company", document: "Document", alias: "Name variant", conflict: "Conflict" };

const fileLink = (caseId, file) => `/api/cases/${encodeURIComponent(caseId || "")}/files/${encodeURIComponent(file)}`;

function sourceList(sources, caseId) {
  if (!sources?.length) return `<p class="kb-muted">Analyst view only. No document source recorded.</p>`;
  return sources.map((s) => `
    <div class="kb-source">
      <a href="${fileLink(caseId, s.file)}" target="_blank" rel="noopener">${escapeHtml(s.file)}</a>
      ${s.quote ? `<blockquote>“${escapeHtml(s.quote)}”</blockquote>` : ""}
      ${s.verified === false ? `<span class="kb-tag warn">Quote not verified</span>` : s.quote ? `<span class="kb-tag ok">Evidence-backed</span>` : ""}
    </div>`).join("");
}

function nodePanel(node, graph, caseId) {
  const related = graph.edges.filter((e) => e.from === node.id || e.to === node.id);
  const name = (id) => graph.nodes.find((n) => n.id === id)?.label || id;
  return `
    <div class="kb-eyebrow">${TYPE_LABEL[node.type]}</div>
    <h3>${escapeHtml(node.label)}</h3>
    ${node.sub ? `<p class="kb-muted">${escapeHtml(node.sub)}</p>` : ""}
    ${node.role ? `<p class="kb-muted">${escapeHtml(node.role)}</p>` : ""}
    ${node.aliases?.length ? `<div class="kb-eyebrow">Aliases</div><p>${node.aliases.map(escapeHtml).join(", ")}</p>` : ""}
    <div class="kb-eyebrow">Connections (${related.length})</div>
    ${related.map((e) => `<div class="kb-rel">${escapeHtml(name(e.from))} <b>${escapeHtml(e.label)}</b> ${escapeHtml(name(e.to))}</div>`).join("") || `<p class="kb-muted">None yet.</p>`}
    ${node.evidence?.length ? `<div class="kb-eyebrow">Evidence</div>${sourceList(node.evidence.map((e) => ({ file: e.document, quote: e.quote, verified: e.verified })), caseId)}` : ""}`;
}

function edgePanel(edge, graph, caseId) {
  const name = (id) => graph.nodes.find((n) => n.id === id)?.label || id;
  return `
    <div class="kb-eyebrow">Why is this connected?</div>
    <h3>${escapeHtml(name(edge.from))}<br><span class="kb-arrow">${escapeHtml(edge.label)} →</span><br>${escapeHtml(name(edge.to))}</h3>
    ${edge.conflict ? `<p class="kb-tag bad">Conflicting evidence. Requires analyst review.</p>` : ""}
    <div class="kb-eyebrow">Evidence</div>
    ${sourceList(edge.sources, caseId)}`;
}

function drawGraph(el, graph, mode, onPick, fresh = new Set()) {
  const sub = filterGraph(graph, mode);
  const nodes = sub.nodes.map((n) => {
    const c = COLORS[n.type];
    return {
      id: n.id, label: n.label.length > 28 ? `${n.label.slice(0, 26)}…` : n.label, shape: c.shape,
      color: { background: c.bg, border: fresh.has(n.id) ? "#d97706" : c.border, highlight: { background: c.bg, border: "#2563eb" } },
      font: { color: c.font, face: "Inter", size: 13 }, borderWidth: n.conflict || fresh.has(n.id) ? 3 : 1.5, shadow: fresh.has(n.id) ? { enabled: true, color: "rgba(217,119,6,0.3)", size: 15, x: 0, y: 0 } : false,
      size: n.id === "applicant" ? 26 : 16, margin: 10,
    };
  });
  const edges = sub.edges.map((e) => ({
    id: e.id, from: e.from, to: e.to, label: e.label, arrows: e.kind === "evidence" || e.kind === "identity" ? "" : "to",
    dashes: e.kind === "evidence" || e.kind === "identity",
    color: { color: e.conflict ? "#ef4444" : "#cbd5e1", highlight: "#2563eb" },
    font: { color: "#475569", size: 10, strokeWidth: 2, strokeColor: "#ffffff", face: "Inter", background: "#f8fafc" },
    smooth: { type: "dynamic" },
  }));
  const network = new window.vis.Network(el, { nodes: new window.vis.DataSet(nodes), edges: new window.vis.DataSet(edges) }, {
    physics: { solver: "forceAtlas2Based", stabilization: { iterations: 150 } },
    interaction: { hover: true, zoomView: true, dragView: true },
  });
  network.on("click", (p) => {
    if (p.nodes.length) onPick({ node: graph.nodes.find((n) => n.id === p.nodes[0]) });
    else if (p.edges.length) onPick({ edge: graph.edges.find((e) => e.id === p.edges[0]) });
  });
  return network;
}

function repository(caseData) {
  const checklist = Boolean(caseData?.intake);
  const { groups } = checklist ? buildDocumentsView(caseData) : buildUploadedView(caseData);
  const rows = groups.flatMap((g) => g.rows);
  return `
    <table class="kb-table">
      <thead><tr><th>Document</th><th>File</th><th>Pages</th><th>Status</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr><td>${escapeHtml(r.title)}</td>
        <td>${r.file ? `<a href="${fileLink(caseData.id, r.file)}" target="_blank" rel="noopener">${escapeHtml(r.file)}</a>` : ""}</td>
        <td>${r.pages || ""}</td>
        <td><span class="kb-tag ${r.status === "missing" || r.status === "expired" ? "bad" : r.status === "stale" ? "warn" : "ok"}">${escapeHtml(DOC_STATUS_LABEL[r.status] || r.status)}</span></td></tr>`).join("")}
      </tbody>
    </table>`;
}

const STEPS = ["Document parsed", "Pages extracted", "Entities extracted", "Existing entities resolved", "New relationships identified", "Evidence linked", "Conflicts checked"];

// Node ids seen the last time each case was drawn, so new arrivals can be lit up.
const seen = new Map();

export function mountKnowledgeBase(container, caseData, onChange = () => {}) {
    const graph = buildKnowledgeGraph(caseData);
    const before = seen.get(caseData.id);
    const fresh = new Set(before ? graph.nodes.filter((n) => !before.nodes.has(n.id)).map((n) => n.id) : []);
    const newLinks = before ? graph.edges.filter((e) => !before.edges.has(`${e.from}|${e.to}|${e.label}`)).length : 0;
    seen.set(caseData.id, { nodes: new Set(graph.nodes.map((n) => n.id)), edges: new Set(graph.edges.map((e) => `${e.from}|${e.to}|${e.label}`)) });
    let mode = "all";
    let network = null;

    container.innerHTML = `
      <div class="kb">
        <header class="kb-head">
          <div>
            <div class="kb-eyebrow">Knowledge Base</div>
            <h2>${escapeHtml(caseData.title || caseData.id)}</h2>
            <p class="kb-muted">Every connection below is traced to a document. Nothing is inferred without a source.</p>
          </div>
          <label class="kb-add">+ Add documents<input type="file" accept="application/pdf" multiple hidden /></label>
        </header>
        <div class="kb-progress" hidden></div>
        ${before && (fresh.size || newLinks) ? `<div class="kb-update">Knowledge Base updated: <b>${fresh.size}</b> new node${fresh.size === 1 ? "" : "s"}, <b>${newLinks}</b> new connection${newLinks === 1 ? "" : "s"}. New items are outlined in gold.</div>` : ""}
        <div class="kb-stats">${Object.entries(graph.stats).map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join("")}</div>
        <div class="kb-toolbar">
          <div class="kb-modes">${MODES.map(([id, label]) => `<button data-mode="${id}" class="${id === mode ? "on" : ""}">${label}${id === "conflicts" && graph.stats.Conflicts ? ` (${graph.stats.Conflicts})` : ""}</button>`).join("")}</div>
          <input class="kb-search" placeholder="Search entities, documents, aliases…" />
        </div>
        <div class="kb-main">
          <div class="kb-canvas"><div class="kb-graph"></div><div class="kb-empty" hidden></div></div>
          <aside class="kb-panel"><p class="kb-muted">Select a node to see what Tracy knows, or an edge to see why it is connected.</p></aside>
        </div>
        <details class="kb-repo"><summary>Document repository</summary>${repository(caseData)}</details>
      </div>`;

    const graphEl = container.querySelector(".kb-graph");
    const panel = container.querySelector(".kb-panel");
    const empty = container.querySelector(".kb-empty");
    const pick = ({ node, edge }) => {
      if (node) panel.innerHTML = nodePanel(node, graph, caseData.id);
      else if (edge) panel.innerHTML = edgePanel(edge, graph, caseData.id);
    };
    const render = () => {
      network?.destroy();
      const sub = filterGraph(graph, mode);
      empty.hidden = sub.nodes.length > 0 && sub.edges.length > 0;
      network = window.vis ? drawGraph(graphEl, graph, mode, pick, fresh) : null;
      if (!window.vis) graphEl.innerHTML = `<p class="kb-muted" style="padding:2rem">Graph library failed to load.</p>`;
    };
    render();

    container.querySelectorAll(".kb-modes button").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      container.querySelectorAll(".kb-modes button").forEach((x) => x.classList.toggle("on", x === b));
      render();
    }));

    container.querySelector(".kb-add input").addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const box = container.querySelector(".kb-progress");
      box.hidden = false;
      let step = 0;
      const paint = (failed) => {
        box.innerHTML = `<div class="kb-eyebrow">Adding to Knowledge Base</div><p>${files.map((f) => escapeHtml(f.name)).join(", ")}</p>` +
          STEPS.map((t, i) => `<div class="kb-step ${i < step ? "done" : ""}">${i < step ? "✓" : "·"} ${t}</div>`).join("") +
          (failed ? `<p class="kb-tag bad">${escapeHtml(failed)}</p>` : "");
      };
      paint();
      const tick = setInterval(() => { if (step < STEPS.length - 1) { step += 1; paint(); } }, 1200);
      try {
        const saved = await api.addDocuments(caseData.id, files);
        clearInterval(tick);
        state.case = saved;
        onChange(saved);
        mountKnowledgeBase(container, saved, onChange);
      } catch (err) {
        clearInterval(tick);
        paint(`Could not add documents: ${String(err.message).slice(0, 160)}`);
      }
    });

    container.querySelector(".kb-search").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q || !network) return;
      const hit = graph.nodes.find((n) => `${n.label} ${n.sub} ${(n.aliases || []).join(" ")}`.toLowerCase().includes(q));
      if (hit) { try { network.selectNodes([hit.id]); network.focus(hit.id, { scale: 1.1, animation: true }); } catch { /* not in this view */ } pick({ node: hit }); }
    });
  }

export default {
  id: "documents",
  step: 1,
  label: "Knowledge Base",
  done: true,
  mount: (container, caseData) => mountKnowledgeBase(container, caseData),
};
