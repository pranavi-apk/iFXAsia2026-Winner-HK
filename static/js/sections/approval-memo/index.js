import { api } from "../../core/api.js";
import { $, $$, escapeHtml } from "../../core/dom.js";
import { pageHeader } from "../../components/page-header.js";
import { openMemoDocument } from "./memo-document.js";
import { RECOMMENDATIONS, buildMemoView } from "./view-model.js";

const TOAST_MS = 2500;

const CATEGORY_ICON = {
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
};

const svg = (paths) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${paths}</svg>`;

const categoryRow = (row) => `
  <div class="cat-finding-row">
    <div class="cat-finding-left">
      <div class="cat-icon">${svg(CATEGORY_ICON[row.icon])}</div>
      <span class="cat-title">${escapeHtml(row.title)}</span>
      <span class="cat-desc">${escapeHtml(row.desc)}</span>
    </div>
    <span class="risk-pill ${row.level.pill}">${row.level.label}</span>
  </div>`;

const actionRow = (action, index) => `
  <div class="action-item-card">
    <div class="action-item-left">
      <span class="action-num-badge" ${action.priority === "high" ? "" : 'style="background:#fef3c7; color:#b45309;"'}>${index + 1}</span>
      <span class="action-text">${escapeHtml(action.text)}</span>
    </div>
    <span class="risk-pill ${action.priority === "high" ? "red" : "amber"}">${action.priority === "high" ? "High" : "Medium"} Priority</span>
  </div>`;

const coverageRow = (item) => `
  <div class="coverage-item">
    <span class="coverage-check${item.ok ? "" : " pending"}">${item.ok ? "&#10003;" : "!"}</span>
    <span>${escapeHtml(item.text)}</span>
  </div>`;

const issueRow = (tone, count, label) => `
  <div class="issue-badge-row ${tone}"><span class="issue-num">${count}</span><span>${label}</span></div>`;

const formatSaved = (iso) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default {
  id: "approval-memo",
  step: 6,
  label: "Approval Memo",
  done: true,

  mount(container, caseData) {
    if (!caseData?.intake) {
      container.innerHTML = pageHeader({ title: "Approval Memo", subtitle: "This case has no structured intake. Open the sample case." });
      return;
    }
    const view = buildMemoView(caseData);
    const choices = Object.keys(RECOMMENDATIONS);

    container.innerHTML = `
      ${pageHeader({
        title: "Approval Memo",
        subtitle: "Review the consolidated findings and make a final recommendation. Edit, add comments, and generate the approval memo.",
      })}

      <div class="memo-container">
        <div class="memo-top-grid">
          <div class="memo-card">
            <div class="memo-card-title">Overall Recommendation</div>
            <div class="rec-select-box" data-rec-box>
              <div class="rec-icon" data-rec-mark></div>
              <div>
                <div class="rec-main-title" data-rec-title></div>
                <div class="rec-subtext" data-rec-sub></div>
              </div>
            </div>
          </div>

          <div class="memo-card">
            <div class="memo-card-title" style="text-align:center;">Risk Score</div>
            <div class="gauge-box">
              <svg class="gauge-svg" viewBox="0 0 100 50">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round" />
                <path d="${view.gauge}" fill="none" stroke="${view.tone}" stroke-width="10" stroke-linecap="round" />
              </svg>
              <div class="gauge-center-text"><div class="gauge-score-val">${view.risk.score}</div></div>
            </div>
            <div class="gauge-label" style="text-align:center;">${escapeHtml(view.risk.rating)} Risk</div>
          </div>

          <div class="memo-card">
            <div class="memo-card-title">Key Issues</div>
            <div class="key-issues-list">
              ${issueRow("red", view.counts.high, "High Risk")}
              ${issueRow("amber", view.counts.medium, "Medium Risk")}
              ${issueRow("yellow", view.counts.low, "Low Risk")}
            </div>
          </div>

          <div class="memo-card">
            <div class="memo-card-title">Coverage</div>
            <div class="coverage-list" data-coverage>${view.coverage.map(coverageRow).join("")}</div>
          </div>
        </div>

        <div class="memo-main-split">
          <div>
            <div class="memo-panel-card">
              <div class="memo-panel-header">
                <div class="memo-panel-title">Executive Summary</div>
                <button class="btn-sm-edit" data-edit="summary">Edit</button>
              </div>
              <p class="summary-text-p" data-field="summary">${escapeHtml(view.summary)}</p>

              <div style="margin-top: 1.75rem;">
                <div class="memo-panel-title" style="font-size:1.05rem;">Key Findings by Category</div>
                <div class="category-findings-list">${view.categories.map(categoryRow).join("")}</div>
              </div>
            </div>

            <div class="memo-panel-card">
              <div class="memo-panel-header">
                <div style="display:flex; align-items:center; gap:0.6rem;">
                  <div class="memo-panel-title">Required Actions</div>
                  <span style="background:#fef3c7; color:#b45309; font-size:0.75rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:9999px;">${view.actions.length} items</span>
                </div>
              </div>
              <div class="action-items-list">${view.actions.map(actionRow).join("")}</div>
            </div>
          </div>

          <div>
            <div class="memo-panel-card">
              <div class="memo-panel-header">
                <div class="memo-panel-title">Analyst Review</div>
                <button class="btn-sm-edit" data-edit="comments">Edit</button>
              </div>
              <div class="analyst-comments-box">
                <div class="comments-header">
                  ${svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>').replace('width="18" height="18"', 'width="15" height="15"')}
                  <span>Analyst Comments</span>
                </div>
                <p class="comments-p" data-field="comments">${escapeHtml(view.analystComments)}</p>
                <div class="analyst-author-bar">
                  <div style="display:flex; align-items:center; gap:0.6rem;">
                    <div class="author-avatar">CA</div>
                    <div class="author-info">
                      <span class="author-name">Compliance Analyst</span>
                      <span class="author-role">Draft author</span>
                    </div>
                  </div>
                  <span class="comment-date" data-saved>${view.savedAt ? `Saved ${formatSaved(view.savedAt)}` : "Not saved yet"}</span>
                </div>
              </div>
            </div>

            <div class="memo-panel-card">
              <div class="memo-panel-header"><div class="memo-panel-title">Approval Decision</div></div>
              <div class="decision-row">
                <div class="radio-decision-group">
                  ${choices
                    .map((choice) => `
                  <label class="radio-lbl ${RECOMMENDATIONS[choice].tone}">
                    <input type="radio" name="decision" value="${choice}" ${choice === view.recommendation ? "checked" : ""} />
                    <span>${choice}</span>
                  </label>`)
                    .join("")}
                </div>

                <div class="decision-actions-row">
                  <button class="btn-save-draft" data-save>Save as Draft</button>
                  <button class="btn-gen-memo" data-generate>Generate Approval Memo</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="memo-toast" data-toast role="status"></div>
    `;

    const toast = $("[data-toast]", container);
    let recommendation = view.recommendation;
    let toastTimer;

    const showToast = (message, isError = false) => {
      toast.textContent = message;
      toast.classList.toggle("error", isError);
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), TOAST_MS);
    };

    const showRecommendation = () => {
      const { mark, tone, sub } = RECOMMENDATIONS[recommendation];
      $("[data-rec-box]", container).className = `rec-select-box ${tone}`;
      $("[data-rec-mark]", container).textContent = mark;
      $("[data-rec-title]", container).textContent = recommendation;
      $("[data-rec-sub]", container).textContent = sub;
    };

    // The text the memo and the saved draft use: whatever is on screen now.
    const current = () => ({
      recommendation,
      summary: $('[data-field="summary"]', container).innerText.trim(),
      analystComments: $('[data-field="comments"]', container).innerText.trim(),
      decisionText: view.decisionTextFor(recommendation),
    });

    showRecommendation();

    // Edit / Done: make a block of text editable in place.
    $$("[data-edit]", container).forEach((button) => {
      button.addEventListener("click", () => {
        const field = $(`[data-field="${button.dataset.edit}"]`, container);
        const editing = field.isContentEditable;
        field.contentEditable = editing ? "false" : "true";
        field.classList.toggle("editing", !editing);
        button.textContent = editing ? "Edit" : "Done";
        if (!editing) field.focus();
      });
    });

    $$('input[name="decision"]', container).forEach((radio) => {
      radio.addEventListener("change", () => {
        recommendation = radio.value;
        showRecommendation();
      });
    });

    $("[data-save]", container).addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const draft = current();
      button.disabled = true;
      try {
        const saved = await api.saveMemo(caseData.id, {
          recommendation: draft.recommendation,
          summary: draft.summary,
          analyst_comments: draft.analystComments,
          decision_text: draft.decisionText,
        });
        caseData.memo_draft = saved.memo_draft;
        $("[data-saved]", container).textContent = `Saved ${formatSaved(saved.memo_draft.saved_at)}`;
        $("[data-coverage]", container).innerHTML = buildMemoView(caseData).coverage.map(coverageRow).join("");
        showToast("Draft saved.");
      } catch (error) {
        showToast("Could not save the draft.", true);
      } finally {
        button.disabled = false;
      }
    });

    $("[data-generate]", container).addEventListener("click", () => {
      if (!openMemoDocument(view, current())) showToast("Allow pop-ups to open the memo.", true);
    });
  },
};
