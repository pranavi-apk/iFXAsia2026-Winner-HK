# Tally

Tally reads one corporate onboarding pack, runs five compliance checks, and leaves the decision with the officer.

The case flow is adapted from [kyc-onboarding-agent](https://github.com/zubertaj123/kyc-onboarding-agent) (MIT). A copy of that repo is in `upstream/kyc-onboarding-agent`. Ownership percentages are calculated in code. Name matching is a visible threshold. The model only extracts text and drafts the memo.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn tally.main:app --reload --port 8080
```

Open http://localhost:8080 and choose **Open sample case**. The sample company is invented.

The model settings are read from `.env` (`ALIBABA_LLM_API_KEY`, `ALIBABA_LLM_ENDPOINT`, `ALIBABA_LLM_MODEL`). Documents stay on local disk.

## Project layout

The sidebar sections (Documents, Ownership & Control, Sanctions & PEP, Source of Funds, Risk Rating, Approval Memo) are the unit of organisation on both sides.

```
static/                     frontend, plain ES modules, no build step
  index.html                shell only
  css/                      base.css, layout.css, sections/, components/
  js/
    main.js                 start-up and wiring
    core/                   api calls, shared state, DOM helpers
    components/             sidebar, pipeline modal, copilot, welcome, page header
    sections/               one folder per sidebar section; index.js lists them
      ownership/            the only built section: map, inspector, view-model.js,
                            and structure/ (the pannable ownership canvas)
    lib/                    countries (names, flags, map positions) and icons
    mock/intake.js          mock onboarding intake, grouped by the bank's 8 requirement groups
tally/                      backend, FastAPI
  main.py                   app setup only
  api/                      routes: cases, review, monitoring, policy, chat
  assessment/               the review pipeline
    pipeline.py             assess(): calls the checks in order
    checks/                 documents, ownership, screening, source_of_funds
    extraction.py people.py pack.py findings.py scoring.py memo.py monitoring.py
```

To add a frontend section, create `static/js/sections/<name>/index.js` exporting `{ id, step, label, mount(container, caseData) }` and list it in `static/js/sections/index.js`.

The sanctions list, PEP list, checklist, and risk points in `data/` are labelled samples for the prototype.
