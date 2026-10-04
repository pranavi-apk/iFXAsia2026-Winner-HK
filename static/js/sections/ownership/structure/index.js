import { escapeHtml } from "../../../core/dom.js";
import { flagImg } from "../../../lib/flags.js";
import { icon } from "../../../lib/icons.js";
import { createCanvas } from "./canvas.js";
import { ARROW_RUN, CARD_W, expKey, layoutStructure } from "./layout.js";

export function renderStructureCard() {
  return `
    <div class="card-panel" id="structure-card">
      <div class="card-title-row">
        <h2>Ownership Structure</h2>
        <div class="tree-controls">
          <button class="btn btn-secondary btn-sm" data-action="collapse">Collapse All</button>
          <button class="btn btn-secondary btn-sm" data-action="fit">Fit</button>
          <button class="btn btn-secondary btn-sm" data-action="zoom-out" aria-label="Zoom out">-</button>
          <span class="tree-zoom-label" data-zoom-label>100%</span>
          <button class="btn btn-secondary btn-sm" data-action="zoom-in" aria-label="Zoom in">+</button>
        </div>
      </div>
      <div class="tree-viewport" data-viewport>
        <div class="tree-world" data-world></div>
      </div>
    </div>`;
}

function nodeHtml(entry) {
  const { node, cx, y, isRoot } = entry;
  const isPerson = node.kind === "person";
  const iconHtml = isPerson ? icon("user", 20) : icon(isRoot ? "buildingFull" : "building", isRoot ? 20 : 18);
  const second = isPerson ? `<strong>${node.pct}%</strong>` : escapeHtml(node.role);
  const rootStyle = isRoot ? "border: 2px solid #2563eb; background: #faf5ff;" : "";
  const iconStyle = isRoot ? ' style="background: #eff6ff; color: #2563eb;"' : "";
  return `
    <div class="tree-node-card in-canvas" style="left:${cx - CARD_W / 2}px; top:${y}px; ${rootStyle}">
      <div class="node-icon-box"${iconStyle}>${iconHtml}</div>
      <div class="node-details">
        <div class="node-name" title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</div>
        <div class="node-sub">${escapeHtml(node.country)}</div>
        <div class="node-sub">${second}</div>
      </div>
      ${node.tag ? `<span class="node-tag">${escapeHtml(node.tag)}</span>` : ""}
      ${isPerson ? "" : flagImg(node.country)}
    </div>`;
}

function edgePath({ from, to }) {
  return `M ${from.x} ${from.y} V ${to.y - ARROW_RUN} H ${to.x} V ${to.y}`;
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
        <marker id="tree-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" stroke="none" />
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
