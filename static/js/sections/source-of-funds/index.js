import { pageHeader } from "../../components/page-header.js";
import { escapeHtml } from "../../core/dom.js";

export default {
  id: "source-of-funds",
  step: 4,
  label: "Source of Funds",
  done: true,

  mount(container, caseData) {
    const totalFunds = caseData?.business?.turnover || "USD 5.0M";
    const entityName = caseData?.title || "Silver Oak Holdings Ltd";

    container.innerHTML = `
      ${pageHeader({
        title: "Source of Funds & Business Purpose",
        subtitle: "Analyse the origin of funds, expected activity and business purpose across all available documents."
      })}

      <div class="sof-container">
        <!-- 1. Top Metric Cards Bar -->
        <div class="sof-metrics-row">
          <div class="sof-metric-card">
            <div class="sof-metric-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="sof-metric-body">
              <div class="sof-metric-value">${escapeHtml(totalFunds)}</div>
              <div class="sof-metric-label">Total Declared Funds</div>
            </div>
          </div>

          <div class="sof-metric-card">
            <div class="sof-metric-icon indigo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            </div>
            <div class="sof-metric-body">
              <div class="sof-metric-value">3</div>
              <div class="sof-metric-label">Funding Sources Identified</div>
            </div>
          </div>

          <div class="sof-metric-card">
            <div class="sof-metric-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="sof-metric-body">
              <div class="sof-metric-value">Consistent</div>
              <div class="sof-metric-label">With Business Purpose</div>
            </div>
          </div>

          <div class="sof-metric-card">
            <div class="sof-metric-icon amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div class="sof-metric-body">
              <div class="sof-metric-value">2</div>
              <div class="sof-metric-label">Items Require Clarification</div>
            </div>
          </div>
        </div>

        <!-- 2. Row 2: Funds Flow Visualisation + Source Breakdown -->
        <div class="sof-grid-2col">
          <!-- Left: Funds Flow Visualisation -->
          <div class="sof-panel">
            <div class="sof-panel-header">
              <div>
                <div class="sof-panel-title">
                  <span>Funds Flow Visualisation</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div class="sof-panel-sub">Trace the key inflows and their sources.</div>
              </div>
            </div>

            <div class="funds-flow-diagram">
              <div class="flow-node-column">
                <div class="flow-node-card">
                  <div class="flow-node-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 10h4M6 14h4M6 18h4M14 10h4M14 14h4M14 18h4M9 3l3-2 3 2"/></svg>
                  </div>
                  <div class="flow-node-info">
                    <span class="flow-node-name">TechCo Ltd</span>
                    <span class="flow-node-meta">Operating Revenue</span>
                    <span class="flow-node-val">USD 3.5M (70%)</span>
                  </div>
                </div>

                <div class="flow-node-card">
                  <div class="flow-node-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div class="flow-node-info">
                    <span class="flow-node-name">Investment Income</span>
                    <span class="flow-node-meta">Dividends</span>
                    <span class="flow-node-val">USD 1.0M (20%)</span>
                  </div>
                </div>

                <div class="flow-node-card">
                  <div class="flow-node-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div class="flow-node-info">
                    <span class="flow-node-name">Personal Savings</span>
                    <span class="flow-node-meta">Individual Funds</span>
                    <span class="flow-node-val">USD 0.5M (10%)</span>
                  </div>
                </div>
              </div>

              <!-- Connecting flow lines SVG -->
              <svg class="flow-arrow-svg" width="60" height="160" viewBox="0 0 60 160">
                <path d="M 0 30 C 30 30, 30 80, 60 80" fill="none" stroke="#bfdbfe" stroke-width="3" />
                <path d="M 0 80 L 60 80" fill="none" stroke="#93c5fd" stroke-width="3" />
                <path d="M 0 130 C 30 130, 30 80, 60 80" fill="none" stroke="#bfdbfe" stroke-width="3" />
              </svg>

              <div class="flow-node-column" style="max-width: 220px;">
                <div class="flow-node-card target">
                  <div class="flow-node-icon" style="background:#2563eb; color:#ffffff; border:none;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 10h4M6 14h4M6 18h4M14 10h4M14 14h4M14 18h4"/></svg>
                  </div>
                  <div class="flow-node-info">
                    <span class="flow-node-name">Maple Finance Pte Ltd</span>
                    <span class="flow-node-meta">Operating Company</span>
                  </div>
                </div>
              </div>

              <div style="font-size: 1.2rem; color: #94a3b8; font-weight: 700;">&rarr;</div>

              <div class="flow-node-column" style="max-width: 220px;">
                <div class="flow-node-card target" style="background:#ffffff; border: 2px solid #2563eb;">
                  <div class="flow-node-icon" style="background:#2563eb; color:#ffffff; border:none;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 10h4M6 14h4M6 18h4M14 10h4M14 14h4M14 18h4"/></svg>
                  </div>
                  <div class="flow-node-info">
                    <span class="flow-node-name">${escapeHtml(entityName)}</span>
                    <span class="flow-node-meta" style="color:#2563eb; font-weight:700;">Onboarded Entity</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Source Breakdown Donut -->
          <div class="sof-panel">
            <div class="sof-panel-header">
              <div>
                <div class="sof-panel-title">Source Breakdown</div>
                <div class="sof-panel-sub">Composition of total funds and key characteristics.</div>
              </div>
            </div>

            <div class="source-breakdown-wrap">
              <div class="donut-chart-box">
                <svg class="donut-chart-svg" viewBox="0 0 36 36">
                  <!-- Donut segment 1 (70%) -->
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1d4ed8" stroke-width="4.5" stroke-dasharray="70, 100" />
                  <!-- Donut segment 2 (20%) -->
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#60a5fa" stroke-width="4.5" stroke-dasharray="20, 100" stroke-dashoffset="-70" />
                  <!-- Donut segment 3 (10%) -->
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#93c5fd" stroke-width="4.5" stroke-dasharray="10, 100" stroke-dashoffset="-90" />
                </svg>
                <div class="donut-center-text">
                  <div class="donut-val">USD 5.0M</div>
                  <div class="donut-lbl">Total Funds</div>
                </div>
              </div>

              <div class="breakdown-legend">
                <div class="legend-item">
                  <div class="legend-left">
                    <span class="legend-dot" style="background:#1d4ed8;"></span>
                    <div>
                      <div class="legend-title">Operating Revenue</div>
                      <div class="legend-sub">70% &bull; From sale of software services</div>
                    </div>
                  </div>
                  <div class="legend-val">USD 3.5M</div>
                </div>

                <div class="legend-item">
                  <div class="legend-left">
                    <span class="legend-dot" style="background:#60a5fa;"></span>
                    <div>
                      <div class="legend-title">Investment Income</div>
                      <div class="legend-sub">20% &bull; Dividends from TechCo Ltd</div>
                    </div>
                  </div>
                  <div class="legend-val">USD 1.0M</div>
                </div>

                <div class="legend-item">
                  <div class="legend-left">
                    <span class="legend-dot" style="background:#93c5fd;"></span>
                    <div>
                      <div class="legend-title">Personal Savings</div>
                      <div class="legend-sub">10% &bull; Individual funds from UBO</div>
                    </div>
                  </div>
                  <div class="legend-val">USD 0.5M</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Row 3: Timeline of Key Transactions + Declared Business Purpose -->
        <div class="sof-grid-2col">
          <!-- Left: Timeline of Key Transactions -->
          <div class="sof-panel">
            <div class="sof-panel-header">
              <div>
                <div class="sof-panel-title">
                  <span>Timeline of Key Transactions</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div class="sof-panel-sub">Major inflows and relevant events.</div>
              </div>
            </div>

            <div class="timeline-track">
              <div class="timeline-node">
                <span class="timeline-date">Jan 2022</span>
                <span class="timeline-dot"></span>
                <span class="timeline-desc">Incorporation of Maple Finance Pte Ltd</span>
              </div>

              <div class="timeline-node">
                <span class="timeline-date">Mar 2023</span>
                <span class="timeline-dot"></span>
                <span class="timeline-val">USD 3.5M</span>
                <span class="timeline-desc">Revenue from TechCo Ltd</span>
              </div>

              <div class="timeline-node">
                <span class="timeline-date">Apr 2023</span>
                <span class="timeline-dot"></span>
                <span class="timeline-val">USD 1.0M</span>
                <span class="timeline-desc">Dividend income</span>
              </div>

              <div class="timeline-node">
                <span class="timeline-date">Jun 2023</span>
                <span class="timeline-dot"></span>
                <span class="timeline-val">USD 0.5M</span>
                <span class="timeline-desc">Personal funds transfer</span>
              </div>

              <div class="timeline-node">
                <span class="timeline-date">Aug 2023</span>
                <span class="timeline-dot"></span>
                <span class="timeline-desc">Onboarding application submitted</span>
              </div>
            </div>
          </div>

          <!-- Right: Declared Business Purpose -->
          <div class="sof-panel">
            <div class="sof-panel-header">
              <div>
                <div class="sof-panel-title">Declared Business Purpose</div>
              </div>
              <button style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.3rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: #334155; cursor: pointer;">Edit</button>
            </div>

            <div class="purpose-list">
              <div class="purpose-item">
                <div class="purpose-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <span class="purpose-label">Business Activity</span>
                <span class="purpose-value">Investment holding in technology and financial services</span>
              </div>

              <div class="purpose-item">
                <div class="purpose-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                </div>
                <span class="purpose-label">Expected Transactions</span>
                <span class="purpose-value">Investments, dividends and treasury management</span>
              </div>

              <div class="purpose-item">
                <div class="purpose-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <span class="purpose-label">Target Markets</span>
                <span class="purpose-value">Asia-Pacific</span>
              </div>

              <div class="purpose-item">
                <div class="purpose-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                </div>
                <span class="purpose-label">Expected Annual Volume</span>
                <span class="purpose-value">USD 1M &ndash; 5M</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Row 4: Key Supporting Documents Grid -->
        <div class="sof-panel">
          <div class="sof-panel-header">
            <div>
              <div class="sof-panel-title">Key Supporting Documents</div>
              <div class="sof-panel-sub">Documents used to verify the source of funds and business purpose.</div>
            </div>
            <button style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.35rem 0.85rem; font-size: 0.8rem; font-weight: 600; color: #334155; cursor: pointer;">View All Documents</button>
          </div>

          <div class="docs-cards-row">
            <div class="doc-card">
              <div class="doc-card-top">
                <div class="doc-preview-thumb" style="width:100%;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
              </div>
              <span class="doc-card-title">Sale and Purchase Agreement</span>
              <span class="doc-card-date">15 Mar 2023</span>
              <span class="doc-pill-badge green">Supports Revenue</span>
            </div>

            <div class="doc-card">
              <div class="doc-card-top">
                <div class="doc-preview-thumb" style="width:100%;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
              </div>
              <span class="doc-card-title">Bank Statement</span>
              <span class="doc-card-date">Mar &ndash; Apr 2023</span>
              <span class="doc-pill-badge green">Confirms Inflow</span>
            </div>

            <div class="doc-card">
              <div class="doc-card-top">
                <div class="doc-preview-thumb" style="width:100%;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
              </div>
              <span class="doc-card-title">Dividend Certificate</span>
              <span class="doc-card-date">12 Apr 2023</span>
              <span class="doc-pill-badge green">Supports Investment Income</span>
            </div>

            <div class="doc-card">
              <div class="doc-card-top">
                <div class="doc-preview-thumb" style="width:100%;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
              </div>
              <span class="doc-card-title">Personal Bank Statement</span>
              <span class="doc-card-date">Jun 2023</span>
              <span class="doc-pill-badge green">Supports Personal Funds</span>
            </div>

            <div class="doc-card">
              <div class="doc-card-top">
                <div class="doc-preview-thumb" style="width:100%;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
              </div>
              <span class="doc-card-title">Tax Clearance Certificate</span>
              <span class="doc-card-date">FY 2022</span>
              <span class="doc-pill-badge amber">Requires Review</span>
            </div>

            <div class="doc-card">
              <div class="doc-card-top">
                <div class="doc-preview-thumb" style="width:100%;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
              </div>
              <span class="doc-card-title">Business Plan</span>
              <span class="doc-card-date">Aug 2023</span>
              <span class="doc-pill-badge green">Supports Purpose</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
