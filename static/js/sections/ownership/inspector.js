import { escapeHtml } from "../../core/dom.js";
import { flagImg } from "../../lib/flags.js";
import { icon } from "../../lib/icons.js";

const FINDING_STYLE = {
  warning: { glyph: "⚠️", color: "#d97706" },
  info: { glyph: "ℹ️", color: "#2563eb" },
};

function profileCard(view) {
  const { counts } = view;
  const rows = view.info
    .map((row) => {
      const flag = row.flag ? `${flagImg(row.flag, "flag-inline")} ` : "";
      const style = row.small ? ' style="font-size: 0.75rem; line-height: 1.2;"' : "";
      return `
        <tr>
          <td class="lbl">${escapeHtml(row.label)}</td>
          <td class="val"${style}>${flag}${escapeHtml(row.value)}</td>
        </tr>`;
    })
    .join("");

  return `
    <div class="card-panel">
      <div class="entity-header-card">
        ${flagImg(view.jurisdiction, "entity-flag")}
        <div class="entity-title-box">
          <h3>${escapeHtml(view.legalName)}</h3>
          <div class="entity-subtitle">${escapeHtml(view.jurisdiction)} · <span class="node-tag" style="background: #e0e7ff; color: #3730a3;">${escapeHtml(view.companyType)}</span></div>
        </div>
      </div>

      <div class="sub-nav-tabs">
        <button class="sub-tab-btn active">Overview</button>
        <button class="sub-tab-btn">Related Entities (${counts.related})</button>
        <button class="sub-tab-btn">Documents (${counts.documents})</button>
        <button class="sub-tab-btn">Findings (${counts.findings})</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h4 style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">Basic Information</h4>
      </div>

      <table class="info-table">${rows}</table>
    </div>`;
}

function ubosCard(view) {
  const items = view.ubos
    .map(
      (u) => `
      <div class="ubo-list-item">
        <div class="ubo-name">
          ${icon("user", 14)}
          ${escapeHtml(u.name)}
        </div>
        <div style="display: flex; gap: 1rem; align-items: center;">
          ${u.pct == null ? "" : `<span class="ubo-percent">${u.pct}%</span>`}
          <span style="font-size: 0.78rem; color: #64748b;">${escapeHtml(u.country)}</span>
        </div>
      </div>`
    )
    .join("");
  return `
    <div class="card-panel">
      <div class="right-section-title">
        <span>Ultimate Beneficial Owners</span>
        <a href="#" class="link-action">View All</a>
      </div>
      ${items}
    </div>`;
}

function documentsCard(view) {
  const items = view.sourceDocuments
    .map(
      (title) => `
      <div class="doc-list-item">
        <div class="doc-left">
          ${icon("doc", 18, { className: "doc-icon" })}
          <div>
            <div class="doc-title">${escapeHtml(title)}</div>
            <div class="doc-sub">${escapeHtml(view.legalName)}</div>
          </div>
        </div>
        <span class="badge-extracted">Extracted</span>
      </div>`
    )
    .join("");
  return `
    <div class="card-panel">
      <div class="right-section-title">
        <span>Source Documents</span>
        <a href="#" class="link-action">View All</a>
      </div>
      ${items}
    </div>`;
}

function findingsCard(view) {
  const items = view.keyFindings
    .map((f) => {
      const style = FINDING_STYLE[f.kind] || FINDING_STYLE.info;
      return `
      <div class="finding-alert-card ${f.kind}">
        <span style="color: ${style.color};">${style.glyph}</span>
        <div>
          <div class="finding-alert-title">${escapeHtml(f.title)}</div>
          <div class="finding-alert-sub">${escapeHtml(f.sub)}</div>
        </div>
      </div>`;
    })
    .join("");
  return `
    <div class="card-panel">
      <div class="right-section-title">
        <span>Key Findings for this Entity</span>
        <span style="font-size: 0.7rem; font-weight: 700; background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px;">${view.keyFindings.length} findings</span>
      </div>
      ${items}
    </div>`;
}

export function renderFindings(view) {
  return findingsCard(view);
}

// Sample dataset matching user requirement and attached screenshot
const DEFAULT_DIRECTORY_ENTITIES = [
  {
    id: "david-chan",
    name: "David Chan",
    type: "Individual",
    roles: ["UBO", "Shareholder"],
    jurisdiction: "Hong Kong",
    flag: "🇭🇰",
    relationshipsCount: 3,
    status: "Verified",
    statusBadge: "green",
    dob: "12 Mar 1985",
    address: "Victoria, Hong Kong",
    // Trilingual Entity Resolution fields:
    trilingual: {
      knownAs: [
        { name: "David Chan", lang: "English", match: true },
        { name: "陳大衛", lang: "Traditional Chinese", match: true },
        { name: "Chan Tai Wai", lang: "Cantonese Romanization", match: true },
        { name: "Chan, David", lang: "Pinyin", match: true }
      ],
      confidence: 98,
      docCount: 6,
      refCount: 4,
      conflictDetected: false
    },
    relationships: [
      { role: "80% shareholder of", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" },
      { role: "Director of", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" },
      { role: "Shareholder of", name: "Silver Oak Europe Ltd", type: "Company", country: "United Kingdom" }
    ],
    evidence: [
      { title: "Passport - David Chan.pdf", status: "Verified" },
      { title: "Register of Members.pdf", status: "Verified" },
      { title: "Shareholder Declaration.pdf", status: "Verified" },
      { title: "Proof of Address.pdf", status: "Missing" }
    ],
    timeline: [
      { date: "2018-04-12", title: "Incorporation & Founding UBO Registration" },
      { date: "2020-09-01", title: "Appointed Managing Director" },
      { date: "2024-02-15", title: "Latest Document Verification" }
    ]
  },
  {
    id: "sanchit-sethi",
    name: "Sanchit Sethi",
    type: "Individual",
    roles: ["Director"],
    jurisdiction: "Singapore",
    flag: "🇸🇬",
    relationshipsCount: 2,
    status: "Verified",
    statusBadge: "green",
    dob: "05 Nov 1982",
    address: "Marina Bay, Singapore",
    trilingual: {
      knownAs: [
        { name: "Sanchit Sethi", lang: "English", match: true },
        { name: "Sethi, Sanchit", lang: "Pinyin", match: true }
      ],
      confidence: 96,
      docCount: 4,
      refCount: 3,
      conflictDetected: false
    },
    relationships: [
      { role: "Director of", name: "Eastern Trade Pte Ltd", type: "Company", country: "Singapore" },
      { role: "Authorized Signatory of", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" }
    ],
    evidence: [
      { title: "National ID - Sanchit Sethi.pdf", status: "Verified" },
      { title: "Board Resolution Appointment.pdf", status: "Verified" }
    ],
    timeline: [
      { date: "2021-06-10", title: "Appointed Company Director" },
      { date: "2023-11-20", title: "KYC Renewal Completed" }
    ]
  },
  {
    id: "jane-wong",
    name: "Jane Wong",
    type: "Individual",
    roles: ["Shareholder"],
    jurisdiction: "Canada",
    flag: "🇨🇦",
    relationshipsCount: 2,
    status: "Missing documents",
    statusBadge: "red",
    dob: "22 Aug 1990",
    address: "Vancouver, BC, Canada",
    trilingual: {
      knownAs: [
        { name: "Jane Wong", lang: "English", match: true },
        { name: "黃珍妮", lang: "Traditional Chinese", match: true },
        { name: "Wong, Jane", lang: "Pinyin", match: true }
      ],
      confidence: 91,
      docCount: 3,
      refCount: 2,
      conflictDetected: true
    },
    relationships: [
      { role: "20% shareholder of", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" }
    ],
    evidence: [
      { title: "Passport - Jane Wong.pdf", status: "Verified" },
      { title: "Proof of Address - Jane Wong.pdf", status: "Missing" },
      { title: "Tax Residency Declaration.pdf", status: "Missing" }
    ],
    timeline: [
      { date: "2019-02-14", title: "Acquired Shares (20%)" }
    ]
  },
  {
    id: "silver-oak-holdings",
    name: "Silver Oak Holdings Ltd",
    type: "Entity",
    roles: ["Parent company"],
    jurisdiction: "Hong Kong",
    flag: "🇭🇰",
    relationshipsCount: 4,
    status: "Verified",
    statusBadge: "green",
    dob: "N/A (CR #289104)",
    address: "Central, Hong Kong",
    trilingual: {
      knownAs: [
        { name: "Silver Oak Holdings Ltd", lang: "English", match: true },
        { name: "銀橡控股有限公司", lang: "Traditional Chinese", match: true }
      ],
      confidence: 99,
      docCount: 12,
      refCount: 8,
      conflictDetected: false
    },
    relationships: [
      { role: "Parent of", name: "Silver Oak Europe Ltd", type: "Company", country: "United Kingdom" },
      { role: "Parent of", name: "Silver Oak USA Inc", type: "Company", country: "United States" },
      { role: "Associate of", name: "Eastern Trade Pte Ltd", type: "Company", country: "Singapore" }
    ],
    evidence: [
      { title: "Certificate of Incorporation.pdf", status: "Verified" },
      { title: "Annual Return Form NAR1.pdf", status: "Verified" }
    ],
    timeline: [
      { date: "2018-04-12", title: "Incorporated in Hong Kong" }
    ]
  },
  {
    id: "silver-oak-europe",
    name: "Silver Oak Europe Ltd",
    type: "Entity",
    roles: ["Subsidiary"],
    jurisdiction: "United Kingdom",
    flag: "🇬🇧",
    relationshipsCount: 3,
    status: "Verified",
    statusBadge: "green",
    dob: "N/A (Company #119201)",
    address: "London, United Kingdom",
    trilingual: {
      knownAs: [
        { name: "Silver Oak Europe Ltd", lang: "English", match: true }
      ],
      confidence: 97,
      docCount: 5,
      refCount: 4,
      conflictDetected: false
    },
    relationships: [
      { role: "Subsidiary of", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" }
    ],
    evidence: [
      { title: "Companies House Certificate.pdf", status: "Verified" }
    ],
    timeline: [
      { date: "2019-10-05", title: "Incorporated in UK" }
    ]
  },
  {
    id: "sunrise-capital",
    name: "Sunrise Capital",
    type: "Entity",
    roles: ["Shareholder"],
    jurisdiction: "British Virgin Islands",
    flag: "🇻🇬",
    relationshipsCount: 2,
    status: "Insufficient evidence",
    statusBadge: "orange",
    dob: "N/A (BVI #772910)",
    address: "Road Town, Tortola, BVI",
    trilingual: {
      knownAs: [
        { name: "Sunrise Capital Corp", lang: "English", match: true },
        { name: "旭日資本", lang: "Traditional Chinese", match: true }
      ],
      confidence: 85,
      docCount: 2,
      refCount: 2,
      conflictDetected: true
    },
    relationships: [
      { role: "Shareholder of", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" }
    ],
    evidence: [
      { title: "Certificate of Good Standing.pdf", status: "Missing" }
    ],
    timeline: [
      { date: "2022-01-11", title: "Investment agreement executed" }
    ]
  },
  {
    id: "eastern-trade",
    name: "Eastern Trade Pte Ltd",
    type: "Entity",
    roles: ["Associate"],
    jurisdiction: "Singapore",
    flag: "🇸🇬",
    relationshipsCount: 2,
    status: "Verified",
    statusBadge: "green",
    dob: "N/A (UEN 202019281K)",
    address: "Raffles Place, Singapore",
    trilingual: {
      knownAs: [
        { name: "Eastern Trade Pte Ltd", lang: "English", match: true }
      ],
      confidence: 95,
      docCount: 4,
      refCount: 3,
      conflictDetected: false
    },
    relationships: [
      { role: "Associate of", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" }
    ],
    evidence: [
      { title: "ACRA Profile.pdf", status: "Verified" }
    ],
    timeline: [
      { date: "2020-03-18", title: "Incorporated in Singapore" }
    ]
  },
  {
    id: "silver-oak-usa",
    name: "Silver Oak USA Inc",
    type: "Entity",
    roles: ["Subsidiary"],
    jurisdiction: "United States",
    flag: "🇺🇸",
    relationshipsCount: 1,
    status: "Insufficient evidence",
    statusBadge: "orange",
    dob: "N/A (DE #662019)",
    address: "Wilmington, Delaware, USA",
    trilingual: {
      knownAs: [
        { name: "Silver Oak USA Inc", lang: "English", match: true }
      ],
      confidence: 88,
      docCount: 2,
      refCount: 1,
      conflictDetected: false
    },
    relationships: [
      { role: "Subsidiary of", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" }
    ],
    evidence: [
      { title: "Delaware Filing.pdf", status: "Verified" }
    ],
    timeline: [
      { date: "2021-09-09", title: "Incorporated in Delaware" }
    ]
  },
  {
    id: "golden-peak",
    name: "Golden Peak Ltd",
    type: "Entity",
    roles: ["Related entity"],
    jurisdiction: "Cayman Islands",
    flag: "🇰🇾",
    relationshipsCount: 1,
    status: "Missing documents",
    statusBadge: "red",
    dob: "N/A (KY #49281)",
    address: "George Town, Cayman Islands",
    trilingual: {
      knownAs: [
        { name: "Golden Peak Ltd", lang: "English", match: true },
        { name: "金峰有限公司", lang: "Traditional Chinese", match: true }
      ],
      confidence: 82,
      docCount: 1,
      refCount: 1,
      conflictDetected: true
    },
    relationships: [
      { role: "Related Entity", name: "Silver Oak Holdings Ltd", type: "Company", country: "Hong Kong" }
    ],
    evidence: [
      { title: "Register of Directors.pdf", status: "Missing" }
    ],
    timeline: [
      { date: "2023-05-12", title: "Identified in transaction logs" }
    ]
  }
];

export function renderDetails(view) {
  const entities = DEFAULT_DIRECTORY_ENTITIES;

  setTimeout(() => {
    setupDirectoryEvents(entities);
  }, 50);

  return `
    <div class="pe-directory-wrapper">
      <!-- Top Summary Metrics Cards (as per layout spec) -->
      <div class="pe-metrics-grid">
        <div class="pe-metric-card">
          <div class="pe-metric-icon" style="background: #fff7ed; color: #c2410c;">
            ${icon("building", 20)}
          </div>
          <div class="pe-metric-content">
            <div class="pe-metric-val">6 <span class="pe-metric-sub">Entities</span></div>
            <div class="pe-metric-tag green">🟢 4 verified</div>
          </div>
        </div>

        <div class="pe-metric-card">
          <div class="pe-metric-icon" style="background: #f0fdf4; color: #15803d;">
            ${icon("user", 20)}
          </div>
          <div class="pe-metric-content">
            <div class="pe-metric-val">3 <span class="pe-metric-sub">Individuals</span></div>
            <div class="pe-metric-tag green">🟢 2 verified</div>
          </div>
        </div>

        <div class="pe-metric-card">
          <div class="pe-metric-icon" style="background: #fefce8; color: #a16207;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <div class="pe-metric-content">
            <div class="pe-metric-val">12 <span class="pe-metric-sub">Relationships</span></div>
            <div class="pe-metric-tag red">⚠️ 3 missing evidence</div>
          </div>
        </div>

        <div class="pe-metric-card">
          <div class="pe-metric-icon" style="background: #eff6ff; color: #1d4ed8;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          </div>
          <div class="pe-metric-content">
            <div class="pe-metric-val">6 <span class="pe-metric-sub">Countries / Regions</span></div>
            <div class="pe-flags-row">🇭🇰 🇸🇬 🇬🇧 🇨🇦 🇻🇬 +2</div>
          </div>
        </div>

        <div class="pe-metric-card">
          <div class="pe-metric-icon" style="background: #faf5ff; color: #7e22ce;">
            ${icon("doc", 20)}
          </div>
          <div class="pe-metric-content">
            <div class="pe-metric-val">12 <span class="pe-metric-sub">Source documents</span></div>
            <div class="pe-metric-tag green">🟢 8 verified</div>
          </div>
        </div>
      </div>

      <!-- Powerful Filter/Search Area -->
      <div class="pe-filter-bar">
        <div class="pe-type-tabs">
          <button class="pe-tab-btn active" data-filter="all">All (9)</button>
          <button class="pe-tab-btn" data-filter="individual">Individuals (3)</button>
          <button class="pe-tab-btn" data-filter="entity">Entities (6)</button>
        </div>

        <div class="pe-dropdowns">
          <select id="pe-country-filter" class="pe-select">
            <option value="">All countries</option>
            <option value="Hong Kong">Hong Kong 🇭🇰</option>
            <option value="Singapore">Singapore 🇸🇬</option>
            <option value="Canada">Canada 🇨🇦</option>
            <option value="United Kingdom">United Kingdom 🇬🇧</option>
            <option value="British Virgin Islands">BVI 🇻🇬</option>
          </select>

          <select id="pe-role-filter" class="pe-select">
            <option value="">All roles</option>
            <option value="UBO">UBO</option>
            <option value="Shareholder">Shareholder</option>
            <option value="Director">Director</option>
            <option value="Subsidiary">Subsidiary</option>
          </select>

          <select id="pe-status-filter" class="pe-select">
            <option value="">Evidence status</option>
            <option value="Verified">Verified</option>
            <option value="Missing documents">Missing documents</option>
            <option value="Insufficient evidence">Insufficient evidence</option>
          </select>
        </div>

        <div class="pe-search-box">
          <svg class="pe-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="pe-search-input" placeholder="Search by name, company, alias, registration number..." />
        </div>
      </div>

      <!-- Main Dense & Elegant Entity Directory Table -->
      <div class="pe-table-card">
        <table class="pe-table">
          <thead>
            <tr>
              <th style="width: 32px;"><input type="checkbox" id="pe-select-all" /></th>
              <th>Name &nbsp;▲</th>
              <th>Type</th>
              <th>Role / Description</th>
              <th>Country / Region</th>
              <th>Key relationships</th>
              <th>Evidence status</th>
              <th style="width: 30px;"></th>
            </tr>
          </thead>
          <tbody id="pe-table-body">
            ${renderTableRows(entities)}
          </tbody>
        </table>
      </div>

      <!-- Investigation Drawer Slide-out Container -->
      <div id="pe-investigation-drawer" class="pe-drawer hidden">
        <div class="pe-drawer-backdrop" id="pe-drawer-close-bg"></div>
        <div class="pe-drawer-content" id="pe-drawer-inner">
          <!-- Populated dynamically upon clicking a row -->
        </div>
      </div>
    </div>
  `;
}

function renderTableRows(entities) {
  return entities.map((item) => {
    const avatarBadge = item.type === "Individual" 
      ? `<div class="pe-avatar person">${item.name.split(" ").map(n=>n[0]).join("")}</div>`
      : `<div class="pe-avatar entity">${icon("building", 14)}</div>`;

    const roleBadges = item.roles.map(r => `<span class="pe-role-tag ${r.toLowerCase()}">${r}</span>`).join(" ");

    const badgeClass = item.statusBadge === "green" ? "status-verified" : item.statusBadge === "red" ? "status-missing" : "status-warning";
    const badgeDot = item.statusBadge === "green" ? "🟢" : item.statusBadge === "red" ? "🔴" : "🟠";

    return `
      <tr class="pe-row" data-id="${item.id}">
        <td onclick="event.stopPropagation()"><input type="checkbox" /></td>
        <td>
          <div class="pe-name-col">
            ${avatarBadge}
            <span class="pe-name-text">${escapeHtml(item.name)}</span>
          </div>
        </td>
        <td class="pe-cell-sub">${escapeHtml(item.type)}</td>
        <td><div class="pe-roles-flex">${roleBadges}</div></td>
        <td>
          <span class="pe-country-badge">${item.flag} ${escapeHtml(item.jurisdiction)}</span>
        </td>
        <td class="pe-cell-sub">${item.relationshipsCount} relationships</td>
        <td>
          <span class="pe-status-pill ${badgeClass}">
            ${badgeDot} ${escapeHtml(item.status)}
          </span>
        </td>
        <td><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></td>
      </tr>
    `;
  }).join("");
}

function setupDirectoryEvents(entities) {
  const tableBody = document.getElementById("pe-table-body");
  const drawer = document.getElementById("pe-investigation-drawer");
  const drawerInner = document.getElementById("pe-drawer-inner");
  const closeBg = document.getElementById("pe-drawer-close-bg");
  const searchInput = document.getElementById("pe-search-input");

  if (!tableBody) return;

  // Filter handlers
  let activeFilter = "all";
  const typeBtns = document.querySelectorAll(".pe-tab-btn");
  typeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      typeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      filterTable();
    });
  });

  const countryFilter = document.getElementById("pe-country-filter");
  const roleFilter = document.getElementById("pe-role-filter");
  const statusFilter = document.getElementById("pe-status-filter");

  [countryFilter, roleFilter, statusFilter].forEach(el => {
    if (el) el.addEventListener("change", filterTable);
  });
  if (searchInput) searchInput.addEventListener("input", filterTable);

  function filterTable() {
    const q = searchInput ? searchInput.value.toLowerCase() : "";
    const c = countryFilter ? countryFilter.value : "";
    const r = roleFilter ? roleFilter.value : "";
    const s = statusFilter ? statusFilter.value : "";

    const filtered = entities.filter(item => {
      if (activeFilter === "individual" && item.type !== "Individual") return false;
      if (activeFilter === "entity" && item.type !== "Entity") return false;

      if (c && item.jurisdiction !== c) return false;
      if (r && !item.roles.includes(r)) return false;
      if (s && item.status !== s) return false;

      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesJurisdiction = item.jurisdiction.toLowerCase().includes(q);
        const matchesTrilingual = item.trilingual && item.trilingual.knownAs.some(k => k.name.toLowerCase().includes(q));
        if (!matchesName && !matchesJurisdiction && !matchesTrilingual) return false;
      }
      return true;
    });

    tableBody.innerHTML = renderTableRows(filtered);
    bindRowClicks();
  }

  function bindRowClicks() {
    const rows = tableBody.querySelectorAll(".pe-row");
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        const entity = entities.find(e => e.id === id);
        if (entity) {
          openDrawer(entity);
        }
      });
    });
  }

  function openDrawer(entity) {
    drawerInner.innerHTML = renderDrawerContent(entity);
    drawer.classList.remove("hidden");

    // Bind drawer subtab switching & close
    const closeBtn = drawerInner.querySelector("#pe-drawer-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeDrawer);
    }

    const drawerTabs = drawerInner.querySelectorAll(".drawer-tab-btn");
    const tabPanels = drawerInner.querySelectorAll(".drawer-tab-panel");
    drawerTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        drawerTabs.forEach(t => t.classList.remove("active"));
        tabPanels.forEach(p => p.classList.add("hidden"));
        tab.classList.add("active");
        const panelId = tab.dataset.panel;
        const panel = drawerInner.querySelector(`#${panelId}`);
        if (panel) panel.classList.remove("hidden");
      });
    });
  }

  function closeDrawer() {
    drawer.classList.add("hidden");
  }

  if (closeBg) closeBg.addEventListener("click", closeDrawer);

  bindRowClicks();
}

function renderDrawerContent(entity) {
  const avatarHtml = entity.type === "Individual"
    ? `<div class="drawer-avatar person">${entity.name.split(" ").map(n=>n[0]).join("")}</div>`
    : `<div class="drawer-avatar entity">${icon("building", 22)}</div>`;

  const statusBadge = entity.statusBadge === "green" ? "🟢 Verified" : entity.statusBadge === "red" ? "🔴 Missing" : "🟠 Insufficient";

  // Render Tracy's unique Trilingual Entity Resolution Card
  let trilingualCard = "";
  if (entity.trilingual) {
    const variants = entity.trilingual.knownAs.map(v => `
      <div class="trilingual-variant-chip">
        <span class="variant-name">${escapeHtml(v.name)}</span>
        <span class="variant-lang">${escapeHtml(v.lang)}</span>
        <span class="variant-check">✓ Match</span>
      </div>
    `).join("");

    trilingualCard = `
      <div class="trilingual-resolution-box">
        <div class="trilingual-header">
          <div class="trilingual-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6 10-10"/><path d="M2 12l5 5"/></svg>
            Tracy AI · Trilingual Entity Resolution
          </div>
          <div class="trilingual-confidence-badge">${entity.trilingual.confidence}% Confidence</div>
        </div>
        <p class="trilingual-desc">Auto-resolved across English, Traditional/Simplified Chinese, Pinyin & Cantonese romanization:</p>
        <div class="trilingual-chips-grid">
          ${variants}
        </div>
        <div class="trilingual-meta-footer">
          <span>Matched across <strong>${entity.trilingual.docCount} documents</strong> (${entity.trilingual.refCount} cross-references)</span>
          <span>${entity.trilingual.conflictDetected ? "⚠️ Minor name variant conflict detected" : "🟢 No conflicting identity evidence detected"}</span>
        </div>
      </div>
    `;
  }

  const relsList = entity.relationships.map(r => `
    <div class="drawer-rel-item">
      <div class="drawer-rel-left">
        ${icon("building", 16)}
        <div>
          <div class="rel-title"><strong>${escapeHtml(r.role)}</strong> ${escapeHtml(r.name)}</div>
          <div class="rel-sub">${escapeHtml(r.type)} · ${escapeHtml(r.country)}</div>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  `).join("");

  const evList = entity.evidence.map(ev => {
    const isV = ev.status === "Verified";
    return `
      <div class="drawer-ev-item">
        <div class="drawer-ev-left">
          ${icon("doc", 16)}
          <span class="ev-title">${escapeHtml(ev.title)}</span>
        </div>
        <span class="ev-status-badge ${isV ? 'green' : 'red'}">${isV ? '✓ Verified' : '✕ Missing'}</span>
      </div>
    `;
  }).join("");

  const timeList = entity.timeline.map(t => `
    <div class="drawer-timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-date">${escapeHtml(t.date)}</div>
        <div class="timeline-title">${escapeHtml(t.title)}</div>
      </div>
    </div>
  `).join("");

  return `
    <div class="drawer-header">
      <div class="drawer-header-left">
        ${avatarHtml}
        <div>
          <h2 class="drawer-entity-name">${escapeHtml(entity.name)}</h2>
          <div class="drawer-entity-tags">
            ${entity.roles.map(r=>`<span class="node-tag">${r}</span>`).join(" ")}
            <span>· ${entity.type} ·</span>
            <span>${entity.flag} ${escapeHtml(entity.jurisdiction)}</span>
          </div>
        </div>
      </div>
      <div class="drawer-header-right">
        <span class="drawer-status-pill">${statusBadge}</span>
        <button id="pe-drawer-close-btn" class="drawer-close-btn">&times;</button>
      </div>
    </div>

    ${(entity.type || "").toLowerCase() === "individual" ? "" : `
    <!-- Drawer Navigation Tabs -->
    <div class="drawer-nav-tabs">
      <button class="drawer-tab-btn active" data-panel="panel-overview">Overview</button>
      <button class="drawer-tab-btn" data-panel="panel-relationships">Relationships (${entity.relationships.length})</button>
      <button class="drawer-tab-btn" data-panel="panel-documents">Documents (${entity.evidence.length})</button>
      <button class="drawer-tab-btn" data-panel="panel-timeline">Timeline</button>
    </div>
    `}

    <!-- Drawer Content Body -->
    <div class="drawer-body">
      <!-- PANEL OVERVIEW -->
      <div id="panel-overview" class="drawer-tab-panel">
        ${trilingualCard}

        <div class="drawer-section-box">
          <div class="drawer-section-header">
            <h4>Basic information</h4>
          </div>
          <table class="drawer-info-table">
            <tr>
              <td class="lbl">Full name</td>
              <td class="val">${escapeHtml(entity.name)}</td>
            </tr>
            <tr>
              <td class="lbl">Role</td>
              <td class="val">${entity.roles.join(" · ")}</td>
            </tr>
            <tr>
              <td class="lbl">Nationality / Tax Home</td>
              <td class="val">${entity.flag} ${escapeHtml(entity.jurisdiction)}</td>
            </tr>
            <tr>
              <td class="lbl">Date of birth / Reg #</td>
              <td class="val">${escapeHtml(entity.dob)}</td>
            </tr>
            <tr>
              <td class="lbl">Address</td>
              <td class="val">${escapeHtml(entity.address)}</td>
            </tr>
          </table>
        </div>

        <div class="drawer-section-box">
          <div class="drawer-section-header">
            <h4>Relationships</h4>
          </div>
          <div class="drawer-rels-list">
            ${relsList}
          </div>
        </div>

        <div class="drawer-section-box">
          <div class="drawer-section-header">
            <h4>Evidence & KYC Documents</h4>
          </div>
          <div class="drawer-ev-list">
            ${evList}
          </div>
        </div>
      </div>

      <!-- PANEL RELATIONSHIPS -->
      <div id="panel-relationships" class="drawer-tab-panel hidden">
        <div class="drawer-section-box">
          <h4>Connected Entities & Directors</h4>
          <div class="drawer-rels-list" style="margin-top: 0.75rem;">
            ${relsList}
          </div>
        </div>
      </div>

      <!-- PANEL DOCUMENTS -->
      <div id="panel-documents" class="drawer-tab-panel hidden">
        <div class="drawer-section-box">
          <h4>Source Supporting Documents</h4>
          <div class="drawer-ev-list" style="margin-top: 0.75rem;">
            ${evList}
          </div>
        </div>
      </div>

      <!-- PANEL TIMELINE -->
      <div id="panel-timeline" class="drawer-tab-panel hidden">
        <div class="drawer-section-box">
          <h4>Entity Event Timeline</h4>
          <div class="drawer-timeline" style="margin-top: 0.75rem;">
            ${timeList}
          </div>
        </div>
      </div>
    </div>
  `;
}

