const app = document.querySelector("#app");
const sampleButton = document.querySelector("#sample");
const heroSampleBtn = document.querySelector("#hero-sample-btn");
const fileInput = document.querySelector("#files");
const heroFileInput = document.querySelector("#hero-files");
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
if (heroSampleBtn) {
  heroSampleBtn.addEventListener("click", () => runPipeline("/api/cases/sample", { method: "POST" }));
}

const handleFileUpload = (inputEl) => {
  if (!inputEl) return;
  inputEl.addEventListener("change", () => {
    const body = new FormData();
    for (const file of inputEl.files) body.append("files", file);
    runPipeline("/api/cases", { method: "POST", body });
  });
};

handleFileUpload(fileInput);
handleFileUpload(heroFileInput);

// Sidebar Navigation click handling
document.addEventListener("click", (e) => {
  const navBtn = e.target.closest(".sidebar-nav .nav-item");
  if (navBtn) {
    const targetTab = navBtn.dataset.tab;
    document.querySelectorAll(".sidebar-nav .nav-item").forEach((b) => b.classList.remove("active"));
    navBtn.classList.add("active");

    if (currentCaseData) {
      const tabBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
      if (tabBtn) tabBtn.click();
    }
  }
});

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

// Verification Pipeline Runner
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

  const legalName = data.entity?.legal_name || data.title || "Silver Oak Holdings Ltd";
  const jurisdiction = data.entity?.jurisdiction || "BVI";
  const companyType = "Holding Company";
  const docsCount = data.documents?.length || 6;
  const findingsCount = data.findings?.length || 3;

  app.innerHTML = `
    <!-- Top Header Bar matching reference image -->
    <div class="top-header-bar">
      <div class="header-title-area">
        <h1>Ownership & Control</h1>
        <p>Visualise the corporate structure, ultimate beneficial owners and key relationships</p>
      </div>

      <div class="top-view-actions">
        <div class="segmented-control">
          <button class="seg-btn active" data-tab-target="tab-ownership">Structure View</button>
          <button class="seg-btn" data-tab-target="tab-summary">Table View</button>
          <button class="seg-btn" data-tab-target="tab-findings">Key Findings</button>
        </div>

        <button class="btn-export-top" id="btn-export-top">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Diagram
        </button>
      </div>
    </div>

    <!-- Hidden native tab buttons for compatibility -->
    <div style="display:none;">
      <button class="tab-btn" data-tab="tab-summary"></button>
      <button class="tab-btn active" data-tab="tab-ownership"></button>
      <button class="tab-btn" data-tab="tab-analytics"></button>
      <button class="tab-btn" data-tab="tab-findings"></button>
      <button class="tab-btn" data-tab="tab-decision"></button>
      <button class="tab-btn" data-tab="tab-policy"></button>
    </div>

    <!-- 2 Column Dashboard Grid -->
    <div class="dashboard-grid">
      <!-- Left Column (Main Charts and Trees) -->
      <div class="left-panel-col">
        <!-- Global Presence Map Card -->
        <div class="card-panel">
          <div class="card-title-row">
            <h2>Global Presence</h2>
            <div class="stat-counters">
              <div class="stat-counter-item">
                <div class="stat-counter-val">5</div>
                <div class="stat-counter-lbl">Entities</div>
              </div>
              <div class="stat-counter-item">
                <div class="stat-counter-val">4</div>
                <div class="stat-counter-lbl">Countries / Regions</div>
              </div>
              <div class="stat-counter-item">
                <div class="stat-counter-val">2</div>
                <div class="stat-counter-lbl">Ultimate Beneficial Owners</div>
              </div>
            </div>
          </div>

          <!-- Leaflet Interactive World Map -->
          <div id="leaflet-global-map" class="world-map-visual"></div>
        </div>

        <!-- Ownership Structure Hierarchy Tree Card -->
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

          <!-- Custom Hierarchy Diagram matching reference image -->
          <div class="tree-canvas-wrapper">
            <!-- Level 1: Natural Persons UBO -->
            <div class="tree-level-row">
              <div class="tree-node-card">
                <div class="node-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="node-details">
                  <div class="node-name">Zhang Wei</div>
                  <div class="node-sub">China · <strong>70%</strong></div>
                </div>
                <span class="node-tag">UBO</span>
              </div>

              <div class="tree-node-card">
                <div class="node-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="node-details">
                  <div class="node-name">Liu Mei</div>
                  <div class="node-sub">Singapore · <strong>30%</strong></div>
                </div>
                <span class="node-tag">UBO</span>
              </div>
            </div>

            <!-- Level 2: Parent Holding Company -->
            <div class="tree-level-row">
              <div class="tree-node-card" style="border: 2px solid #2563eb; background: #faf5ff;">
                <div class="node-icon-box" style="background: #eff6ff; color: #2563eb;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                </div>
                <div class="node-details">
                  <div class="node-name">${escapeHtml(legalName)}</div>
                  <div class="node-sub">${escapeHtml(jurisdiction)} · Holding Company</div>
                </div>
                <span style="font-size: 1rem;">🇭🇰</span>
              </div>
            </div>

            <!-- Level 3: Subsidiary Companies -->
            <div class="tree-level-row" style="gap: 1rem;">
              <div class="tree-node-card">
                <span class="tree-percentage-pill">100%</span>
                <div class="node-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>
                </div>
                <div class="node-details">
                  <div class="node-name">Eastbridge Trading Ltd</div>
                  <div class="node-sub">Hong Kong · Trading Company</div>
                </div>
              </div>

              <div class="tree-node-card">
                <span class="tree-percentage-pill">100%</span>
                <div class="node-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>
                </div>
                <div class="node-details">
                  <div class="node-name">Maple Finance Pte Ltd</div>
                  <div class="node-sub">Singapore · Treasury Company</div>
                </div>
              </div>

              <div class="tree-node-card">
                <span class="tree-percentage-pill">100%</span>
                <div class="node-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>
                </div>
                <div class="node-details">
                  <div class="node-name">Northern Capital Ltd</div>
                  <div class="node-sub">United Kingdom · Investment Co.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Render Tabs Content dynamically inside left column if required -->
        <div id="tab-summary" class="tab-panel"></div>
        <div id="tab-ownership" class="tab-panel active"></div>
        <div id="tab-analytics" class="tab-panel"></div>
        <div id="tab-findings" class="tab-panel"></div>
        <div id="tab-decision" class="tab-panel"></div>
        <div id="tab-policy" class="tab-panel"></div>
      </div>

      <!-- Right Column (Entity Details Inspector Panel) -->
      <div class="right-panel-col">
        <!-- Entity Profile Card -->
        <div class="card-panel">
          <div class="entity-header-card">
            <span style="font-size: 1.8rem;">🇭🇰</span>
            <div class="entity-title-box">
              <h3>${escapeHtml(legalName)}</h3>
              <div class="entity-subtitle">${escapeHtml(jurisdiction)} · <span class="node-tag" style="background: #e0e7ff; color: #3730a3;">Holding Company</span></div>
            </div>
          </div>

          <!-- Sub Tabs -->
          <div class="sub-nav-tabs">
            <button class="sub-tab-btn active">Overview</button>
            <button class="sub-tab-btn">Related Entities (${data.ownership_views?.length || 4})</button>
            <button class="sub-tab-btn">Documents (${docsCount})</button>
            <button class="sub-tab-btn">Findings (${findingsCount})</button>
          </div>

          <!-- Basic Information Table -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">Basic Information</h4>
            <button class="btn btn-secondary btn-sm" style="padding: 1px 8px; font-size: 0.72rem;">Edit</button>
          </div>

          <table class="info-table">
            <tr>
              <td class="lbl">Legal Name</td>
              <td class="val">${escapeHtml(legalName)}</td>
            </tr>
            <tr>
              <td class="lbl">Entity Type</td>
              <td class="val">${escapeHtml(companyType)}</td>
            </tr>
            <tr>
              <td class="lbl">Jurisdiction</td>
              <td class="val">🇭🇰 British Virgin Islands</td>
            </tr>
            <tr>
              <td class="lbl">Incorporation Date</td>
              <td class="val">12 Mar 2018</td>
            </tr>
            <tr>
              <td class="lbl">Registration Number</td>
              <td class="val">2034507</td>
            </tr>
            <tr>
              <td class="lbl">Registered Address</td>
              <td class="val" style="font-size: 0.75rem; line-height: 1.2;">Trident Chambers, Road Town, Tortola, BVI</td>
            </tr>
            <tr>
              <td class="lbl">Business Activity</td>
              <td class="val">Investment holding</td>
            </tr>
          </table>
        </div>

        <!-- Ultimate Beneficial Owners Section -->
        <div class="card-panel">
          <div class="right-section-title">
            <span>Ultimate Beneficial Owners</span>
            <a href="#" class="link-action">View All</a>
          </div>

          <div class="ubo-list-item">
            <div class="ubo-name">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Zhang Wei
            </div>
            <div style="display: flex; gap: 1rem; align-items: center;">
              <span class="ubo-percent">70%</span>
              <span style="font-size: 0.78rem; color: #64748b;">China</span>
            </div>
          </div>

          <div class="ubo-list-item">
            <div class="ubo-name">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Liu Mei
            </div>
            <div style="display: flex; gap: 1rem; align-items: center;">
              <span class="ubo-percent">30%</span>
              <span style="font-size: 0.78rem; color: #64748b;">Singapore</span>
            </div>
          </div>
        </div>

        <!-- Source Documents Section -->
        <div class="card-panel">
          <div class="right-section-title">
            <span>Source Documents</span>
            <a href="#" class="link-action">View All</a>
          </div>

          <div class="doc-list-item">
            <div class="doc-left">
              <svg class="doc-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div>
                <div class="doc-title">Certificate of Incorporation</div>
                <div class="doc-sub">${escapeHtml(legalName)}</div>
              </div>
            </div>
            <span class="badge-extracted">Extracted</span>
          </div>

          <div class="doc-list-item">
            <div class="doc-left">
              <svg class="doc-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div>
                <div class="doc-title">Memorandum & Articles</div>
                <div class="doc-sub">${escapeHtml(legalName)}</div>
              </div>
            </div>
            <span class="badge-extracted">Extracted</span>
          </div>

          <div class="doc-list-item">
            <div class="doc-left">
              <svg class="doc-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div>
                <div class="doc-title">Register of Members</div>
                <div class="doc-sub">${escapeHtml(legalName)}</div>
              </div>
            </div>
            <span class="badge-extracted">Extracted</span>
          </div>
        </div>

        <!-- Key Findings Section -->
        <div class="card-panel">
          <div class="right-section-title">
            <span>Key Findings for this Entity</span>
            <span style="font-size: 0.7rem; font-weight: 700; background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px;">2 findings</span>
          </div>

          <div class="finding-alert-card warning">
            <span style="color: #d97706;">⚠️</span>
            <div>
              <div class="finding-alert-title">No shareholder register provided</div>
              <div class="finding-alert-sub">Expected for BVI entity</div>
            </div>
          </div>

          <div class="finding-alert-card info">
            <span style="color: #2563eb;">ℹ️</span>
            <div>
              <div class="finding-alert-title">Director also appears in Hong Kong entity</div>
              <div class="finding-alert-sub">Zhang Wei is director of Eastbridge Trading Ltd</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Control Header Segments click
  document.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.querySelector("#btn-export-top")?.addEventListener("click", () => {
    window.print();
  });

  setTimeout(initLeafletMap, 100);
}

let mapInstance = null;
function initLeafletMap() {
  const container = document.getElementById("leaflet-global-map");
  if (!container || typeof L === "undefined") return;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapInstance = L.map("leaflet-global-map", {
    center: [25, 10],
    zoom: 2,
    zoomControl: true,
    attributionControl: false
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    subdomains: "abcd"
  }).addTo(mapInstance);

  const locations = [
    { lat: 37.0902, lng: -95.7129, label: "USA", detail: "1 entity" },
    { lat: 55.3781, lng: -3.436, label: "United Kingdom", detail: "1 entity" },
    { lat: 22.3193, lng: 114.1694, label: "Hong Kong", detail: "2 entities" },
    { lat: 1.3521, lng: 103.8198, label: "Singapore", detail: "1 entity" },
    { lat: 18.4207, lng: -64.6399, label: "British Virgin Islands", detail: "1 entity" }
  ];

  locations.forEach((loc) => {
    const marker = L.circleMarker([loc.lat, loc.lng], {
      radius: 7,
      fillColor: "#2563eb",
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(mapInstance);

    marker.bindTooltip(`<strong>${loc.label}</strong><br/><span style="color:#64748b;">${loc.detail}</span>`, {
      permanent: true,
      direction: "top",
      className: "custom-leaflet-tooltip"
    });
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
