from pydantic import BaseModel


class Decision(BaseModel):
    status: str
    rating: str | None = None
    note: str = ""


class FindingDecision(BaseModel):
    disposition: str
    note: str = ""


class ChatMessage(BaseModel):
    prompt: str
