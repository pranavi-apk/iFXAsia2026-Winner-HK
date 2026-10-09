export function renderPresenceCard(view) {
  const presence = view.presence || { entities: 9, ubos: 3, relationships: 12, countries: 6, gaps: 3 };
  const legalName = view.legalName || "Silver Oak Holdings Ltd";
  
  const metricCards = [
    {
      val: presence.entities || 9,
      lbl: "Entities identified",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/></svg>`,
      bg: "#faf7f2",
      iconBg: "#f5eee0"
    },
    {
      val: presence.ubos || 3,
      lbl: "Individuals identified",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      bg: "#faf7f2",
      iconBg: "#f5eee0"
    },
    {
      val: presence.relationships || 12,
      lbl: "Relationships mapped",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      bg: "#faf7f2",
      iconBg: "#f5eee0"
    },
    {
      val: presence.countries || 6,
      lbl: "Countries / Regions",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
      bg: "#faf7f2",
      iconBg: "#f5eee0"
    },
    {
      val: presence.gaps || 3,
      lbl: "Potential gaps in evidence",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      bg: "#faf7f2",
      iconBg: "#fef2f2"
    }
  ];

  return `
    <div class="tracy-dashboard-container">
      <!-- 5 Horizontal Summary Metric Cards -->
      <div class="tracy-metrics-row">
        ${metricCards.map(c => `
          <div class="tracy-metric-card" style="background:${c.bg}">
            <div class="tracy-metric-icon" style="background:${c.iconBg}">
              ${c.icon}
            </div>
            <div class="tracy-metric-info">
              <span class="tracy-metric-val">${c.val}</span>
              <span class="tracy-metric-lbl">${c.lbl}</span>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Main Map Box Card -->
      <div class="tracy-map-card">
        <div class="tracy-map-header">
          <div class="tracy-map-header-left">
            <div class="map-globe-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div class="tracy-map-titles">
              <h3>Global Ownership Map</h3>
              <p>Visualise the cross-border ownership and control structure</p>
            </div>
          </div>
          <div class="tracy-map-controls">
            <select class="tracy-select-dropdown">
              <option>All entities</option>
              <option>Holding companies</option>
              <option>Subsidiaries</option>
            </select>
            <button type="button" class="map-control-btn" title="Search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
            <button type="button" class="map-control-btn" title="Filter"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></button>
            <button type="button" class="map-control-btn" title="Fullscreen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>
          </div>
        </div>

        <div class="tracy-map-viewport">
          <div id="leaflet-global-map" class="world-map-visual"></div>
        </div>

        <div class="tracy-map-legend">
          <span class="legend-item"><span class="legend-dot company"></span> Company</span>
          <span class="legend-item"><span class="legend-dot individual"></span> Individual</span>
          <span class="legend-item"><span class="legend-line solid"></span> Ownership</span>
          <span class="legend-item"><span class="legend-line dashed"></span> Control</span>
          <span class="legend-item"><span class="legend-line dotted"></span> Director</span>
        </div>
      </div>

      <!-- Bottom Key Insights -->
      <div class="tracy-key-insights-section">
        <h4 class="insights-heading">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          Key Insights
        </h4>
        <div class="insights-cards-grid">
          <div class="insight-card">
            <div class="insight-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
            <div class="insight-text">${legalName} is registered in ${view.applicant?.country || "Hong Kong"}.</div>
          </div>
          <div class="insight-card">
            <div class="insight-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
            <div class="insight-text">${view.effectiveOwners && view.effectiveOwners.length ? `${view.effectiveOwners[0].name} is identified as the primary UBO (${view.effectiveOwners[0].pct}%).` : "David Chan is identified as the ultimate beneficial owner (80%)."}</div>
          </div>
          <div class="insight-card">
            <div class="insight-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5e2b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg></div>
            <div class="insight-text">Entities are connected across ${presence.countries || 6} jurisdictions.</div>
          </div>
        </div>
      </div>
    </div>`;
}

