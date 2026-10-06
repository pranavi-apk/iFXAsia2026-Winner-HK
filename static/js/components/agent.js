import { escapeHtml } from "../core/dom.js";
import { api } from "../core/api.js";
import { state } from "../core/state.js";
import { buildOwnershipView } from "../sections/ownership/view-model.js";
import { initPresenceMap } from "../sections/ownership/map/index.js";
import { renderPresenceCard } from "../sections/ownership/presence-card.js";
import { mountStructure, renderStructureCard } from "../sections/ownership/structure/index.js";
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

function shell(inner) {
  root.innerHTML = `
    <div class="agent">
      <header class="agent-top">
        <div class="agent-brand"><img src="/static/img/tracy_logo.png" alt="" /><span>Tracy</span></div>
        <button type="button" class="agent-new" id="agent-new">New case</button>
      </header>
      <div class="agent-stage">${inner}</div>
    </div>`;
  root.querySelector("#agent-new").addEventListener("click", () => {
    state.case = null;
    files = [];
    showHome();
  });
}

function showHome() {
  shell(`
    <div class="agent-home">
      <div class="agent-brand" style="justify-content:center"><img src="/static/img/tracy_logo.png" alt="" /><span>Tracy</span></div>
      <h1>Hi, I'm Tracy.</h1>
      <p>Your KYC investigation agent. I read a corporate pack, map who owns and controls the company, and draft the chase email. I do not send it.</p>
      <form class="agent-composer" id="agent-form">
        <input id="agent-prompt" placeholder="Upload a pack to investigate" />
        <button class="agent-send" type="submit" aria-label="Start">→</button>
      </form>
      <div class="agent-actions">
        ${[
          ["analyse", "Analyse a document pack"],
          ["structure", "Show ownership structure"],
          ["gaps", "Find missing evidence"],
          ["email", "Draft a chase email"],
        ].map(([id, label]) => `<button type="button" class="agent-action" data-go="${id}"><strong>${label}</strong></button>`).join("")}
      </div>
      <input id="agent-files" type="file" accept="application/pdf" multiple hidden />
    </div>`);
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
  picker.addEventListener("change", () => {
    const chosen = Array.from(picker.files || []);
    picker.value = "";
    if (chosen.length) investigate(chosen);
  });
}

function investigate(chosen) {
  files = chosen;
  const task = api.uploadCase(chosen);
  let step = 0;
  paintThread(step, false);
  const timer = setInterval(() => {
    step = Math.min(step + 1, STEPS.length - 1);
    paintThread(step, false);
  }, 900);
  task.then((data) => {
    clearInterval(timer);
    state.case = data;
    paintThread(STEPS.length, true);
    setTimeout(() => showResults(data), 500);
  }).catch((error) => {
    clearInterval(timer);
    shell(`<div class="agent-thread"><div class="bubble">${escapeHtml(error.message)}</div></div>`);
  });
}

function paintThread(active, done) {
  shell(`
    <div class="agent-thread">
      <div class="bubble user">Analyse the onboarding documents for this pack and show me the ownership structure.</div>
      <div class="bubble">
        <strong>Got it. I'm reading the ${files.length} document${files.length === 1 ? "" : "s"} you uploaded.</strong>
        <ul class="step-list">
          ${STEPS.map((label, index) => `<li class="${done || index < active ? "done" : ""}">${done || index < active ? "✓" : "○"} ${label}</li>`).join("")}
        </ul>
      </div>
    </div>`);
}

function gapsOf(caseData) {
  return (caseData.findings || []).filter((item) => /missing|expired|not in the pack|gap/i.test(`${item.title} ${item.detail || ""}`));
}

function showResults(caseData) {
  const view = buildOwnershipView(caseData);
  const gaps = gapsOf(caseData);
  const name = view.legalName;
  shell(`
    <div class="agent-thread">
      <div class="bubble user">Analyse the onboarding documents for ${escapeHtml(name)} and show me the ownership structure.</div>
      <div class="bubble">
        <strong>I've read the pack for ${escapeHtml(name)}. Here is what I found.</strong>
        <div class="metric-row">
          <div class="metric"><b>${view.presence.entities}</b><span>Entities</span></div>
          <div class="metric"><b>${view.presence.ubos}</b><span>Individuals</span></div>
          <div class="metric"><b>${view.presence.countries}</b><span>Countries</span></div>
          <div class="metric"><b>${gaps.length}</b><span>Evidence gaps</span></div>
        </div>
        ${view.keyFindings.slice(0, 4).map((item) => `<span class="finding">${escapeHtml(item.title)}</span>`).join("")}
        <div class="result-actions">
          <button type="button" data-go="map">View global ownership map</button>
          <button type="button" data-go="people">See people and entities</button>
          <button type="button" data-go="gaps">Review missing evidence</button>
          <button type="button" data-go="email">Draft a chase email</button>
        </div>
      </div>
    </div>`);
  root.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showWork(button.dataset.go));
  });
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
    `為完成 ${view.legalName} 的擁有權及控制權審查，請提供上述尚未齊備的文件。`,
    "",
    "This is a draft for the officer. It has not been sent.",
  ].join("\n");
}

function showWork(id) {
  const caseData = state.case;
  if (!caseData) {
    showHome();
    return;
  }
  const view = buildOwnershipView(caseData);
  shell(`
    <div class="agent-work">
      <nav class="agent-nav">
        <strong style="padding:0.4rem 0.6rem">${escapeHtml(view.legalName)}</strong>
        ${NAV.map(([key, label]) => `<button type="button" data-nav="${key}" class="${key === id ? "active" : ""}">${label}</button>`).join("")}
      </nav>
      <div class="agent-panel" id="agent-panel"></div>
    </div>`);
  root.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => showWork(button.dataset.nav));
  });
  const panel = root.querySelector("#agent-panel");
  if (id === "map") {
    panel.innerHTML = `<h2>Global ownership map</h2><p class="email-note">${view.presence.entities} entities · ${view.presence.ubos} individuals · ${view.presence.countries} countries</p>${renderPresenceCard(view)}`;
    setTimeout(() => initPresenceMap(view.map), 80);
  } else if (id === "structure") {
    panel.innerHTML = renderStructureCard();
    mountStructure(panel.querySelector("#structure-card"), view);
  } else if (id === "people") {
    panel.innerHTML = `<h2>People and entities</h2><div class="ownership-details">${renderDetails(view)}</div>`;
  } else if (id === "documents") {
    const docs = caseData.documents || [];
    panel.innerHTML = `<h2>Documents</h2>${docs.map((doc) => `<span class="finding">${escapeHtml(doc.filename || doc.title || "Document")}</span>`).join("") || "<p>No documents stored.</p>"}`;
  } else if (id === "gaps") {
    panel.innerHTML = `<h2>Gaps and next steps</h2>${renderFindings(view)}`;
  } else {
    panel.innerHTML = `
      <h2>Chase email</h2>
      <p class="email-note">English and Traditional Chinese. Ready for the officer. Not sent.</p>
      <textarea class="email-draft" id="chase-email">${escapeHtml(draftEmail(caseData, view))}</textarea>`;
  }
}
