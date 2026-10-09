# Tracy

**First place, AI & Intelligent Trading track.** Team Iridium — Pranavi, Niharika, and Anas — won iFX Hack Hong Kong 2026 (iFX EXPO Asia) with Tracy. The prize was HKD 16,000.

Tracy is an AI compliance workspace for Know Your Business (KYB) analysts. A company applies to open an account. The analyst uploads the document pack. Tracy reads it, works out who actually owns and controls the company, flags what is missing or inconsistent, and drafts the review. The analyst still makes the decision.

## The problem

Opening a corporate account can take months. The slow part is not typing a form. It is untangling who really owns the company when ownership runs through holding companies, funds, and people in different countries, and the papers do not all agree.

That work is still mostly done by hand. Analysts read certificates, registers, IDs, and bank statements, draw the ownership chain, chase missing pages, and write the memo. Banks, payment firms, fintechs, and exchanges feel this on every complex onboarding.

## What Tracy does

Tracy takes a company's pack and turns it into a review an officer can check.

1. **Read the pack.** PDFs in English or Chinese, including scans. Each fact the model pulls out has to come with a quote from a named file.
2. **Check the quotes.** Code looks for that quote in the original file. If it is not there, the fact is dropped. The model does not get to invent a percentage, a name, or a document.
3. **Build the ownership chain.** Direct shareholdings are multiplied along each path and added up when several paths reach the same person. A company with no owners above it is a gap, not a guessed percentage. Cycles are reported and not followed again. If two documents name different owners, or the same owner at two different percentages, that conflict is a finding.
4. **Screen the names.** People and companies are checked against the sanctions and PEP lists loaded for this demo. Jurisdictions are checked against the rules in the policy file.
5. **Check the money story.** The declared source of funds is compared with what the papers actually show.
6. **Score the case with written rules.** Each finding has a point value in the policy. The score maps to a rating band. The model does not pick the number.
7. **Draft the memo and the chase list.** A short approval memo states the suggested rating and that the officer decides. A separate note lists only what is still outstanding, so the customer is not asked for the same document twice.

The officer reviews the evidence, can override a finding, and records the decision.

## What the officer sees

- **Documents.** What arrived, and what the checklist still expects.
- **Ownership & Control.** The chain, the calculated effective owners, and the gaps.
- **Sanctions & PEP.** Names checked against the lists loaded for this demo. Adverse media is not run. No licensed adverse-media source is connected.
- **Source of Funds.** Where the money is said to come from, and whether the papers support that.
- **Risk Rating.** A score, the findings behind it, and the rule that added each set of points.
- **Approval Memo.** A draft the officer can edit and sign.

## Who it is for

Operations and compliance teams that onboard companies: commercial banks, neobanks, payment firms, fintech platforms, and crypto exchanges. The buyer is the team that has to finish the ownership step before an account can open. Customer-facing teams feel it too, because a cleaner first review means fewer follow-up emails.

## Try it

Silver Oak Holdings Ltd is a made-up company for the demo. Open the app and choose **Open sample case**, or upload any of its documents. Tracy shows the prepared review for that company.

Upload a different company's documents and Tracy reads those files and builds the review from them. That takes longer, because it is a real review of whatever was uploaded.

Documents stay on this computer. The sanctions list, the PEP list, and the risk points are labelled samples for the prototype.

## Start the app

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn tally.main:app --reload --port 8080
```

Open http://localhost:8080. The model key is read from a local `.env` file and is not part of the app.

## Built with

Python, FastAPI, and Qwen. The model reads documents and drafts text. Ownership percentages, name screening, and the risk score are ordinary code with visible rules.

## Team

Iridium — Pranavi (frontend), Niharika (backend), Anas (product). Built for the Compliance & Operations track at iFX Hack, Centennial Campus, HKU, 4 October 2026.
