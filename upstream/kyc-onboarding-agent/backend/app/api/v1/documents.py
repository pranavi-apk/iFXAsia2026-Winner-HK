"""
Documents API endpoints.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form, Query
from fastapi.responses import FileResponse
from app.schemas.document import (
    Document,
    DocumentUpdate,
    DocumentListResponse,
    DocumentUploadResponse
)
from app.services.document_service import document_service
from app.core.config import settings


router = APIRouter()


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="Get all documents",
    description="Retrieve all documents, optionally filtered by case ID"
)
async def get_documents(
    case_id: Optional[str] = Query(None, description="Filter by case ID")
):
    """Get all documents, optionally filtered by case."""
    documents = await document_service.get_all_documents(case_id=case_id)
    return DocumentListResponse(
        documents=documents,
        total=len(documents),
        case_id=case_id
    )


@router.get(
    "/{document_id}",
    response_model=Document,
    summary="Get document by ID",
    description="Retrieve a specific document by its ID"
)
async def get_document(document_id: str):
    """Get a specific document by ID."""
    document = await document_service.get_document_by_id(document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )
    return document


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document",
    description="Upload a new document to a case"
)
async def upload_document(
    case_id: str = Form(..., description="Case ID to attach document to"),
    file: UploadFile = File(..., description="Document file to upload")
):
    """
    Upload a new document.

    This endpoint:
    1. Accepts a file upload
    2. Saves the file to the filesystem
    3. Creates a document record
    4. Returns the document metadata

    NOTE: Documents are stored with status="uploaded" but NOT processed.
    To trigger AI assessment, use the "Run AI Assessment" button which calls
    the case assessment endpoint.
    """
    # Validate file size
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes"
        )

    # Validate file type
    if not file.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not determine file type"
        )

    # Create document
    try:
        document = await document_service.create_document(
            filename=file.filename or "unknown",
            file_content=file_content,
            case_id=case_id,
            mime_type=file.content_type
        )

        # NOTE: We do NOT auto-classify on upload anymore.
        # Classification happens when user clicks "Run AI Assessment"

        return DocumentUploadResponse(
            document=document,
            message="Document uploaded successfully. Click 'Run AI Assessment' to process.",
            processing_started=False
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.put(
    "/{document_id}",
    response_model=Document,
    summary="Update a document",
    description="Update document metadata"
)
async def update_document(document_id: str, document_update: DocumentUpdate):
    """Update document metadata."""
    document = await document_service.update_document(document_id, document_update)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )
    return document


@router.patch(
    "/{document_id}",
    response_model=Document,
    summary="Partially update a document",
    description="Partially update document metadata (HITL review, verification status, etc.)"
)
async def patch_document(document_id: str, document_update: DocumentUpdate):
    """Partially update document metadata."""
    document = await document_service.update_document(document_id, document_update)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )
    return document


@router.post(
    "/{document_id}/classify",
    response_model=Document,
    summary="Classify a document",
    description="Trigger AI classification for a document"
)
async def classify_document(document_id: str):
    """Classify a document using AI."""
    document = await document_service.classify_document(document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )
    return document


@router.get(
    "/{document_id}/download",
    summary="Download a document",
    description="Download the actual document file"
)
async def download_document(document_id: str):
    """Download a document file."""
    document = await document_service.get_document_by_id(document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )

    from pathlib import Path
    file_path = Path(document.storage_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on disk"
        )

    return FileResponse(
        path=str(file_path),
        filename=document.filename,
        media_type=document.mime_type
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document",
    description="Delete a document from the system"
)
async def delete_document(document_id: str):
    """Delete a document."""
    success = await document_service.delete_document(document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )
    return None
