"""The AI copilot: answers questions from the stored case only."""
import json

from fastapi import APIRouter

from tally.api.deps import load_case
from tally.api.schemas import ChatMessage
from tally.llm import chat

router = APIRouter(prefix="/api/cases/{case_id}", tags=["chat"])


@router.post("/chat")
def case_chat(case_id: str, body: ChatMessage):
    case = load_case(case_id)
    context = {
        "entity": case.get("entity"),
        "business": case.get("business"),
        "risk": case.get("risk"),
        "findings": [{"title": item.get("title"), "detail": item.get("detail")} for item in (case.get("findings") or [])],
        "memo": case.get("memo"),
        "customer_request": case.get("customer_request"),
        "adverse_media": (case.get("adverse_media") or {}).get("label"),
        "background": (case.get("background") or {}).get("label"),
    }
    messages = [
        {"role": "system", "content": (
            "You are the compliance officer's assistant. Answer only from this case. "
            "If the officer writes in Chinese, answer in written Chinese. "
            "If they write in English, answer in English. "
            "Do not invent screening hits, percentages, or documents. "
            f"Case: {json.dumps(context, ensure_ascii=False)}"
        )},
        {"role": "user", "content": body.prompt},
    ]
    try:
        reply = chat(messages, max_tokens=600)
    except Exception as exc:
        reply = f"Could not consult LLM: {str(exc)}"
    return {"reply": reply}
