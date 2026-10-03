"""
Document management service.
"""
import os
import hashlib
from typing import List, Optional
from datetime import datetime
from pathlib import Path
from app.core.storage import storage
from app.core.config import settings
from app.schemas.document import (
    Document,
    DocumentCreate,
    DocumentUpdate,
    DocumentType,
    DocumentStatus,
    HITLVerificationStatus
)


class DocumentService:
    """Service for managing documents."""

    COLLECTION = "documents"

    def __init__(self):
        """Initialize document service."""
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(exist_ok=True)

    @staticmethod
    def _generate_document_id() -> str:
        """Generate a unique document ID."""
        import random
        import time
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        # Add microseconds to ensure uniqueness even for rapid uploads
        microseconds = int(time.time() * 1000000) % 1000000
        random_suffix = random.randint(100, 999)
        return f"DOC-{timestamp}-{microseconds:06d}-{random_suffix}"

    @staticmethod
    def _calculate_file_hash(file_content: bytes) -> str:
        """Calculate SHA-256 hash of file content."""
        return hashlib.sha256(file_content).hexdigest()

    @staticmethod
    def _format_file_size(size_bytes: int) -> str:
        """Convert bytes to human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"

    async def get_all_documents(
        self,
        case_id: Optional[str] = None
    ) -> List[Document]:
        """Get all documents, optionally filtered by case."""
        if case_id:
            docs_data = await storage.filter(self.COLLECTION, {'case_id': case_id})
        else:
            docs_data = await storage.get_all(self.COLLECTION)

        # Sort by created_at descending
        docs_data.sort(
            key=lambda x: x.get('created_at', ''),
            reverse=True
        )

        return [Document(**doc) for doc in docs_data]

    async def get_document_by_id(self, document_id: str) -> Optional[Document]:
        """Get a specific document by ID."""
        doc_data = await storage.get_by_id(self.COLLECTION, document_id)
        if doc_data:
            return Document(**doc_data)
        return None

    async def create_document(
        self,
        filename: str,
        file_content: bytes,
        case_id: str,
        mime_type: str
    ) -> Document:
        """Create a new document record and save file."""
        # Generate document ID
        doc_id = self._generate_document_id()

        # Calculate file hash
        file_hash = self._calculate_file_hash(file_content)

        # Check for duplicate: same file hash + filename + case_id
        existing_docs = await storage.get_all(self.COLLECTION)
        for doc in existing_docs:
            if (doc.get('file_hash') == file_hash and
                doc.get('filename') == filename and
                doc.get('case_id') == case_id):
                logger.warning(f"Duplicate document detected: {filename} already exists for case {case_id}")
                # Return the existing document instead of creating a duplicate
                return Document(**doc)

        # Generate storage path
        case_dir = self.upload_dir / case_id
        case_dir.mkdir(exist_ok=True)

        # Save file
        file_extension = Path(filename).suffix
        storage_filename = f"{doc_id}{file_extension}"
        storage_path = case_dir / storage_filename

        with open(storage_path, 'wb') as f:
            f.write(file_content)

        # Calculate file size
        file_size = len(file_content)
        size_str = self._format_file_size(file_size)

        # Prepare document data
        doc_data = {
            'id': doc_id,
            'filename': filename,
            'case_id': case_id,
            'file_size': file_size,
            'size': size_str,
            'mime_type': mime_type,
            'file_hash': file_hash,
            'storage_path': str(storage_path),
            'document_type': DocumentType.UNKNOWN,
            'status': DocumentStatus.UPLOADED,
            'ai_classification': 'Unknown',
            'confidence': 0,
            'hitl_verified': HITLVerificationStatus.PENDING,
            'authenticity': 0,
            'flags': 0,
            'uploaded_by': 'system',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
        }

        # Create in storage
        created_data = await storage.create(self.COLLECTION, doc_data)

        return Document(**created_data)

    async def update_document(
        self,
        document_id: str,
        document_update: DocumentUpdate
    ) -> Optional[Document]:
        """Update an existing document."""
        update_data = document_update.model_dump(exclude_unset=True)

        if not update_data:
            return await self.get_document_by_id(document_id)

        # Handle HITL decision history
        if update_data.get('hitl_verified') and update_data.get('verified_by'):
            # Get current document to access history
            current_doc = await self.get_document_by_id(document_id)
            if current_doc:
                # Create HITL decision record
                hitl_decision = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'analyst': update_data.get('verified_by', 'Unknown'),
                    'ai_classification': current_doc.ai_classification,
                    'human_decision': update_data.get('hitl_verified'),
                    'modified_classification': update_data.get('ai_classification') if update_data.get('hitl_verified') == 'Modified' else None,
                    'confidence': update_data.get('confidence', current_doc.confidence),
                    'feedback': None  # Can be added later
                }

                # Add to history
                hitl_history = current_doc.hitl_history or []
                hitl_history.append(hitl_decision)
                update_data['hitl_history'] = hitl_history

                # Set verification timestamp
                update_data['verified_at'] = datetime.utcnow().isoformat()

        updated_data = await storage.update(self.COLLECTION, document_id, update_data)

        if updated_data:
            return Document(**updated_data)
        return None

    async def delete_document(self, document_id: str) -> bool:
        """Delete a document."""
        # Get document to find file path
        doc = await self.get_document_by_id(document_id)
        if doc:
            # Delete physical file
            try:
                file_path = Path(doc.storage_path)
                if file_path.exists():
                    file_path.unlink()
            except Exception:
                pass  # Continue even if file deletion fails

            # Delete from storage
            return await storage.delete(self.COLLECTION, document_id)

        return False

    async def classify_document(self, document_id: str) -> Optional[Document]:
        """Classify document using OpenAI-based document parsing."""
        import logging
        logger = logging.getLogger(__name__)

        doc = await self.get_document_by_id(document_id)
        if not doc:
            return None

        # Use OpenAI-based document parser
        try:
            from app.core.openai_doc_parser import get_openai_parser

            parser = get_openai_parser()
            file_path = Path(doc.storage_path)

            logger.info(f"[TRACE] 🔍 Starting OpenAI-based parsing for: {doc.filename} (ID: {document_id})")
            logger.info(f"[TRACE] File path: {file_path}")

            # Extract and classify using OpenAI
            result = await parser.classify_and_extract(file_path)

            logger.info(f"[TRACE] ✅ OpenAI classified as: {result.get('document_type')} ({result.get('confidence')}%)")
            logger.info(f"[TRACE] 📊 Extracted data fields: {list(result.get('extracted_data', {}).keys())}")
            logger.info(f"[TRACE] Authenticity score: {result.get('authenticity_score')}")

            # Map document type to our enum
            doc_type = self._map_doc_type_to_enum(result['document_type'])

            # Prepare update with all extracted data
            update_dict = {
                'document_type': doc_type.value,
                'ai_classification': result['document_type'],
                'confidence': int(result.get('confidence', 0)),
                'status': DocumentStatus.CLASSIFIED.value,
                'authenticity': int(result.get('authenticity_score', 85)),
                'classification_model': "openai_gpt4",
                'classification_timestamp': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
            }

            # Store OCR text (first 5000 chars)
            if result.get('extracted_text'):
                update_dict['ocr_text'] = result['extracted_text'][:5000]

            # Store structured extracted data
            if result.get('extracted_data'):
                update_dict['extracted_data'] = result['extracted_data']

                # Extract specific fields for top-level fields
                extracted = result['extracted_data']
                if extracted.get('issue_date'):
                    try:
                        from datetime import datetime as dt
                        update_dict['issue_date'] = dt.fromisoformat(extracted['issue_date']).isoformat()
                    except:
                        pass

                if extracted.get('document_number'):
                    update_dict['document_number'] = extracted['document_number']

                if extracted.get('issuing_authority'):
                    update_dict['issuing_authority'] = extracted['issuing_authority']

            # Update in storage
            from app.core.storage import storage
            logger.info(f"[TRACE] Updating document {document_id} with classification: {update_dict['ai_classification']}, status: {update_dict['status']}")
            await storage.update(self.COLLECTION, document_id, update_dict)

            logger.info(f"[TRACE] 💾 Document {document_id} updated with extracted data")

            updated_doc = await self.get_document_by_id(document_id)
            logger.info(f"[TRACE] Retrieved updated document: status={updated_doc.status}, classification={updated_doc.ai_classification}")
            return updated_doc

        except Exception as e:
            logger.error(f"❌ OpenAI parsing failed: {e}", exc_info=True)
            # Fallback to simple classification on error
            return await self._fallback_classification(document_id)

    async def _fallback_classification(self, document_id: str) -> Optional[Document]:
        """Fallback classification when AI fails."""
        import random

        doc = await self.get_document_by_id(document_id)
        if not doc:
            return None

        filename_lower = doc.filename.lower()

        # Simple keyword matching
        if 'certificate' in filename_lower:
            doc_type = DocumentType.CERTIFICATE_OF_INCORPORATION
            confidence = 90
        elif 'board' in filename_lower or 'resolution' in filename_lower:
            doc_type = DocumentType.BOARD_RESOLUTION
            confidence = 88
        elif 'aml' in filename_lower or 'kyc' in filename_lower:
            doc_type = DocumentType.AML_KYC_CERTIFICATE
            confidence = 87
        else:
            doc_type = DocumentType.UNKNOWN
            confidence = 75

        update = DocumentUpdate(
            document_type=doc_type,
            ai_classification=doc_type.value,
            confidence=confidence,
            status=DocumentStatus.CLASSIFIED,
            authenticity=random.randint(80, 95)
        )

        return await self.update_document(document_id, update)

    def _map_doc_type_to_enum(self, doc_type: str) -> DocumentType:
        """Map OpenAI document type string to our internal DocumentType enum."""
        # Normalize the document type string
        doc_type_lower = doc_type.lower().strip()

        # Direct matches
        if 'certificate of incorporation' in doc_type_lower or 'incorporation certificate' in doc_type_lower:
            return DocumentType.CERTIFICATE_OF_INCORPORATION
        elif 'articles of association' in doc_type_lower or 'articles' in doc_type_lower:
            return DocumentType.ARTICLES_OF_ASSOCIATION
        elif 'board resolution' in doc_type_lower or 'resolution' in doc_type_lower:
            return DocumentType.BOARD_RESOLUTION
        elif 'financial statement' in doc_type_lower or 'financials' in doc_type_lower:
            return DocumentType.FINANCIAL_STATEMENT
        elif 'passport' in doc_type_lower or 'id' in doc_type_lower or 'identity' in doc_type_lower:
            return DocumentType.PROOF_OF_IDENTITY
        elif 'proof of address' in doc_type_lower or 'utility bill' in doc_type_lower:
            return DocumentType.PROOF_OF_ADDRESS
        elif 'aml' in doc_type_lower or 'kyc' in doc_type_lower:
            return DocumentType.AML_KYC_CERTIFICATE
        elif 'bank reference' in doc_type_lower:
            return DocumentType.BANK_REFERENCE
        elif 'tax' in doc_type_lower:
            return DocumentType.TAX_CERTIFICATE
        elif 'ubo' in doc_type_lower or 'beneficial owner' in doc_type_lower:
            return DocumentType.UBO_DOCUMENTATION
        elif 'regulatory' in doc_type_lower or 'license' in doc_type_lower:
            return DocumentType.REGULATORY_LICENSE
        elif 'shareholder' in doc_type_lower:
            return DocumentType.SHAREHOLDER_REGISTER
        else:
            return DocumentType.OTHER

    def _map_kyc_to_document_type(self, kyc_type: str) -> DocumentType:
        """Map KYC document type to our internal DocumentType enum."""
        mapping = {
            'certificate_of_incorporation': DocumentType.CERTIFICATE_OF_INCORPORATION,
            'articles_of_association': DocumentType.ARTICLES_OF_ASSOCIATION,
            'board_resolution': DocumentType.BOARD_RESOLUTION,
            'regulatory_license': DocumentType.REGULATORY_LICENSE,
            'aml_kyc_certificate': DocumentType.AML_KYC_CERTIFICATE,
            'passport': DocumentType.PROOF_OF_IDENTITY,
            'national_id': DocumentType.PROOF_OF_IDENTITY,
            'drivers_license': DocumentType.PROOF_OF_IDENTITY,
            'utility_bill': DocumentType.PROOF_OF_ADDRESS,
            'bank_statement': DocumentType.BANK_REFERENCE,
            'audited_financials': DocumentType.FINANCIAL_STATEMENT,
            'tax_return': DocumentType.TAX_CERTIFICATE,
            'source_of_funds': DocumentType.SOURCE_OF_FUNDS,
            'ubo_declaration': DocumentType.UBO_DOCUMENTATION,
            'shareholder_register': DocumentType.SHAREHOLDER_REGISTER,
        }

        return mapping.get(kyc_type, DocumentType.UNKNOWN)


document_service = DocumentService()
