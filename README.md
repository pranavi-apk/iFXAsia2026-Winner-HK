# Tracy

Tracy helps a compliance officer review a company that wants to open an account.

Upload the company's documents. Tracy reads the pack, checks what is missing, who owns and controls the company, whether any names need a closer look, and where the money comes from. It then prepares a risk view and a draft approval memo. The officer reviews the findings and makes the decision.

## What the officer sees

- **Documents.** What arrived in the pack, and what is still missing.
- **Ownership & Control.** Who owns the company, and how that ownership is held.
- **Sanctions & PEP.** Names checked against the lists loaded for this demo.
- **Source of Funds.** Where the money is said to come from, and whether the papers support that.
- **Risk Rating.** A score, with the findings behind it.
- **Approval Memo.** A draft the officer can review and sign.

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
