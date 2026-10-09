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
from fpdf import FPDF

from tally.demo_pack import _find_font

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
        [f"Company: {COMPANY}", f"Registered office: {OFFICE}", "Shows: registered office, directors, shareholders, share capital",
         "Shareholder: Zhang Wei (张伟 / 張偉) | 70 percent",
         "Shareholder: Jade Crest Holdings Pte Ltd (翡翠峰控股私人有限公司) | 30 percent",
         "Name note: The registry holds Zhang Wei under three spellings: Zhang Wei (Pinyin), Cheung Wai (Cantonese, Hong Kong records) and 张伟 (Simplified Chinese)."]),
    doc("04-certificate-of-incumbency.pdf", "certificate-of-incumbency", "company", "Certificate of Incumbency",
        {"Issued": "2026-05-20", "Review": "verified", "Max age months": "3"},
        [f"Company: {COMPANY}", "Certified by the registered agent, Trident Corporate Services Ltd."]),

    # 2. Who runs it
    doc("05-register-of-directors.pdf", "register-of-directors", "management", "Register of Directors and Company Secretary",
        {"Issued": "2026-09-10", "Review": "verified"},
        [
            f"Company: {COMPANY}",
            "Name variants: zhang-wei | 张伟 (Simplified) | 張偉 (Traditional) | Zhang Wei (Pinyin) | Cheung Wai (Cantonese)",
            "Name variants: liu-mei | 刘梅 (Simplified) | 劉梅 (Traditional) | Liu Mei (Pinyin) | Lau Mui (Cantonese)",
            "Name variants: chen-xiaolin | 陈晓琳 (Simplified) | 陳曉琳 (Traditional) | Chen Xiaolin (Pinyin) | Chan Hiu Lam (Cantonese)",
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
        ["PASSPORT BIODATA PAGE", "Name: Zhang Wei", "Chinese name: 张伟", "Pinyin: Zhang Wei", "Also known as: Cheung Wai (張偉, Cantonese, Hong Kong)", "Nationality: China", "Number: EJ4410298"]),
    doc("08-passport-liu-mei.pdf", "id-liu-mei", "management", "Passport: Liu Mei",
        {"Issued": "2016-07-31", "Expires": "2026-07-30", "Review": "verified", "Person": "liu-mei"},
        ["PASSPORT BIODATA PAGE", "Name: Liu Mei", "Chinese name: 刘梅", "Pinyin: Liu Mei", "Also known as: Lau Mui (劉梅, Cantonese)", "Nationality: Singapore", "Number: K7203918A"]),
    doc("09-hkid-chen-xiaolin.pdf", "id-chen-xiaolin", "management", "HKID: Chen Xiaolin",
        {"Review": "verified", "Person": "chen-xiaolin"},
        ["HONG KONG IDENTITY CARD", "Name: CHAN, Hiu Lam", "Chinese name: 陳曉琳", "Pinyin: Chen Xiaolin", "Also known as: Chan Hiu Lam (Cantonese, as printed on HKID)", "Number: Y6620418(3)"]),
    doc("10-address-zhang-wei.pdf", "address-zhang-wei", "management", "Proof of residential address: Zhang Wei",
        {"Issued": "2026-08-14", "Review": "verified", "Person": "zhang-wei", "Kind": "Bank statement", "Max age months": "3"},
        ["Name: CHEUNG Wai (張偉)", "Note: Account holder spelt in Cantonese. Same person as Zhang Wei, passport EJ4410298.", "Address: Flat 12B, 8 Conduit Road, Mid-Levels, Hong Kong"]),
    doc("11-address-liu-mei.pdf", "address-liu-mei", "management", "Proof of residential address: Liu Mei",
        {"Issued": "2026-04-02", "Review": "verified", "Person": "liu-mei", "Kind": "Utility bill", "Max age months": "3"},
        ["Name: Liu Mei (刘梅)", "Address: 41 Cairnhill Road, Singapore"]),
    doc("12-address-chen-xiaolin.pdf", "address-chen-xiaolin", "management", "Proof of residential address: Chen Xiaolin",
        {"Issued": "2026-09-02", "Review": "received", "Person": "chen-xiaolin", "Kind": "Utility bill", "Max age months": "3"},
        ["Name: Chan Hiu Lam (陳曉琳)", "Note: Cantonese spelling of Chen Xiaolin, as on HKID.", "Address: 5 Tai Hang Road, Hong Kong"]),

    # 3. Who owns and controls it
    doc("13-structure-chart.pdf", "structure-chart", "ownership", "Ownership structure chart",
        {"Issued": "2026-09-15", "Review": "received"},
        [
            "Goes up to the two individuals. Percentages are the share a company or person holds in the one it points to.",
            "Note: Chinese names: 东桥贸易有限公司 (Eastbridge Trading Ltd, 東橋貿易有限公司 in Hong Kong), 翡翠峰控股私人有限公司 (Jade Crest).",
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
        ["Note: 投票代理协议 / 投票代理協議. Grantor: Jade Crest Holdings Pte Ltd (翡翠峰控股私人有限公司). Proxy holder: 张伟 (Zhang Wei).",
         "Control: Voting proxy | Zhang Wei | Holds a proxy over the votes attached to Jade Crest's 30 percent until 31 Dec 2026. | disclosed"]),

    # 4. What the business does
    doc("15-business-description.pdf", "business-description", "business", "Description of business activities",
        {"Issued": "2026-09-12", "Review": "verified"},
        [
            "Description: Holds and finances a group that sources and trades industrial components between mainland China, Hong Kong and Southeast Asia.",
            "Note: 业务说明 / 業務說明. 东桥贸易有限公司 (Eastbridge Trading Ltd) 主要从事工业零部件贸易。",
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
        ["股权转让协议", "Note: 本协议由转让方张伟与受让方深圳前海物流有限公司于2017年9月8日签订。",
         "Seller: Zhang Wei (张伟)", "Share transferred: 35 percent", "Price: USD 6,200,000",
         "Note: 转让价款为人民币叁仟捌佰万元整 (RMB 38,000,000), 折合约 USD 6,200,000。转让方身份证明: 护照 EJ4410298。",
         "Note: English summary. The seller 张伟 is the same person as Zhang Wei (Pinyin) and Cheung Wai (Cantonese, 張偉)."]),
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
            "Name resolution: Zhang Wei = 张伟 = 張偉 = Cheung Wai | matched across passport, registry, bank statement and share sale agreement",
            "Name resolution: Liu Mei = 刘梅 = 劉梅 = Lau Mui | matched across passport and Singapore address proof",
            "Name resolution: Chen Xiaolin = 陳曉琳 = Chan Hiu Lam | matched across HKID and director register",
        ]),
]


KEY_LINE = re.compile(r"^[A-Z][A-Za-z ]{1,40}: ")


def render(spec: dict) -> str:
    head = {"Document id": spec["id"], "Group": spec["group"], **spec["head"]}
    top = "\n".join(f"{key}: {value}" for key, value in head.items())
    # Prose becomes a Note line, so a line that wraps in the PDF is the only kind that continues the one before it.
    lines = [line if KEY_LINE.match(line) else f"Note: {line}" for line in spec["lines"]]
    return f"{spec['title'].upper()}\n\n{top}\n\n" + "\n".join(lines)


ISSUER = {
    "company": ("Registry of Corporate Affairs", "British Virgin Islands  |  Road Town, Tortola", "RC"),
    "management": ("Silver Oak Holdings Ltd", "Corporate Records & Company Secretarial", "SO"),
    "ownership": ("Silver Oak Holdings Ltd", "Group Structure Office", "SO"),
    "business": ("Silver Oak Holdings Ltd", "Finance & Operations", "SO"),
    "funds": ("Silver Oak Holdings Ltd", "Finance & Treasury", "SO"),
    "presence": ("Silver Oak Holdings Ltd", "Premises & Operations", "SO"),
    "declarations": ("Silver Oak Holdings Ltd", "Compliance Declarations", "SO"),
    "record": ("Onboarding Team", "Case File & Audit Trail", "OT"),
}
ISSUER_BY_ID = {
    "id-zhang-wei": ("Ministry of Public Security, PRC", "Exit-Entry Administration  |  People's Republic of China", "PRC"),
    "id-liu-mei": ("Immigration & Checkpoints Authority", "Republic of Singapore", "SG"),
    "id-chen-xiaolin": ("Immigration Department", "Hong Kong Special Administrative Region", "HK"),
    "audited-accounts": ("Fong & Partners CPA", "Certified Public Accountants  |  Hong Kong", "FP"),
    "certificate-of-incumbency": ("Trident Corporate Services Ltd", "Registered Agent  |  Road Town, Tortola", "TC"),
    "proof-registered-office": ("Trident Corporate Services Ltd", "Registered Agent  |  Road Town, Tortola", "TC"),
    "proof-business-address": ("Harbour Centre Management Ltd", "Landlord  |  Wan Chai, Hong Kong", "HC"),
    "bank-statements-other": ("Pacific Mercantile Bank", "Corporate Banking  |  Hong Kong", "PM"),
    "sow-zhang-wei": ("Shenzhen Qianhai Notary Office", "深圳前海公证处", "公证"),
}
NAVY = (22, 41, 71)
GOLD = (176, 138, 62)
GREY = (110, 110, 110)
INK = (40, 40, 40)

# Extra supporting content per document. "Key: value" lines are table rows; anything else is prose.
# Only invented keys are used so intake.py ignores them.
EXTRA = {
    "certificate-of-incorporation": [
        "Section: 1. Incorporation",
        "The Registrar of Corporate Affairs certifies that the company named above was incorporated on the date shown and that it is in good standing as at the date of this certificate.",
        "Section: 2. Registered agent",
        "Registered agent: Trident Corporate Services Ltd, Trident Chambers, Road Town, Tortola.",
        "Section: 3. Authority",
        "Issued under section 9 of the BVI Business Companies Act, 2004. Registration of the Memorandum and Articles of Association was completed on the same date.",
        "Registrar: A. Penn | Registrar of Corporate Affairs | Seal affixed",
    ],
    "memorandum-and-articles": [
        "Article one: The name of the company is Silver Oak Holdings Ltd. The company is a company limited by shares.",
        "Article two: The registered office is the office of the registered agent in the British Virgin Islands.",
        "Article three: The company may carry on any business or activity not prohibited by BVI law, with the primary object of investment holding.",
        "Article four: Each share carries one vote and an equal right to dividends and to assets on winding up.",
        "Article five: Directors may exercise all powers of the company. Transfers of shares need a resolution of the board.",
        "Article six: Two directors must sign any instrument above the board's delegated limit.",
        "Subscribers: Zhang Wei (张伟) | 35,000 shares; Jade Crest Holdings Pte Ltd | 15,000 shares",
    ],
    "registry-extract": [
        "Extract status: Active, in good standing. No charges registered. No winding-up proceedings.",
        "Filing history: 2018-03-12 Incorporation | 2022-06-01 Appointment of director Chen Xiaolin | 2025-12-01 Proxy filing noted",
        "Search reference: BVI-2034507-0910 | Searched by Onboarding Team | 2026-09-10 14:22 HKT",
    ],
    "certificate-of-incumbency": [
        "Statement: The registered agent certifies that the persons named in the register of directors are the current directors and that the shareholders named are the registered holders.",
        "Signed: Authorised signatory, Trident Corporate Services Ltd | 2026-05-20",
        "Validity: This certificate is valid for three months from the date of issue.",
    ],
    "register-of-directors": [
        "Statement: Entries are kept under section 118 of the BVI Business Companies Act. Name variants are recorded where an individual is known by more than one spelling.",
        "Signed: Secretary, Trident Corporate Services Ltd | 2026-09-10",
    ],
    "board-resolution": [
        "Recital: A meeting of the board of directors of Silver Oak Holdings Ltd was held on 12 September 2026, at which a quorum was present throughout.",
        "Resolved one: That the company open a corporate account with the bank and that the account be operated as set out in this resolution.",
        "Resolved two: That the signatories named below are authorised to give instructions on the account within the limits stated.",
        "Resolved three: That the secretary certify this resolution and deliver it to the bank.",
        "Signed: Zhang Wei (张伟) | Director | Specimen signature on file",
        "Signed: Chen Xiaolin (陳曉琳) | Director | Specimen signature on file",
    ],
    "id-zhang-wei": [
        "Surname: ZHANG",
        "Given names: WEI",
        "Date of birth: 1971-05-06 | Place of birth: Shenzhen, Guangdong",
        "Sex: M | Authority: 公安部出入境管理局 | National ID: 4403************18",
        "MRZ line one: P<CHNZHANG<<WEI<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
        "MRZ line two: EJ44102983CHN7105069M3011144<<<<<<<<<<<<<<04",
    ],
    "id-liu-mei": [
        "Surname: LIU",
        "Given names: MEI",
        "Date of birth: 1976-02-19 | Place of birth: Singapore",
        "Sex: F | Authority: ICA Singapore",
        "MRZ line one: P<SGPLIU<<MEI<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
        "MRZ line two: K7203918A5SGP7602193F2607307<<<<<<<<<<<<<<06",
        "Alert: This passport expired on 2026-07-30. A renewed passport has been requested.",
    ],
    "id-chen-xiaolin": [
        "Date of birth: 1984-09-23 | Sex: F | Symbols: ***AZ",
        "Date of issue of the card: 2019-06-11 | Permanent resident: yes",
        "Surname in Chinese: 陳 | Given name in Chinese: 曉琳 | Telecode: 7115 2556 3655",
    ],
    "address-zhang-wei": [
        "Statement period: 2026-07-14 to 2026-08-13 | Account: Pacific Mercantile Bank personal current account ending 4417",
        "Opening balance: HKD 1,284,210.50",
        "Entry: 2026-07-21 | Salary credit, Eastbridge Trading Ltd | HKD 185,000.00",
        "Entry: 2026-08-02 | Management fee, Conduit Road estate | HKD -12,800.00",
        "Closing balance: HKD 1,501,640.20",
    ],
    "address-liu-mei": [
        "Bill period: 2026-02-18 to 2026-03-17 | Account no: 2210-8841-07 | Amount due: SGD 148.35",
        "Service address: 41 Cairnhill Road, Singapore 229660",
    ],
    "address-chen-xiaolin": [
        "Bill period: 2026-08-01 to 2026-08-31 | Account no: 66-310942-8 | Amount due: HKD 612.40",
        "Supply address: 5 Tai Hang Road, Hong Kong",
    ],
    "structure-chart": [
        "Legend: up arrows lead to the individuals who ultimately own the applicant. Down arrows show the subsidiaries it owns.",
        "Check one: Zhang Wei holds 70 percent directly. Liu Mei holds 100 percent of Jade Crest, giving her 30 percent indirectly.",
        "Check two: Jade Crest's 30 percent carries votes that are exercised by Zhang Wei under a proxy until 31 Dec 2026.",
        "Prepared by: Group Structure Office | Approved by: Zhang Wei | 2026-09-15",
    ],
    "voting-proxy": [
        "Recital: Jade Crest Holdings Pte Ltd is the registered holder of 15,000 ordinary shares in Silver Oak Holdings Ltd, being 30 percent of the issued share capital.",
        "Grant: Jade Crest appoints Zhang Wei as its proxy to attend, speak and vote at all general meetings and on all written resolutions.",
        "Term: From 1 December 2025 until 31 December 2026, unless revoked in writing.",
        "Economic rights: Dividends and capital remain with Jade Crest and its owner, Liu Mei.",
        "Signed: Liu Mei (刘梅), for Jade Crest Holdings Pte Ltd | 2025-12-01",
        "Signed: Zhang Wei (张伟), as proxy | 2025-12-01",
    ],
    "business-description": [
        "Group overview: Silver Oak Holdings Ltd is the parent of three operating groups: Eastbridge (trading), Maple (treasury) and Northern Capital (investments).",
        "Revenue split: Industrial fasteners 46 percent | Bearings and seals 38 percent | Treasury income 16 percent",
        "Markets: Hong Kong 38 percent | China 34 percent | Singapore 19 percent | Other 9 percent",
    ],
    "audited-accounts": [
        "Opinion: In our opinion the financial statements give a true and fair view of the company's financial position as at 31 December 2025.",
        "Income statement: Revenue | USD 24,800,000 | prior year USD 21,950,000",
        "Income statement: Net profit | USD 1,920,000 | prior year USD 1,610,000",
        "Balance sheet: Total assets | USD 31,400,000 | prior year USD 28,730,000",
        "Balance sheet: Total liabilities | USD 12,950,000 | prior year USD 12,100,000",
        "Cash flow: Net cash from operations | USD 2,340,000",
        "Related parties: Loans to Eastbridge Trading Ltd of USD 3,100,000 are repayable on demand.",
        "Signed: Fong & Partners CPA, Hong Kong | 2026-04-28",
    ],
    "sample-contracts": [
        "Contract: Supply of industrial fasteners | Eastbridge Trading Ltd to Kowloon Precision Works Ltd | 12 months from 2026-01-01",
        "Invoice: INV-20260307 | 2026-03-07 | USD 412,000.00 | paid",
        "Invoice: INV-20260512 | 2026-05-12 | USD 388,500.00 | paid",
        "Invoice: INV-20260718 | 2026-07-18 | USD 436,200.00 | paid",
        "Terms: Net 45 days. Goods shipped from Ningbo to Hong Kong, FOB.",
    ],
    "sof-statement": [
        "Statement: The company confirms that all funds to be held in the account derive from the sources stated above.",
        "Signed: Zhang Wei (张伟), Director | 2026-09-12",
    ],
    "sow-zhang-wei": [
        "Notarial: 本公证书证明上述股权转让协议的签署人张伟为本人，签署行为真实有效。",
        "Notarial: This notarial certificate confirms that the signatory 张伟 (Zhang Wei) signed in person and the translation is faithful.",
        "Seal: 深圳前海公证处 | Notary 李国强 | 2017-09-08",
    ],
    "expected-activity": [
        "Declaration: The figures above are our best estimate of activity over the next twelve months and will be reviewed at each periodic review.",
        "Signed: Zhang Wei (张伟), Director | 2026-09-12",
    ],
    "bank-statements-other": [
        "Entry: 2026-03-04 | Credit | Kowloon Precision Works Ltd, Hong Kong | USD 412,000.00",
        "Entry: 2026-03-19 | Debit | Ningbo Hengda Metal Products Co, China | USD 355,000.00",
        "Entry: 2026-04-08 | Credit | Lion City Machinery Pte Ltd, Singapore | USD 298,400.00",
        "Entry: 2026-05-14 | Debit | Suzhou Ruiyi Bearings Co, China | USD 241,900.00",
        "Entry: 2026-06-02 | Credit | Pearl Delta Engineering Co, China | USD 276,000.00",
        "Entry: 2026-08-21 | Credit | Kowloon Precision Works Ltd, Hong Kong | USD 436,200.00",
    ],
    "proof-registered-office": [
        "Statement: Trident Corporate Services Ltd confirms it acts as registered agent and that the address above is the registered office of the company.",
    ],
    "proof-business-address": [
        "Lease: Unit 2305, 23/F, Harbour Centre | Term: 2025-11-01 to 2028-10-31 | Monthly rent: HKD 118,000",
        "Tenant: Silver Oak Holdings Ltd (Hong Kong place of business) | Landlord: Harbour Centre Management Ltd",
        "Signed: For the landlord | For the tenant, Zhang Wei (张伟) | 2025-10-20",
    ],
    "evidence-operations": [
        "Payroll: 14 employees across finance, sales and logistics | Monthly payroll HKD 612,000",
        "Premises: Wan Chai office with reception, three meeting rooms and a stock room",
    ],
    "crs-entity": [
        "Declaration: I declare that the information given is correct and complete.",
        "Signed: Zhang Wei (张伟), Director | 2026-09-12",
    ],
    "crs-zhang-wei": [
        "Tax identification number: HKID-based | Country of birth: China | Date of birth: 1971-05-06",
        "Signed: Zhang Wei (张伟) | 2026-09-12",
    ],
    "crs-liu-mei": [
        "Tax identification number: SG-NRIC-based | Country of birth: Singapore | Date of birth: 1976-02-19",
        "Signed: Liu Mei (刘梅) | 2026-09-14",
    ],
    "pep-declaration": [
        "Question: Is the person, or a close family member or associate, a politically exposed person? Answer recorded above for each person.",
        "Signed: Zhang Wei (张伟) for all three persons | 2026-09-12",
    ],
    "sanctions-declaration": [
        "Counterparties: Kowloon Precision Works Ltd, Lion City Machinery Pte Ltd, Pearl Delta Engineering Co, Ningbo Hengda Metal Products Co, Suzhou Ruiyi Bearings Co",
        "Signed: Zhang Wei (张伟) | 2026-09-12",
    ],
    "verification-log": [
        "Reviewer: KYC analyst | Log opened 2026-09-21 | Last updated 2026-09-29",
        "Open point: Liu Mei's passport is expired and her documents are not certified.",
    ],
    "onboarding-tracker": [
        "Status: Awaiting Jade Crest constitution and register of members; one interview outstanding.",
    ],
}

STAMP = {"verified": ("VERIFIED", (30, 120, 70)), "received": ("RECEIVED", (176, 110, 30))}


def _write_styled_pdf(path: Path, spec: dict) -> None:
    """A letterhead-style document. Every `Key: value` line stays on one text row so intake.py can read it back.
    Decoration is drawn as shapes, never as loose text between key lines."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=24)
    pdf.add_font("Body", "", _find_font())
    left, width = 18, 174
    pdf.set_margins(left, 16, 18)
    issuer = ISSUER_BY_ID.get(spec["id"]) or ISSUER.get(spec["group"], (COMPANY, "", "SO"))
    status = spec["head"].get("Review", "")

    def guilloche(x, y, w, h):
        pdf.set_draw_color(232, 226, 212)
        pdf.set_line_width(0.15)
        for i in range(0, int(w), 3):
            pdf.line(x + i, y, x + w - i, y + h)
        pdf.set_line_width(0.2)

    def page_frame():
        pdf.set_fill_color(*NAVY)
        pdf.rect(0, 0, 210, 30, "F")
        pdf.set_fill_color(*GOLD)
        pdf.rect(0, 30, 210, 1.2, "F")
        # crest
        pdf.set_draw_color(214, 190, 130)
        pdf.set_line_width(0.6)
        pdf.ellipse(left, 6, 18, 18)
        pdf.ellipse(left + 1.5, 7.5, 15, 15)
        pdf.set_font("Body", size=8)
        pdf.set_text_color(214, 190, 130)
        pdf.set_xy(left, 13.5)
        pdf.cell(18, 4, issuer[2], align="C")
        pdf.set_xy(left + 24, 8)
        pdf.set_font("Body", size=14)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(120, 7, issuer[0])
        pdf.set_xy(left + 24, 16)
        pdf.set_font("Body", size=8)
        pdf.set_text_color(214, 190, 130)
        pdf.cell(120, 5, issuer[1])
        pdf.set_xy(left + 24, 22)
        pdf.cell(120, 4, "OFFICIAL RECORD  |  CONFIDENTIAL  |  FOR ONBOARDING USE")
        pdf.set_line_width(0.2)
        # border
        pdf.set_draw_color(*GOLD)
        pdf.rect(8, 36, 194, 250)
        pdf.set_draw_color(220, 210, 185)
        pdf.rect(9.5, 37.5, 191, 247)

    pdf.add_page()
    page_frame()
    guilloche(150, 270, 40, 12)
    pdf.set_xy(left, 40)
    pdf.set_text_color(*NAVY)
    pdf.set_font("Body", size=17)
    pdf.multi_cell(width - 36, 8, spec["title"])
    # stamp (shape plus short text, drawn beside the title, above all key rows)
    label, colour = STAMP.get(status, ("ON FILE", (90, 90, 120)))
    pdf.set_draw_color(*colour)
    pdf.set_line_width(0.7)
    pdf.rect(left + width - 32, 38, 32, 11)
    pdf.set_xy(left + width - 32, 41.5)
    pdf.set_font("Body", size=9)
    pdf.set_text_color(*colour)
    pdf.cell(32, 4, label, align="C")
    pdf.set_line_width(0.2)
    pdf.set_y(max(pdf.get_y(), 52) + 2)

    def row(key, value, control=False, prose=False):
        pdf.set_x(left + 3)
        if control:
            pdf.set_font("Body", size=9)
            pdf.set_text_color(*GREY)
        else:
            pdf.set_font("Body", size=10.5)
            pdf.set_text_color(*NAVY)
        pdf.cell(64, 6, f"{key}:")
        pdf.set_text_color(*INK)
        pdf.set_font("Body", size=9 if control else 10.5)
        pdf.multi_cell(width - 70, 6, value)
        if not control:
            pdf.set_draw_color(228, 228, 228)
            pdf.line(left + 3, pdf.get_y() + 0.5, left + width - 3, pdf.get_y() + 0.5)
            pdf.ln(1)

    head = {"Document id": spec["id"], "Group": spec["group"], **spec["head"]}
    top = pdf.get_y()
    pdf.set_fill_color(246, 243, 236)
    pdf.rect(left + 3, top, width - 6, 6 * len(head) + 4, "F")
    pdf.set_y(top + 2)
    for key, value in head.items():
        row(key, value, control=True)
    pdf.ln(6)

    extra = EXTRA.get(spec["id"], [])
    for line in spec["lines"] + extra:
        if KEY_LINE.match(line):
            key, value = line.split(": ", 1)
        else:
            key, value = "Note", line
        row(key, value)

    # Footer on every page, as keyed rows so it never joins a value above it
    total = pdf.page_no()
    for number in range(1, total + 1):
        pdf.page = number
        pdf.set_y(-30)
        pdf.set_draw_color(*GOLD)
        pdf.line(left, pdf.get_y(), left + width, pdf.get_y())
        pdf.ln(2)
        pdf.set_x(left)
        pdf.set_font("Body", size=8)
        pdf.set_text_color(*GREY)
        pdf.cell(width, 4.5, f"Footer: {COMPANY}  |  Case KYC-2026-0412  |  Ref {spec['id']}  |  Page {number} of {total}")
        pdf.ln(4.5)
        pdf.set_x(left)
        pdf.cell(width, 4.5, "Disclaimer: Part of the onboarding pack. Synthetic demo data: no real persons or entities.")
    pdf.output(path)


def write_pack(folder: Path = PACK_DIR) -> list[Path]:
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("*.pdf"):
        old.unlink()
    paths = []
    for spec in PACK:
        path = folder / spec["file"]
        _write_styled_pdf(path, spec)
        paths.append(path)
    return paths


if __name__ == "__main__":
    print(f"Wrote {len(write_pack())} PDFs to {PACK_DIR}")
