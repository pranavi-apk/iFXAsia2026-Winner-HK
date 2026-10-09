import { escapeHtml } from "../../../core/dom.js";
import { flagImg } from "../../../lib/flags.js";
import { icon } from "../../../lib/icons.js";
import { createCanvas } from "./canvas.js";
import { CARD_W, expKey, layoutStructure } from "./layout.js";

export function renderStructureCard() {
  return `
    <div class="card-panel structure-board" id="structure-card">
      <div class="card-title-row structure-board-head">
        <div class="structure-board-title">
          <h2>Ownership structure</h2>
          <p>Owners sit above the applicant. Entities it owns sit below.</p>
        </div>
        <div class="tree-controls">
          <button class="btn btn-secondary btn-sm" data-action="collapse">Collapse all</button>
          <button class="btn btn-secondary btn-sm" data-action="fit">Fit</button>
          <button class="btn btn-secondary btn-sm" data-action="zoom-out" aria-label="Zoom out">−</button>
          <span class="tree-zoom-label" data-zoom-label>100%</span>
          <button class="btn btn-secondary btn-sm" data-action="zoom-in" aria-label="Zoom in">+</button>
        </div>
      </div>
      <div class="tree-viewport" data-viewport>
        <div class="tree-world" data-world></div>
        <div class="tree-legend">
          <span><i class="swatch root"></i> Applicant</span>
          <span><i class="swatch person"></i> Person</span>
          <span><i class="swatch company"></i> Company</span>
        </div>
      </div>
    </div>`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] || "?").slice(0, 2);
  return escapeHtml(letters.toUpperCase());
}

function nodeHtml(entry) {
  const { node, cx, y, isRoot } = entry;
  const isPerson = node.kind === "person";
  const kind = isRoot ? "root" : isPerson ? "person" : "company";
  const kicker = isRoot ? "Applicant" : escapeHtml(node.role || (isPerson ? "Individual" : "Company"));
  const mark = isPerson
    ? `<div class="node-avatar" aria-hidden="true">${initials(node.name)}</div>`
    : `<div class="node-icon-box">${icon(isRoot ? "buildingFull" : "building", 18)}</div>`;
  const share = node.pct != null ? `<span class="node-pct">${node.pct}%</span>` : "";
  return `
    <div class="tree-node-card in-canvas is-${kind}" style="left:${cx - CARD_W / 2}px; top:${y}px;">
      ${mark}
      <div class="node-details">
        <div class="node-kicker">${kicker}</div>
        <div class="node-name" title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</div>
        <div class="node-meta">
          <span class="node-sub">${escapeHtml(node.country || "")}</span>
          ${share}
        </div>
      </div>
      ${node.tag ? `<span class="node-tag">${escapeHtml(node.tag)}</span>` : ""}
      ${isPerson ? "" : flagImg(node.country)}
    </div>`;
}

function edgePath({ from, to }) {
  const mid = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.y}`;
}

function worldHtml(layout) {
  const paths = layout.edges.map((e) => `<path d="${edgePath(e)}" marker-end="url(#tree-arrow)" />`).join("");
  const pills = layout.edges
    .filter((e) => e.pct != null)
    .map((e) => `<span class="tree-edge-pill" style="left:${e.pillAt.x}px; top:${e.pillAt.y}px;">${e.pct}%</span>`)
    .join("");
  const toggles = layout.toggles
    .map(
      (t) => `
      <button class="tree-toggle" data-toggle="${t.key}" style="left:${t.cx}px; top:${t.y}px;"
        title="Show ${t.dir === "down" ? "subsidiaries" : "owners"}">+${t.count}</button>`
    )
    .join("");

  return `
    <svg class="tree-edges" width="${layout.width}" height="${layout.height}">
      <defs>
        <marker id="tree-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b48d3c" stroke="none" />
        </marker>
      </defs>
      ${paths}
    </svg>
    ${layout.nodes.map(nodeHtml).join("")}
    ${pills}
    ${toggles}`;
}

export function mountStructure(card, view) {
  const viewport = card.querySelector("[data-viewport]");
  const world = card.querySelector("[data-world]");
  const label = card.querySelector("[data-zoom-label]");
  const canvas = createCanvas(viewport, world, (k) => {
    label.textContent = `${Math.round(k * 100)}%`;
  });

  // Start with the applicant's direct owners and subsidiaries; everything
  // further out is collapsed until the user opens it.
  const initial = () => new Set([expKey("up", "applicant"), expKey("down", "applicant")]);
  let expanded = initial();
  let layout = layoutStructure(view.structure, expanded);

  const paint = () => {
    world.style.width = `${layout.width}px`;
    world.style.height = `${layout.height}px`;
    world.innerHTML = worldHtml(layout);
  };
  const fit = () => canvas.fit(layout.width, layout.height);

  paint();
  fit();

  world.addEventListener("click", (e) => {
    const button = e.target.closest("[data-toggle]");
    if (!button) return;
    const key = button.dataset.toggle;
    const anchor = canvas.screenOf(layout.anchors[key].x, layout.anchors[key].y);

    expanded.add(key);
    layout = layoutStructure(view.structure, expanded);
    paint();
    const moved = layout.anchors[key];
    canvas.pin(moved.x, moved.y, anchor.x, anchor.y); // the card you clicked stays where it was
  });

  card.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "zoom-in") canvas.zoomStep(1);
    else if (action === "zoom-out") canvas.zoomStep(-1);
    else if (action === "fit") fit();
    else if (action === "collapse") {
      expanded = initial();
      layout = layoutStructure(view.structure, expanded);
      paint();
      fit();
    }
  });
}
