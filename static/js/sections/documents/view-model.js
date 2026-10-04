// What the Documents table shows: one row per checklist item from the case's
// intake (the eight requirement groups the backend read out of the pack's PDFs,
// see tally/intake.py). An item with no PDF, such as one that is missing or does
// not apply, has an empty file.
export const DOC_STATUS_LABEL = {
  verified: "Verified",
  received: "Received",
  pending: "Pending",
  stale: "Out of date",
  expired: "Expired",
  missing: "Missing",
  not_applicable: "Not applicable",
};

// The eight groups in the order the bank lists them.
const GROUPS = [
  ["company", "The company itself"],
  ["management", "Who runs it"],
  ["ownership", "Who owns and controls it"],
  ["business", "What the business does"],
  ["funds", "Source of funds and activity"],
  ["presence", "Address and presence"],
  ["declarations", "Tax and declarations"],
  ["verification", "Interaction and verification"],
];

const shortDate = (iso) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso)) : "";

// Items that do not apply to the applicant are left out.
export function buildDocumentsView(caseData) {
  const { intake } = caseData;
  const pages = Object.fromEntries((caseData.documents || []).map((d) => [d.filename, d.pages]));

  const groups = GROUPS.map(([key, title], index) => ({
    title: `${index + 1}. ${title}`,
    rows: (intake[key]?.documents || []).filter((item) => item.status !== "not_applicable").map((item) => ({
      title: item.title,
      file: item.file || "",
      date: shortDate(item.issued),
      pages: item.file ? pages[item.file] : null,
      status: item.status,
      note: item.note || "",
    })),
  }));

  const rows = groups.flatMap((group) => group.rows);
  return { groups, total: rows.length, withFile: rows.filter((row) => row.file).length };
}
