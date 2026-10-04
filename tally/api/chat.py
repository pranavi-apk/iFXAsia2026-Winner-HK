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
        "risk": case.get("risk"),
        "findings": case.get("findings"),
        "people": case.get("people"),
        "companies": case.get("companies"),
    }
    messages = [
        {"role": "system", "content": (
            "You are Tally AI Compliance Officer Assistant. Answer questions accurately based ONLY on this case data: "
            f"{json.dumps(context)}. Be concise, professional, and clear."
        )},
        {"role": "user", "content": body.prompt},
    ]
    try:
        reply = chat(messages, max_tokens=600)
    except Exception as exc:
        reply = f"Could not consult LLM: {str(exc)}"
    return {"reply": reply}
