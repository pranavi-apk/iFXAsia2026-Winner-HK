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


class MemoDraft(BaseModel):
    recommendation: str
    summary: str = ""
    analyst_comments: str = ""
    decision_text: str = ""


class PurposeEdit(BaseModel):
    business_activity: str = ""
    expected_transactions: str = ""
    target_markets: str = ""
    expected_annual_volume: str = ""
    introducer: str = ""
