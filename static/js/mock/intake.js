// Mock onboarding intake for the sample applicant (invented company and people).
//
// It follows the eight groups of the bank's onboarding requirements, so each
// sidebar section reads from the group it depends on:
//
//   company       1. The company itself            -> Documents
//   management    2. Who runs it                   -> Documents
//   ownership     3. Who owns and controls it      -> Ownership & Control
//   business      4. What the business does        -> Source of Funds
//   funds         5. Source and expected activity  -> Source of Funds
//   presence      6. Address and presence          -> Documents
//   declarations  7. Tax and declarations          -> Sanctions & PEP
//   verification  8. Interaction and verification  -> Documents
//
// `screening` and `findings` are what the checks would produce from the above.
// Every checklist item has the same shape (see `doc`), so one list can be built
// from all of them with allDocuments().
//
// "Today" for this case is 2026-10-04, so dates below are relative to that.

export const TODAY = "2026-10-04";
export const DOC_STATUS = ["verified", "received", "pending", "stale", "expired", "missing", "not_applicable"];

// One checklist item. `status` is one of DOC_STATUS:
//   verified        in the pack and checked
//   received        in the pack, not yet checked
//   pending         asked for, not arrived
//   stale           in the pack but older than the bank accepts
//   expired         past its own expiry date
//   missing         required and absent
//   not_applicable  does not apply to this applicant
const doc = (id, title, status, extra = {}) => ({ id, title, status, ...extra });

export const MOCK_INTAKE = {
  caseRef: "KYC-2026-0412",
  receivedOn: "2026-09-21",
  beneficialOwnerThresholdPct: 25, // lower for higher-risk customers

  // ---------------------------------------------------------------- 1. company
  company: {
    profile: {
      legalName: "Silver Oak Holdings Ltd",
      formerNames: [],
      entityType: "Holding Company",
      jurisdiction: "British Virgin Islands",
      incorporationDate: "2018-03-12",
      registrationNumber: "2034507",
      registeredOffice: "Trident Chambers, Road Town, Tortola, BVI",
      businessActivity: "Investment holding",
      shareCapital: { currency: "USD", authorised: 50000, issued: 50000, shares: 50000 },
    },
    documents: [
      doc("certificate-of-incorporation", "Certificate of Incorporation", "verified", {
        issued: "2018-03-12", apostilled: true, file: "01-certificate-of-incorporation.pdf",
      }),
      doc("certificate-of-change-of-name", "Certificate of Change of Name", "not_applicable", {
        note: "No change of name since incorporation.",
      }),
      doc("business-registration-certificate", "Business Registration Certificate (Hong Kong)", "not_applicable", {
        note: "The applicant is not registered in Hong Kong. Its subsidiary Eastbridge Trading Ltd holds one (BR 71420385).",
      }),
      doc("memorandum-and-articles", "Memorandum & Articles of Association", "verified", {
        issued: "2018-03-12", file: "02-memorandum-and-articles.pdf",
      }),
      doc("registry-extract", "Company registry extract", "verified", {
        issued: "2026-09-10", file: "03-registry-extract.pdf",
        shows: ["registered office", "directors", "shareholders", "share capital"],
      }),
      doc("certificate-of-incumbency", "Certificate of Incumbency", "stale", {
        issued: "2026-05-20", maxAgeMonths: 3, file: "04-certificate-of-incumbency.pdf",
        note: "Issued 137 days ago. The bank accepts 3 months for an offshore company.",
      }),
    ],
  },

  // --------------------------------------------------------------- 2. who runs it
  management: {
    directors: [
      { id: "zhang-wei", name: "Zhang Wei", role: "Director", nationality: "China", residence: "Hong Kong", appointed: "2018-03-12" },
      { id: "liu-mei", name: "Liu Mei", role: "Director", nationality: "Singapore", residence: "Singapore", appointed: "2018-03-12" },
      { id: "chen-xiaolin", name: "Chen Xiaolin", role: "Director", nationality: "Hong Kong", residence: "Hong Kong", appointed: "2022-06-01" },
    ],
    companySecretary: { name: "Trident Corporate Services Ltd", kind: "company", country: "British Virgin Islands" },
    signatories: [
      { personId: "zhang-wei", name: "Zhang Wei", rule: "Either to sign up to USD 250,000; jointly above", specimenSignature: true },
      { personId: "chen-xiaolin", name: "Chen Xiaolin", rule: "Either to sign up to USD 250,000; jointly above", specimenSignature: true },
    ],
    documents: [
      doc("register-of-directors", "Register of Directors and Company Secretary", "verified", {
        issued: "2026-09-10", file: "05-register-of-directors.pdf",
      }),
      doc("board-resolution", "Board resolution authorizing the account", "verified", {
        issued: "2026-09-12", file: "06-board-resolution.pdf",
        note: "Names two authorized signatories with specimen signatures.",
      }),
      doc("id-zhang-wei", "Passport: Zhang Wei", "verified", {
        person: "zhang-wei", number: "EJ4410298", expires: "2030-11-14", file: "07-passport-zhang-wei.pdf",
      }),
      doc("id-liu-mei", "Passport: Liu Mei", "expired", {
        person: "liu-mei", number: "K7203918A", expires: "2026-07-30", file: "08-passport-liu-mei.pdf",
        note: "Expired 66 days ago. A valid copy is needed.",
      }),
      doc("id-chen-xiaolin", "HKID: Chen Xiaolin", "verified", {
        person: "chen-xiaolin", number: "Y6620418(3)", file: "09-hkid-chen-xiaolin.pdf",
      }),
      doc("address-zhang-wei", "Proof of residential address: Zhang Wei", "verified", {
        person: "zhang-wei", issued: "2026-08-14", kind: "Bank statement", file: "10-address-zhang-wei.pdf",
      }),
      doc("address-liu-mei", "Proof of residential address: Liu Mei", "stale", {
        person: "liu-mei", issued: "2026-04-02", kind: "Utility bill", maxAgeMonths: 3, file: "11-address-liu-mei.pdf",
        note: "Dated over 6 months ago.",
      }),
      doc("address-chen-xiaolin", "Proof of residential address: Chen Xiaolin", "received", {
        person: "chen-xiaolin", issued: "2026-09-02", kind: "Utility bill", file: "12-address-chen-xiaolin.pdf",
      }),
    ],
  },

  // -------------------------------------------------------- 3. owns and controls
  // `structure` is what the ownership canvas and map draw. Owners sit above the
  // applicant (a node's `children` are the next owners up); subsidiaries below.
  // `pct` is the share a node holds in the node below it (owners) or that the
  // parent holds in it (subsidiaries).
  ownership: {
    structure: {
      owners: [
        { id: "ubo-zhang-wei", kind: "person", name: "Zhang Wei", country: "China", pct: 70, tag: "UBO" },
        {
          id: "jade-crest", kind: "company", name: "Jade Crest Holdings Pte Ltd", country: "Singapore", role: "Shareholder", pct: 30,
          children: [
            { id: "ubo-liu-mei", kind: "person", name: "Liu Mei", country: "Singapore", pct: 100, tag: "UBO" },
          ],
        },
      ],
      subsidiaries: [
        {
          id: "eastbridge", kind: "company", name: "Eastbridge Trading Ltd", country: "Hong Kong", role: "Trading Company", pct: 100,
          children: [
            { id: "eastbridge-hk", kind: "company", name: "Eastbridge HK Branch", country: "Hong Kong", role: "Branch", pct: 100 },
            { id: "eastbridge-sh", kind: "company", name: "Eastbridge SH Rep. Office", country: "China", role: "Representative Office", pct: 100 },
          ],
        },
        {
          id: "maple", kind: "company", name: "Maple Finance Pte Ltd", country: "Singapore", role: "Treasury Company", pct: 100,
          children: [{ id: "maple-us", kind: "company", name: "Maple US Inc", country: "USA", role: "Operating Company", pct: 100 }],
        },
        {
          id: "northern", kind: "company", name: "Northern Capital Ltd", country: "United Kingdom", role: "Investment Company", pct: 100,
          children: [{ id: "nc-real-estate", kind: "company", name: "NC Real Estate LLC", country: "USA", role: "Property Holding", pct: 100 }],
        },
      ],
    },
    // Individuals above the bank's threshold. `effectivePct` is worked out from
    // the chain: Liu Mei holds 30% through Jade Crest, which she owns fully.
    beneficialOwners: [
      {
        personId: "zhang-wei", name: "Zhang Wei", country: "China", effectivePct: 70, route: "Direct",
        identity: "id-zhang-wei", address: "address-zhang-wei",
      },
      {
        personId: "liu-mei", name: "Liu Mei", country: "Singapore", effectivePct: 30, route: "Via Jade Crest Holdings Pte Ltd (100%)",
        identity: "id-liu-mei", address: "address-liu-mei",
      },
    ],
    controlByOtherMeans: [
      {
        kind: "Voting proxy",
        holder: "Zhang Wei",
        detail: "Holds a proxy over the votes attached to Jade Crest's 30% until 31 Dec 2026.",
        status: "disclosed",
      },
    ],
    documents: [
      doc("register-of-members", "Register of Members (shareholders)", "missing", {
        note: "Not in the pack. Shareholdings are only declared in the structure chart.",
      }),
      doc("structure-chart", "Ownership structure chart", "received", {
        issued: "2026-09-15", file: "13-structure-chart.pdf",
        note: "Goes up to the two individuals.",
      }),
      doc("jade-crest-constitution", "Jade Crest Holdings Pte Ltd: constitution", "pending", {
        entity: "jade-crest", note: "Requested 2026-09-22.",
      }),
      doc("jade-crest-register", "Jade Crest Holdings Pte Ltd: register of members", "pending", {
        entity: "jade-crest", note: "Requested 2026-09-22. Needed to confirm Liu Mei holds 100%.",
      }),
      doc("voting-proxy", "Voting proxy agreement (Jade Crest shares)", "received", {
        issued: "2025-12-01", file: "14-voting-proxy.pdf",
      }),
    ],
  },

  // ------------------------------------------------------ 4. what the business does
  business: {
    description: "Holds and finances a group that sources and trades industrial components between mainland China, Hong Kong and Southeast Asia.",
    products: ["Industrial fasteners", "Bearings and seals", "Treasury and intra-group financing"],
    mainCustomers: [
      { name: "Kowloon Precision Works Ltd", country: "Hong Kong", sharePct: 24 },
      { name: "Lion City Machinery Pte Ltd", country: "Singapore", sharePct: 19 },
      { name: "Pearl Delta Engineering Co", country: "China", sharePct: 15 },
    ],
    mainSuppliers: [
      { name: "Ningbo Hengda Metal Products Co", country: "China", sharePct: 41 },
      { name: "Suzhou Ruiyi Bearings Co", country: "China", sharePct: 22 },
    ],
    financialStatements: { basis: "Audited", period: "FY2025", year: 2025, auditor: "Fong & Partners CPA", turnoverUsd: 24800000, netProfitUsd: 1920000, totalAssetsUsd: 31400000 },
    licenses: [],
    licenseNote: "No regulatory licence needed for this activity.",
    documents: [
      doc("business-description", "Description of business activities", "verified", { issued: "2026-09-12", file: "15-business-description.pdf" }),
      doc("audited-accounts", "Audited financial statements FY2025", "verified", { issued: "2026-04-28", file: "16-audited-accounts-fy2025.pdf" }),
      doc("website", "Company website", "verified", { url: "silveroak-holdings.example", note: "Matches the stated products and group companies." }),
      doc("sample-contracts", "Sample supply contract and invoices", "received", { issued: "2026-08-19", file: "17-contract-and-invoices.pdf" }),
      doc("regulatory-licence", "Regulatory licence", "not_applicable", { note: "Not a money services or trust business." }),
    ],
  },

  // ----------------------------------------------- 5. money: source and activity
  funds: {
    sourceOfFunds: {
      declared: "Dividends from Eastbridge Trading Ltd and repayment of intra-group loans.",
      supportedBy: ["audited-accounts", "bank-statements-other"],
    },
    sourceOfWealth: [
      {
        personId: "zhang-wei", name: "Zhang Wei",
        declared: "Founder of Eastbridge. Sold a 35% stake in a Shenzhen logistics company in 2017 for about USD 6.2 million.",
        supportedBy: ["sow-zhang-wei"],
      },
      {
        personId: "liu-mei", name: "Liu Mei",
        declared: "Former finance director at a Singapore shipping group. Savings and an inheritance in 2019.",
        supportedBy: [],
      },
    ],
    expectedActivity: {
      monthlyCreditsUsd: 1800000,
      monthlyDebitsUsd: 1650000,
      monthlyTransactions: 60,
      typicalTransactionUsd: { min: 15000, max: 400000 },
      counterpartyCountries: ["Hong Kong", "China", "Singapore", "Vietnam", "United Arab Emirates"],
    },
    observedActivity: {
      note: "Last 6 months at the other bank",
      avgMonthlyCreditsUsd: 1740000,
      counterpartyCountries: ["Hong Kong", "China", "Singapore", "Vietnam"],
    },
    documents: [
      doc("sof-statement", "Source of funds statement", "verified", { issued: "2026-09-12", file: "18-source-of-funds.pdf" }),
      doc("sow-zhang-wei", "Source of wealth evidence: Zhang Wei (share sale agreement)", "received", {
        person: "zhang-wei", issued: "2017-09-08", file: "19-share-sale-agreement-zh.pdf", language: "Chinese", translation: "received",
      }),
      doc("sow-liu-mei", "Source of wealth evidence: Liu Mei", "missing", {
        person: "liu-mei", note: "Higher-risk case: evidence of the 2019 inheritance is needed.",
      }),
      doc("expected-activity", "Expected activity declaration", "verified", { issued: "2026-09-12", file: "20-expected-activity.pdf" }),
      doc("bank-statements-other", "Bank statements from another bank (6 months)", "received", {
        issued: "2026-09-05", file: "21-bank-statements.pdf", period: "2026-03 to 2026-08",
      }),
    ],
  },

  // ------------------------------------------------------- 6. address and presence
  presence: {
    registeredOffice: { address: "Trident Chambers, Road Town, Tortola, BVI", kind: "Registered agent address" },
    businessAddress: { address: "Unit 2305, 23/F, Harbour Centre, 25 Harbour Road, Wan Chai, Hong Kong", kind: "Leased office" },
    operations: {
      employees: 14,
      since: "2019-02",
      evidence: ["Office lease", "Payroll records", "Supplier invoices addressed to the Wan Chai office"],
    },
    documents: [
      doc("proof-registered-office", "Proof of registered office", "verified", {
        issued: "2026-09-10", kind: "Registered agent letter", file: "22-registered-agent-letter.pdf",
      }),
      doc("proof-business-address", "Proof of business address", "verified", {
        issued: "2025-11-01", kind: "Office lease", file: "23-office-lease.pdf",
      }),
      doc("evidence-operations", "Evidence of real operations", "received", {
        issued: "2026-09-12", kind: "Payroll summary and invoices", file: "24-operations-evidence.pdf",
      }),
    ],
  },

  // -------------------------------------------------------- 7. tax and declarations
  declarations: {
    taxResidency: [
      { subject: "Silver Oak Holdings Ltd", kind: "entity", residence: "British Virgin Islands", fatca: "Passive NFFE", crs: "Investment entity" },
      { subject: "Zhang Wei", kind: "person", residence: "Hong Kong", fatca: "Non-US person", crs: "Reportable (Hong Kong)" },
      { subject: "Liu Mei", kind: "person", residence: "Singapore", fatca: "Non-US person", crs: "Reportable (Singapore)" },
    ],
    pep: [
      { personId: "zhang-wei", name: "Zhang Wei", declared: false },
      { personId: "liu-mei", name: "Liu Mei", declared: false },
      { personId: "chen-xiaolin", name: "Chen Xiaolin", declared: false },
    ],
    sanctions: {
      declaredBy: "Zhang Wei",
      signedOn: "2026-09-12",
      statement: "Neither the company, its owners, directors nor its main counterparties are subject to sanctions.",
      exposureCountries: [],
    },
    documents: [
      doc("crs-entity", "FATCA / CRS self-certification: entity", "verified", { issued: "2026-09-12", file: "25-crs-entity.pdf" }),
      doc("crs-zhang-wei", "CRS self-certification: Zhang Wei", "verified", { person: "zhang-wei", issued: "2026-09-12", file: "26-crs-zhang-wei.pdf" }),
      doc("crs-liu-mei", "CRS self-certification: Liu Mei", "received", { person: "liu-mei", issued: "2026-09-14", file: "27-crs-liu-mei.pdf" }),
      doc("pep-declaration", "PEP declaration (all directors and owners)", "received", { issued: "2026-09-12", file: "28-pep-declaration.pdf" }),
      doc("sanctions-declaration", "Sanctions exposure declaration", "verified", { issued: "2026-09-12", file: "29-sanctions-declaration.pdf" }),
    ],
  },

  // -------------------------------------------------- 8. interaction and verification
  verification: {
    certifiedCopies: [
      { documentId: "certificate-of-incorporation", certifiedBy: "Tse & Associates, Solicitors", on: "2026-09-08" },
      { documentId: "id-zhang-wei", certifiedBy: "Tse & Associates, Solicitors", on: "2026-09-08" },
      { documentId: "id-chen-xiaolin", certifiedBy: "Original sighted", on: "2026-09-21" },
    ],
    apostilles: [
      { documentId: "certificate-of-incorporation", apostilled: true },
      { documentId: "certificate-of-incumbency", apostilled: false },
    ],
    interviews: [
      { personId: "zhang-wei", name: "Zhang Wei", mode: "Video", date: "2026-09-29", status: "done" },
      { personId: "chen-xiaolin", name: "Chen Xiaolin", mode: "In person", date: "2026-10-09", status: "scheduled" },
      { personId: "liu-mei", name: "Liu Mei", mode: "Video", date: null, status: "to schedule" },
    ],
    translations: [
      { documentId: "sow-zhang-wei", from: "Chinese", to: "English", status: "received" },
    ],
    documents: [
      doc("certified-copies", "Certified copies of key documents", "received", { note: "3 of 4 certified. Liu Mei's documents are not certified." }),
      doc("apostille", "Apostille (foreign company documents)", "stale", { note: "Incumbency certificate is not apostilled." }),
      doc("interviews", "Director interviews", "pending", { note: "1 of 3 done." }),
      doc("translations", "Translations into English", "received", { note: "Certified translation of the share sale agreement." }),
    ],
  },

  // -------------------------------------------------- what the checks produce
  // Screening of every party in the pack. `match` is a name-similarity score.
  screening: [
    { name: "Silver Oak Holdings Ltd", kind: "company", result: "clear", sanctions: "clear", pep: "n/a" },
    { name: "Jade Crest Holdings Pte Ltd", kind: "company", result: "clear", sanctions: "clear", pep: "n/a" },
    { name: "Eastbridge Trading Ltd", kind: "company", result: "clear", sanctions: "clear", pep: "n/a" },
    { name: "Zhang Wei", kind: "person", result: "clear", sanctions: "clear", pep: "clear" },
    { name: "Liu Mei", kind: "person", result: "clear", sanctions: "clear", pep: "clear" },
    {
      name: "Chen Xiaolin", kind: "person", result: "review", sanctions: "clear", pep: "possible match",
      match: { score: 0.88, listName: "Chen Xiao Lin", detail: "Sample entry: former district council adviser" },
    },
  ],

  // `group` is the key above the finding comes from; `section` is the sidebar
  // section that shows it; `severity` is high | medium | low.
  findings: [
    { id: "f-register-of-members", group: "ownership", section: "ownership", severity: "high", title: "No shareholder register provided", sub: "Expected for a BVI entity. The 70/30 split is only declared in the structure chart." },
    { id: "f-jade-crest-chain", group: "ownership", section: "ownership", severity: "high", title: "Chain above Jade Crest is undocumented", sub: "Its constitution and register of members are still pending, so Liu Mei's 100% is unconfirmed." },
    { id: "f-voting-proxy", group: "ownership", section: "ownership", severity: "medium", title: "Zhang Wei holds a voting proxy over Jade Crest's shares", sub: "Control exceeds his 70% economic interest until 31 Dec 2026." },
    { id: "f-director-overlap", group: "management", section: "ownership", severity: "low", title: "Director also appears in Hong Kong entity", sub: "Zhang Wei is director of Eastbridge Trading Ltd." },
    { id: "f-liu-passport", group: "management", section: "documents", severity: "high", title: "Liu Mei's passport has expired", sub: "Expired 2026-07-30." },
    { id: "f-liu-address", group: "management", section: "documents", severity: "medium", title: "Liu Mei's proof of address is out of date", sub: "Utility bill dated 2026-04-02." },
    { id: "f-incumbency", group: "company", section: "documents", severity: "medium", title: "Certificate of incumbency is older than 3 months", sub: "Issued 2026-05-20 and not apostilled." },
    { id: "f-sow-liu", group: "funds", section: "source-of-funds", severity: "medium", title: "No evidence of Liu Mei's source of wealth", sub: "Inheritance in 2019 is declared but not supported." },
    { id: "f-new-counterparty", group: "funds", section: "source-of-funds", severity: "low", title: "Expected counterparty in a country not seen before", sub: "United Arab Emirates is expected but absent from the last 6 months of statements." },
    { id: "f-pep-hit", group: "declarations", section: "sanctions", severity: "high", title: "Possible PEP match for Chen Xiaolin", sub: "88% similar to a list entry. Declared not a PEP." },
    { id: "f-interviews", group: "verification", section: "documents", severity: "low", title: "2 of 3 director interviews outstanding", sub: "Chen Xiaolin on 2026-10-09. Liu Mei to be scheduled." },
  ],
};

// Every checklist item across the eight groups, each tagged with its group.
export function allDocuments(intake = MOCK_INTAKE) {
  return ["company", "management", "ownership", "business", "funds", "presence", "declarations", "verification"]
    .flatMap((group) => (intake[group]?.documents || []).map((item) => ({ ...item, group })));
}

// How many items are in each status, for the Documents section's summary.
export function documentCounts(intake = MOCK_INTAKE) {
  const counts = Object.fromEntries(DOC_STATUS.map((status) => [status, 0]));
  allDocuments(intake).forEach((item) => { counts[item.status] += 1; });
  return counts;
}
