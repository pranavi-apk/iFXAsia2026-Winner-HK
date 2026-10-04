// Everything the Ownership screen shows comes from buildOwnershipView().
//
// Only the holding company's name and jurisdiction, and the document and
// finding counts, come from the case. The rest is sample data that looks the
// same for every case. To wire a field to real data, change it here and
// nothing else has to move.
export function buildOwnershipView(caseData) {
  const legalName = caseData.entity?.legal_name || caseData.title || "Silver Oak Holdings Ltd";
  const jurisdiction = caseData.entity?.jurisdiction || "BVI";

  const ubos = [
    { name: "Zhang Wei", country: "China", pct: 70 },
    { name: "Liu Mei", country: "Singapore", pct: 30 },
  ];

  const subsidiaries = [
    { name: "Eastbridge Trading Ltd", country: "Hong Kong", role: "Trading Company", pct: 100 },
    { name: "Maple Finance Pte Ltd", country: "Singapore", role: "Treasury Company", pct: 100 },
    { name: "Northern Capital Ltd", country: "United Kingdom", role: "Investment Co.", pct: 100 },
  ];

  const keyFindings = [
    { kind: "warning", title: "No shareholder register provided", sub: "Expected for BVI entity" },
    { kind: "info", title: "Director also appears in Hong Kong entity", sub: "Zhang Wei is director of Eastbridge Trading Ltd" },
  ];

  return {
    legalName,
    jurisdiction,
    companyType: "Holding Company",

    presence: { entities: 5, countries: 4, ubos: ubos.length },
    // Keys match the "name" property in static/vendor/countries-50m.json.
    mapCountries: {
      "United States of America": { label: "United States", count: 1, names: [] },
      "United Kingdom": { label: "United Kingdom", count: 1, names: [{ name: "Northern Capital Ltd", role: "Investment Co." }] },
      "Hong Kong": { label: "Hong Kong", count: 2, names: [{ name: "Eastbridge Trading Ltd", role: "Trading Company" }] },
      "Singapore": {
        label: "Singapore",
        count: 1,
        names: [{ name: "Maple Finance Pte Ltd", role: "Treasury Company" }],
        ubos: [{ name: "Liu Mei", pct: 30 }],
      },
      "British Virgin Is.": { label: "British Virgin Islands", count: 1, names: [] },
    },
    // Places too small to see as a shape at world scale also get a dot.
    mapDots: {
      "Hong Kong": [22.3193, 114.1694],
      "Singapore": [1.3521, 103.8198],
      "British Virgin Is.": [18.4207, -64.6399],
    },

    ubos,
    subsidiaries,

    info: [
      { label: "Legal Name", value: legalName },
      { label: "Entity Type", value: "Holding Company" },
      { label: "Jurisdiction", value: "British Virgin Islands", flag: "British Virgin Islands" },
      { label: "Incorporation Date", value: "12 Mar 2018" },
      { label: "Registration Number", value: "2034507" },
      { label: "Registered Address", value: "Trident Chambers, Road Town, Tortola, BVI", small: true },
      { label: "Business Activity", value: "Investment holding" },
    ],

    sourceDocuments: ["Certificate of Incorporation", "Memorandum & Articles", "Register of Members"],
    keyFindings,

    counts: {
      related: caseData.ownership_views?.length || 4,
      documents: caseData.documents?.length || 6,
      findings: caseData.findings?.length || 3,
    },
  };
}
