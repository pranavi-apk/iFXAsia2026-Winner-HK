"""
Case-related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class CaseStatus(str, Enum):
    """Case status enum."""
    DRAFT = "Draft"
    IN_REVIEW = "In Review"
    PENDING_DOCS = "Pending Docs"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    ESCALATED = "Escalated"
    ON_HOLD = "On Hold"


class RiskLevel(str, Enum):
    """Risk level enum."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    NOT_ASSESSED = "—"


class CasePriority(str, Enum):
    """Case priority enum."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class CaseBase(BaseModel):
    """Base case schema with common fields."""
    investor_name: str = Field(..., description="Investor/Company name")
    investor_type: str = Field(..., description="Type of investor (Fund, Corporation, etc.)")
    jurisdiction: str = Field(..., description="Jurisdiction/Country")
    status: CaseStatus = Field(default=CaseStatus.DRAFT)
    risk_rating: RiskLevel = Field(default=RiskLevel.NOT_ASSESSED)
    priority: CasePriority = Field(default=CasePriority.MEDIUM)
    assigned_to: str = Field(default="Unassigned", description="Analyst name")
    completeness: int = Field(default=0, ge=0, le=100, description="Completion percentage")
    stage: str = Field(default="Stage 1/7")


class CaseCreate(CaseBase):
    """Schema for creating a new case."""
    pass


class CaseUpdate(BaseModel):
    """Schema for updating an existing case."""
    investor_name: Optional[str] = None
    investor_type: Optional[str] = None
    jurisdiction: Optional[str] = None
    status: Optional[CaseStatus] = None
    risk_rating: Optional[RiskLevel] = None
    priority: Optional[CasePriority] = None
    assigned_to: Optional[str] = None
    completeness: Optional[int] = None
    stage: Optional[str] = None


class Case(CaseBase):
    """Complete case schema with all fields."""
    id: str = Field(..., description="Case ID (e.g., CASE-2024-0847)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_new: bool = Field(default=False, description="Flag for new cases")

    # Additional metadata
    incorporation_date: Optional[datetime] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None

    # Assessment results
    completeness_score: float = Field(default=0.0, ge=0.0, le=100.0)
    risk_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    risk_level: Optional[str] = None
    verification_status: str = Field(default="pending")
    screening_status: str = Field(default="pending")
    hitl_status: str = Field(default="not_started")
    hitl_required: bool = Field(default=False)

    # Full comprehensive assessment results (from AI assessment)
    assessment_results: Optional[Dict[str, Any]] = None

    # Tracking
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    sla_deadline: Optional[datetime] = None

    # Extensible metadata
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True


class CaseListResponse(BaseModel):
    """Response schema for case list."""
    cases: List[Case]
    total: int
    page: int = 1
    page_size: int = 100


class CaseStats(BaseModel):
    """Statistics for dashboard."""
    total_cases: int
    in_review: int
    approved: int
    escalated: int
    pending_docs: int
    avg_completion_days: float
    hitl_pending: int
