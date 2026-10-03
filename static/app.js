const app = document.querySelector("#app");
const sampleButton = document.querySelector("#sample");
const fileInput = document.querySelector("#files");
const headerCaseInfo = document.querySelector("#header-case-info");
const navCaseTitle = document.querySelector("#nav-case-title");
const navRiskBadge = document.querySelector("#nav-risk-badge");
const pipelineModal = document.querySelector("#pipeline-modal");
const pipelineProgress = document.querySelector("#pipeline-progress");
const pipelineStatusText = document.querySelector("#pipeline-status-text");

const copilotWidget = document.querySelector("#ai-copilot-widget");
const copilotToggleBtn = document.querySelector("#copilot-toggle-btn");
const copilotDrawer = document.querySelector("#copilot-drawer");
const copilotCloseBtn = document.querySelector("#copilot-close-btn");
const copilotMsgBox = document.querySelector("#copilot-msg-box");
const copilotInput = document.querySelector("#copilot-input");
const copilotSend = document.querySelector("#copilot-send");

let currentCaseData = null;
let activeChartInstance = null;

// Initialize listeners
if (sampleButton) {
  sampleButton.addEventListener("click", () => runPipeline("/api/cases/sample", { method: "POST" }));
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const body = new FormData();
    for (const file of fileInput.files) body.append("files", file);
    runPipeline("/api/cases", { method: "POST", body });
  });
}

// Check URL query param on page load
const savedCase = new URLSearchParams(location.search).get("case");
if (savedCase) {
  fetch(`/api/cases/${savedCase}`)
    .then((res) => {
      if (!res.ok) throw new Error("Case not found");
      return res.json();
    })
    .then(renderCase)
    .catch(() => {});
}

// Copilot Drawer Controls
if (copilotToggleBtn) {
  copilotToggleBtn.addEventListener("click", () => {
    copilotDrawer.style.display = copilotDrawer.style.display === "none" ? "flex" : "none";
  });
}
if (copilotCloseBtn) {
  copilotCloseBtn.addEventListener("click", () => {
    copilotDrawer.style.display = "none";
  });
}

if (copilotSend) {
  copilotSend.addEventListener("click", sendCopilotMsg);
  copilotInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendCopilotMsg();
  });
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("chip-btn")) {
    const prompt = e.target.dataset.ask;
    if (prompt) askCopilot(prompt);
  }
});

function sendCopilotMsg() {
  const text = copilotInput.value.trim();
  if (!text) return;
  copilotInput.value = "";
  askCopilot(text);
}

function askCopilot(prompt) {
  if (!currentCaseData) return;
  
  const userMsg = document.createElement("div");
  userMsg.className = "copilot-msg user";
  userMsg.textContent = prompt;
  copilotMsgBox.appendChild(userMsg);

  const botMsg = document.createElement("div");
  botMsg.className = "copilot-msg bot";
  botMsg.textContent = "Checking case records and regulatory rules...";
  copilotMsgBox.appendChild(botMsg);
  copilotMsgBox.scrollTop = copilotMsgBox.scrollHeight;

  fetch(`/api/cases/${currentCaseData.id}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
    .then((res) => res.json())
    .then((data) => {
      botMsg.textContent = data.reply || "No response received.";
      copilotMsgBox.scrollTop = copilotMsgBox.scrollHeight;
    })
    .catch((err) => {
      botMsg.textContent = `Error: ${err.message}`;
    });
}

// Professional Verification Pipeline Runner
function runPipeline(url, options) {
  if (sampleButton) sampleButton.disabled = true;
  pipelineModal.classList.add("active");

  const steps = [
    { id: "p-step-1", pct: 20, text: "Parsing corporate documents and verifying identity records..." },
    { id: "p-step-2", pct: 40, text: "Traversing ownership graph and calculating effective UBO shares..." },
    { id: "p-step-3", pct: 65, text: "Validating entity with Hong Kong Companies Registry & HKMA APIs..." },
    { id: "p-step-4", pct: 85, text: "Screening names against UN Consolidated & HK Sanctions lists..." },
    { id: "p-step-5", pct: 100, text: "Calculating risk score and generating compliance memorandum..." },
  ];

  let currentStep = 0;

  function advanceStep() {
    if (currentStep < steps.length) {
      const s = steps[currentStep];
      pipelineProgress.style.width = `${s.pct}%`;
      pipelineStatusText.textContent = s.text;

      document.querySelectorAll(".p-step").forEach((el, idx) => {
        if (idx < currentStep) {
          el.className = "p-step completed";
          el.querySelector(".p-status").textContent = "Completed ✓";
        } else if (idx === currentStep) {
          el.className = "p-step active";
          el.querySelector(".p-status").textContent = "Processing...";
        } else {
          el.className = "p-step";
          el.querySelector(".p-status").textContent = "Pending";
        }
      });
      currentStep++;
    }
  }

  advanceStep();
  const stepTimer = setInterval(() => {
    if (currentStep < steps.length - 1) advanceStep();
  }, 1100);

  fetch(url, options)
    .then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    })
    .then((data) => {
      clearInterval(stepTimer);
      document.querySelectorAll(".p-step").forEach((el) => {
        el.className = "p-step completed";
        el.querySelector(".p-status").textContent = "Completed ✓";
      });
      pipelineProgress.style.width = "100%";
      pipelineStatusText.textContent = "Compliance verification finished successfully!";

      setTimeout(() => {
        pipelineModal.classList.remove("active");
        renderCase(data);
      }, 500);
    })
    .catch((error) => {
      clearInterval(stepTimer);
      pipelineModal.classList.remove("active");
      app.innerHTML = `
        <div class="welcome-hero">
          <div class="hero-content">
            <h1 style="color: var(--status-attention); font-size: 2rem;">Verification Encountered an Error</h1>
            <p style="color: var(--text-muted);">${escapeHtml(error.message)}</p>
            <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: 1rem;">Return to Dashboard</button>
          </div>
        </div>
      `;
    })
    .finally(() => {
      if (sampleButton) sampleButton.disabled = false;
    });
}

function renderCase(data) {
  currentCaseData = data;
  history.replaceState(null, "", `/?case=${data.id}`);

  // Show copilot widget
  if (copilotWidget) copilotWidget.style.display = "block";

  // Header update
  if (headerCaseInfo) {
    headerCaseInfo.style.display = "flex";
    navCaseTitle.textContent = data.entity?.legal_name || data.title;
    navRiskBadge.textContent = `${data.risk.rating} Risk (${data.risk.score} pts)`;
    navRiskBadge.className = `nav-risk-pill ${data.risk.rating}`;
    if (data.risk.rating === "Low") {
      navRiskBadge.style.background = "var(--status-clear-bg)";
      navRiskBadge.style.color = "var(--status-clear)";
      navRiskBadge.style.border = "1px solid var(--status-clear-border)";
    } else if (data.risk.rating === "Medium") {
      navRiskBadge.style.background = "var(--status-review-bg)";
      navRiskBadge.style.color = "var(--status-review)";
      navRiskBadge.style.border = "1px solid var(--status-review-border)";
    } else {
      navRiskBadge.style.background = "var(--status-attention-bg)";
      navRiskBadge.style.color = "var(--status-attention)";
      navRiskBadge.style.border = "1px solid var(--status-attention-border)";
    }
  }

  const modules = Object.values(data.modules);
  const legalName = data.entity?.legal_name || data.title;
  const initialLetter = legalName.charAt(0).toUpperCase();

  app.innerHTML = `
    <!-- Command Center Header Bar -->
    <div class="case-header-bar">
      <div class="company-profile">
        <div class="company-avatar">${initialLetter}</div>
        <div class="company-title-area">
          <h1>${escapeHtml(legalName)}</h1>
          <div class="company-meta-tags">
            <span class="meta-tag">Case ID: <strong class="meta-badge">${escapeHtml(data.id)}</strong></span>
            <span class="meta-tag">HK Registry: <strong class="meta-badge" style="color: var(--primary);">${escapeHtml(data.registry?.status || 'no_match')}</strong></span>
            <span class="meta-tag">Model Engine: <strong class="meta-badge">${escapeHtml(data.labels.model)}</strong></span>
          </div>
        </div>
      </div>

      <!-- Animated SVG Speedometer Dial Gauge -->
      <div class="risk-gauge-box">
        <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;">
          <svg width="64" height="64" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" stroke-width="3.5" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" 
              stroke="${data.risk.rating === 'Low' ? '#059669' : data.risk.rating === 'Medium' ? '#d97706' : '#dc2626'}" 
              stroke-width="3.5" stroke-dasharray="${Math.min(100, Math.max(15, data.risk.score * 2.5))}, 100" />
          </svg>
          <div style="position: absolute; font-family: var(--font-title); font-weight: 800; font-size: 1rem; color: var(--text-main);">${data.risk.score}</div>
        </div>

        <div>
          <div style="font-size: 0.7rem; color: var(--text-subtle); font-weight: 700; letter-spacing: 0.06em;">RISK SCORE GAUGE</div>
          <div class="gauge-score ${data.risk.rating}" style="font-size: 1.6rem;">${data.risk.rating} Risk</div>
        </div>
      </div>
    </div>

    <!-- Stepper Navigation Tabs -->
    <nav class="tab-navigation">
      <button class="tab-btn active" data-tab="tab-summary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Overview & Modules
      </button>
      <button class="tab-btn" data-tab="tab-ownership">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Ownership Hierarchy Graph
      </button>
      <button class="tab-btn" data-tab="tab-analytics">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Risk Analytics
      </button>
      <button class="tab-btn" data-tab="tab-findings">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Findings & Document Viewer
        <span class="tab-count">${data.findings.length}</span>
      </button>
      <button class="tab-btn" data-tab="tab-decision">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Officer Decision & Memo
      </button>
      <button class="tab-btn" data-tab="tab-policy">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Policy Configuration
      </button>
    </nav>

    <!-- Tab Panels Container -->
    <div class="tab-panels-container">
      
      <!-- Tab 1: Summary -->
      <div id="tab-summary" class="tab-panel active">
        <div class="grid-5-cards">
          ${modules.map((m) => `
            <div class="module-card">
              <div class="module-card-header">
                <div class="module-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <span class="status-pill ${m.status}">${escapeHtml(m.status)}</span>
              </div>
              <h3>${escapeHtml(m.title)}</h3>
              <div class="module-subtext">
                ${m.rating ? `<strong style="color: var(--text-main);">${m.rating}</strong> Risk · ${m.score} penalty points` : "Automated verification clear"}
              </div>
            </div>
          `).join("")}
        </div>

        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Corporate Entity Profile & Extracted Documents
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
            <div>
              <h4 style="color: var(--primary); font-size: 0.88rem; margin-bottom: 0.5rem;">Verified Corporate Profile</h4>
              <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 0.25rem;"><strong>Legal Name:</strong> ${escapeHtml(data.entity?.legal_name || 'N/A')}</p>
              <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 0.25rem;"><strong>Company Number:</strong> ${escapeHtml(data.entity?.company_number || 'N/A')}</p>
              <p style="font-size: 0.88rem; color: var(--text-muted);"><strong>Jurisdiction:</strong> ${escapeHtml(data.entity?.jurisdiction || 'Hong Kong SAR')}</p>
            </div>
            <div>
              <h4 style="color: var(--primary); font-size: 0.88rem; margin-bottom: 0.5rem;">Uploaded Pack Documents (${data.documents.length})</h4>
              <ul style="list-style: none; font-size: 0.85rem; color: var(--text-muted);">
                ${data.documents.map(d => `<li style="margin-bottom: 0.25rem;">📄 <strong>${escapeHtml(d.filename)}</strong> (${escapeHtml(d.doc_type)})</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Ownership Hierarchy Graph -->
      <div id="tab-ownership" class="tab-panel">
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/></svg>
              Ultimate Beneficial Ownership (UBO) Hierarchy Graph
            </div>
            <div style="font-size: 0.8rem; color: var(--accent-blue); font-weight: 600;">💡 Click any graph node to inspect entity UBO details</div>
          </div>
          
          <div class="graph-legend">
            <div class="legend-item"><span class="legend-swatch" style="background: #0f2942;"></span> Applicant Company</div>
            <div class="legend-item"><span class="legend-swatch" style="background: #059669;"></span> Natural Person (UBO)</div>
            <div class="legend-item"><span class="legend-swatch" style="background: #0284c7;"></span> Corporate Holding Co.</div>
            <div class="legend-item"><span class="legend-swatch" style="background: #d97706;"></span> Missing Register Gap</div>
          </div>

          <div id="views-container">
            ${(data.ownership_views || []).map((view, i) => `
              <div style="margin-bottom: 1.5rem;">
                <h4 style="color: var(--text-main); margin-bottom: 0.5rem; font-size: 0.92rem;">Source Document: ${escapeHtml(view.source)}</h4>
                <div id="graph-${i}" class="vis-graph-container"></div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
                  <strong>Calculated Effective Shares:</strong> 
                  ${(view.effective || []).map(p => `${escapeHtml(p.name)} (${p.percent}%)`).join(', ') || 'None'}
                  ${(view.gaps || []).length ? `<span style="color: var(--status-review); margin-left: 0.5rem;">⚠️ Missing Register: ${view.gaps.map(g => escapeHtml(g.missing_document)).join(', ')}</span>` : ''}
                </div>
              </div>
            `).join('') || '<p style="color: var(--text-muted);">No graph ownership links extracted.</p>'}
          </div>
        </div>
      </div>

      <!-- Tab 3: Analytics -->
      <div id="tab-analytics" class="tab-panel">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
          <div class="card-panel">
            <div class="panel-header">
              <div class="panel-title">Risk Penalty Factor Distribution</div>
            </div>
            <div style="height: 260px; position: relative;">
              <canvas id="risk-chart"></canvas>
            </div>
          </div>

          <div class="card-panel">
            <div class="panel-header">
              <div class="panel-title">Monitoring & Periodic Re-Screening</div>
            </div>
            <div style="margin-bottom: 1rem;">
              <button id="run-monitor" class="btn btn-primary btn-sm" style="margin-bottom: 1rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Re-Screen Names Against UN/HK Designation Lists
              </button>
            </div>
            <div class="audit-timeline">
              ${(data.monitoring?.triggers || []).map(t => `
                <div class="audit-item" style="color: ${t.due ? 'var(--status-attention)' : 'var(--text-muted)'};">
                  <strong>${t.due ? '⚠️ ACTION REQUIRED' : 'Scheduled'}:</strong> ${escapeHtml(t.detail)}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 4: Findings & Document Evidence Inspector -->
      <div id="tab-findings" class="tab-panel">
        <div class="dual-inspector">
          <div>
            <h3 style="color: var(--text-main); font-size: 1rem; margin-bottom: 0.85rem; font-family: var(--font-heading);">Automated Risk Findings (${data.findings.length})</h3>
            <div class="findings-list" id="findings-list"></div>
          </div>
          <div class="evidence-drawer" id="evidence-box">
            <div style="color: var(--text-muted); text-align: center; padding: 2rem;">
              Select any finding on the left to inspect verbatim source quotes and record officer overrides.
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 5: Decision & Memo -->
      <div id="tab-decision" class="tab-panel">
        <div class="decision-banner">
          <div>
            <div style="font-weight: 700; color: var(--primary); font-size: 1rem;">
              ${data.decision ? `Officer Disposition: ${data.decision.status.toUpperCase()}` : `Suggested Rating: ${data.risk.rating}`}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              ${data.decision?.note ? `Officer Note: ${escapeHtml(data.decision.note)}` : 'Pending final sign-off by compliance officer.'}
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <select id="rating-select" style="padding: 0.45rem;">
              <option value="Low" ${data.risk.rating === 'Low' ? 'selected' : ''}>Low Risk</option>
              <option value="Medium" ${data.risk.rating === 'Medium' ? 'selected' : ''}>Medium Risk</option>
              <option value="High" ${data.risk.rating === 'High' ? 'selected' : ''}>High Risk</option>
            </select>
            <button class="btn btn-primary" data-status="approved">Approve Case</button>
            <button class="btn btn-secondary" data-status="returned">Return to Customer</button>
            <button class="btn btn-secondary" data-status="overridden">Save Override</button>
            <button class="btn btn-secondary" id="btn-export-report">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Report
            </button>
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <label style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">Officer Audit Note</label>
          <textarea id="officer-note" rows="2" placeholder="Add justification notes for audit log...">${escapeHtml(data.decision?.note || '')}</textarea>
        </div>

        <div class="memo-container">
          <div class="memo-box">
            <h4>📋 Compliance Approval Memorandum</h4>
            <div class="memo-text">${escapeHtml(data.memo || '')}</div>
          </div>
          <div class="memo-box">
            <h4>✉️ Customer Document Request Letter</h4>
            <div class="memo-text">${escapeHtml(data.customer_request || '')}</div>
          </div>
        </div>
      </div>

      <!-- Tab 6: Policy Engine -->
      <div id="tab-policy" class="tab-panel">
        <div class="card-panel" id="policy-box">
          <div class="panel-header">
            <div class="panel-title">Policy Rules & Risk Weight Parameters</div>
          </div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">Adjust penalty weights and required document checklists below. Saving rules recalculates case scores instantly in real-time.</p>
          <div id="policy-fields">Loading policy settings...</div>
        </div>
      </div>

    </div>
  `;

  // Tab switching logic
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPanel = document.getElementById(btn.dataset.tab);
      if (targetPanel) targetPanel.classList.add("active");

      if (btn.dataset.tab === "tab-ownership") {
        drawGraphs(data.ownership_views || []);
      } else if (btn.dataset.tab === "tab-analytics") {
        renderAnalyticsChart(data);
      }
    });
  });

  renderFindingsList(data);

  document.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const status = e.currentTarget.dataset.status;
      const rating = document.querySelector("#rating-select").value;
      const note = document.querySelector("#officer-note").value;

      fetch(`/api/cases/${data.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rating, note }),
      })
        .then((res) => res.json())
        .then(renderCase);
    });
  });

  document.querySelector("#btn-export-report")?.addEventListener("click", () => {
    window.print();
  });

  document.querySelector("#run-monitor")?.addEventListener("click", () => {
    fetch(`/api/cases/${data.id}/monitor`, { method: "POST" })
      .then((res) => res.json())
      .then(renderCase);
  });

  mountPolicyEditor(data.id);
}

function renderFindingsList(caseData) {
  const container = document.querySelector("#findings-list");
  if (!container) return;
  container.innerHTML = "";

  if (!caseData.findings.length) {
    container.innerHTML = `<p style="color: var(--text-muted);">No risk findings generated.</p>`;
    return;
  }

  caseData.findings.forEach((finding, index) => {
    const item = document.createElement("div");
    item.className = "finding-item";
    const isOverridden = finding.officer?.disposition === "overridden";
    item.innerHTML = `
      <div class="finding-top">
        <span class="finding-title">${escapeHtml(finding.title)}</span>
        <span class="finding-badge ${finding.severity}">${finding.severity}</span>
      </div>
      <div class="finding-detail">${escapeHtml(finding.detail)}</div>
      ${isOverridden ? `<div style="font-size: 0.75rem; color: var(--status-clear); margin-top: 0.3rem; font-weight: 600;">✓ Overridden by Officer</div>` : ""}
    `;

    item.addEventListener("click", () => {
      document.querySelectorAll(".finding-item").forEach((fi) => fi.classList.remove("active"));
      item.classList.add("active");
      showEvidence(caseId = caseData.id, finding);
    });

    container.appendChild(item);
    if (index === 0) item.click();
  });
}

function showEvidence(caseId, finding) {
  const box = document.querySelector("#evidence-box");
  if (!box) return;

  const blocks = (finding.evidence || []).map((item) => `
    <div style="margin-bottom: 0.85rem; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem;">
      <div class="evidence-doc-name">📄 Document: ${escapeHtml(item.document)}</div>
      <div class="evidence-quote">"${escapeHtml(item.quote)}"</div>
      ${item.context ? `<div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">Context: ${escapeHtml(item.context)}</div>` : ''}
    </div>
  `).join('');

  const officerNote = finding.officer ? `
    <div style="background: var(--status-clear-bg); border: 1px solid var(--status-clear-border); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; color: var(--status-clear); margin-bottom: 1rem;">
      Officer Action: <strong>${escapeHtml(finding.officer.disposition)}</strong> ${finding.officer.note ? `— ${escapeHtml(finding.officer.note)}` : ''}
    </div>
  ` : '';

  box.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
      <h3 style="color: var(--text-main); font-family: var(--font-heading); font-size: 1.05rem;">${escapeHtml(finding.title)}</h3>
      <span class="finding-badge ${finding.severity}">${finding.severity}</span>
    </div>
    <div style="font-size: 0.82rem; color: var(--text-subtle); margin-bottom: 1rem;">Module: <strong>${escapeHtml(finding.module)}</strong> · Code: <code>${escapeHtml(finding.code)}</code></div>
    
    ${officerNote}
    
    <h4 style="font-size: 0.88rem; color: var(--primary); margin-bottom: 0.5rem;">Verified Quote Evidence (${finding.evidence?.length || 0})</h4>
    ${blocks || '<p style="font-size: 0.85rem; color: var(--text-muted);">No quote evidence recorded.</p>'}

    <div class="officer-action-box">
      <label style="font-size: 0.8rem; color: var(--text-subtle); display: block; margin-bottom: 0.35rem;">Officer Override Justification</label>
      <input type="text" id="finding-note-input" placeholder="Enter reason for disposition..." style="width: 100%; margin-bottom: 0.75rem;">
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-primary btn-sm" id="btn-accept-finding">Accept Finding</button>
        <button class="btn btn-secondary btn-sm" id="btn-override-finding">Override Finding (0 Pts)</button>
      </div>
    </div>
  `;

  document.querySelector("#btn-accept-finding")?.addEventListener("click", () => sendFinding(caseId, finding.id, "accepted"));
  document.querySelector("#btn-override-finding")?.addEventListener("click", () => sendFinding(caseId, finding.id, "overridden"));
}

function sendFinding(caseId, findingId, disposition) {
  const note = document.querySelector("#finding-note-input")?.value || "";
  fetch(`/api/cases/${caseId}/findings/${findingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ disposition, note }),
  })
    .then((res) => res.json())
    .then(renderCase);
}

function renderAnalyticsChart(data) {
  const ctx = document.getElementById("risk-chart");
  if (!ctx) return;

  if (activeChartInstance) activeChartInstance.destroy();

  const factors = data.risk.factors || [];
  const labels = factors.length ? factors.map((f) => f.finding) : ["No Risk Factors"];
  const points = factors.length ? factors.map((f) => f.points) : [0];

  activeChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Risk Penalty Points",
          data: points,
          backgroundColor: "rgba(2, 132, 199, 0.85)",
          borderColor: "#0f2942",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#475569", font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: "#475569" }, grid: { color: "#e2e8f0" } },
      },
    },
  });
}

function drawGraphs(views) {
  if (!window.vis) return;

  views.forEach((view, index) => {
    const container = document.getElementById(`graph-${index}`);
    if (!container || !view.links?.length) return;

    const counts = {};
    for (const link of view.links) counts[link.owned] = (counts[link.owned] || 0) + 1;
    const subject = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const gapNames = new Set((view.gaps || []).map((gap) => gap.name));

    const kinds = {};
    const names = new Set();
    for (const link of view.links) {
      names.add(link.owner);
      names.add(link.owned);
      kinds[link.owner] = link.owner_kind || kinds[link.owner] || "person";
      if (!kinds[link.owned]) kinds[link.owned] = "company";
    }

    const nodes = [...names].map((name) => {
      const isSubject = name === subject;
      const isGap = gapNames.has(name);
      const isPerson = kinds[name] === "person" && !isSubject;

      let color = { background: "#ffffff", border: "#0284c7" };
      let fontColor = "#0f172a";

      if (isSubject) {
        color = { background: "#0f2942", border: "#16385c" };
        fontColor = "#ffffff";
      } else if (isGap) {
        color = { background: "#fffbeb", border: "#d97706" };
      } else if (isPerson) {
        color = { background: "#ecfdf5", border: "#059669" };
      }

      return {
        id: name,
        label: isSubject ? `${name}\n(Applicant Company)` : isGap ? `${name}\n(Missing Register Gap)` : name,
        shape: "box",
        margin: 12,
        widthConstraint: { maximum: 210 },
        color,
        font: { color: fontColor, face: "Inter, sans-serif", size: 12 },
        borderWidth: 1.5,
      };
    });

    const edges = view.links.map((link, edgeIndex) => ({
      id: `${index}-${edgeIndex}`,
      from: link.owner,
      to: link.owned,
      label: `${link.percent}% Share`,
      arrows: { to: { enabled: true, scaleFactor: 0.6 } },
      font: { align: "middle", size: 11, color: "#0f2942", strokeWidth: 4, strokeColor: "#ffffff" },
      color: { color: "#64748b", highlight: "#0284c7" },
      smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.4 },
    }));

    const network = new vis.Network(
      container,
      { nodes, edges },
      {
        layout: {
          hierarchical: {
            direction: "UD",
            sortMethod: "directed",
            levelSeparation: 120,
            nodeSpacing: 150,
          },
        },
        physics: false,
        interaction: { hover: true, tooltipDelay: 80 },
      }
    );

    network.once("afterDrawing", () => {
      network.fit({ animation: false });
    });

    // Node click inspector pop-up
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        alert(`UBO Node Selected: ${nodeId}\nStatus: Verified in Corporate Pack\nType: ${kinds[nodeId] || 'company'}`);
      }
    });
  });
}

function mountPolicyEditor(caseId) {
  fetch("/api/policy")
    .then((res) => res.json())
    .then((policy) => {
      const box = document.querySelector("#policy-fields");
      if (!box) return;

      const pointInputs = Object.entries(policy.points)
        .map(
          ([key, value]) => `
          <div class="policy-factor-row">
            <span style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(key)}</span>
            <input data-point="${escapeHtml(key)}" type="number" value="${value}" style="width: 85px;">
          </div>
        `
        )
        .join("");

      const docs = (policy.required_documents || []).map((item) => item.label).join("\n");
      const countries = (policy.high_risk_jurisdictions?.names || []).join(", ");

      box.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <div>
            <h4 style="color: var(--primary); font-size: 0.9rem; margin-bottom: 0.75rem;">Risk Penalty Weights</h4>
            ${pointInputs}
          </div>
          <div>
            <h4 style="color: var(--primary); font-size: 0.9rem; margin-bottom: 0.75rem;">Thresholds & Controls</h4>
            <div style="margin-bottom: 0.85rem;">
              <label style="font-size: 0.8rem; color: var(--text-subtle); display: block;">Fuzzy Match Threshold</label>
              <input id="policy-threshold" type="number" step="0.01" value="${policy.match_threshold}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 0.85rem;">
              <label style="font-size: 0.8rem; color: var(--text-subtle); display: block;">Periodic Review Months</label>
              <input id="policy-months" type="number" value="${policy.review_months}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 0.85rem;">
              <label style="font-size: 0.8rem; color: var(--text-subtle); display: block;">Required Documents Checklist</label>
              <textarea id="policy-docs" rows="3">${escapeHtml(docs)}</textarea>
            </div>
            <div style="margin-bottom: 0.85rem;">
              <label style="font-size: 0.8rem; color: var(--text-subtle); display: block;">High-Risk Jurisdictions</label>
              <textarea id="policy-countries" rows="2">${escapeHtml(countries)}</textarea>
            </div>
            <button class="btn btn-primary" id="save-policy-btn" style="width: 100%;">Save Rules & Re-Score Case</button>
          </div>
        </div>
      `;

      document.querySelector("#save-policy-btn")?.addEventListener("click", () => {
        const next = structuredClone(policy);
        box.querySelectorAll("[data-point]").forEach((input) => {
          next.points[input.dataset.point] = Number(input.value);
        });

        next.match_threshold = Number(box.querySelector("#policy-threshold").value);
        next.review_months = Number(box.querySelector("#policy-months").value);

        const labels = box
          .querySelector("#policy-docs")
          .value.split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        next.required_documents = labels.map((label) => {
          const existing = (policy.required_documents || []).find((item) => item.label === label);
          return existing || { type: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), label };
        });

        next.high_risk_jurisdictions.names = box
          .querySelector("#policy-countries")
          .value.split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);

        fetch("/api/policy", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        })
          .then(() => fetch(`/api/cases/${caseId}/rescore`, { method: "POST" }))
          .then((res) => res.json())
          .then(renderCase);
      });
    });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])
  );
}

// Hero trigger listeners
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "hero-sample-btn") {
    runPipeline("/api/cases/sample", { method: "POST" });
  }
});
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "hero-files") {
    const body = new FormData();
    for (const file of e.target.files) body.append("files", file);
    runPipeline("/api/cases", { method: "POST", body });
  }
});
