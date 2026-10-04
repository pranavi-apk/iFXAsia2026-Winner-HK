import { $ } from "./core/dom.js";
import { api } from "./core/api.js";
import { state } from "./core/state.js";
import { mountCopilot, showCopilot } from "./components/copilot.js";
import { mountPipelineModal, runWithPipeline } from "./components/pipeline-modal.js";
import { mountSidebar, setActiveNav, setSampleDisabled } from "./components/sidebar.js";
import { renderError, renderWelcome } from "./components/welcome.js";
import { sectionById, sections } from "./sections/index.js";

const app = $("#app");

function showWelcome() {
  history.replaceState(null, "", "/");
  renderWelcome(app, { onSample: openSample, onUpload: openUpload });
}

function showSection(id) {
  state.sectionId = id;
  setActiveNav(id);
  if (!state.case) return; // nothing to show until a case is open
  sectionById(id).mount(app, state.case);
}

function showCase(data) {
  state.case = data;
  history.replaceState(null, "", `/?case=${data.id}`);
  showCopilot();
  showSection(state.sectionId);
}

async function openCase(task) {
  setSampleDisabled(true);
  try {
    showCase(await runWithPipeline(task));
  } catch (error) {
    renderError(app, error.message, { onBack: showWelcome });
  } finally {
    setSampleDisabled(false);
  }
}

function openSample() {
  return openCase(() => api.sampleCase());
}

function openUpload(files) {
  return openCase(() => api.uploadCase(files));
}

mountSidebar($("#sidebar"), {
  sections,
  activeId: state.sectionId,
  onSelect: showSection,
  onSample: openSample,
  onUpload: openUpload,
});
mountPipelineModal($("#overlays"));
mountCopilot($("#overlays"));
renderWelcome(app, { onSample: openSample, onUpload: openUpload });

const savedCase = new URLSearchParams(location.search).get("case");
if (savedCase) {
  api.getCase(savedCase).then(showCase).catch(() => {});
}
