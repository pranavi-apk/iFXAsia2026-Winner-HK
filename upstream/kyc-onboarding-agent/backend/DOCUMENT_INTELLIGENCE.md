# Document Intelligence Integration

The the global bank IRA backend now includes optional AI-powered document classification using the document_intelli_v1 system.

## Overview

The backend can now:
- **Classify documents automatically** using AI or rule-based methods
- **Extract structured data** from KYC/AML documents
- **Support 20+ document types** relevant to investor onboarding
- **Provide confidence scores** for classifications
- **Extract text content** from PDF/images via OCR

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  the global bank IRA Backend                     │
│              (FastAPI + JSON Storage)                 │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│          DocumentIntelligenceService                  │
│         (app/core/doc_intelligence.py)                │
│                                                       │
│  ┌──────────────┐         ┌──────────────┐          │
│  │ AI Mode      │         │ Fallback     │          │
│  │ (LlamaIndex) │    OR   │ (Rule-based) │          │
│  └──────────────┘         └──────────────┘          │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│           document_intelli_v1 System                  │
│     (Separate project in parent directory)            │
│                                                       │
│  - LlamaIndex Stack (LlamaParse, Classify, Extract)  │
│  - LandingAI Stack  (ADE Document Processing)        │
│  - Gemini Integration (Handwriting recognition)      │
└──────────────────────────────────────────────────────┘
```

## How It Works

### Mode 1: AI-Powered Classification (Recommended)

When `LLAMA_CLOUD_API_KEY` is configured:

1. **Upload** - Document is uploaded and saved to filesystem
2. **Parse** - LlamaParse converts PDF/image to structured markdown
3. **Classify** - LlamaClassify identifies document type with confidence score
4. **Extract** - Optionally extract structured fields (future feature)
5. **Store** - Results saved to JSON with classification metadata

### Mode 2: Fallback Classification (Default)

When API key is not configured:

1. **Upload** - Document is uploaded and saved
2. **Analyze** - Filename analyzed for keywords
3. **Classify** - Rule-based classification based on filename patterns
4. **Store** - Results saved with lower confidence scores

The system automatically falls back to rule-based classification if AI processing fails.

## Supported Document Types

### Corporate Documents
- Certificate of Incorporation
- Articles of Association
- Memorandum of Association
- Certificate of Incumbency
- Board Resolution

### Regulatory Documents
- Investment Management Agreement
- Prospectus
- Offering Memorandum
- Regulatory License

### Identity Documents
- Passport
- National ID
- Driver's License

### Proof of Address
- Utility Bill
- Bank Statement
- Lease Agreement

### Financial Documents
- Audited Financials
- Tax Return
- Source of Funds Declaration
- Source of Wealth Declaration

### UBO Documents
- UBO Declaration
- Ownership Structure Chart
- Shareholder Register

### AML/KYC
- AML/KYC Certificate

## Setup

### Option 1: With AI (Recommended for Production)

```bash
# 1. Get API key from https://cloud.llamaindex.ai
# 2. Add to .env file
echo "LLAMA_CLOUD_API_KEY=llx-your-key-here" >> .env

# 3. Install optional dependencies
pip install llama-cloud>=1.2.0 Pillow>=10.0.0

# 4. Restart server
uvicorn app.main:app --reload
```

### Option 2: Without AI (Development/Testing)

No additional setup required! The backend will automatically use rule-based classification.

## API Usage

### Upload and Classify Document

```bash
# Upload document (automatically classified)
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "case_id=CASE-2024-0847" \
  -F "file=@certificate_of_incorporation.pdf"
```

**Response:**
```json
{
  "document": {
    "id": "DOC-123",
    "filename": "certificate_of_incorporation.pdf",
    "ai_classification": "certificate_of_incorporation",
    "confidence": 98,
    "authenticity": 96,
    "status": "Classified",
    "document_type": "Certificate of Incorporation"
  },
  "message": "Document uploaded and classified successfully",
  "processing_started": true
}
```

### Re-classify Existing Document

```bash
# Trigger classification for existing document
curl -X POST http://localhost:8000/api/v1/documents/DOC-123/classify
```

## Configuration

### Environment Variables

```env
# Optional: Enable AI-powered classification
LLAMA_CLOUD_API_KEY=llx-your-key-here

# Future: Alternative processors
# LANDINGAI_API_KEY=your-key
# GOOGLE_API_KEY=your-key
```

### Classification Settings

Edit `app/core/doc_intelligence.py` to customize:

```python
# Choose processor
doc_intelligence = DocumentIntelligenceService(
    use_llamaindex=True  # False for rule-based only
)
```

## API Responses

### Classification Result

```python
DocumentIntelligenceResult:
  - document_type: str          # KYC document type
  - confidence: float           # 0-100 confidence score
  - extracted_text: Optional[str]  # First 500 chars of text
  - extracted_fields: Dict      # Future: structured data
  - authenticity_score: float   # 0-100 authenticity estimate
  - processing_time_ms: float   # Processing duration
  - warnings: List[str]         # Any warnings/issues
```

### Document Model (Updated)

```python
Document:
  # ... existing fields ...

  # Classification fields
  document_type: DocumentType
  ai_classification: str         # Detailed classification
  confidence: int                # 0-100
  classification_model: str      # "document_intelligence_v1"
  classification_timestamp: datetime

  # Extracted data
  ocr_text: Optional[str]        # Extracted text content
  extracted_data: Dict           # Structured fields

  # Quality metrics
  authenticity: int              # 0-100
  verification_issues: List[str]
```

## Performance

### AI Mode (with LlamaIndex)

- **Parsing**: ~2-5 seconds per page
- **Classification**: ~1-2 seconds
- **Total**: ~3-7 seconds per document

### Fallback Mode (Rule-based)

- **Classification**: <100ms
- **Total**: <100ms per document

## Cost Estimation

Using LlamaCloud API (as of 2024):

| Operation | Cost per 1000 pages |
|-----------|---------------------|
| Parse (Agentic) | ~$10 |
| Classify | ~$1 |
| Extract | ~$5 |
| **Total** | **~$16** |

For development, use fallback mode to avoid costs.

## Troubleshooting

### Issue: "Using rule-based classification" warning

**Cause**: `LLAMA_CLOUD_API_KEY` not set

**Solution**:
```bash
# Add API key to .env
echo "LLAMA_CLOUD_API_KEY=llx-your-key" >> .env

# Restart server
```

### Issue: "Could not import document_intelli_v1"

**Cause**: document_intelli_v1 directory not found

**Solution**:
```bash
# Verify directory structure
ls -la ../document_intelli_v1

# Should show the document_intelli_v1 directory
# If missing, clone/copy it to parent directory
```

### Issue: Low confidence scores

**Cause**: Using fallback classification

**Solution**:
- Enable AI mode with API key
- Or improve filename to include keywords
- Examples:
  - ✅ "certificate_of_incorporation_acme.pdf"
  - ❌ "doc_001.pdf"

### Issue: Classification errors

**Check logs**:
```bash
# Server will show:
"AI classification failed: [error], falling back to rule-based"
```

**Common causes**:
- Invalid API key
- Network connectivity
- Unsupported file format
- File size too large

## Future Enhancements

### Planned Features

1. **Structured Extraction**
   - Extract specific fields (names, dates, amounts)
   - Pydantic schemas for each document type
   - Validation of extracted data

2. **LandingAI Integration**
   - Alternative AI processor
   - Bounding box annotations
   - Page-level processing

3. **Gemini Handwriting**
   - Handwritten document support
   - Math formula extraction
   - Form field recognition

4. **Advanced Features**
   - Document similarity detection
   - Fraud detection
   - Multi-language support
   - Batch processing

### Integration Roadmap

```
Phase 1 (Current):
  ✅ Basic classification
  ✅ Fallback mode
  ✅ KYC document types

Phase 2 (Next):
  🔄 Structured extraction
  🔄 Confidence thresholds
  🔄 Background processing

Phase 3 (Future):
  ⏳ LandingAI integration
  ⏳ Gemini handwriting
  ⏳ Advanced analytics
```

## Code Examples

### Using Document Intelligence Service Directly

```python
from app.core.doc_intelligence import get_document_intelligence_service
from pathlib import Path

# Get service instance
doc_intel = get_document_intelligence_service()

# Classify a document
result = await doc_intel.classify_document(
    file_path=Path("uploads/CASE-123/DOC-456.pdf")
)

print(f"Type: {result.document_type}")
print(f"Confidence: {result.confidence}%")
print(f"Authenticity: {result.authenticity_score}%")
```

### Custom Document Types

Add new types in `app/core/doc_intelligence.py`:

```python
class KYCDocumentType(str, Enum):
    # Add your custom type
    CUSTOM_DOCUMENT = "custom_document"
```

Then add classification rules:

```python
classifications = {
    # ... existing ...
    'custom': (KYCDocumentType.CUSTOM_DOCUMENT, 90),
}
```

## Testing

### Test with Sample Documents

```bash
# 1. Upload test document
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "case_id=TEST-001" \
  -F "file=@test_certificate.pdf"

# 2. Check classification
curl http://localhost:8000/api/v1/documents/DOC-XXX

# 3. Verify fields:
#    - document_type
#    - ai_classification
#    - confidence
#    - authenticity
```

### Unit Testing

```python
import pytest
from app.core.doc_intelligence import DocumentIntelligenceService

@pytest.mark.asyncio
async def test_classification():
    service = DocumentIntelligenceService(use_llamaindex=False)

    result = await service.classify_document(
        Path("test_docs/certificate.pdf")
    )

    assert result.document_type != "unknown"
    assert result.confidence > 70
```

## Best Practices

### For Development
- Use fallback mode (no API key required)
- Test with descriptive filenames
- Mock AI responses in tests

### For Production
- Enable AI mode with API key
- Set up background task queue
- Monitor classification accuracy
- Log all processing errors
- Implement retry logic

### For Accuracy
- Use descriptive filenames
- Ensure good document quality
- Upload clear scans/photos
- Validate results manually initially

## Support

### Documentation
- Backend README: `backend/README.md`
- API Docs: http://localhost:8000/api/docs
- Document Intelligence: This file

### Debugging
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Getting Help
1. Check server logs for errors
2. Verify API key is valid
3. Test with sample documents
4. Review document_intelli_v1 documentation

---

## Summary

✅ **Document intelligence is integrated and ready to use!**

- Works out of the box with rule-based classification
- Optionally use AI for better accuracy (requires API key)
- Supports 20+ KYC/AML document types
- Automatic fallback if AI fails
- Easy to test and deploy

Add `LLAMA_CLOUD_API_KEY` to `.env` for AI-powered classification, or use as-is for development with rule-based classification.
