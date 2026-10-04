import { $, $$ } from "../core/dom.js";

// The steps are a visual walkthrough of what the backend does; the real work
// happens in a single request, so the animation is timed, not event-driven.
const STEPS = [
  {
    name: "Document Grounding & Text Chunking",
    sub: "LLM extracting entity profiles & verified quote blocks",
    pct: 20,
    text: "Parsing corporate documents and verifying identity records...",
  },
  {
    name: "Graph Ownership & UBO Traversal",
    sub: "Recursive path multiplication & gap detection in Python",
    pct: 40,
    text: "Traversing ownership graph and calculating effective UBO shares...",
  },
  {
    name: "Official HK Registry Lookup",
    sub: "Live API queries to HK Companies Registry & HKMA data",
    pct: 65,
    text: "Validating entity with Hong Kong Companies Registry & HKMA APIs...",
  },
  {
    name: "UN & HK Sanctions Fuzzy Screening",
    sub: "Cross-checking entities across 5,000+ designation entries",
    pct: 85,
    text: "Screening names against UN Consolidated & HK Sanctions lists...",
  },
  {
    name: "Risk Matrix & Executive Memo Synthesis",
    sub: "Evaluating penalty weights & drafting officer memorandum",
    pct: 100,
    text: "Calculating risk score and generating compliance memorandum...",
  },
];

const STEP_INTERVAL_MS = 1100;
const CLOSE_DELAY_MS = 500;

export function mountPipelineModal(host) {
  host.insertAdjacentHTML(
    "beforeend",
    `
    <div id="pipeline-modal" class="pipeline-modal-overlay">
      <div class="pipeline-card">
        <div class="pipeline-header">
          <div class="pipeline-title">
            <span class="pulsing-dot"></span>
            AUTONOMOUS MULTI-AGENT COMPLIANCE ENGINE
          </div>
          <div style="font-size: 0.85rem; color: #64748b;" id="pipeline-status-text">Initializing autonomous verification agents...</div>
        </div>

        <div class="pipeline-steps">
          ${STEPS.map(
            (step, i) => `
          <div class="p-step">
            <div class="p-icon">${i + 1}</div>
            <div class="p-info">
              <div class="p-name">${step.name}</div>
              <div class="p-sub">${step.sub}</div>
            </div>
            <div class="p-status">Pending</div>
          </div>`
          ).join("")}
        </div>

        <div class="pipeline-progress-bar">
          <div class="progress-fill" id="pipeline-progress"></div>
        </div>
      </div>
    </div>`
  );
}

function setStepStates(activeIndex) {
  $$(".p-step").forEach((el, idx) => {
    const status = el.querySelector(".p-status");
    if (idx < activeIndex) {
      el.className = "p-step completed";
      status.textContent = "Completed ✓";
    } else if (idx === activeIndex) {
      el.className = "p-step active";
      status.textContent = "Processing...";
    } else {
      el.className = "p-step";
      status.textContent = "Pending";
    }
  });
}

// Shows the modal while `task()` runs and resolves with its result.
export async function runWithPipeline(task) {
  const modal = $("#pipeline-modal");
  const progress = $("#pipeline-progress");
  const statusText = $("#pipeline-status-text");
  modal.classList.add("active");

  let current = 0;
  const advance = () => {
    const step = STEPS[current];
    progress.style.width = `${step.pct}%`;
    statusText.textContent = step.text;
    setStepStates(current);
    current += 1;
  };

  advance();
  const timer = setInterval(() => {
    if (current < STEPS.length - 1) advance();
  }, STEP_INTERVAL_MS);

  try {
    const result = await task();
    $$(".p-step").forEach((el) => {
      el.className = "p-step completed";
      el.querySelector(".p-status").textContent = "Completed ✓";
    });
    progress.style.width = "100%";
    statusText.textContent = "Compliance verification finished successfully!";
    await new Promise((resolve) => setTimeout(resolve, CLOSE_DELAY_MS));
    return result;
  } finally {
    clearInterval(timer);
    modal.classList.remove("active");
  }
}
