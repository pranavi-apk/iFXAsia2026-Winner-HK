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

The sanctions list, PEP list, checklist, and risk points in `data/` are labelled samples for the prototype.
