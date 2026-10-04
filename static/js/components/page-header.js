import { escapeHtml } from "../core/dom.js";

// Title bar at the top of every section. `actions` is optional trusted HTML.
export function pageHeader({ title, subtitle, actions = "" }) {
  return `
    <div class="top-header-bar">
      <div class="header-title-area">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="top-view-actions">${actions}</div>
    </div>`;
}
