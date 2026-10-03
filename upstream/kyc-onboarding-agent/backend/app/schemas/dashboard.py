"""
Dashboard statistics schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional


class RiskDistribution(BaseModel):
    """Risk distribution statistics."""
    low: int = Field(default=0, description="Number of low risk cases")
    medium: int = Field(default=0, description="Number of medium risk cases")
    high: int = Field(default=0, description="Number of high risk cases")
    prohibited: int = Field(default=0, description="Number of prohibited/critical risk cases")


class DashboardStats(BaseModel):
    """Comprehensive dashboard statistics."""
    # Top stats cards
    total_cases: int = Field(default=0, description="Total number of cases")
    cases_this_month: int = Field(default=0, description="Cases created this month")

    in_review: int = Field(default=0, description="Cases in review status")
    hitl_pending: int = Field(default=0, description="Cases requiring HITL review")

    approved: int = Field(default=0, description="Approved cases")
    avg_completion_days: float = Field(default=0.0, description="Average days to completion")

    escalated: int = Field(default=0, description="Escalated cases")
    rejected: int = Field(default=0, description="Rejected cases")

    # AI metrics
    ai_classification_accuracy: float = Field(default=0.0, ge=0.0, le=100.0, description="AI document classification accuracy percentage")
    screening_false_positive_rate: float = Field(default=0.0, ge=0.0, le=100.0, description="Screening false positive rate percentage")

    # Risk distribution
    risk_distribution: RiskDistribution = Field(default_factory=RiskDistribution, description="Risk level distribution")

    # Additional metadata
    pending_docs: int = Field(default=0, description="Cases pending documents")
    draft: int = Field(default=0, description="Cases in draft status")
    on_hold: int = Field(default=0, description="Cases on hold")

    # Document statistics
    total_documents_processed: int = Field(default=0, description="Total documents processed across all cases")
    total_documents_classified: int = Field(default=0, description="Total documents classified correctly by AI")
    total_screening_matches: int = Field(default=0, description="Total screening matches found")
    auto_resolved_screenings: int = Field(default=0, description="Screening matches auto-resolved by AI")
