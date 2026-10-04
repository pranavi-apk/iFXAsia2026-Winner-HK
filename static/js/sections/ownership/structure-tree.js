import { escapeHtml } from "../../core/dom.js";
import { flagImg } from "../../lib/flags.js";
import { icon } from "../../lib/icons.js";

function nodeCard({ iconHtml, name, sub, tag = "", flag = "", pct = null, cardStyle = "", iconStyle = "" }) {
  return `
    <div class="tree-node-card"${cardStyle ? ` style="${cardStyle}"` : ""}>
      ${pct != null ? `<span class="tree-percentage-pill">${pct}%</span>` : ""}
      <div class="node-icon-box"${iconStyle ? ` style="${iconStyle}"` : ""}>${iconHtml}</div>
      <div class="node-details">
        <div class="node-name">${escapeHtml(name)}</div>
        <div class="node-sub">${sub}</div>
      </div>
      ${tag}
      ${flag}
    </div>`;
}

export function renderStructureTree(view) {
  const ubos = view.ubos.map((u) =>
    nodeCard({
      iconHtml: icon("user", 20),
      name: u.name,
      sub: `${escapeHtml(u.country)} · <strong>${u.pct}%</strong>`,
      tag: '<span class="node-tag">UBO</span>',
    })
  );

  const holding = nodeCard({
    iconHtml: icon("buildingFull", 20),
    name: view.legalName,
    sub: `${escapeHtml(view.jurisdiction)} · ${escapeHtml(view.companyType)}`,
    flag: flagImg(view.jurisdiction),
    cardStyle: "border: 2px solid #2563eb; background: #faf5ff;",
    iconStyle: "background: #eff6ff; color: #2563eb;",
  });

  const subsidiaries = view.subsidiaries.map((s) =>
    nodeCard({
      iconHtml: icon("building", 18),
      name: s.name,
      sub: `${escapeHtml(s.country)} · ${escapeHtml(s.role)}`,
      flag: flagImg(s.country),
      pct: s.pct,
    })
  );

  return `
    <div class="card-panel">
      <div class="card-title-row">
        <h2>Ownership Structure</h2>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" style="padding: 2px 10px; font-size: 0.75rem;">Collapse All</button>
          <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;">-</button>
          <span style="font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; padding: 0 4px;">100%</span>
          <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;">+</button>
        </div>
      </div>

      <div class="tree-canvas-wrapper">
        <div class="tree-level-row">${ubos.join("")}</div>
        <div class="tree-level-row">${holding}</div>
        <div class="tree-level-row" style="gap: 1rem;">${subsidiaries.join("")}</div>
      </div>
    </div>`;
}
