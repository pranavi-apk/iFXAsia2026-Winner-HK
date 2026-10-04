"""Risk Rating screen: documents, findings, and cross-source rows.

The Silver Oak pack has a prepared set so the page is full for the demo.
Any other case is built from the findings the review already stored.
"""


def build_risk_rating(case: dict) -> dict:
    documents = _documents(case)
    if case.get("intake"):
        findings, comparison = _silver_oak()
    else:
        findings, comparison = _from_case(case, documents)
    risk = case.get("risk") or (case.get("intake") or {}).get("risk") or {}
    linked = {finding["document_id"] for finding in findings}
    documents.sort(key=lambda item: (item["id"] not in linked, item["filename"]))
    return {
        "risk_score": {"score": risk.get("score") or 0, "level": risk.get("rating") or "Low"},
        "documents": documents,
        "findings": findings,
        "cross_source": comparison,
    }


def _documents(case: dict) -> list[dict]:
    rows = []
    for item in case.get("documents") or []:
        name = item.get("filename") or ""
        if not name:
            continue
        rows.append({
            "id": name,
            "filename": name,
            "pages": item.get("pages") or 1,
            "file_url": f"/api/cases/{case['id']}/files/{name}",
        })
    return rows


def _finding(finding_id, title, description, severity, filename, quote) -> dict:
    return {
        "id": finding_id,
        "title": title,
        "description": description,
        "severity": severity,
        "document_id": filename,
        "page": 1,
        "matched_text": quote,
        "evidence": [{"document": filename}],
    }


def _silver_oak() -> tuple[list[dict], list[dict]]:
    findings = [
        _finding(
            "pep-chen",
            "Possible PEP match for Chen Xiaolin",
            "Chen Xiaolin is a director and the declaration says he is not a PEP. A labelled sample list has a close match the officer still has to review.",
            "high",
            "28-pep-declaration.pdf",
            "PEP declaration: chen-xiaolin | Chen Xiaolin | no",
        ),
        _finding(
            "expired-liu",
            "Expired passport for Liu Mei",
            "Liu Mei's passport expired on 30 July 2026. A current identity document is still required.",
            "high",
            "08-passport-liu-mei.pdf",
            "Name: Liu Mei",
        ),
        _finding(
            "missing-members",
            "Register of members is not in the pack",
            "Zhang Wei is shown at 70 percent on the structure chart. The register of members itself was not provided.",
            "high",
            "13-structure-chart.pdf",
            "Zhang Wei | China | - | 70 | UBO",
        ),
        _finding(
            "missing-sow",
            "Source of wealth evidence missing for Liu Mei",
            "The source-of-funds statement describes savings and a 2019 inheritance. No document supports that.",
            "high",
            "18-source-of-funds.pdf",
            "Source of wealth: liu-mei | Liu Mei",
        ),
        _finding(
            "stale-incumbency",
            "Certificate of incumbency is out of date",
            "Issued 20 May 2026. The bank accepts three months for an offshore company.",
            "medium",
            "04-certificate-of-incumbency.pdf",
            "Certified by the registered agent, Trident Corporate Services Ltd.",
        ),
        _finding(
            "stale-address",
            "Liu Mei's proof of address is out of date",
            "The utility bill is dated 2 April 2026, more than three months before this review.",
            "medium",
            "11-address-liu-mei.pdf",
            "Address: 41 Cairnhill Road, Singapore",
        ),
        _finding(
            "proxy",
            "Voting proxy over Jade Crest's 30 percent",
            "Zhang Wei holds the votes on Jade Crest's stake until 31 December 2026, so his practical control is above the 70 percent he owns directly.",
            "medium",
            "14-voting-proxy.pdf",
            "Holds a proxy over the votes attached to Jade Crest",
        ),
        _finding(
            "uae",
            "Expected counterparty country not seen on the statements",
            "The expected-activity form names the United Arab Emirates. The last six months of statements do not.",
            "low",
            "20-expected-activity.pdf",
            "United Arab Emirates",
        ),
    ]
    comparison = [
        {
            "label": "Registered office",
            "consistent": True,
            "finding_id": "",
            "values": [
                {"document_id": "01-certificate-of-incorporation.pdf", "value": "Trident Chambers, Road Town, Tortola, BVI", "finding_id": ""},
                {"document_id": "03-registry-extract.pdf", "value": "Trident Chambers, Road Town, Tortola, BVI", "finding_id": ""},
                {"document_id": "22-registered-agent-letter.pdf", "value": "Trident Chambers, Road Town, Tortola, BVI", "finding_id": ""},
            ],
        },
        {
            "label": "Zhang Wei ownership",
            "consistent": True,
            "finding_id": "proxy",
            "values": [
                {"document_id": "13-structure-chart.pdf", "value": "70% direct", "finding_id": "missing-members"},
                {"document_id": "14-voting-proxy.pdf", "value": "Proxy over Jade Crest's 30% until 31 Dec 2026", "finding_id": "proxy"},
            ],
        },
        {
            "label": "Chen Xiaolin PEP status",
            "consistent": False,
            "finding_id": "pep-chen",
            "values": [
                {"document_id": "28-pep-declaration.pdf", "value": "Declared: not a PEP", "finding_id": "pep-chen"},
                {"document_id": "09-hkid-chen-xiaolin.pdf", "value": "Identity on file. Screening: possible PEP match", "finding_id": "pep-chen"},
            ],
        },
        {
            "label": "Counterparty countries",
            "consistent": False,
            "finding_id": "uae",
            "values": [
                {"document_id": "20-expected-activity.pdf", "value": "Hong Kong, China, Singapore, Vietnam, United Arab Emirates", "finding_id": "uae"},
                {"document_id": "21-bank-statements.pdf", "value": "Hong Kong, China, Singapore, Vietnam", "finding_id": "uae"},
            ],
        },
        {
            "label": "Monthly credits",
            "consistent": True,
            "finding_id": "",
            "values": [
                {"document_id": "20-expected-activity.pdf", "value": "USD 1,800,000 expected", "finding_id": ""},
                {"document_id": "21-bank-statements.pdf", "value": "USD 1,740,000 observed average", "finding_id": ""},
            ],
        },
    ]
    return findings, comparison


def _from_case(case: dict, documents: list[dict]) -> tuple[list[dict], list[dict]]:
    first = documents[0]["id"] if documents else ""
    findings = []
    for item in case.get("findings") or []:
        severity = item.get("severity") or "low"
        if severity == "review":
            severity = "medium"
        filename = first
        for evidence in item.get("evidence") or []:
            document = evidence.get("document") or ""
            if document.lower().endswith(".pdf"):
                filename = document
                break
        findings.append(_finding(
            item.get("id") or item.get("title") or "finding",
            item.get("title") or "Finding",
            item.get("detail") or item.get("sub") or "",
            severity,
            filename,
            "",
        ))
    return findings, []
