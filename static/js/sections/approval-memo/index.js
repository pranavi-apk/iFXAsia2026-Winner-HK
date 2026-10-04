import { pageHeader } from "../../components/page-header.js";
import { escapeHtml } from "../../core/dom.js";

export default {
  id: "approval-memo",
  step: 6,
  label: "Approval Memo",
  done: true,

  mount(container, caseData) {
    const entityName = caseData?.title || "Maple Finance Pte Ltd";

    container.innerHTML = `
      ${pageHeader({
        title: "Approval Memo",
        subtitle: "Review the consolidated findings and make a final recommendation. Edit, add comments, and generate the approval memo."
      })}

      <div class="memo-container">
        <!-- 1. Top Summary Cards Grid -->
        <div class="memo-top-grid">
          <!-- Overall Recommendation -->
          <div class="memo-card">
            <div class="memo-card-title">Overall Recommendation</div>
            <div class="rec-select-box">
              <div class="rec-icon">!</div>
              <div>
                <div class="rec-main-title">Conditional Approval</div>
                <div class="rec-subtext">Subject to additional information and ongoing monitoring.</div>
              </div>
            </div>
          </div>

          <!-- Risk Score Gauge -->
          <div class="memo-card">
            <div class="memo-card-title" style="text-align:center;">Risk Score</div>
            <div class="gauge-box">
              <svg class="gauge-svg" viewBox="0 0 100 50">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 78 18" fill="none" stroke="#f59e0b" stroke-width="10" stroke-linecap="round" />
              </svg>
              <div class="gauge-center-text">
                <div class="gauge-score-val">72</div>
              </div>
            </div>
            <div class="gauge-label" style="text-align:center;">Medium Risk</div>
          </div>

          <!-- Key Issues -->
          <div class="memo-card">
            <div class="memo-card-title">Key Issues</div>
            <div class="key-issues-list">
              <div class="issue-badge-row red">
                <span class="issue-num">2</span>
                <span>High Risk</span>
              </div>
              <div class="issue-badge-row amber">
                <span class="issue-num">3</span>
                <span>Medium Risk</span>
              </div>
              <div class="issue-badge-row yellow">
                <span class="issue-num">2</span>
                <span>Low Risk</span>
              </div>
            </div>
          </div>

          <!-- Coverage -->
          <div class="memo-card">
            <div class="memo-card-title">Coverage</div>
            <div class="coverage-list">
              <div class="coverage-item">
                <span class="coverage-check">&#10003;</span>
                <span>All required documents reviewed</span>
              </div>
              <div class="coverage-item">
                <span class="coverage-check">&#10003;</span>
                <span>Sanctions & PEP screening completed</span>
              </div>
              <div class="coverage-item">
                <span class="coverage-check">&#10003;</span>
                <span>Source of Funds assessment completed</span>
              </div>
              <div class="coverage-item">
                <span class="coverage-check">&#10003;</span>
                <span>Analyst review and comments added</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Main 2-Column Split -->
        <div class="memo-main-split">
          <!-- Left Side: Executive Summary, Key Findings, Required Actions -->
          <div>
            <!-- Executive Summary -->
            <div class="memo-panel-card">
              <div class="memo-panel-header">
                <div class="memo-panel-title">Executive Summary</div>
                <button class="btn-sm-edit">Edit</button>
              </div>
              <p class="summary-text-p">
                The applicant, <strong>${escapeHtml(entityName)}</strong>, is a Singapore-incorporated entity primarily engaged in technology and financial advisory services. Our assessment is based on the documents provided, open-source information and screening results. While no sanctions or adverse media were found, several inconsistencies were identified in the incorporation date and registered address, and additional clarification on the source of funds is required.
              </p>

              <!-- Key Findings by Category -->
              <div style="margin-top: 1.75rem;">
                <div class="memo-panel-title" style="font-size:1.05rem;">Key Findings by Category</div>
                <div class="category-findings-list">
                  <div class="cat-finding-row">
                    <div class="cat-finding-left">
                      <div class="cat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <span class="cat-title">Ownership & Control</span>
                      <span class="cat-desc">Ultimate beneficial owner identified. Structure is consistent across documents.</span>
                    </div>
                    <span class="risk-pill green">Low Risk</span>
                  </div>

                  <div class="cat-finding-row">
                    <div class="cat-finding-left">
                      <div class="cat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      </div>
                      <span class="cat-title">Sanctions & PEP</span>
                      <span class="cat-desc">No matches found in global sanctions lists. 1 potential PEP match (false positive).</span>
                    </div>
                    <span class="risk-pill green">Low Risk</span>
                  </div>

                  <div class="cat-finding-row">
                    <div class="cat-finding-left">
                      <div class="cat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <span class="cat-title">Source of Funds</span>
                      <span class="cat-desc">Funds primarily from sale of technology business. Supporting documents provided but tax clearance missing.</span>
                    </div>
                    <span class="risk-pill amber">Medium Risk</span>
                  </div>

                  <div class="cat-finding-row">
                    <div class="cat-finding-left">
                      <div class="cat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <span class="cat-title">Risk Rating</span>
                      <span class="cat-desc">Overall risk score: 72 (Medium). Key issues relate to address inconsistency and missing documents.</span>
                    </div>
                    <span class="risk-pill amber">Medium Risk</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Required Actions -->
            <div class="memo-panel-card">
              <div class="memo-panel-header">
                <div style="display:flex; align-items:center; gap:0.6rem;">
                  <div class="memo-panel-title">Required Actions</div>
                  <span style="background:#fef3c7; color:#b45309; font-size:0.75rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:9999px;">2 items</span>
                </div>
              </div>

              <div class="action-items-list">
                <div class="action-item-card">
                  <div class="action-item-left">
                    <span class="action-num-badge">1</span>
                    <span class="action-text">Provide tax clearance certificate for the sale of the technology business.</span>
                  </div>
                  <span class="risk-pill red">High Priority</span>
                </div>

                <div class="action-item-card">
                  <div class="action-item-left">
                    <span class="action-num-badge" style="background:#fef3c7; color:#b45309;">2</span>
                    <span class="action-text">Clarify registered address discrepancy (10 Anson Road vs 9 Raffles Place).</span>
                  </div>
                  <span class="risk-pill amber">Medium Priority</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Side: Analyst Review & Approval Decision -->
          <div>
            <!-- Analyst Review -->
            <div class="memo-panel-card">
              <div class="memo-panel-header">
                <div class="memo-panel-title">Analyst Review</div>
                <button class="btn-sm-edit">Edit</button>
              </div>

              <div class="analyst-comments-box">
                <div class="comments-header">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>Analyst Comments</span>
                </div>
                <p class="comments-p">
                  The overall profile appears legitimate with a clear business rationale. However, there are discrepancies in the incorporation date and registered address across documents. The source of funds is consistent with the declared business purpose, but the tax clearance certificate is pending. Recommend conditional approval subject to the requested documents and ongoing monitoring.
                </p>

                <div class="analyst-author-bar">
                  <div style="display:flex; align-items:center; gap:0.6rem;">
                    <div class="author-avatar">PK</div>
                    <div class="author-info">
                      <span class="author-name">Pranavi Kuntrapakam</span>
                      <span class="author-role">Compliance Analyst</span>
                    </div>
                  </div>
                  <span class="comment-date">3 Oct 2026, 16:45</span>
                </div>
              </div>
            </div>

            <!-- Approval Decision -->
            <div class="memo-panel-card">
              <div class="memo-panel-header">
                <div class="memo-panel-title">Approval Decision</div>
              </div>

              <div class="decision-editor-box">
                <div class="decision-textarea-label">Final Decision & Conditions</div>
                <textarea class="decision-textarea">Conditional approval subject to:
1. Submission of tax clearance certificate.
2. Clarification of registered address.
3. Ongoing monitoring for any adverse media or changes in ownership.</textarea>
                <div style="font-size:0.7rem; color:#94a3b8; text-align:right;">178/500</div>

                <div class="radio-decision-group">
                  <label class="radio-lbl">
                    <input type="radio" name="decision" checked />
                    <span>Conditional Approval</span>
                  </label>
                  <label class="radio-lbl">
                    <input type="radio" name="decision" />
                    <span>Approve</span>
                  </label>
                  <label class="radio-lbl">
                    <input type="radio" name="decision" />
                    <span>Reject</span>
                  </label>
                </div>

                <div class="decision-actions-row">
                  <button class="btn-save-draft">Save as Draft</button>
                  <button class="btn-gen-memo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>Generate Approval Memo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
