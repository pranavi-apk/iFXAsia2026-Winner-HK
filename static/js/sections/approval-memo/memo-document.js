import { escapeHtml } from "../../core/dom.js";

const PILL = { red: "#b91c1c", amber: "#b45309", green: "#15803d" };

const paragraphs = (text) =>
  escapeHtml(text)
    .split("\n")
    .map((line) => `<p>${line}</p>`)
    .join("");

// The approval memo as a standalone printable page, from the screen's current
// view and whatever the officer has typed. Opens in a new tab and offers print.
export function memoDocumentHtml(view, draft) {
  const findings = view.categories
    .map(
      (row) => `
      <tr>
        <td><strong>${escapeHtml(row.title)}</strong></td>
        <td style="color: ${PILL[row.level.pill]}; white-space: nowrap;">${escapeHtml(row.level.label)}</td>
        <td>${escapeHtml(row.desc)}</td>
      </tr>`
    )
    .join("");
  const actions = view.actions
    .map((action) => `<li>${escapeHtml(action.text)} <em style="color: ${action.priority === "high" ? PILL.red : PILL.amber};">(${action.priority === "high" ? "High" : "Medium"} priority)</em></li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Approval Memo - ${escapeHtml(view.entityName)}</title>
  <style>
    body { font-family: Inter, "Segoe UI", Arial, sans-serif; color: #0f172a; max-width: 780px; margin: 2rem auto; padding: 0 1.25rem; line-height: 1.55; font-size: 14px; }
    h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    h2 { font-size: 1rem; margin: 1.6rem 0 0.4rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
    .meta { color: #64748b; font-size: 0.85rem; }
    .banner { display: flex; gap: 2rem; margin: 1.2rem 0; padding: 0.9rem 1.1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .banner div span { display: block; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
    .banner div strong { font-size: 1.05rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    td { padding: 0.45rem 0.5rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    p { margin: 0 0 0.35rem; }
    li { margin-bottom: 0.3rem; }
    .actions { margin: 1.5rem 0; }
    button { font: inherit; padding: 0.5rem 1.1rem; border-radius: 6px; border: 1px solid #0f172a; background: #0f172a; color: #fff; cursor: pointer; }
    @media print { .actions { display: none; } body { margin: 0; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>Approval Memo</h1>
  <div class="meta">${escapeHtml(view.entityName)} &middot; Review date ${escapeHtml(view.asOf)}</div>

  <div class="banner">
    <div><span>Recommendation</span><strong>${escapeHtml(draft.recommendation)}</strong></div>
    <div><span>Risk score</span><strong>${view.risk.score} (${escapeHtml(view.risk.rating)})</strong></div>
    <div><span>Findings</span><strong>${view.counts.high} high &middot; ${view.counts.medium} medium &middot; ${view.counts.low} low</strong></div>
  </div>

  <h2>Executive summary</h2>
  ${paragraphs(draft.summary)}

  <h2>Key findings by category</h2>
  <table>${findings}</table>

  <h2>Required actions</h2>
  ${actions ? `<ol>${actions}</ol>` : "<p>None.</p>"}

  <h2>Analyst review</h2>
  ${paragraphs(draft.analystComments)}

  <h2>Final decision and conditions</h2>
  <p><strong>${escapeHtml(draft.recommendation)}</strong></p>
  ${paragraphs(draft.decisionText)}

  <p class="meta" style="margin-top: 2rem;">Scores follow an illustrative sample policy, not an institution's risk policy. The officer decides.</p>
</body>
</html>`;
}

// Returns false if the browser blocked the new tab.
export function openMemoDocument(view, draft) {
  const tab = window.open("", "_blank");
  if (!tab) return false;
  tab.document.open();
  tab.document.write(memoDocumentHtml(view, draft));
  tab.document.close();
  return true;
}
