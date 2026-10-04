import { pageHeader } from "../../components/page-header.js";
import { icon } from "../../lib/icons.js";
import { initPresenceMap } from "./map/index.js";
import { renderInspector } from "./inspector.js";
import { renderPresenceCard } from "./presence-card.js";
import { mountStructure, renderStructureCard } from "./structure/index.js";
import { buildOwnershipView } from "./view-model.js";

const MAP_INIT_DELAY_MS = 100; // wait for the container to have a size

const headerActions = `
  <button class="btn-export-top" id="btn-export-top">
    ${icon("download", 15)}
    Export Diagram
  </button>`;

export default {
  id: "ownership",
  step: 2,
  label: "Ownership & Control",

  mount(container, caseData) {
    if (!caseData.intake) {
      container.innerHTML = pageHeader({ title: "Ownership & Control", subtitle: "This case has no structured intake. Open the sample case." });
      return;
    }
    const view = buildOwnershipView(caseData);

    container.innerHTML = `
      ${pageHeader({
        title: "Ownership & Control",
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

    mountStructure(container.querySelector("#structure-card"), view);

    container.querySelector("#btn-export-top").addEventListener("click", () => window.print());

    setTimeout(() => initPresenceMap(view.map), MAP_INIT_DELAY_MS);
  },
};
