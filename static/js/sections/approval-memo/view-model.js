// Everything the Approval Memo screen shows, worked out from the case's intake:
// its findings and risk (tally/intake.py). The officer's saved draft, if any,
// overrides the suggested text.

export const RECOMMENDATIONS = {
  "Conditional Approval": { mark: "!", tone: "amber", sub: "Subject to additional information and ongoing monitoring." },
  Approve: { mark: "✓", tone: "green", sub: "No outstanding conditions." },
  Reject: { mark: "✕", tone: "red", sub: "The applicant is not accepted." },
};

const LEVEL = { high: { pill: "red", label: "High Risk" }, medium: { pill: "amber", label: "Medium Risk" }, low: { pill: "green", label: "Low Risk" } };
const NO_ISSUES = { pill: "green", label: "Low Risk" };
const RANK = { high: 0, medium: 1, low: 2 };
const GROUPS = ["company", "management", "ownership", "business", "funds", "presence", "declarations", "verification"];

const CATEGORIES = [
  { section: "ownership", title: "Ownership & Control", icon: "shield" },
  { section: "sanctions", title: "Sanctions & PEP", icon: "search" },
  { section: "source-of-funds", title: "Source of Funds", icon: "dollar" },
  { section: "documents", title: "Documents", icon: "doc" },
];

const list = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0] || "");
const checklist = (intake) => GROUPS.flatMap((group) => intake[group].documents);

// "Zhang Wei (70%) and Liu Mei (30%, through Jade Crest Holdings Pte Ltd)"
function ownersSentence(intake) {
  const owners = intake.ownership.beneficialOwners.map((owner) => {
    const via = owner.route.startsWith("Via ") ? `, ${owner.route.replace(/^Via /, "through ").replace(/ \(\d+%\)/, "")}` : "";
    return `${owner.name} (${owner.effectivePct}%${via})`;
  });
  return owners.length ? `It is owned by ${list(owners)}.` : "Its beneficial owners are not yet identified.";
}

function summary(intake, counts) {
  const { profile } = intake.company;
  const files = checklist(intake).filter((item) => item.file).length;
  const top = intake.findings.filter((item) => item.severity === "high").slice(0, 3).map((item) => item.title);
  const issues = counts.high ? ` ${counts.high} high-priority ${counts.high === 1 ? "issue was" : "issues were"} found: ${top.join("; ")}.` : "";
  return `The applicant, ${profile.legalName}, is a ${profile.entityType.toLowerCase()} incorporated in ${profile.jurisdiction} (${profile.businessActivity.toLowerCase()}). ${ownersSentence(intake)} Our assessment is based on the ${files} documents in the pack and screening of ${intake.screening.length} parties.${issues}`;
}

function categories(findings, risk) {
  const rows = CATEGORIES.map(({ section, title, icon }) => {
    const own = findings.filter((item) => item.section === section).sort((a, b) => RANK[a.severity] - RANK[b.severity]);
    const level = own.length ? LEVEL[own[0].severity] : NO_ISSUES;
    const shown = own.slice(0, 2).map((item) => item.title);
    const more = own.length > 2 ? ` and ${own.length - 2} more.` : ".";
    return { title, icon, level, desc: own.length ? `${shown.join("; ")}${more}` : "No issues found." };
  });
  const counts = risk.counts || { high: 0, medium: 0, low: 0 };
  rows.push({
    title: "Risk Rating", icon: "shield", level: LEVEL[String(risk.rating || "").toLowerCase()] || LEVEL.low,
    desc: `Overall risk score: ${risk.score} (${risk.rating}). ${counts.high} high, ${counts.medium} medium and ${counts.low} low-risk findings.`,
  });
  return rows;
}

// High and medium findings become actions for the customer or the officer.
const actions = (findings) =>
  findings
    .filter((item) => item.severity !== "low")
    .sort((a, b) => RANK[a.severity] - RANK[b.severity])
    .map((item) => ({ title: item.title, text: item.sub ? `${item.title}. ${item.sub}` : item.title, priority: item.severity }));

function coverage(intake, draft) {
  const open = checklist(intake).filter((item) => ["missing", "expired", "stale", "pending"].includes(item.status));
  const sof = intake.funds.documents.find((item) => item.id === "sof-statement");
  return [
    { ok: open.length === 0, text: open.length ? `${open.length} required documents are missing, out of date or pending` : "All required documents reviewed" },
    { ok: true, text: `Sanctions & PEP screening completed (${intake.screening.length} parties)` },
    { ok: sof?.status !== "missing", text: "Source of Funds assessment completed" },
    { ok: Boolean(draft), text: "Analyst review and comments added" },
  ];
}

function suggestedDecisionText(recommendation, todo) {
  const numbered = (items) => items.map((item, i) => `${i + 1}. ${item}`).join("\n");
  if (recommendation === "Approve") return "Approved. No outstanding conditions.";
  if (recommendation === "Reject") {
    const highs = todo.filter((a) => a.priority === "high").map((a) => a.title);
    return `Rejected. Reasons:\n${numbered(highs.length ? highs : ["Not satisfied with the information provided."])}`;
  }
  const conditions = todo.slice(0, 6).map((a) => a.title);
  return `Conditional approval subject to:\n${numbered([...conditions, "Ongoing monitoring for adverse media or changes in ownership."])}`;
}

function analystComments(counts, risk) {
  return `The profile has a clear business rationale. The pack scores ${risk.score} (${risk.rating}) with ${counts.high} high and ${counts.medium} medium findings, mostly missing, expired or pending documents and an unconfirmed ownership chain above Jade Crest. The possible PEP match on a director needs review before any approval. Recommend conditional approval subject to the requested documents and ongoing monitoring.`;
}

// The arc of the half-circle gauge, from the left end to `fraction` of the way round.
const gaugePath = (fraction) => {
  const angle = Math.PI * (1 - Math.min(1, Math.max(0, fraction)));
  return `M 10 50 A 40 40 0 0 1 ${(50 + 40 * Math.cos(angle)).toFixed(2)} ${(50 - 40 * Math.sin(angle)).toFixed(2)}`;
};

const SECTION = {
  documents: "documents",
  ownership: "ownership",
  screening: "sanctions",
  source_of_funds: "source-of-funds",
};
const SEVERITY = { high: "high", medium: "medium", low: "low", review: "medium" };

const asOfDate = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? String(iso)
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

function sectionFor(item) {
  if (item.module === "ownership" || item.code === "ownership_declaration") return "ownership";
  if (item.module === "source_of_funds" || item.code === "source_of_funds") return "source-of-funds";
  if (item.module === "screening") return "sanctions";
  return SECTION[item.module] || item.section || "documents";
}

function packFindings(caseData) {
  return (caseData.findings || []).map((item) => ({
    section: sectionFor(item),
    title: item.title || "",
    sub: item.detail || item.sub || "",
    severity: SEVERITY[item.severity] || "low",
    code: item.code || "",
  }));
}

function packRisk(caseData, findings) {
  const stored = caseData.risk || {};
  const counts = { high: 0, medium: 0, low: 0 };
  findings.forEach((item) => {
    counts[item.severity] = (counts[item.severity] || 0) + 1;
  });
  return {
    score: stored.score ?? 0,
    rating: stored.rating || "Low",
    counts,
  };
}

function suggestRecommendation(findings) {
  if (findings.some((item) => item.severity === "high" || item.severity === "medium")) return "Conditional Approval";
  return "Approve";
}

function caseSummary(caseData, findings, counts) {
  const entity = caseData.entity || {};
  const name = entity.legal_name || caseData.title || "The applicant";
  const jurisdiction = entity.jurisdiction || "an unknown jurisdiction";
  const people = (caseData.people || []).map((person) => person.name).filter(Boolean);
  const named = people.length ? `People named in the pack: ${list(people)}. Share percentages are not stated.` : "Beneficial owners are not identified in the pack.";
  const files = (caseData.documents || []).length;
  const screened = (caseData.screening || []).length;
  const top = findings.filter((item) => item.severity === "high").slice(0, 3).map((item) => item.title);
  const issues = counts.high ? ` ${counts.high} high-priority ${counts.high === 1 ? "issue was" : "issues were"} found: ${top.join("; ")}.` : "";
  return `The applicant, ${name}, is incorporated in ${jurisdiction}. ${named} The assessment used the ${files} document${files === 1 ? "" : "s"} in the pack and screened ${screened} ${screened === 1 ? "party" : "parties"}.${issues}`;
}

function caseComments(caseData, counts, risk) {
  const drafted = String(caseData.memo || "").trim();
  const score = `The pack scores ${risk.score} (${risk.rating}) with ${counts.high} high and ${counts.medium} medium findings.`;
  return drafted ? `${drafted} ${score} The officer decides.` : `${score} The officer decides.`;
}

function caseCoverage(caseData, findings, draft) {
  const missing = findings.filter((item) => /^Missing\b/i.test(item.title));
  const screened = (caseData.screening || []).length;
  const sofMissing = findings.some((item) => item.code === "source_of_funds" || /source of funds/i.test(item.title));
  return [
    { ok: missing.length === 0, text: missing.length ? `${missing.length} required documents are missing` : "All required documents reviewed" },
    { ok: screened > 0, text: screened ? `Sanctions & PEP screening completed (${screened} parties)` : "Sanctions & PEP screening was not run" },
    { ok: !sofMissing, text: sofMissing ? "Source of funds is not in the pack" : "Source of Funds assessment completed" },
    { ok: Boolean(draft), text: draft ? "Analyst review and comments added" : "Analyst review is ready for the officer" },
  ];
}

function fromAssessment(caseData) {
  const draft = caseData.memo_draft || null;
  const findings = packFindings(caseData);
  const risk = packRisk(caseData, findings);
  const todo = actions(findings);
  const recommendation = draft?.recommendation || suggestRecommendation(findings);
  const customerRequest = String(caseData.customer_request || "").trim();

  return {
    entityName: caseData.entity?.legal_name || caseData.title || "Applicant",
    asOf: asOfDate(caseData.created_at),
    risk,
    tone: { High: "#dc2626", Medium: "#f59e0b", Low: "#16a34a" }[risk.rating] || "#16a34a",
    gauge: gaugePath((risk.score || 0) / 100),
    counts: risk.counts,
    recommendation,
    summary: draft?.summary || caseSummary(caseData, findings, risk.counts),
    categories: categories(findings, risk),
    actions: todo,
    coverage: caseCoverage(caseData, findings, draft),
    analystComments: draft?.analyst_comments || caseComments(caseData, risk.counts, risk),
    savedAt: draft?.saved_at || null,
    decisionText: draft?.decision_text || (recommendation === "Conditional Approval" && customerRequest ? customerRequest : suggestedDecisionText(recommendation, todo)),
    decisionTextFor: (choice) => suggestedDecisionText(choice, todo),
  };
}

export function buildMemoView(caseData) {
  if (!caseData?.intake) return fromAssessment(caseData || {});
  const { intake } = caseData;
  const draft = caseData.memo_draft || null;
  const { risk, findings } = intake;
  const todo = actions(findings);
  const recommendation = draft?.recommendation || "Conditional Approval";

  return {
    entityName: intake.company.profile.legalName,
    asOf: intake.asOf,
    risk,
    tone: { High: "#dc2626", Medium: "#f59e0b", Low: "#16a34a" }[risk.rating] || "#16a34a",
    gauge: gaugePath(risk.score / 100),
    counts: risk.counts,
    recommendation,
    summary: draft?.summary || summary(intake, risk.counts),
    categories: categories(findings, risk),
    actions: todo,
    coverage: coverage(intake, draft),
    analystComments: draft?.analyst_comments || analystComments(risk.counts, risk),
    savedAt: draft?.saved_at || null,
    decisionText: draft?.decision_text || suggestedDecisionText(recommendation, todo),
    decisionTextFor: (choice) => suggestedDecisionText(choice, todo),
  };
}
