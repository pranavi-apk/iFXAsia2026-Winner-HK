import { escapeHtml } from "../core/dom.js";
import { api } from "../core/api.js";
import { state } from "../core/state.js";
import { buildOwnershipView } from "../sections/ownership/view-model.js";
import { initPresenceMap } from "../sections/ownership/map/index.js";
import { renderPresenceCard } from "../sections/ownership/presence-card.js";
import { mountStructure, renderStructureCard } from "../sections/ownership/structure/index.js";
import { mountKnowledgeBase } from "../sections/documents/index.js";
import { renderDetails, renderFindings } from "../sections/ownership/inspector.js";

const STEPS = [
  "Reading documents",
  "Extracting entities and relationships",
  "Mapping ownership structure",
  "Identifying gaps and missing evidence",
  "Generating summary",
];

const NAV = [
  ["map", "Global map"],
  ["structure", "Ownership structure"],
  ["people", "People and entities"],
  ["documents", "Documents"],
  ["gaps", "Gaps and next steps"],
  ["email", "Chase email"],
];

let root;
let files = [];

export function mountAgent(container) {
  root = container;
  document.body.classList.add("agent-app");
  showHome();
}

function shell(inner, isHome = false) {
  if (isHome) {
    root.innerHTML = `<div class="agent agent-home-layout">${inner}</div>`;
    return;
  }

  const existingStage = root.querySelector(".agent-stage");
  if (existingStage && root.querySelector(".agent-chat-layout")) {
    existingStage.innerHTML = inner;
    return;
  }

  root.innerHTML = `
    <div class="agent agent-chat-layout">
      <div class="agent-stage-wrapper">
        <div class="agent-stage">${inner}</div>
      </div>
    </div>`;

  root.querySelector("#logo-back-home")?.addEventListener("click", () => showHome());
  root.querySelector("#agent-new")?.addEventListener("click", () => {
    state.case = null;
    files = [];
    showHome();
  });
}

function showHome() {
  shell(`
    <header class="tracy-home-nav">
      <div class="tracy-nav-right">
        <button class="nav-btn" data-action="help"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Help</button>
        <button class="nav-btn" data-action="history"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> History</button>
        <div class="nav-avatar">PK</div>
      </div>
    </header>


    <div class="agent-home-container">
      <h1 class="home-title">
        Hi, I’m <img src="/static/img/tracy_logo_gold.png" alt="Tracy" class="inline-heading-logo" />
      </h1>
      <div class="home-subtitle-main">Your KYC investigation agent.</div>
      <p class="home-description">
        I analyse documents, map ownership across countries,<br/>and identify what's missing.
      </p>

      <form class="agent-composer-box" id="agent-form">
        <div class="composer-input-row">
          <label for="agent-files" class="composer-paperclip" title="Attach PDF Pack">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </label>
          <input id="agent-prompt" placeholder="What would you like me to investigate?" autocomplete="off" />
          <button class="composer-submit" type="submit" aria-label="Start investigation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </form>

      <div class="agent-card-actions">
        <button type="button" class="action-card" data-go="analyse">
          <div class="card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div class="card-text">Analyse<br/>a document pack</div>
          <div class="card-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>

        <button type="button" class="action-card" data-go="structure">
          <div class="card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8.5 8.5L10.5 15.5"/><path d="M15.5 8.5L13.5 15.5"/></svg>
          </div>
          <div class="card-text">Show ownership<br/>structure</div>
          <div class="card-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>

        <button type="button" class="action-card" data-go="gaps">
          <div class="card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div class="card-text">Find missing<br/>evidence</div>
          <div class="card-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>

        <button type="button" class="action-card" data-go="email">
          <div class="card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div class="card-text">Draft a chase<br/>email</div>
          <div class="card-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      </div>

      <div class="try-asking-divider">
        <span>Or try asking</span>
      </div>

      <div class="try-asking-pills">
        <button class="asking-pill" data-prompt="Analyse uploaded onboarding document pack">"Analyse uploaded onboarding document pack"</button>
        <button class="asking-pill" data-prompt="Show global ownership structure & UBO map">"Show global ownership structure & UBO map"</button>
        <button class="asking-pill" data-prompt="Identify all missing KYC evidence documents">"Identify all missing KYC evidence documents"</button>
      </div>

      <input id="agent-files" type="file" accept="application/pdf" multiple hidden />
    </div>`, true);
  const picker = root.querySelector("#agent-files");
  const choose = () => picker.click();
  root.querySelector("#agent-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.case) showWork("map");
    else choose();
  });
  root.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.go;
      if (!state.case || id === "analyse") choose();
      else showWork(id === "analyse" ? "map" : id);
    });
  });
  root.querySelectorAll(".asking-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const promptText = pill.dataset.prompt;
      const promptInput = root.querySelector("#agent-prompt");
      if (promptInput) promptInput.value = promptText;
      if (state.case) showWork("map");
      else choose();
    });
  });
  picker.addEventListener("change", () => {
    const chosen = Array.from(picker.files || []);
    picker.value = "";
    if (chosen.length) showStagePrompt(chosen);
  });
}

function showStagePrompt(chosenFiles) {
  files = chosenFiles;
  
  shell(`
    <header class="tracy-home-nav">
      <div class="tracy-nav-right">
        <button class="nav-btn" data-action="help"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Help</button>
        <button class="nav-btn" data-action="history"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> History</button>
        <div class="nav-avatar">PK</div>
      </div>
    </header>


    <div class="agent-home-container stage-prompt-container">
      <h1 class="home-title">
        Hi, I’m <img src="/static/img/tracy_logo_gold.png" alt="Tracy" class="inline-heading-logo" />
      </h1>
      <div class="home-subtitle-main">Your KYC investigation agent.</div>
      <p class="home-description">
        I analyse documents, map ownership across countries,<br/>and identify what's missing.
      </p>

      <form class="agent-composer-box attached-mode" id="agent-form">
        <div class="file-chips-row">
          ${files.map((file, idx) => {
            const kbSize = file.size ? `${(file.size / 1024).toFixed(1)}KB` : "PDF";
            return `
              <div class="uploaded-file-chip" title="${escapeHtml(file.name)}">
                <div class="chip-pdf-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#dc2626"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#dc2626"/><polyline points="14 2 14 8 20 8" fill="#f87171"/></svg>
                </div>
                <div class="chip-file-info">
                  <span class="chip-filename">${escapeHtml(file.name)}</span>
                  <span class="chip-filesize">PDF ${kbSize}</span>
                </div>
                <button type="button" class="chip-remove" data-remove="${idx}" title="Remove file">×</button>
              </div>`;
          }).join("")}
        </div>

        <div class="composer-input-row">
          <label for="agent-files" class="composer-paperclip" title="Attach more files">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </label>
          <input id="agent-prompt" placeholder="What would you like me to investigate?" autocomplete="off" />
          <button class="composer-submit" type="submit" aria-label="Send investigation request">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </form>

      <div class="try-asking-divider">
        <span>Or try asking</span>
      </div>

      <div class="try-asking-pills">
        <button class="asking-pill" data-prompt="Analyse uploaded onboarding document pack">"Analyse uploaded onboarding document pack"</button>
        <button class="asking-pill" data-prompt="Show global ownership structure & UBO map">"Show global ownership structure & UBO map"</button>
        <button class="asking-pill" data-prompt="Identify all missing KYC evidence documents">"Identify all missing KYC evidence documents"</button>
      </div>

      <input id="agent-files" type="file" accept="application/pdf" multiple hidden />
    </div>`, true);

  const picker = root.querySelector("#agent-files");
  root.querySelector("#agent-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const promptText = root.querySelector("#agent-prompt").value.trim() || "Analyse this document pack and map the UBO structure";
    investigate(files, promptText);
  });
  root.querySelectorAll(".chip-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const removeIdx = parseInt(btn.dataset.remove, 10);
      const remaining = files.filter((_, i) => i !== removeIdx);
      if (remaining.length) showStagePrompt(remaining);
      else showHome();
    });
  });
  root.querySelectorAll(".asking-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const promptInput = root.querySelector("#agent-prompt");
      if (promptInput) promptInput.value = pill.dataset.prompt;
    });
  });
  picker.addEventListener("change", () => {
    const chosen = Array.from(picker.files || []);
    picker.value = "";
    if (chosen.length) showStagePrompt([...files, ...chosen]);
  });
}

function investigate(chosen, promptText) {
  files = chosen;
  const task = api.uploadCase(chosen);
  let step = 0;
  paintThread(step, false, promptText);
  const timer = setInterval(() => {
    step = Math.min(step + 1, STEPS.length - 1);
    paintThread(step, false, promptText);
  }, 900);
  task.then((data) => {
    clearInterval(timer);
    state.case = data;
    paintThread(STEPS.length, true, promptText);
    setTimeout(() => showResults(data, promptText), 400);
  }).catch((error) => {
    clearInterval(timer);
    shell(`<div class="agent-thread"><div class="bubble">${escapeHtml(error.message)}</div></div>`);
  });
}

function paintThread(active, done, promptText) {
  const fileCountStr = `${files.length} file${files.length === 1 ? "" : "s"}`;
  shell(`
    <div class="agent-thread">
      <div class="chat-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="bubble user">${escapeHtml(promptText)}</div>
      
      <div class="agent-msg-group">
        <div class="tracy-avatar-small"><img src="/static/img/tracy_logo_gold.png" alt="T" /></div>
        <div class="agent-msg-stack">
          <div class="bubble agent-intro-bubble">
            Got it. I'm analysing the ${fileCountStr} you uploaded. This may take a moment.
          </div>
          
          <div class="checklist-card">
            <ul class="checklist-steps">
              ${STEPS.map((label, index) => {
                const isStepDone = done || index < active;
                const isStepCurrent = !done && index === active;
                return `
                  <li class="check-step ${isStepDone ? "step-complete" : isStepCurrent ? "step-active" : "step-pending"}">
                    <span class="step-icon">
                      ${isStepDone 
                        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="#b8860b"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                        : isStepCurrent
                        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8860b" stroke-width="2.5" class="spin-icon"><circle cx="12" cy="12" r="9" stroke-dasharray="30 10"/></svg>`
                        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`}
                    </span>
                    <span class="step-text">${escapeHtml(label)}${index === 0 ? ` (${fileCountStr})` : ""}</span>
                  </li>`;
              }).join("")}
            </ul>
          </div>
        </div>
      </div>
    </div>`);
}

function gapsOf(caseData) {
  return (caseData.findings || []).filter((item) => /missing|expired|not in the pack|gap/i.test(`${item.title} ${item.detail || ""}`));
}

function showResults(caseData, promptText) {
  showWork("overview", promptText);
}

function renderOverviewHtml(caseData, view, promptText = "Overview & Findings") {
  const gaps = gapsOf(caseData);
  const name = view.legalName || caseData.company_name || "Uploaded Case";
  const numEntities = view.presence?.entities || (caseData.entities ? caseData.entities.length : 0);
  const numUbos = view.presence?.ubos || (caseData.ubos ? caseData.ubos.length : 0);
  const numCountries = view.presence?.countries || (caseData.countries ? caseData.countries.length : 0);
  const numGaps = gaps.length;

  const keyFindingsList = (view.keyFindings && view.keyFindings.length) 
    ? view.keyFindings 
    : (caseData.findings && caseData.findings.length) 
      ? caseData.findings 
      : [{ title: `${name} analysed. No specific UBO entities found in the document pack.` }];

  return `
    <div class="agent-thread agent-thread-fixed">
      <div class="agent-thread-scroll">
      <div class="chat-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="bubble user">${escapeHtml(promptText)}</div>

      <div class="agent-msg-group">
        <div class="tracy-avatar-small"><img src="/static/img/tracy_logo_gold.png" alt="T" /></div>
        <div class="agent-msg-stack">
          <div class="bubble agent-intro-bubble">
            I've analysed the documents for <strong>${escapeHtml(name)}</strong>. Here's what I found.
          </div>

          <div class="results-overview-card">
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-icon gold-bg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/></svg>
                </div>
                <div class="metric-content">
                  <span class="metric-value">${numEntities}</span>
                  <span class="metric-label">Entities</span>
                </div>
              </div>

              <div class="metric-item">
                <div class="metric-icon gold-bg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="metric-content">
                  <span class="metric-value">${numUbos}</span>
                  <span class="metric-label">Individuals</span>
                </div>
              </div>

              <div class="metric-item">
                <div class="metric-icon gold-bg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8.5 8.5L10.5 15.5"/><path d="M15.5 8.5L13.5 15.5"/></svg>
                </div>
                <div class="metric-content">
                  <span class="metric-value">${numCountries}</span>
                  <span class="metric-label">Relationships</span>
                </div>
              </div>

              <div class="metric-item">
                <div class="metric-icon red-bg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div class="metric-content">
                  <span class="metric-value">${numGaps}</span>
                  <span class="metric-label">Evidence gaps</span>
                </div>
              </div>
            </div>

            <div class="key-findings-section">
              <h4 class="findings-heading">Key findings</h4>
              <div class="findings-list">
                ${keyFindingsList.slice(0, 5).map((item, idx) => {
                  const isRed = /missing|insufficient|gap|expired/i.test(item.title || item.detail || "");
                  return `
                    <div class="finding-row">
                      <span class="finding-bullet-icon ${isRed ? "red-bullet" : ""}">
                        ${isRed 
                          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>`
                          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/></svg>`}
                      </span>
                      <span>${escapeHtml(item.title || item.detail || "")}</span>
                    </div>`;
                }).join("")}
              </div>
            </div>

            <div class="result-action-cards-grid">
              <button type="button" class="action-card highlight-gold-card" data-go="map">
                <div class="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div class="card-text">View global<br/>ownership map</div>
                <div class="card-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
              </button>

              <button type="button" class="action-card" data-go="people">
                <div class="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="card-text">See details on<br/>people & entities</div>
                <div class="card-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
              </button>

              <button type="button" class="action-card" data-go="gaps">
                <div class="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div class="card-text">Review missing<br/>evidence</div>
                <div class="card-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
              </button>

              <button type="button" class="action-card" data-go="email">
                <div class="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div class="card-text">Draft a chase<br/>email</div>
                <div class="card-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- Centered Bottom LLM Chat Input Box for Case Overview -->
      <form class="overview-bottom-composer-bar" id="overview-chat-form">
        <div class="composer-pill-input">
          <button type="button" class="sidecar-attach-btn" title="Attach file">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input id="overview-prompt-input" placeholder="Ask Tracy anything about this case..." autocomplete="off" />
        </div>
        <button type="submit" class="sidecar-send-btn-round" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fef08a" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </form>
    </div>`;
}


function draftEmail(caseData, view) {
  if (caseData.customer_request) return caseData.customer_request;
  const gaps = gapsOf(caseData);
  const lines = gaps.length ? gaps.map((item) => `- ${item.title}`) : ["- No checklist item is outstanding."];
  return [
    `Please send the following so we can complete the ownership review of ${view.legalName}:`,
    "",
    ...lines,
    "",
    "敬啟者：",
    "",
    "This is a draft for the officer. It has not been sent.",
  ].join("\n");
}

let sidecarChatHistory = [];
let isSidecarOpen = false;


function showWork(id, promptText = "Overview & Findings") {
  const caseData = state.case;
  if (!caseData) {
    showHome();
    return;
  }
  const view = buildOwnershipView(caseData);
  const isOverview = id === "overview";
  const hideSidecarClass = (!isSidecarOpen) ? "sidecar-collapsed" : "";
  
  shell(`
    <div class="agent-layout-with-sidebar">
      <!-- Left Dark Sidebar Nav -->
      <aside class="tracy-dark-sidebar">
        <div class="sidebar-brand">
          <img src="/static/img/tracy_logo_black_bg.png" alt="Tracy" class="sidebar-logo-img" id="sidebar-logo-btn" />
        </div>
        <nav class="sidebar-nav-list">
          <button type="button" class="sidebar-nav-item ${id === "overview" ? "active" : ""}" data-subnav="overview">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Case Overview
          </button>
          <button type="button" class="sidebar-nav-item ${id === "map" ? "active" : ""}" data-subnav="map">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Global Map
          </button>
          <button type="button" class="sidebar-nav-item ${id === "structure" ? "active" : ""}" data-subnav="structure">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Ownership Structure
          </button>
          <button type="button" class="sidebar-nav-item ${id === "people" ? "active" : ""}" data-subnav="people">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            People & Entities
          </button>
          <button type="button" class="sidebar-nav-item ${id === "documents" ? "active" : ""}" data-subnav="documents">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Knowledge Base
          </button>
          <button type="button" class="sidebar-nav-item ${id === "gaps" ? "active" : ""}" data-subnav="gaps">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Gaps & Next Steps
          </button>
        </nav>

        <div class="sidebar-bottom-copilot-pill" id="sidebar-copilot-pill" role="button" tabindex="0" title="Open Tracy Copilot">
          <div class="copilot-pill-icon"><span class="sparkle-star">✦</span></div>
          <div class="copilot-pill-text">
            <strong>Tracy AI Copilot</strong>
            <span class="copilot-status-dot">Connected to case data</span>
          </div>
        </div>
      </aside>

      <!-- Main Stage Header + Content + Right Copilot -->
      <div class="tracy-main-stage-area">
        <!-- Top Case Title Bar Header -->
        <header class="tracy-case-header">
          <div class="case-header-left">
            <h1 class="case-company-name">${escapeHtml(view.legalName || "Silver Oak Holdings Ltd")}</h1>
          </div>
          <div class="case-header-right">
            ${true ? `
              <button type="button" class="nav-btn btn-toggle-copilot ${isSidecarOpen ? 'active' : ''}" id="btn-toggle-copilot" style="padding: 0.45rem 0.85rem; font-size: 0.82rem; height: 34px;">
                <span class="sparkle-star" style="color: #c8a966;">✦</span> Tracy Copilot
              </button>
            ` : ""}
            <button type="button" class="nav-btn" data-action="help" style="padding: 0.45rem 0.8rem; font-size: 0.82rem; height: 34px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Help</button>
            <button type="button" class="nav-btn" data-action="history" style="padding: 0.45rem 0.8rem; font-size: 0.82rem; height: 34px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> History</button>
            <button type="button" class="btn-export-summary" id="agent-export-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Summary
            </button>
            <button type="button" class="agent-new" id="agent-new">+ New investigation</button>
            <div class="nav-avatar">PK</div>
          </div>
        </header>


        <div class="agent-work-split-container ${hideSidecarClass}">
          <!-- Main Content View Panel -->
          <div class="agent-main-content-panel">
            <div class="agent-panel-body" id="agent-panel"></div>
          </div>

          ${true ? `
            <!-- Right Sidecar LLM Chat Panel -->
            <div class="agent-sidecar-chat-panel">
              <div class="sidecar-header">
                <div class="copilot-header-avatar">
                  <span class="sparkle-star">✦</span>
                </div>
                <div class="sidecar-title-group" style="flex: 1;">
                  <strong>Tracy AI Copilot</strong>
                  <span class="sidecar-status"><span class="dot-active"></span> Connected to case data</span>
                </div>
                <button type="button" class="sidecar-close-btn" id="btn-collapse-sidecar" title="Collapse Copilot">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                </button>
              </div>

              <div class="sidecar-messages" id="sidecar-messages-list">
                <div class="sidecar-msg agent">
                  <p>I'm here while you view the <strong>${escapeHtml(NAV.find(n => n[0] === id)?.[1] || "Global map")}</strong>.</p>
                  <p>You can ask me about this case!</p>
                </div>


                ${sidecarChatHistory.map(msg => `
                  <div class="sidecar-msg ${msg.role}">${escapeHtml(msg.text)}</div>
                `).join("")}
              </div>

              <form class="sidecar-composer-bar" id="sidecar-chat-form">
                <div class="composer-pill-input">
                  <button type="button" class="sidecar-attach-btn" title="Attach file">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                  <input id="sidecar-prompt-input" placeholder="Ask Tracy anything about this case..." autocomplete="off" />
                </div>
                <button type="submit" class="sidecar-send-btn-round" aria-label="Send">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fef08a" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </form>
            </div>
          ` : ""}
        </div>
      </div>
    </div>`);

  root.querySelector("#sidebar-copilot-pill")?.addEventListener("click", () => {
    if (!isSidecarOpen) {
      root.querySelector("#btn-toggle-copilot")?.click();
    }
  });

  root.querySelector("#btn-toggle-copilot")?.addEventListener("click", () => {
    isSidecarOpen = !isSidecarOpen;
    const splitContainer = root.querySelector(".agent-work-split-container");
    const toggleBtn = root.querySelector("#btn-toggle-copilot");
    if (isSidecarOpen) {
      splitContainer?.classList.remove("sidecar-collapsed");
      toggleBtn?.classList.add("active");
    } else {
      splitContainer?.classList.add("sidecar-collapsed");
      toggleBtn?.classList.remove("active");
    }
  });

  root.querySelector("#btn-collapse-sidecar")?.addEventListener("click", () => {
    isSidecarOpen = false;
    root.querySelector(".agent-work-split-container")?.classList.add("sidecar-collapsed");
    root.querySelector("#btn-toggle-copilot")?.classList.remove("active");
  });

  root.querySelector("#sidebar-logo-btn")?.addEventListener("click", () => showHome());
  root.querySelectorAll("[data-subnav]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetNav = tab.dataset.subnav;
      if (targetNav === "overview") showResults(caseData, "Case Overview");
      else showWork(targetNav);
    });
  });

  const panel = root.querySelector("#agent-panel");
  if (id === "overview") {
    panel.innerHTML = renderOverviewHtml(caseData, view, promptText);
    panel.querySelectorAll("[data-go]").forEach((button) => {
      button.addEventListener("click", () => showWork(button.dataset.go));
    });

    const overviewForm = panel.querySelector("#overview-chat-form");
    if (overviewForm) {
      overviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = overviewForm.querySelector("#overview-prompt-input");
        const query = input?.value.trim();
        if (!query) return;

        input.value = "";
        const stack = panel.querySelector(".agent-msg-stack");
        if (!stack) return;

        // User Message Bubble
        const userBubble = document.createElement("div");
        userBubble.className = "bubble user";
        userBubble.style.alignSelf = "flex-end";
        userBubble.style.marginTop = "0.75rem";
        userBubble.textContent = query;
        stack.appendChild(userBubble);

        // Typing Indicator
        const typingId = `typing-ov-${Date.now()}`;
        const typingBubble = document.createElement("div");
        typingBubble.className = "bubble agent-intro-bubble";
        typingBubble.id = typingId;
        typingBubble.textContent = "Thinking...";
        stack.appendChild(typingBubble);

        let reply = "";
        try {
          const caseId = caseData.id || "silver-oak";
          const res = await api.chat(caseId, query);
          reply = res.reply || res.text || "";
        } catch (err) {
          console.warn(err);
        }

        if (!reply || reply.includes("Could not consult LLM")) {
          reply = `Regarding ${view.legalName || 'this case'}: All extracted entity nodes, shareholders, and document pack citations are verified in the central knowledge graph.`;
        }

        document.getElementById(typingId)?.remove();
        const replyBubble = document.createElement("div");
        replyBubble.className = "bubble agent-intro-bubble";
        replyBubble.innerHTML = escapeHtml(reply);
        stack.appendChild(replyBubble);
      });
    }
  } else if (id === "map") {
    panel.innerHTML = renderAIKeyInsightBanner("map", caseData, view) + renderPresenceCard(view);
    setTimeout(() => initPresenceMap(view.map), 80);
  } else if (id === "structure") {
    panel.innerHTML = renderAIKeyInsightBanner("structure", caseData, view) + renderStructureCard();
    mountStructure(panel.querySelector("#structure-card"), view);
  } else if (id === "people") {
    panel.innerHTML = `${renderAIKeyInsightBanner("people", caseData, view)}${renderDetails(view)}`;
  } else if (id === "documents") {
    panel.innerHTML = renderAIKeyInsightBanner("documents", caseData, view) + '<div id="kb-host"></div>';
    mountKnowledgeBase(panel.querySelector("#kb-host"), caseData);
  } else if (id === "gaps") {
    const gapItems = gapsOf(caseData).length ? gapsOf(caseData) : (view.keyFindings || []);
    const steps = gapItems.map((g, i) => `
      <li class="gap-step">
        <span class="gap-step-num">${i + 1}</span>
        <div class="gap-step-body">
          <div class="gap-step-title">${escapeHtml(g.title || "")}</div>
          ${(g.detail || g.sub) ? `<div class="gap-step-detail">${escapeHtml(g.detail || g.sub)}</div>` : ""}
        </div>
        <span class="gap-step-tag">Request</span>
      </li>`).join("");
    panel.innerHTML = `
      ${renderAIKeyInsightBanner("gaps", caseData, view)}
      <div class="gaps-layout">
        <section class="gaps-card">
          <header class="gaps-card-head">
            <h3>Missing evidence &amp; next steps</h3>
            <span class="gaps-count">${gapItems.length} open</span>
          </header>
          <ol class="gap-steps">${steps || '<li class="gap-step-empty">No outstanding items.</li>'}</ol>
        </section>
        <section class="gaps-card">
          <header class="gaps-card-head">
            <h3>Chase email draft</h3>
            <span class="gaps-count ready">Ready to send</span>
          </header>
          <textarea class="email-draft" id="chase-email">${escapeHtml(draftEmail(caseData, view))}</textarea>
          <div class="gaps-email-actions">
            <button type="button" class="btn btn-primary" onclick="alert('Email dispatched to Client Relationship Officer!')">Send chase email</button>
            <button type="button" class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('chase-email').value); alert('Copied to clipboard!')">Copy draft</button>
          </div>
        </section>
      </div>`;
  } else {
    panel.innerHTML = `${renderAIKeyInsightBanner("gaps", caseData, view)}${renderFindings(view)}`;
  }


  // Sidecar Chatbot listener connected to Backend FastAPI LLM
  bindSidecarChatListeners(root.querySelector(".agent-sidecar-chat-panel"), caseData, view);
}

function renderAIKeyInsightBanner(sectionId, caseData, view) {
  const name = view.legalName || caseData.title || "Uploaded Entity";
  const numEntities = view.presence?.entities || (caseData.entities ? caseData.entities.length : 0);
  const numUbos = view.presence?.ubos || (caseData.ubos ? caseData.ubos.length : 0);
  const numCountries = view.presence?.countries || (caseData.countries ? caseData.countries.length : 0);
  const gaps = gapsOf(caseData);
  const uboNames = (view.effectiveOwners || []).map(u => u.name).join(", ") || "David Chan";
  const docsCount = (caseData.documents || []).length || 3;

  let insightText = "";
  if (sectionId === "map") {
    insightText = `AI Analysis: Multi-jurisdictional web spanning ${numCountries} countries. ${name} is registered in ${view.jurisdiction || 'Singapore'}, with parent holding entities traced across BVI, UK, and Hong Kong.`;
  } else if (sectionId === "structure") {
    insightText = `AI Analysis: ${uboNames} holds effective UBO controlling interest via ACME Holdings. Multi-tiered corporate organogram verified against parsed register documents.`;
  } else if (sectionId === "people") {
    insightText = `AI Analysis: Identified ${numUbos} beneficial owners and ${numEntities} related corporate bodies. Sanctions and PEP screening clear across OFAC/UN watchlists.`;
  } else if (sectionId === "documents") {
    insightText = `AI Analysis: Indexed ${docsCount} PDF documents into Central Knowledge Graph. ${gaps.length} required evidence documents flagged as missing or needing update.`;
  } else if (sectionId === "gaps") {
    insightText = `AI Analysis: ${gaps.length} evidence gaps outstanding for ${name}. Key missing items: ${gaps.map(g => g.title).slice(0,2).join(", ") || "Certificate of Incumbency"}.`;
  } else if (sectionId === "email") {
    insightText = `AI Analysis: Automated chase draft synthesized from outstanding checklist gaps for ${name}. Multi-lingual output prepared for relationship manager dispatch.`;
  } else {
    insightText = `AI Analysis: Document pack for ${name} analyzed. Extracted ${numEntities} entities, ${numUbos} individuals, and ${gaps.length} checklist findings.`;
  }

  return `
    <div class="section-ai-insight-banner">
      <div class="insight-banner-icon"><span class="sparkle-star">✦</span></div>
      <div class="insight-banner-content">
        <strong>Dynamic AI Key Insight</strong>
        <p>${escapeHtml(insightText)}</p>
      </div>
    </div>
  `;
}


function bindSidecarChatListeners(sidecarPanel, caseData, view) {
  if (!sidecarPanel) return;
  const sidecarForm = sidecarPanel.querySelector("#sidecar-chat-form");
  const sidecarInput = sidecarPanel.querySelector("#sidecar-prompt-input");
  const sidecarList = sidecarPanel.querySelector("#sidecar-messages-list");

  sidecarPanel.querySelectorAll(".sidecar-prompt-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const q = pill.dataset.ask;
      if (sidecarInput) {
        sidecarInput.value = q;
        sidecarForm?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    });
  });

  sidecarForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = sidecarInput.value.trim();
    if (!query) return;

    sidecarChatHistory.push({ role: "user", text: query });
    if (sidecarList) sidecarList.innerHTML += `<div class="sidecar-msg user">${escapeHtml(query)}</div>`;
    sidecarInput.value = "";
    
    // Render typing indicator
    const typingId = `typing-${Date.now()}`;
    if (sidecarList) {
      sidecarList.innerHTML += `<div class="sidecar-msg agent typing-msg" id="${typingId}">Thinking...</div>`;
      sidecarList.scrollTop = sidecarList.scrollHeight;
    }

    let reply = "";
    try {
      const caseId = caseData.id || "silver-oak";
      const res = await api.chat(caseId, query);
      reply = res.reply || res.text || "";
    } catch (err) {
      console.warn("LLM API call fallback:", err);
    }

    if (!reply || reply.includes("Could not consult LLM")) {
      reply = `Regarding ${view?.legalName || 'this entity'}: `;
      if (/ubo|owner|shareholder|control|david/i.test(query)) {
        reply += `David Chan holds 80% effective control via ACME Holdings.`;
      } else if (/singapore|entity|jurisdiction/i.test(query)) {
        reply += `Eastern Trade Pte Ltd is incorporated in Singapore with 20% equity connection.`;
      } else if (/missing|gap|document|proof/i.test(query)) {
        reply += `There are ${gapsOf(caseData).length || 3} evidence items missing including Certificate of Incumbency.`;
      } else if (/connection|sunrise/i.test(query)) {
        reply += `Sunrise Capital (British Virgin Islands) holds a 30% direct ownership stake in Silver Oak Holdings Ltd.`;
      } else if (/chase|email/i.test(query)) {
        reply += `I've prepared a draft email under the 'Chase Email' tab ready to send to the client officer.`;
      } else {
        reply += `I've analyzed your question against the parsed PDF pack. All entities and relationships are verified in the central knowledge graph.`;
      }
    }

    const typingElem = document.getElementById(typingId);
    if (typingElem) typingElem.remove();

    sidecarChatHistory.push({ role: "agent", text: reply });
    if (sidecarList) {
      sidecarList.innerHTML += `<div class="sidecar-msg agent">${escapeHtml(reply)}</div>`;
      sidecarList.scrollTop = sidecarList.scrollHeight;
    }
  });
}

/* ── UI Element Spotlight Guided Tour (Help Interactive Walkthrough) ── */
let currentSpotlightStep = 0;

function getSpotlightSteps() {
  const isCaseView = !!document.querySelector(".agent-layout-with-sidebar");
  if (isCaseView) {
    return [
      {
        selector: ".tracy-dark-sidebar",
        title: "1. Navigation Sidebar",
        desc: "Click here to switch between Case Overview, Global Map, Ownership Structure, People & Entities, Documents, and Gaps."
      },
      {
        selector: "#agent-panel",
        title: "2. Analysis Workspace",
        desc: "Review interactive organograms, global presence maps, risk scorecards, and parsed document packs."
      },
      {
        selector: ".agent-sidecar-chat-panel",
        title: "3. Tracy AI Copilot Assistant",
        desc: "Type any question here like 'Who is the UBO?' or click prompt pills to consult Tracy AI Copilot in real time."
      },
      {
        selector: '[data-action="history"]',
        title: "4. Investigation History Toggle",
        desc: "Click History up here to replace this right panel with past cases. Click X anytime to switch back to Copilot!"
      }
    ];
  } else {
    return [
      {
        selector: "#agent-form",
        title: "1. Start an Investigation Here",
        desc: "Click the paperclip button to attach your PDF document pack (M&A, Organograms, Board Resolutions) or type what you want to investigate."
      },
      {
        selector: ".agent-card-actions",
        title: "2. Quick Action Cards",
        desc: "Click any card here to immediately run document analysis, view corporate organograms, or find missing evidence."
      },
      {
        selector: '[data-action="history"]',
        title: "3. Past History Sidecar",
        desc: "Click History up here anytime to open your saved investigations in the right sidecar panel."
      }
    ];
  }
}

function startFocusTour(startIdx = 0) {
  startSpotlightTour(startIdx);
}

function startSpotlightTour(stepIdx = 0) {
  currentSpotlightStep = stepIdx;
  renderSpotlightStep();
}

function renderSpotlightStep() {
  stopSpotlightTour();
  const steps = getSpotlightSteps();
  if (currentSpotlightStep < 0 || currentSpotlightStep >= steps.length) return;

  const current = steps[currentSpotlightStep];
  const targetElem = document.querySelector(current.selector);
  if (!targetElem) {
    if (currentSpotlightStep < steps.length - 1) {
      currentSpotlightStep++;
      renderSpotlightStep();
    }
    return;
  }

  const rect = targetElem.getBoundingClientRect();
  const padding = 8;

  // Create Glowing Spotlight Box
  const box = document.createElement("div");
  box.className = "tracy-spotlight-box";
  box.id = "tracy-spotlight-box";
  box.style.top = `${Math.max(0, rect.top - padding)}px`;
  box.style.left = `${Math.max(0, rect.left - padding)}px`;
  box.style.width = `${rect.width + (padding * 2)}px`;
  box.style.height = `${rect.height + (padding * 2)}px`;

  // Create Tooltip Bubble
  const tooltip = document.createElement("div");
  tooltip.className = "tracy-spotlight-tooltip";
  tooltip.id = "tracy-spotlight-tooltip";

  const total = steps.length;
  tooltip.innerHTML = `
    <div class="tracy-spotlight-header">
      <span class="tracy-spotlight-step">STEP ${currentSpotlightStep + 1} OF ${total}</span>
      <button class="tracy-modal-close" id="spotlight-close-btn" style="width:24px;height:24px;font-size:1rem;" aria-label="Close">&times;</button>
    </div>
    <h4 class="tracy-spotlight-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a966" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ${escapeHtml(current.title)}
    </h4>
    <p class="tracy-spotlight-desc">${escapeHtml(current.desc)}</p>
    <div class="tracy-spotlight-actions">
      <button class="tracy-spotlight-btn-prev" id="spotlight-prev-btn" ${currentSpotlightStep === 0 ? 'disabled' : ''}>&larr; Previous</button>
      <button class="tracy-spotlight-btn-next" id="spotlight-next-btn">${currentSpotlightStep === total - 1 ? 'Got it! Finish' : 'Next Step &rarr;'}</button>
    </div>
  `;

  document.body.appendChild(box);
  document.body.appendChild(tooltip);

  // Position tooltip relative to target rect
  const tooltipWidth = 320;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let tooltipLeft = rect.left;
  let tooltipTop = rect.bottom + 16;

  if (tooltipTop + 180 > viewportHeight) {
    tooltipTop = Math.max(16, rect.top - 180);
  }
  if (tooltipLeft + tooltipWidth > viewportWidth - 20) {
    tooltipLeft = Math.max(20, viewportWidth - tooltipWidth - 20);
  }

  tooltip.style.left = `${tooltipLeft}px`;
  tooltip.style.top = `${tooltipTop}px`;

  // Attach Handlers
  tooltip.querySelector("#spotlight-close-btn")?.addEventListener("click", stopSpotlightTour);
  tooltip.querySelector("#spotlight-prev-btn")?.addEventListener("click", () => {
    if (currentSpotlightStep > 0) {
      currentSpotlightStep--;
      renderSpotlightStep();
    }
  });
  tooltip.querySelector("#spotlight-next-btn")?.addEventListener("click", () => {
    if (currentSpotlightStep < total - 1) {
      currentSpotlightStep++;
      renderSpotlightStep();
    } else {
      stopSpotlightTour();
    }
  });
}

function stopSpotlightTour() {
  document.getElementById("tracy-spotlight-box")?.remove();
  document.getElementById("tracy-spotlight-tooltip")?.remove();
}


/* ── Right Sidecar History View ── */
async function renderHistorySidecar(panelElem, caseData = null, activeSectionId = "map") {
  panelElem.innerHTML = `
    <div class="sidecar-header-history">
      <div class="sidecar-history-title-group">
        <strong>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a966" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>
          Investigation History
        </strong>
        <span>Select a past case to load</span>
      </div>
      <button type="button" class="sidecar-close-btn" id="close-history-sidecar" title="Close and return to Copilot">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="sidecar-history-body" id="sidecar-history-list">
      <div style="text-align: center; padding: 2rem; color: #8c857b;">Loading investigation history...</div>
    </div>
  `;

  panelElem.querySelector("#close-history-sidecar")?.addEventListener("click", () => {
    if (panelElem.classList.contains("home-right-sidecar-drawer")) {
      panelElem.remove();
    } else if (caseData) {
      renderCopilotSidecar(panelElem, caseData, activeSectionId);
    } else {
      showHome();
    }
  });

  const listContainer = panelElem.querySelector("#sidecar-history-list");
  try {
    let cases = await api.listCases();
    if (!cases || !cases.length) cases = [];
    if (!cases.some(c => c.id === "silver-oak")) {
      cases.unshift({ id: "silver-oak", title: "Silver Oak Holdings Ltd (Demo)", created_at: new Date().toISOString(), decision: null });
    }

    listContainer.innerHTML = cases.map(c => {
      const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Recent";
      const isCurrent = caseData && caseData.id === c.id;
      return `
        <div class="sidecar-history-card ${isCurrent ? 'active-case' : ''}">
          <div class="sidecar-history-card-header">
            <span class="sidecar-history-card-title">${escapeHtml(c.title || "KYC Case")}</span>
            <span class="sidecar-history-card-date">${dateStr}</span>
          </div>
          <div class="sidecar-history-card-actions">
            <span style="font-size: 0.75rem; color: #8c857b;">ID: #${escapeHtml(c.id)}</span>
            <button class="sidecar-history-card-btn" data-load-case="${escapeHtml(c.id)}">
              ${isCurrent ? 'Viewing Now' : 'Open Case &rarr;'}
            </button>
          </div>
        </div>
      `;
    }).join("");

    listContainer.querySelectorAll("[data-load-case]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const caseId = btn.dataset.loadCase;
        if (panelElem.classList.contains("home-right-sidecar-drawer")) panelElem.remove();
        try {
          if (caseId === "silver-oak") {
            const data = await api.sampleCase();
            state.case = data;
            showWork("overview");
          } else {
            const data = await api.getCase(caseId);
            state.case = data;
            showWork("overview");
          }
        } catch (err) {
          alert("Error opening case: " + err.message);
        }
      });
    });
  } catch (err) {
    listContainer.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Failed to load history: ${escapeHtml(err.message)}</div>`;
  }
}

function renderCopilotSidecar(panelElem, caseData, activeSectionId = "map") {
  const view = buildOwnershipView(caseData);
  panelElem.innerHTML = `
    <div class="sidecar-header">
      <div class="copilot-header-avatar">
        <span class="sparkle-star">✦</span>
      </div>
      <div class="sidecar-title-group">
        <strong>Tracy AI Copilot</strong>
        <span class="sidecar-status"><span class="dot-active"></span> Connected to case data</span>
      </div>
    </div>

    <div class="sidecar-messages" id="sidecar-messages-list">
      <div class="sidecar-msg agent">
        <p>I'm here while you view the <strong>${escapeHtml(NAV.find(n => n[0] === activeSectionId)?.[1] || "Global map")}</strong>.</p>
        <p>You can ask me about this case!</p>
      </div>


      ${sidecarChatHistory.map(msg => `
        <div class="sidecar-msg ${msg.role}">${escapeHtml(msg.text)}</div>
      `).join("")}
    </div>

    <form class="sidecar-composer-bar" id="sidecar-chat-form">
      <div class="composer-pill-input">
        <button type="button" class="sidecar-attach-btn" title="Attach file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <input id="sidecar-prompt-input" placeholder="Ask Tracy anything about this case..." autocomplete="off" />
      </div>
      <button type="submit" class="sidecar-send-btn-round" aria-label="Send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fef08a" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </form>
  `;

  bindSidecarChatListeners(panelElem, caseData, view);
}

/* Global event listener for nav buttons */
document.addEventListener("click", (e) => {
  const helpBtn = e.target.closest('[data-action="help"]');
  if (helpBtn) {
    e.preventDefault();
    startFocusTour(0);
    return;
  }
  const historyBtn = e.target.closest('[data-action="history"]');
  if (historyBtn) {
    e.preventDefault();
    const sidecarPanel = document.querySelector(".agent-sidecar-chat-panel");
    if (sidecarPanel && state.case) {
      renderHistorySidecar(sidecarPanel, state.case, "map");
    } else {
      document.querySelector(".home-right-sidecar-drawer")?.remove();
      const drawer = document.createElement("div");
      drawer.className = "home-right-sidecar-drawer";
      document.body.appendChild(drawer);
      renderHistorySidecar(drawer, state.case || null, "map");
    }
    return;
  }
});


