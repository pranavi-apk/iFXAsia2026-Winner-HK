// Everything the Ownership screen shows comes from buildOwnershipView().
//
// It reads the case's intake, which the backend builds from the pack's PDFs
// (tally/intake.py). The owners, subsidiaries, profile, documents and findings
// all come from there.
import { buildMapData } from "./map/data.js";

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = (iso) => SHORT_DATE.format(new Date(iso));

// Documents that were handed over, as opposed to asked for or absent.
const IN_PACK = new Set(["verified", "received", "stale", "expired"]);

// Individuals at the top of every chain, with the share they hold in the
// applicant: each link's percentage multiplied along the way.
function effectiveOwners(owners, share = 1) {
  return (owners || []).flatMap((owner) => {
    const here = share * (owner.pct / 100);
    return owner.kind === "person"
      ? [{ name: owner.name, country: owner.country, pct: Math.round(here * 1000) / 10 }]
      : effectiveOwners(owner.children, here);
  });
}

const countEntities = (nodes) =>
  (nodes || []).reduce((sum, node) => sum + (node.kind === "person" ? 0 : 1) + countEntities(node.children), 0);

export function buildOwnershipView(caseData) {
  const intake = caseData.intake;
  const { profile } = intake.company;
  const legalName = profile.legalName;
  const jurisdiction = profile.jurisdiction;

  const structure = {
    applicant: { id: "applicant", name: legalName, country: jurisdiction, role: profile.entityType },
    owners: intake.ownership.structure.owners,
    subsidiaries: intake.ownership.structure.subsidiaries,
  };

  const map = buildMapData(structure);
  const ubos = effectiveOwners(structure.owners);

  const packDocuments = [...intake.company.documents, ...intake.ownership.documents].filter((item) => IN_PACK.has(item.status));
  const keyFindings = intake.findings
    .filter((item) => item.section === "ownership")
    .map((item) => ({ kind: item.severity === "low" ? "info" : "warning", title: item.title, sub: item.sub }));

  return {
    legalName,
    jurisdiction,
    companyType: profile.entityType,

    presence: map.stats,
    map,

    ubos,
    structure,

    info: [
      { label: "Legal Name", value: legalName },
      { label: "Entity Type", value: profile.entityType },
      { label: "Jurisdiction", value: jurisdiction, flag: jurisdiction },
      { label: "Incorporation Date", value: shortDate(profile.incorporationDate) },
      { label: "Registration Number", value: profile.registrationNumber },
      { label: "Registered Address", value: profile.registeredOffice, small: true },
      { label: "Business Activity", value: profile.businessActivity },
    ],

    sourceDocuments: packDocuments.map((item) => item.title),
    keyFindings,

    counts: {
      related: countEntities(structure.subsidiaries) + countEntities(structure.owners),
      documents: packDocuments.length,
      findings: keyFindings.length,
    },
  };
}
