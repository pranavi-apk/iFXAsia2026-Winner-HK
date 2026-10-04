from pathlib import Path

from fpdf import FPDF

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "C:/Windows/Fonts/msyh.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
]


def _find_font() -> str:
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return candidate
    raise FileNotFoundError("No Unicode font with Chinese glyphs found. Add one to FONT_CANDIDATES in tally/demo_pack.py.")

PACK = {
    "01-certificate-of-incorporation.pdf": """CERTIFICATE OF INCORPORATION

Harbour Lantern Trading Limited
BVI Company Number: 1982746
Jurisdiction: British Virgin Islands
Date of incorporation: 12 March 2019
Registered office: Ritter House, Wickhams Cay II, Road Town, Tortola, British Virgin Islands

This certifies that Harbour Lantern Trading Limited is incorporated under the BVI Business Companies Act.
""",
    "02-register-of-directors.pdf": """REGISTER OF DIRECTORS
Company: Harbour Lantern Trading Limited
Company number: 1982746

Director 1
Name: Wei Chen
Chinese name: 陈伟
Nationality: Hong Kong
Residential address: 18 Connaught Road Central, Hong Kong
Date appointed: 12 March 2019

Director 2
Name: Li Ming
Chinese name: 李明
Also known as: Lee Ming
Nationality: Hong Kong
Residential address: 88 Queen's Road Central, Hong Kong
Date appointed: 2 June 2021
""",
    "03-declaration-of-ownership.pdf": """DECLARATION OF OWNERSHIP
Company: Harbour Lantern Trading Limited

The following persons and entities own the company:

1. Wei Chen — 60 percent. Natural person.
2. Northwind Holdings Limited — 40 percent. Company incorporated in the British Virgin Islands.

Northwind Holdings Limited is understood to be wholly owned by Soren Halek, a national of Russia. The register of members of Northwind Holdings Limited is not attached to this declaration.

Declared by the company secretary on 3 January 2026.
""",
    "04-ownership-schedule-zh.pdf": """股权结构说明
公司: Harbour Lantern Trading Limited
公司编号: 1982746

股东如下:
1. 陈伟 (Wei Chen) — 40 percent
2. 李明 (Li Ming, also known as Lee Ming) — 20 percent
3. Northwind Holdings Limited — 40 percent

本文件与英文所有权声明同时提交。
日期: 3 January 2026
""",
    "05-proof-of-address.pdf": """PROOF OF ADDRESS
Utility statement

Account name: Harbour Lantern Trading Limited
Service address: 88 Queen's Road Central, Hong Kong
Statement date: 2 September 2026

This statement shows the service address of the account holder.
""",
    "06-source-of-funds.pdf": """SOURCE OF FUNDS AND BUSINESS PURPOSE
Company: Harbour Lantern Trading Limited

Business purpose: wholesale of consumer electronics.
Expected activity: import and resale of consumer electronics in Hong Kong, expected turnover USD 2,000,000 a year.
Declared source of funds: shareholder capital and trade receivables from electronics buyers.
The relationship was introduced by Patrick Lam.

Bank statement summary for the same period:
Total credits: USD 1,850,000
Description of credits: consulting fees received from Caspian Trade LLC.

Prepared 20 September 2026.
""",
    "07-passport-li-ming.pdf": """PASSPORT BIODATA PAGE
Surname: LI
Given names: Ming
Name: Li Ming
Chinese name: 李明
Also known as: Lee Ming
Nationality: Hong Kong
Passport number: E9988123
Date of expiry: 14 January 2024
""",
}


def _write_pdf(path: Path, text: str) -> None:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.add_font("Body", "", _find_font())
    pdf.set_font("Body", size=12)
    pdf.multi_cell(0, 7, text.strip())
    pdf.output(path)


def write_sample(folder: Path) -> list[dict]:
    folder.mkdir(parents=True, exist_ok=True)
    written = []
    for name, text in PACK.items():
        path = folder / name
        _write_pdf(path, text)
        written.append({"filename": name, "path": path})
    return written
