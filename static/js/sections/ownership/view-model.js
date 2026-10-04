// Everything the Ownership screen shows comes from buildOwnershipView().
//
// It reads the case's intake, which the backend builds from the pack's PDFs
// (tally/intake.py). The owners, subsidiaries, profile, documents and findings
// all come from there.
import { buildMapData } from "./map/data.js";

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? String(iso) : SHORT_DATE.format(date);
};

function countryOf(value) {
  const text = String(value || "");
  if (/british|england|wales|scotland|united kingdom|\buk\b/i.test(text)) return "United Kingdom";
  return text;
}

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

function fromCase(caseData) {
  const entity = caseData.entity || {};
  const legalName = entity.legal_name || caseData.title || "Applicant";
  const jurisdiction = countryOf(entity.jurisdiction);
  const people = caseData.people || [];
  const companies = (caseData.companies || []).filter((company) => company.name && company.name !== legalName);
  const owners = people.map((person, index) => ({
    id: `person-${index}`,
    kind: "person",
    name: person.name,
    country: countryOf(person.nationality) || jurisdiction,
    role: (person.roles || []).join(", ") || "Named in the pack",
  }));
  const subsidiaries = companies.map((company, index) => ({
    id: `company-${index}`,
    kind: "company",
    name: company.name,
    country: countryOf(company.jurisdiction) || jurisdiction,
    role: "Named in the pack",
  }));
  const structure = {
    applicant: { id: "applicant", name: legalName, country: jurisdiction, role: "Applicant" },
    owners,
    subsidiaries,
  };
  const map = buildMapData(structure);
  const findings = (caseData.findings || []).filter((item) => item.module === "ownership" || /ownership|shareholder|ubo/i.test(item.title || ""));
  const documents = caseData.documents || [];
  return {
    legalName,
    jurisdiction,
    companyType: "Company",
    presence: map.stats,
    map,
    ubos: owners.map((owner) => ({ name: owner.name, country: owner.country, pct: null })),
    structure,
    info: [
      { label: "Legal Name", value: legalName },
      { label: "Entity Type", value: "Company" },
      { label: "Jurisdiction", value: jurisdiction, flag: jurisdiction },
      { label: "Registration Number", value: entity.company_number || "" },
      { label: "Registered Address", value: entity.registered_address || "", small: true },
    ],
    sourceDocuments: documents.map((item) => item.filename),
    keyFindings: findings.map((item) => ({ kind: item.severity === "low" ? "info" : "warning", title: item.title, sub: item.detail || "" })),
    counts: {
      related: owners.length + subsidiaries.length,
      documents: documents.length,
      findings: findings.length,
    },
  };
}

export function buildOwnershipView(caseData) {
  if (!caseData.intake) return fromCase(caseData);
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
