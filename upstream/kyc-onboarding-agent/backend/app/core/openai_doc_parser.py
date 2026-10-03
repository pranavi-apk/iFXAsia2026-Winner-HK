"""
Document parsing using LlamaIndex (document_intelli_v1) with fallback to OpenAI.

This parser preferably uses the LlamaIndex stack from document_intelli_v1 which
handles scanned PDFs and images properly. Falls back to PyPDF2 + OpenAI if unavailable.
"""
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import json
import os

logger = logging.getLogger(__name__)


class OpenAIDocumentParser:
    """Parse documents using LlamaIndex stack (preferred) or OpenAI GPT-4 (fallback)."""

    def __init__(self, api_key: str):
        """Initialize with OpenAI API key (used as fallback)."""
        self.api_key = api_key
        self.use_llamaindex = False

        # Try to use LlamaIndex from document_intelli_v1
        try:
            from app.core.doc_intelligence import get_document_intelligence_service
            self.doc_intelligence = get_document_intelligence_service()
            if self.doc_intelligence.processor:
                self.use_llamaindex = True
                logger.info("✅ Using LlamaIndex stack from document_intelli_v1")
            else:
                logger.info("⚠️  LlamaIndex not available, falling back to OpenAI+PyPDF2")
                self._init_openai_fallback()
        except Exception as e:
            logger.warning(f"Could not initialize LlamaIndex: {e}, using OpenAI fallback")
            self._init_openai_fallback()

    def _init_openai_fallback(self):
        """Initialize OpenAI client for fallback."""
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
        except ImportError:
            logger.error("OpenAI package not installed. Install with: pip install openai")
            raise

    async def classify_and_extract(
        self,
        file_path: Path
    ) -> Dict[str, Any]:
        """
        Classify document and extract structured data using LlamaIndex or OpenAI fallback.

        Returns:
            {
                'document_type': str,
                'confidence': int,
                'extracted_text': str,
                'extracted_data': dict,
                'authenticity_score': int
            }
        """
        # Use LlamaIndex if available (handles scanned PDFs and images properly)
        if self.use_llamaindex:
            try:
                return await self._classify_with_llamaindex(file_path)
            except Exception as e:
                logger.error(f"LlamaIndex parsing failed: {e}, falling back to OpenAI")
                # Fall through to OpenAI fallback

        # Fallback: Use PyPDF2 + OpenAI
        return await self._classify_with_openai_fallback(file_path)

    async def _classify_with_llamaindex(self, file_path: Path) -> Dict[str, Any]:
        """Use LlamaIndex stack to parse and classify document."""
        logger.info(f"📄 Using LlamaIndex to parse {file_path.name}")

        # Use the document intelligence service
        result = await self.doc_intelligence.classify_document(file_path)

        # Map to expected format
        return {
            'document_type': self._normalize_doc_type(result.document_type),
            'confidence': int(result.confidence),
            'extracted_text': result.extracted_text or '',
            'extracted_data': result.extracted_fields,
            'authenticity_score': int(result.authenticity_score) if result.authenticity_score else 85
        }

    def _normalize_doc_type(self, doc_type: str) -> str:
        """Normalize document type to user-friendly format."""
        # Convert snake_case to Title Case
        if '_' in doc_type:
            return ' '.join(word.capitalize() for word in doc_type.split('_'))
        return doc_type.capitalize()

    async def _classify_with_openai_fallback(self, file_path: Path) -> Dict[str, Any]:
        """Fallback: Use PyPDF2 + OpenAI GPT-4."""
        logger.info(f"📄 Using OpenAI+PyPDF2 fallback for {file_path.name}")

        # Extract text using PyPDF2
        extracted_text = self._extract_text_from_pdf(file_path)

        if not extracted_text or len(extracted_text) < 50:
            logger.warning(f"Very little text extracted ({len(extracted_text) if extracted_text else 0} chars), document may be scanned image")
            return {
                'document_type': 'unknown',
                'confidence': 0,
                'extracted_text': extracted_text or '',
                'extracted_data': {},
                'authenticity_score': 0
            }

        # Use OpenAI to classify and extract
        try:
            result = await self._call_openai_for_extraction(extracted_text, file_path.name)
            result['extracted_text'] = extracted_text
            return result
        except Exception as e:
            logger.error(f"OpenAI extraction failed: {e}")
            return {
                'document_type': 'unknown',
                'confidence': 0,
                'extracted_text': extracted_text,
                'extracted_data': {},
                'authenticity_score': 0
            }

    def _extract_text_from_pdf(self, pdf_path: Path) -> str:
        """Extract text from PDF using PyPDF2."""
        try:
            import PyPDF2
        except ImportError:
            logger.error("PyPDF2 not installed")
            return ""

        text = ""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            logger.info(f"Extracted {len(text)} characters from {pdf_path.name}")
            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            return ""

    async def _call_openai_for_extraction(self, text: str, filename: str) -> Dict[str, Any]:
        """Call OpenAI GPT-4 to extract structured data."""
        prompt = f"""Extract information from this investor onboarding document.

DOCUMENT TEXT:
{text[:4000]}

Return JSON with:
{{
    "document_type": "Certificate of Incorporation|Board Resolution|Financial Statement|Passport/ID|Proof of Address|Other",
    "confidence": 0-100,
    "extracted_data": {{
        "company_name": "...",
        "company_number": "...",
        "directors": [],
        "shareholders": []
    }},
    "authenticity_score": 0-100
}}"""

        response = self.client.chat.completions.create(
            model="gpt-5-nano-2025-08-07",
            messages=[
                {"role": "system", "content": "Return only valid JSON"},
                {"role": "user", "content": prompt}
            ]
        )

        try:
            return json.loads(response.choices[0].message.content.strip())
        except json.JSONDecodeError:
            return {
                'document_type': 'unknown',
                'confidence': 0,
                'extracted_data': {},
                'authenticity_score': 0
            }


# Singleton instance
_parser_instance: Optional[OpenAIDocumentParser] = None


def get_openai_parser() -> OpenAIDocumentParser:
    """Get or create parser instance."""
    global _parser_instance
    if _parser_instance is None:
        from app.core.config import settings
        api_key = settings.OPENAI_API_KEY or ""
        logger.info(f"🔧 Creating new OpenAIDocumentParser singleton instance")
        logger.info(f"  - OPENAI_API_KEY: {'✅ Set' if api_key else '❌ Not set'}")
        logger.info(f"  - LLAMA_CLOUD_API_KEY: {'✅ Set' if settings.LLAMA_CLOUD_API_KEY else '❌ Not set'}")
        _parser_instance = OpenAIDocumentParser(api_key=api_key)
        logger.info(f"  - Result: use_llamaindex={_parser_instance.use_llamaindex}")
    return _parser_instance
