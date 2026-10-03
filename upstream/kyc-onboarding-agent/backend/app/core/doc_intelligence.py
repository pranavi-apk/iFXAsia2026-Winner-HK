"""
Document Intelligence Integration for the global bank IRA.

This module provides a simplified wrapper around the document_intelli_v1
system for KYC/AML document processing.
"""
import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
from enum import Enum
import asyncio

# Add document_intelli_v1 to path (ensure it's always first for reliable imports)
DOC_INTELLI_PATH = Path(__file__).parent.parent.parent.parent / "document_intelli_v1"
if DOC_INTELLI_PATH.exists():
    doc_intelli_str = str(DOC_INTELLI_PATH.resolve())  # Use absolute path
    # Remove if already exists (from previous reload) and add to front
    if doc_intelli_str in sys.path:
        sys.path.remove(doc_intelli_str)
    sys.path.insert(0, doc_intelli_str)


class KYCDocumentType(str, Enum):
    """KYC/AML specific document types."""
    # Corporate Documents
    CERTIFICATE_OF_INCORPORATION = "certificate_of_incorporation"
    ARTICLES_OF_ASSOCIATION = "articles_of_association"
    MEMORANDUM_OF_ASSOCIATION = "memorandum_of_association"
    CERTIFICATE_OF_INCUMBENCY = "certificate_of_incumbency"
    BOARD_RESOLUTION = "board_resolution"

    # Regulatory Documents
    INVESTMENT_MANAGEMENT_AGREEMENT = "investment_management_agreement"
    PROSPECTUS = "prospectus"
    OFFERING_MEMORANDUM = "offering_memorandum"
    REGULATORY_LICENSE = "regulatory_license"

    # Identity Documents
    PASSPORT = "passport"
    NATIONAL_ID = "national_id"
    DRIVERS_LICENSE = "drivers_license"

    # Proof of Address
    UTILITY_BILL = "utility_bill"
    BANK_STATEMENT = "bank_statement"
    LEASE_AGREEMENT = "lease_agreement"

    # Financial Documents
    AUDITED_FINANCIALS = "audited_financials"
    TAX_RETURN = "tax_return"
    SOURCE_OF_FUNDS = "source_of_funds"
    SOURCE_OF_WEALTH = "source_of_wealth"

    # UBO Documents
    UBO_DECLARATION = "ubo_declaration"
    OWNERSHIP_STRUCTURE_CHART = "ownership_structure_chart"
    SHAREHOLDER_REGISTER = "shareholder_register"

    # AML/KYC
    AML_KYC_CERTIFICATE = "aml_kyc_certificate"

    # Other
    OTHER = "other"
    UNKNOWN = "unknown"


class DocumentIntelligenceResult:
    """Result from document intelligence processing."""

    def __init__(
        self,
        document_type: str,
        confidence: float,
        extracted_text: Optional[str] = None,
        extracted_fields: Optional[Dict[str, Any]] = None,
        authenticity_score: Optional[float] = None,
        processing_time_ms: float = 0.0,
        warnings: Optional[List[str]] = None
    ):
        self.document_type = document_type
        self.confidence = confidence
        self.extracted_text = extracted_text
        self.extracted_fields = extracted_fields or {}
        self.authenticity_score = authenticity_score
        self.processing_time_ms = processing_time_ms
        self.warnings = warnings or []


class DocumentIntelligenceService:
    """
    Simplified document intelligence service for the global bank IRA.

    This service provides document classification and extraction
    using the document_intelli_v1 system.
    """

    def __init__(self, use_llamaindex: bool = True):
        """
        Initialize document intelligence service.

        Args:
            use_llamaindex: If True, use LlamaIndex stack; else use local processing
        """
        self.use_llamaindex = use_llamaindex
        self.processor = None

        # Check if document_intelli_v1 is available
        self.intelli_available = DOC_INTELLI_PATH.exists()

        if self.intelli_available and use_llamaindex:
            self._initialize_processor()

    def _initialize_processor(self):
        """Initialize the document processor from document_intelli_v1."""
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Import settings to get API key
            from app.core.config import settings

            # Import from document_intelli_v1
            from src.llamaindex_stack import LlamaIndexProcessor

            # Check for API key from settings
            api_key = settings.LLAMA_CLOUD_API_KEY
            if api_key:
                logger.info(f"✅ Initializing LlamaIndexProcessor with API key: {api_key[:20]}...")
                self.processor = LlamaIndexProcessor(api_key=api_key)
                logger.info(f"✅ LlamaIndexProcessor initialized successfully: {self.processor}")
            else:
                logger.warning("⚠️  LLAMA_CLOUD_API_KEY not set, using fallback classification")
                self.processor = None
        except ImportError as e:
            logger.error(f"❌ Could not import document_intelli_v1: {e}")
            import traceback
            traceback.print_exc()
            self.processor = None
        except Exception as e:
            logger.error(f"❌ Failed to initialize LlamaIndexProcessor: {e}")
            import traceback
            traceback.print_exc()
            self.processor = None

    async def classify_document(
        self,
        file_path: Path,
        file_content: Optional[bytes] = None
    ) -> DocumentIntelligenceResult:
        """
        Classify a document and extract basic information.

        Args:
            file_path: Path to the document file
            file_content: Optional file content bytes

        Returns:
            DocumentIntelligenceResult with classification and extraction data
        """
        import time
        start_time = time.time()

        # If processor is available, use it
        if self.processor:
            try:
                result = await self._classify_with_ai(file_path)
                return result
            except Exception as e:
                print(f"AI classification failed: {e}, falling back to rule-based")

        # Fallback to rule-based classification
        result = self._classify_with_rules(file_path)
        result.processing_time_ms = (time.time() - start_time) * 1000

        return result

    async def _classify_with_ai(self, file_path: Path) -> DocumentIntelligenceResult:
        """Classify using AI processor from document_intelli_v1."""
        import time
        import logging
        logger = logging.getLogger(__name__)

        start_time = time.time()

        # Parse the document using LlamaIndex with timeout (30 seconds max per document)
        try:
            parsed = await asyncio.wait_for(
                self.processor.parse(str(file_path)),
                timeout=30.0
            )
            logger.info(f"✅ LlamaIndex parsed {len(parsed)} characters")
        except asyncio.TimeoutError:
            logger.warning(f"⏱️  LlamaIndex parsing timed out after 30s, falling back to OCR extraction")
            # Fallback: extract text using basic OCR/text extraction
            parsed = await self._fallback_text_extraction(file_path)
            logger.info(f"✅ Fallback extracted {len(parsed)} characters")

        # Try LlamaIndex classification first
        classification = await self.processor.classify(parsed)
        llama_type = classification.document_type.value
        llama_confidence = classification.confidence * 100

        logger.info(f"📊 LlamaIndex classification: {llama_type} ({llama_confidence:.1f}%)")

        # If LlamaIndex confidence is low (<70%), use OpenAI for better classification
        if llama_confidence < 70:
            logger.info(f"⚠️  Low confidence ({llama_confidence:.1f}%), using OpenAI classifier")
            doc_type, confidence = await self._classify_with_openai(parsed, file_path.name)
        else:
            # Map LlamaIndex type to KYC type
            doc_type = self._map_to_kyc_type(llama_type)
            confidence = llama_confidence

        # Extract structured data using OpenAI
        logger.info(f"🔍 Extracting structured data with OpenAI...")
        extracted_fields = await self._extract_structured_data(parsed, doc_type, file_path.name)
        logger.info(f"✅ Extracted {len(extracted_fields)} fields: {list(extracted_fields.keys())}")

        processing_time = (time.time() - start_time) * 1000

        logger.info(f"✅ Final classification: {doc_type} ({confidence:.1f}%)")

        return DocumentIntelligenceResult(
            document_type=doc_type,
            confidence=confidence,
            extracted_text=parsed if parsed else None,
            extracted_fields=extracted_fields,
            authenticity_score=min(85 + (confidence / 100) * 10, 99),
            processing_time_ms=processing_time
        )

    async def _fallback_text_extraction(self, file_path: Path) -> str:
        """Fallback text extraction when LlamaIndex times out."""
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Try using PyPDF2 for PDF files
            if file_path.suffix.lower() == '.pdf':
                try:
                    import PyPDF2
                    with open(file_path, 'rb') as f:
                        reader = PyPDF2.PdfReader(f)
                        text_parts = []
                        for page in reader.pages:
                            text_parts.append(page.extract_text())
                        text = '\n\n'.join(text_parts)
                        if text.strip():
                            logger.info(f"✅ PyPDF2 extracted {len(text)} characters")
                            return text
                except Exception as e:
                    logger.warning(f"PyPDF2 extraction failed: {e}")

            # For images or if PDF extraction failed, return minimal text from filename
            logger.warning(f"Could not extract text from {file_path}, using filename for classification")
            return f"Document: {file_path.name}"

        except Exception as e:
            logger.error(f"Fallback extraction failed: {e}")
            return f"Document: {file_path.name}"

    def _classify_with_rules(self, file_path: Path) -> DocumentIntelligenceResult:
        """Rule-based classification based on filename."""
        filename_lower = file_path.name.lower()

        # Classification mapping
        classifications = {
            'certificate_of_incorporation': (KYCDocumentType.CERTIFICATE_OF_INCORPORATION, 95),
            'certificate': (KYCDocumentType.CERTIFICATE_OF_INCORPORATION, 90),
            'incorporation': (KYCDocumentType.CERTIFICATE_OF_INCORPORATION, 92),
            'board_resolution': (KYCDocumentType.BOARD_RESOLUTION, 94),
            'resolution': (KYCDocumentType.BOARD_RESOLUTION, 88),
            'aml': (KYCDocumentType.AML_KYC_CERTIFICATE, 91),
            'kyc': (KYCDocumentType.AML_KYC_CERTIFICATE, 91),
            'license': (KYCDocumentType.REGULATORY_LICENSE, 93),
            'articles': (KYCDocumentType.ARTICLES_OF_ASSOCIATION, 92),
            'memorandum': (KYCDocumentType.MEMORANDUM_OF_ASSOCIATION, 90),
            'shareholder': (KYCDocumentType.SHAREHOLDER_REGISTER, 89),
            'register': (KYCDocumentType.SHAREHOLDER_REGISTER, 85),
            'passport': (KYCDocumentType.PASSPORT, 96),
            'national_id': (KYCDocumentType.NATIONAL_ID, 95),
            'drivers_license': (KYCDocumentType.DRIVERS_LICENSE, 94),
            'driver': (KYCDocumentType.DRIVERS_LICENSE, 90),
            'utility': (KYCDocumentType.UTILITY_BILL, 92),
            'bank_statement': (KYCDocumentType.BANK_STATEMENT, 94),
            'bank': (KYCDocumentType.BANK_STATEMENT, 88),
            'financial': (KYCDocumentType.AUDITED_FINANCIALS, 90),
            'audit': (KYCDocumentType.AUDITED_FINANCIALS, 92),
            'tax_return': (KYCDocumentType.TAX_RETURN, 93),
            'tax': (KYCDocumentType.TAX_RETURN, 87),
            'source_of_funds': (KYCDocumentType.SOURCE_OF_FUNDS, 94),
            'funds': (KYCDocumentType.SOURCE_OF_FUNDS, 86),
            'wealth': (KYCDocumentType.SOURCE_OF_WEALTH, 90),
            'ubo': (KYCDocumentType.UBO_DECLARATION, 92),
            'ownership': (KYCDocumentType.OWNERSHIP_STRUCTURE_CHART, 90),
            'prospectus': (KYCDocumentType.PROSPECTUS, 93),
            'offering': (KYCDocumentType.OFFERING_MEMORANDUM, 91),
        }

        # Find best match
        best_match = (KYCDocumentType.UNKNOWN, 75)
        for keyword, (doc_type, confidence) in classifications.items():
            if keyword in filename_lower:
                if confidence > best_match[1]:
                    best_match = (doc_type, confidence)

        doc_type, confidence = best_match

        return DocumentIntelligenceResult(
            document_type=doc_type.value,
            confidence=confidence,
            authenticity_score=85 + (confidence - 75) * 0.5,  # Estimate based on confidence
            warnings=["Using rule-based classification. For better accuracy, configure LLAMA_CLOUD_API_KEY"]
        )

    async def _classify_with_openai(self, text: str, filename: str) -> tuple[str, float]:
        """Use OpenAI GPT-4 to classify document based on content."""
        import logging
        import json
        logger = logging.getLogger(__name__)

        try:
            from openai import OpenAI
            from app.core.config import settings
            client = OpenAI(api_key=settings.OPENAI_API_KEY)

            # Take first 6000 chars for classification
            sample_text = text[:6000]

            prompt = f"""You are a KYC/AML document classification expert. Classify this investor onboarding document into EXACTLY ONE category based ONLY on the document content (ignore any filename hints).

DOCUMENT CONTENT:
{sample_text}

=== REQUIRED CATEGORIES (Choose ONE) ===

CORPORATE FORMATION:
• certificate_of_incorporation: Official certificate/charter from registry showing company formation (e.g., "Certificate of Incorporation", "Articles of Incorporation", "Certificate of Good Standing")
• articles_of_association: Company constitution, memorandum & articles, bylaws, operating agreement - MUST BE the actual constitution/bylaws document itself, NOT a report about amendments
• board_resolution: Board meeting minutes, resolutions, director decisions, SEC Form 8-K filings about board actions, proxy statements

FINANCIAL DOCUMENTS:
• audited_financials: Audited financial statements, annual reports with auditor signature, CPA certified financials (NOT bank statements)
• bank_statement: Monthly/quarterly bank account statements showing transactions (e.g., Chase, Wells Fargo statements)
• tax_return: Corporate tax returns, IRS filings, tax certificates

IDENTITY DOCUMENTS:
• passport: Government-issued passport with photo page
• national_id: National ID card, government ID card
• drivers_license: Driver's license

PROOF OF ADDRESS:
• utility_bill: Electricity, gas, water, internet bills showing address
• proof_of_address: Lease agreement, property deed, council tax bill

OTHER KYC DOCUMENTS:
• ubo_declaration: Ultimate Beneficial Owner declaration, ownership structure
• shareholder_register: Register/list of shareholders
• regulatory_license: Financial services license, professional license
• source_of_funds: Source of wealth/funds documentation
• aml_kyc_certificate: AML/KYC compliance certificates
• other: Any document not fitting above categories

=== CLASSIFICATION RULES ===
1. Bank statements are NEVER financial statements
2. Focus on document FORMAT and STRUCTURE, not just what it discusses
3. SEC filings (8-K, 10-K, 10-Q, proxy statements) about board actions = board_resolution
4. A document ABOUT bylaws/articles amendments is NOT the same as the bylaws/articles themselves
5. Look for key indicators: signatures, seals, official headers, transaction tables
6. If uncertain between two types, choose the PRIMARY document format

Return ONLY valid JSON:
{{
    "document_type": "one of the above types",
    "confidence": 0-100,
    "reasoning": "brief explanation of why this classification"
}}"""

            response = client.chat.completions.create(
                model="gpt-5-nano-2025-08-07",
                messages=[
                    {"role": "system", "content": "You are an expert in KYC/AML document classification. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ]
            )

            result = json.loads(response.choices[0].message.content.strip())
            doc_type = result.get("document_type", "other")
            confidence = float(result.get("confidence", 50))
            reasoning = result.get("reasoning", "")

            logger.info(f"🤖 OpenAI classification: {doc_type} ({confidence}%) - {reasoning}")

            return doc_type, confidence

        except Exception as e:
            logger.error(f"❌ OpenAI classification failed: {e}")
            # Fallback to keyword-based classification
            return self._classify_by_keywords(text, filename)

    async def _extract_structured_data(self, text: str, doc_type: str, filename: str) -> Dict[str, Any]:
        """Extract structured data from document using OpenAI."""
        import logging
        import json
        logger = logging.getLogger(__name__)

        try:
            from openai import OpenAI
            from app.core.config import settings
            client = OpenAI(api_key=settings.OPENAI_API_KEY)

            # Take first 6000 chars for extraction
            sample_text = text[:6000]

            # Create extraction prompt based on document type
            prompt = self._build_extraction_prompt(doc_type, filename, sample_text)

            response = client.chat.completions.create(
                model="gpt-5-nano-2025-08-07",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting structured data from KYC/AML documents. Return only valid JSON with the requested fields."},
                    {"role": "user", "content": prompt}
                ]
            )

            result = json.loads(response.choices[0].message.content.strip())
            logger.info(f"✅ OpenAI extracted fields: {list(result.keys())}")

            return result

        except Exception as e:
            logger.error(f"❌ OpenAI extraction failed: {e}")
            return {}

    def _build_extraction_prompt(self, doc_type: str, filename: str, text: str) -> str:
        """Build extraction prompt based on document type."""
        base_prompt = f"""Extract structured information from this KYC/AML document based ONLY on the content.

DOCUMENT TYPE: {doc_type}

DOCUMENT CONTENT:
{text}

"""

        # Document type specific extraction instructions
        if "certificate_of_incorporation" in doc_type.lower() or "incorporation" in doc_type.lower():
            return base_prompt + """Extract the following information and return as JSON:
{
    "company_name": "Full legal company name",
    "company_number": "Registration/incorporation number",
    "jurisdiction": "State/country of incorporation",
    "incorporation_date": "Date of incorporation (YYYY-MM-DD)",
    "registered_address": "Full registered address",
    "company_type": "Entity type (Corporation, LLC, etc.)",
    "directors": ["List of director names"],
    "officers": ["List of officer names with titles"],
    "authorized_shares": "Number of authorized shares"
}

If a field is not found, use null."""

        elif "board_resolution" in doc_type.lower() or "resolution" in doc_type.lower():
            return base_prompt + """Extract the following information and return as JSON:
{
    "company_name": "Company name",
    "meeting_date": "Date of board meeting (YYYY-MM-DD)",
    "resolution_title": "Title/subject of resolution",
    "directors_present": ["List of directors present"],
    "resolutions": ["List of resolutions passed"],
    "authorized_persons": ["Names authorized by the resolution"]
}

If a field is not found, use null."""

        elif "shareholder" in doc_type.lower() or "ownership" in doc_type.lower():
            return base_prompt + """Extract the following information and return as JSON:
{
    "company_name": "Company name",
    "shareholders": [
        {
            "name": "Shareholder name",
            "ownership_percentage": "% ownership",
            "share_class": "Class of shares",
            "number_of_shares": "Number of shares"
        }
    ],
    "total_shares": "Total outstanding shares",
    "as_of_date": "Date of register (YYYY-MM-DD)"
}

If a field is not found, use null."""

        elif "ubo" in doc_type.lower() or "beneficial" in doc_type.lower():
            return base_prompt + """Extract the following information and return as JSON:
{
    "company_name": "Company name",
    "ultimate_beneficial_owners": [
        {
            "name": "UBO name",
            "ownership_percentage": "% ultimate ownership",
            "nationality": "Nationality",
            "identification": "ID/Passport number"
        }
    ],
    "declaration_date": "Date of declaration (YYYY-MM-DD)"
}

If a field is not found, use null."""

        elif "passport" in doc_type.lower() or "national_id" in doc_type.lower() or "drivers_license" in doc_type.lower():
            return base_prompt + """Extract the following information and return as JSON:
{
    "full_name": "Full name as shown",
    "document_number": "ID/Passport/License number",
    "date_of_birth": "Date of birth (YYYY-MM-DD)",
    "nationality": "Nationality/Country",
    "issue_date": "Issue date (YYYY-MM-DD)",
    "expiry_date": "Expiry date (YYYY-MM-DD)",
    "place_of_birth": "Place of birth",
    "address": "Address if shown"
}

If a field is not found, use null."""

        elif "bank_statement" in doc_type.lower():
            return base_prompt + """Extract the following information and return as JSON:
{
    "account_holder": "Account holder name",
    "bank_name": "Name of bank",
    "account_number": "Last 4 digits of account (e.g., ***1234)",
    "statement_date": "Statement date (YYYY-MM-DD)",
    "address": "Account holder address",
    "account_type": "Type of account (Checking, Savings, etc.)"
}

If a field is not found, use null."""

        elif "financial" in doc_type.lower() or "audit" in doc_type.lower():
            return base_prompt + """Extract the following information and return as JSON:
{
    "company_name": "Company name",
    "fiscal_year": "Fiscal year",
    "auditor_name": "Name of auditing firm",
    "total_assets": "Total assets value",
    "total_liabilities": "Total liabilities value",
    "net_income": "Net income/profit",
    "audit_date": "Audit date (YYYY-MM-DD)",
    "currency": "Currency used"
}

If a field is not found, use null."""

        else:
            # Generic extraction for other document types
            return base_prompt + """Extract key information and return as JSON with appropriate fields.
Common fields to look for:
{
    "entity_name": "Company or person name",
    "document_date": "Document date (YYYY-MM-DD)",
    "reference_number": "Any reference/registration numbers",
    "key_parties": ["Names of key parties involved"],
    "addresses": ["Any addresses mentioned"]
}

If a field is not found, use null."""

    def _classify_by_keywords(self, text: str, filename: str) -> tuple[str, float]:
        """Fallback: Classify by keywords in text and filename."""
        import logging
        logger = logging.getLogger(__name__)

        # Only use document content for classification, not filename
        text_lower = text.lower()

        # Keyword patterns for each document type
        patterns = {
            KYCDocumentType.CERTIFICATE_OF_INCORPORATION: [
                ('certificate of incorporation', 95),
                ('secretary of state', 90),
                ('incorporated', 85),
                ('state of delaware', 85),
                ('certificate', 70)
            ],
            KYCDocumentType.PASSPORT: [
                ('passport', 95),
                ('nationality', 90),
                ('date of birth', 85),
                ('place of birth', 85)
            ],
            KYCDocumentType.NATIONAL_ID: [
                ('national id', 95),
                ('identity card', 90),
                ('id number', 85)
            ],
            KYCDocumentType.DRIVERS_LICENSE: [
                ('driver', 95),
                ('license', 90),
                ('dmv', 90)
            ],
            KYCDocumentType.BOARD_RESOLUTION: [
                ('board resolution', 95),
                ('board of directors', 90),
                ('resolved', 85),
                ('meeting', 80)
            ],
            KYCDocumentType.ARTICLES_OF_ASSOCIATION: [
                ('articles of association', 95),
                ('articles', 80),
                ('bylaws', 90)
            ],
            KYCDocumentType.BANK_STATEMENT: [
                ('bank statement', 95),
                ('account number', 85),
                ('balance', 80),
                ('transaction', 80)
            ],
            KYCDocumentType.UTILITY_BILL: [
                ('utility bill', 95),
                ('electric', 85),
                ('water bill', 85),
                ('gas bill', 85)
            ],
        }

        best_match = (KYCDocumentType.OTHER.value, 50)

        for doc_type, keywords in patterns.items():
            for keyword, base_confidence in keywords:
                if keyword in text_lower:
                    if base_confidence > best_match[1]:
                        best_match = (doc_type.value, base_confidence)
                    break

        logger.info(f"🔍 Keyword classification: {best_match[0]} ({best_match[1]}%)")
        return best_match

    def _map_to_kyc_type(self, intelli_type: str) -> str:
        """Map document_intelli_v1 types to KYC types."""
        mapping = {
            'certificate': KYCDocumentType.CERTIFICATE_OF_INCORPORATION.value,
            'form': KYCDocumentType.OTHER.value,
            'invoice': KYCDocumentType.OTHER.value,
            'receipt': KYCDocumentType.OTHER.value,
            'contract': KYCDocumentType.INVESTMENT_MANAGEMENT_AGREEMENT.value,
            'report': KYCDocumentType.AUDITED_FINANCIALS.value,
            'medical': KYCDocumentType.OTHER.value,
            'passport': KYCDocumentType.PASSPORT.value,
            'id': KYCDocumentType.NATIONAL_ID.value,
        }

        return mapping.get(intelli_type, KYCDocumentType.OTHER.value)


# Global instance
_doc_intelligence_service: Optional[DocumentIntelligenceService] = None


def get_document_intelligence_service() -> DocumentIntelligenceService:
    """Get or create the global document intelligence service instance."""
    global _doc_intelligence_service

    if _doc_intelligence_service is None:
        # Check if we should use LlamaIndex from settings
        from app.core.config import settings
        use_llamaindex = bool(settings.LLAMA_CLOUD_API_KEY)
        _doc_intelligence_service = DocumentIntelligenceService(use_llamaindex=use_llamaindex)

    return _doc_intelligence_service
