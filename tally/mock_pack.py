"""The mock Silver Oak Holdings onboarding pack: invented company, invented people.

Run `python -m tally.mock_pack` to write the PDFs to demo/demo-docs/silver-oak-pack/.
tally/intake.py reads them back. Every fact a screen shows has to be written
here, in a line the reader understands:

  Key: value                      one value
  Key: a | b | c                  several fields, in the order intake.py expects

Documents have a "Document id" that matches data/checklist.json. Checklist items
that are not a file of their own (not applicable, requested, a website) are
listed in the onboarding tracker.
"""
import re
from pathlib import Path

from tally.config import ROOT
from tally.demo_pack import _write_pdf

PACK_DIR = ROOT / "demo" / "demo-docs" / "silver-oak-pack"
COMPANY = "Silver Oak Holdings Ltd"
OFFICE = "Trident Chambers, Road Town, Tortola, BVI"
HK_OFFICE = "Unit 2305, 23/F, Harbour Centre, 25 Harbour Road, Wan Chai, Hong Kong"
SIGNING = "Either to sign up to USD 250,000; jointly above"


def doc(file, doc_id, group, title, head=None, lines=None):
    return {"file": file, "id": doc_id, "group": group, "title": title, "head": head or {}, "lines": lines or []}


PACK = [
    doc("00-onboarding-tracker.pdf", "onboarding-tracker", "record", "Onboarding tracker",
        {"Case reference": "KYC-2026-0412", "Case date": "2026-10-04", "Received on": "2026-09-21", "Beneficial owner threshold percent": "25"},
        [
            "Checklist items that are not a file of their own. Items absent from both the pack and this list are missing.",
            "Item: certificate-of-change-of-name | not_applicable | | No change of name since incorporation.",
            "Item: business-registration-certificate | not_applicable | | The applicant is not registered in Hong Kong. Its subsidiary Eastbridge Trading Ltd holds BR 71420385.",
            "Item: jade-crest-constitution | pending | jade-crest | Requested 2026-09-22.",
            "Item: jade-crest-register | pending | jade-crest | Requested 2026-09-22. Needed to confirm Liu Mei holds 100 percent.",
            "Item: website | verified | | silveroak-holdings.example matches the stated products and group companies.",
            "Item: regulatory-licence | not_applicable | | Not a money services or trust business.",
            "Item: certified-copies | received | | 3 of 4 certified. Liu Mei's documents are not certified.",
            "Item: apostille | stale | | Incumbency certificate is not apostilled.",
            "Item: interviews | pending | | 1 of 3 done.",
            "Item: translations | received | | Certified translation of the share sale agreement.",
        ]),

    # 1. The company itself
    doc("01-certificate-of-incorporation.pdf", "certificate-of-incorporation", "company", "Certificate of Incorporation",
        {"Issued": "2018-03-12", "Review": "verified", "Apostilled": "yes"},
        [
            f"Company: {COMPANY}",
            "Company number: 2034507",
            "Jurisdiction: British Virgin Islands",
            "Entity type: Holding Company",
            "Date of incorporation: 2018-03-12",
            f"Registered office: {OFFICE}",
            "Business activity: Investment holding",
            "Share capital: USD | 50000 | 50000 | 50000",
            "This certifies that the company is incorporated under the BVI Business Companies Act.",
        ]),
    doc("02-memorandum-and-articles.pdf", "memorandum-and-articles", "company", "Memorandum & Articles of Association",
        {"Issued": "2018-03-12", "Review": "verified"},
        [f"Company: {COMPANY}", "Authorised capital: USD 50,000 divided into 50,000 shares of USD 1 each."]),
    doc("03-registry-extract.pdf", "registry-extract", "company", "Company registry extract",
        {"Issued": "2026-09-10", "Review": "verified"},
        [f"Company: {COMPANY}", f"Registered office: {OFFICE}", "Shows: registered office, directors, shareholders, share capital"]),
    doc("04-certificate-of-incumbency.pdf", "certificate-of-incumbency", "company", "Certificate of Incumbency",
        {"Issued": "2026-05-20", "Review": "verified", "Max age months": "3"},
        [f"Company: {COMPANY}", "Certified by the registered agent, Trident Corporate Services Ltd."]),

    # 2. Who runs it
    doc("05-register-of-directors.pdf", "register-of-directors", "management", "Register of Directors and Company Secretary",
        {"Issued": "2026-09-10", "Review": "verified"},
        [
            f"Company: {COMPANY}",
            "Director: zhang-wei | Zhang Wei | Director | China | Hong Kong | 2018-03-12",
            "Director: liu-mei | Liu Mei | Director | Singapore | Singapore | 2018-03-12",
            "Director: chen-xiaolin | Chen Xiaolin | Director | Hong Kong | Hong Kong | 2022-06-01",
            "Secretary: Trident Corporate Services Ltd | company | British Virgin Islands",
            "Other directorship: zhang-wei | Eastbridge Trading Ltd",
        ]),
    doc("06-board-resolution.pdf", "board-resolution", "management", "Board resolution authorizing the account",
        {"Issued": "2026-09-12", "Review": "verified"},
        [
            f"Company: {COMPANY}",
            "The board resolves to open an account and names two authorized signatories with specimen signatures.",
            f"Signatory: zhang-wei | Zhang Wei | {SIGNING} | yes",
            f"Signatory: chen-xiaolin | Chen Xiaolin | {SIGNING} | yes",
        ]),
    doc("07-passport-zhang-wei.pdf", "id-zhang-wei", "management", "Passport: Zhang Wei",
        {"Issued": "2020-11-15", "Expires": "2030-11-14", "Review": "verified", "Person": "zhang-wei"},
        ["PASSPORT BIODATA PAGE", "Name: Zhang Wei", "Number: EJ4410298"]),
    doc("08-passport-liu-mei.pdf", "id-liu-mei", "management", "Passport: Liu Mei",
        {"Issued": "2016-07-31", "Expires": "2026-07-30", "Review": "verified", "Person": "liu-mei"},
        ["PASSPORT BIODATA PAGE", "Name: Liu Mei", "Number: K7203918A"]),
    doc("09-hkid-chen-xiaolin.pdf", "id-chen-xiaolin", "management", "HKID: Chen Xiaolin",
        {"Review": "verified", "Person": "chen-xiaolin"},
        ["HONG KONG IDENTITY CARD", "Name: Chen Xiaolin", "Number: Y6620418(3)"]),
    doc("10-address-zhang-wei.pdf", "address-zhang-wei", "management", "Proof of residential address: Zhang Wei",
        {"Issued": "2026-08-14", "Review": "verified", "Person": "zhang-wei", "Kind": "Bank statement", "Max age months": "3"},
        ["Name: Zhang Wei", "Address: Flat 12B, 8 Conduit Road, Mid-Levels, Hong Kong"]),
    doc("11-address-liu-mei.pdf", "address-liu-mei", "management", "Proof of residential address: Liu Mei",
        {"Issued": "2026-04-02", "Review": "verified", "Person": "liu-mei", "Kind": "Utility bill", "Max age months": "3"},
        ["Name: Liu Mei", "Address: 41 Cairnhill Road, Singapore"]),
    doc("12-address-chen-xiaolin.pdf", "address-chen-xiaolin", "management", "Proof of residential address: Chen Xiaolin",
        {"Issued": "2026-09-02", "Review": "received", "Person": "chen-xiaolin", "Kind": "Utility bill", "Max age months": "3"},
        ["Name: Chen Xiaolin", "Address: 5 Tai Hang Road, Hong Kong"]),

    # 3. Who owns and controls it
    doc("13-structure-chart.pdf", "structure-chart", "ownership", "Ownership structure chart",
        {"Issued": "2026-09-15", "Review": "received"},
        [
            "Goes up to the two individuals. Percentages are the share a company or person holds in the one it points to.",
            "Node: up | ubo-zhang-wei | applicant | person | Zhang Wei | China | - | 70 | UBO",
            "Node: up | jade-crest | applicant | company | Jade Crest Holdings Pte Ltd | Singapore | Shareholder | 30 | -",
            "Node: up | ubo-liu-mei | jade-crest | person | Liu Mei | Singapore | - | 100 | UBO",
            "Node: down | eastbridge | applicant | company | Eastbridge Trading Ltd | Hong Kong | Trading Company | 100 | -",
            "Node: down | eastbridge-hk | eastbridge | company | Eastbridge HK Branch | Hong Kong | Branch | 100 | -",
            "Node: down | eastbridge-sh | eastbridge | company | Eastbridge SH Rep. Office | China | Representative Office | 100 | -",
            "Node: down | maple | applicant | company | Maple Finance Pte Ltd | Singapore | Treasury Company | 100 | -",
            "Node: down | maple-us | maple | company | Maple US Inc | USA | Operating Company | 100 | -",
            "Node: down | northern | applicant | company | Northern Capital Ltd | United Kingdom | Investment Company | 100 | -",
            "Node: down | nc-real-estate | northern | company | NC Real Estate LLC | USA | Property Holding | 100 | -",
        ]),
    doc("14-voting-proxy.pdf", "voting-proxy", "ownership", "Voting proxy agreement (Jade Crest shares)",
        {"Issued": "2025-12-01", "Review": "received"},
        ["Control: Voting proxy | Zhang Wei | Holds a proxy over the votes attached to Jade Crest's 30 percent until 31 Dec 2026. | disclosed"]),

    # 4. What the business does
    doc("15-business-description.pdf", "business-description", "business", "Description of business activities",
        {"Issued": "2026-09-12", "Review": "verified"},
        [
            "Description: Holds and finances a group that sources and trades industrial components between mainland China, Hong Kong and Southeast Asia.",
            "Product: Industrial fasteners",
            "Product: Bearings and seals",
            "Product: Treasury and intra-group financing",
            "Customer: Kowloon Precision Works Ltd | Hong Kong | 24",
            "Customer: Lion City Machinery Pte Ltd | Singapore | 19",
            "Customer: Pearl Delta Engineering Co | China | 15",
            "Supplier: Ningbo Hengda Metal Products Co | China | 41",
            "Supplier: Suzhou Ruiyi Bearings Co | China | 22",
            "Licence note: No regulatory licence needed for this activity.",
        ]),
    doc("16-audited-accounts-fy2025.pdf", "audited-accounts", "business", "Audited financial statements FY2025",
        {"Issued": "2026-04-28", "Review": "verified"},
        [f"Company: {COMPANY}", "Financials: Audited | FY2025 | 2025 | Fong & Partners CPA | 24800000 | 1920000 | 31400000"]),
    doc("17-contract-and-invoices.pdf", "sample-contracts", "business", "Sample supply contract and invoices",
        {"Issued": "2026-08-19", "Review": "received"},
        ["Supply contract between Eastbridge Trading Ltd and Kowloon Precision Works Ltd, with three invoices."]),

    # 5. Source and expected activity
    doc("18-source-of-funds.pdf", "sof-statement", "funds", "Source of funds statement",
        {"Issued": "2026-09-12", "Review": "verified"},
        [
            "Declared source of funds: Dividends from Eastbridge Trading Ltd and repayment of intra-group loans.",
            "Supported by: audited-accounts, bank-statements-other",
            "Source of wealth: zhang-wei | Zhang Wei | Founder of Eastbridge. Sold a 35 percent stake in a Shenzhen logistics company in 2017 for about USD 6.2 million. | sow-zhang-wei",
            "Source of wealth: liu-mei | Liu Mei | Former finance director at a Singapore shipping group. Savings and an inheritance in 2019. | -",
        ]),
    doc("19-share-sale-agreement-zh.pdf", "sow-zhang-wei", "funds", "Source of wealth evidence: Zhang Wei (share sale agreement)",
        {"Issued": "2017-09-08", "Review": "received", "Person": "zhang-wei", "Language": "Chinese"},
        ["股权转让协议", "Seller: Zhang Wei (张伟)", "Share transferred: 35 percent", "Price: USD 6,200,000"]),
    doc("20-expected-activity.pdf", "expected-activity", "funds", "Expected activity declaration",
        {"Issued": "2026-09-12", "Review": "verified"},
        [
            "Expected monthly credits USD: 1800000",
            "Expected monthly debits USD: 1650000",
            "Expected monthly transactions: 60",
            "Typical transaction USD: 15000 | 400000",
            "Counterparty countries: Hong Kong, China, Singapore, Vietnam, United Arab Emirates",
        ]),
    doc("21-bank-statements.pdf", "bank-statements-other", "funds", "Bank statements from another bank (6 months)",
        {"Issued": "2026-09-05", "Review": "received"},
        [
            "Period: 2026-03 to 2026-08",
            "Observed: Last 6 months at the other bank",
            "Average monthly credits USD: 1740000",
            "Observed counterparty countries: Hong Kong, China, Singapore, Vietnam",
        ]),

    # 6. Address and presence
    doc("22-registered-agent-letter.pdf", "proof-registered-office", "presence", "Proof of registered office",
        {"Issued": "2026-09-10", "Review": "verified", "Kind": "Registered agent letter"},
        [f"Registered office: {OFFICE}"]),
    doc("23-office-lease.pdf", "proof-business-address", "presence", "Proof of business address",
        {"Issued": "2025-11-01", "Review": "verified", "Kind": "Office lease"},
        [f"Business address: {HK_OFFICE}", "Kind of premises: Leased office"]),
    doc("24-operations-evidence.pdf", "evidence-operations", "presence", "Evidence of real operations",
        {"Issued": "2026-09-12", "Review": "received", "Kind": "Payroll summary and invoices"},
        [
            "Employees: 14",
            "Operating since: 2019-02",
            "Evidence: Office lease",
            "Evidence: Payroll records",
            "Evidence: Supplier invoices addressed to the Wan Chai office",
        ]),

    # 7. Tax and declarations
    doc("25-crs-entity.pdf", "crs-entity", "declarations", "FATCA / CRS self-certification: entity",
        {"Issued": "2026-09-12", "Review": "verified"},
        [f"Tax residency: {COMPANY} | entity | British Virgin Islands | Passive NFFE | Investment entity"]),
    doc("26-crs-zhang-wei.pdf", "crs-zhang-wei", "declarations", "CRS self-certification: Zhang Wei",
        {"Issued": "2026-09-12", "Review": "verified", "Person": "zhang-wei"},
        ["Tax residency: Zhang Wei | person | Hong Kong | Non-US person | Reportable (Hong Kong)"]),
    doc("27-crs-liu-mei.pdf", "crs-liu-mei", "declarations", "CRS self-certification: Liu Mei",
        {"Issued": "2026-09-14", "Review": "received", "Person": "liu-mei"},
        ["Tax residency: Liu Mei | person | Singapore | Non-US person | Reportable (Singapore)"]),
    doc("28-pep-declaration.pdf", "pep-declaration", "declarations", "PEP declaration (all directors and owners)",
        {"Issued": "2026-09-12", "Review": "received"},
        [
            "PEP declaration: zhang-wei | Zhang Wei | no",
            "PEP declaration: liu-mei | Liu Mei | no",
            "PEP declaration: chen-xiaolin | Chen Xiaolin | no",
        ]),
    doc("29-sanctions-declaration.pdf", "sanctions-declaration", "declarations", "Sanctions exposure declaration",
        {"Issued": "2026-09-12", "Review": "verified"},
        [
            "Declared by: Zhang Wei",
            "Signed on: 2026-09-12",
            "Statement: Neither the company, its owners, directors nor its main counterparties are subject to sanctions.",
            "Exposure countries: none",
        ]),

    # 8. Interaction and verification
    doc("30-verification-log.pdf", "verification-log", "record", "Verification log",
        {"Issued": "2026-09-29"},
        [
            "Certified copy: certificate-of-incorporation | Tse & Associates, Solicitors | 2026-09-08",
            "Certified copy: id-zhang-wei | Tse & Associates, Solicitors | 2026-09-08",
            "Certified copy: id-chen-xiaolin | Original sighted | 2026-09-21",
            "Apostille: certificate-of-incorporation | yes",
            "Apostille: certificate-of-incumbency | no",
            "Interview: zhang-wei | Zhang Wei | Video | 2026-09-29 | done",
            "Interview: chen-xiaolin | Chen Xiaolin | In person | 2026-10-09 | scheduled",
            "Interview: liu-mei | Liu Mei | Video | - | to schedule",
            "Translation: sow-zhang-wei | Chinese | English | received",
        ]),
]


KEY_LINE = re.compile(r"^[A-Z][A-Za-z ]{1,40}: ")


def render(spec: dict) -> str:
    head = {"Document id": spec["id"], "Group": spec["group"], **spec["head"]}
    top = "\n".join(f"{key}: {value}" for key, value in head.items())
    # Prose becomes a Note line, so a line that wraps in the PDF is the only kind that continues the one before it.
    lines = [line if KEY_LINE.match(line) else f"Note: {line}" for line in spec["lines"]]
    return f"{spec['title'].upper()}\n\n{top}\n\n" + "\n".join(lines)


def write_pack(folder: Path = PACK_DIR) -> list[Path]:
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("*.pdf"):
        old.unlink()
    paths = []
    for spec in PACK:
        path = folder / spec["file"]
        _write_pdf(path, render(spec))
        paths.append(path)
    return paths


if __name__ == "__main__":
    print(f"Wrote {len(write_pack())} PDFs to {PACK_DIR}")
