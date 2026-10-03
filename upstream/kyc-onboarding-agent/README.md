# KYC Investor Onboarding Agent

**Reads an institutional investor's onboarding document pack, checks it for completeness,
cross-verifies facts between documents, extracts the beneficial-ownership chain, scores risk, and
escalates what a human must actually decide.**

Onboarding an institutional investor means collecting a dozen documents — incorporation
certificates, audited financials, group structure, officer certifications, bank statements, photo ID
for each beneficial owner — and then having an analyst read all of them together to answer:
is this pack complete, does it agree with itself, who ultimately owns this entity, and how risky is
it?

This is a genericised reference implementation of a system built for a global bank. All customer and
employer identifiers, infrastructure details and sample documents have been removed.

---

## The problem

KYC onboarding is slow because the hard part is *cross-document reasoning*, and that has never been
automatable by rules.

| Reality | Consequence |
|---|---|
| 10–15 documents per case, formats vary by jurisdiction | No fixed parser; every pack is a new reading task |
| Completeness depends on entity type and jurisdiction | "What's missing?" is a judgement, not a checklist lookup |
| Facts must agree *across* documents | An entity name on the bank statement must match the incorporation certificate |
| UBO chains run through multiple holding layers | Ownership must be traced, not looked up |
| Missing documents discovered late | Another round-trip to the investor; days lost each time |
| Analysts re-read the same pack at each stage | The most expensive kind of rework |

Every incomplete pack costs a round-trip to the client. Every round-trip costs days. And onboarding
delay is felt directly by the business — capital that cannot be deployed.

---

## The solution

A single comprehensive assessment pass over the whole case, rather than per-document extraction
with a human assembling the conclusions.

```
    Investor onboarding document pack (PDFs)
                     │
                     ▼
     ┌─────────────────────────────────┐
     │  DOCUMENT SERVICE               │
     │  ingest · store · classify      │
     └───────────────┬─────────────────┘
                     ▼
     ┌─────────────────────────────────────────────────────┐
     │      COMPREHENSIVE ASSESSMENT  (one pass, whole case)│
     │                                                     │
     │   1. Document parsing & classification              │
     │      what is each document, and what does it say?   │
     │                                                     │
     │   2. Completeness checking                          │
     │      what is missing for THIS entity type           │
     │      and jurisdiction?                              │
     │                                                     │
     │   3. Cross-document verification         ⭐         │
     │      do the documents agree with each other?        │
     │                                                     │
     │   4. UBO structure extraction            ⭐         │
     │      trace ownership through holding layers         │
     │                                                     │
     │   5. Risk scoring                                   │
     │      jurisdiction · structure · findings            │
     │                                                     │
     │   6. HITL flagging                                  │
     │      what must a human decide?                      │
     └───────────────┬─────────────────────────────────────┘
                     ▼
     ┌─────────────────────────────────┐
     │  CASE SERVICE                   │  case state, lifecycle
     └───────────────┬─────────────────┘
                     ▼
     ┌─────────────────────────────────┐
     │  ANALYST REVIEW  +  DASHBOARD   │  cases · pending · high risk
     └─────────────────────────────────┘

   Parsing: Azure Document Intelligence · LLM document parser
   API: FastAPI · Deployment: Cloud Run + Cloud SQL
```

### Why this shape

**One assessment over the whole case, not per-document extraction.** The valuable findings are
*relational* — the entity name on the bank statement not matching the incorporation certificate, an
officer listed in one document and absent from another. A per-document pipeline structurally cannot
see these, because each document looks fine in isolation. Assessing the case as a unit is the core
design decision.

**Completeness is evaluated against entity type and jurisdiction.** A static required-documents list
either over-demands (irritating the investor) or under-demands (causing a later round-trip). Deriving
the requirement from the case is what actually reduces re-work.

**UBO extraction is a first-class step.** Beneficial ownership is the regulatory heart of KYC and the
most labour-intensive part of the analysis — tracing ownership through holding layers is exactly the
multi-document reasoning a model does well and a rules engine cannot do at all.

**Risk scoring is derived from findings, not asserted.** The score is a function of jurisdiction,
structure complexity and verification results, so it is explainable to a reviewer and to an examiner.

**HITL flagging is an explicit pipeline output.** The system's job is to make the analyst's decision
fast and well-evidenced, not to approve investors. Every case ends with a human.

---

## Results

| Dimension | Before | After |
|---|---|---|
| Document review | Analyst reads 10–15 documents per case | Parsed, classified and cross-checked automatically |
| Completeness check | Manual against a static checklist | Derived from entity type and jurisdiction |
| Inconsistency detection | Found by careful reading, or missed | Cross-document verification as a pipeline stage |
| UBO chain | Traced by hand through the group structure | Extracted and presented |
| Round-trips to investor | Triggered by late discovery of gaps | Gaps identified on first pass |
| Analyst focus | Reading everything | Deciding the flagged items |

### Business benefits

- **Onboarding time compresses**, and onboarding time is the constraint on deploying investor
  capital — the delay has a direct carrying cost.
- **Round-trips to the investor drop.** Complete-pack assessment on the first pass avoids the
  "one more document" cycle that damages the client relationship as much as the timeline.
- **Consistency of review improves.** Every case receives the same cross-verification, regardless of
  which analyst picks it up or how busy the desk is.
- **Regulatory defensibility strengthens.** UBO chains and risk scores are derived from stated
  evidence, with the reasoning retained.
- **Analyst capacity scales with volume** without linear headcount growth — the reading scales, the
  deciding does not.

---

## Architecture

```
backend/app/
├── main.py                            FastAPI app, health, error handling,
│                                      request middleware, lifecycle hooks
├── core/
│   ├── doc_intelligence.py            Azure Document Intelligence boundary
│   ├── openai_doc_parser.py           LLM document parsing
│   ├── storage.py                     document storage abstraction
│   ├── config.py · logging_config.py
├── services/
│   ├── comprehensive_assessment.py    ⭐ six-stage whole-case assessment
│   ├── document_service.py            ingestion, classification
│   ├── case_service.py                case lifecycle and state
│   └── dashboard_service.py           portfolio metrics
├── schemas/                           case · document · dashboard
└── api/v1/                            REST surface
db_manager.py · scripts/seed_data.py   local database setup
deploy-gcp.sh                          Cloud Run deployment
```

**Stack:** Python · FastAPI · Azure Document Intelligence · LLM parsing · Cloud Run · Cloud SQL

---

## Quick start

```bash
cd backend
pip install -r requirements.txt
cp ../.env.template ../.env
python db_manager.py init
python scripts/seed_data.py
uvicorn app.main:app --reload --port 8080
# API docs at http://localhost:8080/api/docs
```

See `demo/README.md` for the document pack the assessment expects. No sample documents ship with
this repository — supply your own clearly-synthetic test pack.

---

## License

MIT — see [LICENSE](LICENSE).

> Reference implementation. Client and employer identifiers, deployment endpoints and all sample
> documents have been removed. No investor, individual or credential data is present in this
> repository.
