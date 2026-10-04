import { $$ } from "../../core/dom.js";
import { pageHeader } from "../../components/page-header.js";
import { icon } from "../../lib/icons.js";
import { initPresenceMap } from "./map/index.js";
import { renderInspector } from "./inspector.js";
import { renderPresenceCard } from "./presence-card.js";
import { mountStructure, renderStructureCard } from "./structure/index.js";
import { buildOwnershipView } from "./view-model.js";

const VIEW_TABS = ["Structure View", "Table View", "Key Findings"];
const MAP_INIT_DELAY_MS = 100; // wait for the container to have a size

const headerActions = `
  <div class="segmented-control">
    ${VIEW_TABS.map((label, i) => `<button class="seg-btn${i === 0 ? " active" : ""}">${label}</button>`).join("")}
  </div>
  <button class="btn-export-top" id="btn-export-top">
    ${icon("download", 15)}
    Export Diagram
  </button>`;

export default {
  id: "ownership",
  step: 2,
  label: "Ownership & Control",

  mount(container, caseData) {
    const view = buildOwnershipView(caseData);

    container.innerHTML = `
      ${pageHeader({
        title: "Ownership & Control",
        subtitle: "Visualise the corporate structure, ultimate beneficial owners and key relationships",
        actions: headerActions,
      })}
      <div class="dashboard-grid">
        <div class="left-panel-col">
          ${renderPresenceCard(view)}
          ${renderStructureCard()}
        </div>
        <div class="right-panel-col">
          ${renderInspector(view)}
        </div>
      </div>`;

    // The view tabs only change which one looks selected for now.
    const tabs = $$(".seg-btn", container);
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
      });
    });

    mountStructure(container.querySelector("#structure-card"), view);

    container.querySelector("#btn-export-top").addEventListener("click", () => window.print());

    setTimeout(() => initPresenceMap(view.map), MAP_INIT_DELAY_MS);
  },
};
