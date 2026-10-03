"""
Document-related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class DocumentType(str, Enum):
    """Document classification types."""
    CERTIFICATE_OF_INCORPORATION = "Certificate of Incorporation"
    ARTICLES_OF_ASSOCIATION = "Articles of Association"
    BOARD_RESOLUTION = "Board Resolution"
    REGULATORY_LICENSE = "Regulatory License"
    AML_KYC_CERTIFICATE = "AML/KYC Certificate"
    PROOF_OF_ADDRESS = "Proof of Address"
    PROOF_OF_IDENTITY = "Proof of Identity"
    BANK_REFERENCE = "Bank Reference"
    FINANCIAL_STATEMENT = "Financial Statement"
    SOURCE_OF_FUNDS = "Source of Funds"
    TAX_CERTIFICATE = "Tax Certificate"
    UBO_DOCUMENTATION = "UBO Documentation"
    SHAREHOLDER_REGISTER = "Shareholder Register"
    OTHER = "Other"
    UNKNOWN = "Unknown"


class DocumentStatus(str, Enum):
    """Document processing status."""
    UPLOADED = "Uploaded"
    PROCESSING = "Processing"
    CLASSIFIED = "Classified"
    VERIFIED = "Verified"
    FLAGGED = "Flagged"
    PENDING_REVIEW = "Pending Review"
    REJECTED = "Rejected"


class HITLVerificationStatus(str, Enum):
    """HITL verification status."""
    VERIFIED = "Verified"
    PENDING = "Pending"
    REJECTED = "Rejected"


class DocumentBase(BaseModel):
    """Base document schema."""
    filename: str
    case_id: str
    document_type: DocumentType = DocumentType.UNKNOWN
    status: DocumentStatus = DocumentStatus.UPLOADED


class DocumentCreate(DocumentBase):
    """Schema for creating a document record."""
    file_size: int
    mime_type: str
    storage_path: str


class HITLDecision(BaseModel):
    """HITL decision record for learning."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    analyst: str
    ai_classification: str
    human_decision: str  # "Accepted" or "Modified"
    modified_classification: Optional[str] = None
    confidence: int
    feedback: Optional[str] = None


class DocumentUpdate(BaseModel):
    """Schema for updating document."""
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None
    ai_classification: Optional[str] = None
    confidence: Optional[int] = None
    hitl_verified: Optional[str] = None  # Changed to str to accept "Verified", "Modified", "Pending"
    verified_by: Optional[str] = None
    authenticity: Optional[int] = None
    flags: Optional[int] = None
    hitl_decision: Optional[HITLDecision] = None  # New field for storing decision history


class Document(DocumentBase):
    """Complete document schema."""
    id: str = Field(..., description="Document ID (e.g., DOC-001)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: str = Field(default="system")

    # File information
    file_size: int = Field(..., description="File size in bytes")
    size: str = Field(..., description="Human-readable file size")
    mime_type: str
    file_hash: Optional[str] = None
    storage_path: str

    # Classification
    ai_classification: str = Field(default="Unknown")
    confidence: int = Field(default=0, ge=0, le=100)
    classification_model: Optional[str] = None
    classification_timestamp: Optional[datetime] = None

    # Verification
    hitl_verified: HITLVerificationStatus = HITLVerificationStatus.PENDING
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None

    # Authenticity
    authenticity: int = Field(default=0, ge=0, le=100, description="Authenticity score")
    authenticity_score: Optional[float] = None
    fraud_indicators: List[str] = Field(default_factory=list)
    is_tampered: bool = False

    # Quality metrics
    page_count: int = 1
    image_quality_score: Optional[float] = None

    # Flags and issues
    flags: int = Field(default=0, ge=0)
    verification_issues: List[str] = Field(default_factory=list)

    # Extracted data
    ocr_text: Optional[str] = None
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    extracted_entities: List[Dict[str, Any]] = Field(default_factory=list)

    # Document metadata
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    issuing_authority: Optional[str] = None
    document_number: Optional[str] = None

    # Tags and notes
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

    # HITL decision history for AI learning
    hitl_history: List[Dict[str, Any]] = Field(default_factory=list, description="History of HITL decisions for AI learning")

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Response schema for document list."""
    documents: List[Document]
    total: int
    case_id: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    """Response after document upload."""
    document: Document
    message: str = "Document uploaded successfully"
    processing_started: bool = True
