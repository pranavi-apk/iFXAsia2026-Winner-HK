# the global bank IRA Backend - Complete Setup Guide

## Overview

This document provides step-by-step instructions for setting up and running the the global bank Investor Risk Assessment backend server.

## What Was Built

A complete FastAPI backend with:
- ✅ JSON-based file storage (no database needed)
- ✅ Cases management API
- ✅ Documents upload and management API
- ✅ Dashboard statistics endpoint
- ✅ CORS enabled for frontend integration
- ✅ Auto-generated API documentation
- ✅ Mock AI classification for documents

## Quick Start

```bash
# 1. Navigate to backend directory
cd backend

# 2. Activate virtual environment
source env/bin/activate  # On macOS/Linux
# env\Scripts\activate   # On Windows

# 3. Install dependencies (already done)
pip install -r requirements.txt

# 4. Initialize seed data (already done)
python scripts/seed_data.py

# 5. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Access Points

Once the server is running:

- **API Base URL**: http://localhost:8000
- **Swagger UI Documentation**: http://localhost:8000/api/docs
- **ReDoc Documentation**: http://localhost:8000/api/redoc
- **Health Check**: http://localhost:8000/health

## Testing the API

### 1. Check Server Health

```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "app": "the global bank Investor Risk Assessment",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-02-06T19:50:22.489584"
}
```

### 2. Get Dashboard Statistics

```bash
curl http://localhost:8000/api/v1/cases/stats
```

**Expected Response:**
```json
{
  "total_cases": 3,
  "in_review": 1,
  "approved": 1,
  "escalated": 0,
  "pending_docs": 1,
  "avg_completion_days": 23.0,
  "hitl_pending": 1
}
```

### 3. List All Cases

```bash
curl http://localhost:8000/api/v1/cases
```

Returns a list of all cases with pagination support.

### 4. Create a New Case

```bash
curl -X POST http://localhost:8000/api/v1/cases \
  -H "Content-Type: application/json" \
  -d '{
    "investor_name": "Test Investment Fund",
    "investor_type": "Hedge Fund",
    "jurisdiction": "United States",
    "assigned_to": "Jane Smith"
  }'
```

### 5. Upload a Document

```bash
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "case_id=CASE-2024-0847" \
  -F "file=@/path/to/your/document.pdf"
```

The backend will:
- Save the file to `uploads/{case_id}/`
- Calculate file hash and metadata
- Simulate AI classification based on filename
- Return document details with classification results

### 6. Get Documents for a Case

```bash
curl http://localhost:8000/api/v1/documents?case_id=CASE-2024-0847
```

## API Endpoints Summary

### Cases API (`/api/v1/cases`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cases` | List all cases (paginated) |
| GET | `/api/v1/cases/stats` | Get dashboard statistics |
| GET | `/api/v1/cases/{case_id}` | Get case by ID |
| POST | `/api/v1/cases` | Create a new case |
| PUT | `/api/v1/cases/{case_id}` | Update a case |
| PATCH | `/api/v1/cases/{case_id}/mark-viewed` | Mark case as viewed |
| DELETE | `/api/v1/cases/{case_id}` | Delete a case |

### Documents API (`/api/v1/documents`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/documents` | List all documents (optional case filter) |
| GET | `/api/v1/documents/{document_id}` | Get document by ID |
| POST | `/api/v1/documents/upload` | Upload a document |
| PUT | `/api/v1/documents/{document_id}` | Update document metadata |
| POST | `/api/v1/documents/{document_id}/classify` | Classify document with AI |
| GET | `/api/v1/documents/{document_id}/download` | Download document file |
| DELETE | `/api/v1/documents/{document_id}` | Delete a document |

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── api/v1/
│   │   ├── cases.py           # Cases endpoints
│   │   └── documents.py       # Documents endpoints
│   ├── core/
│   │   ├── config.py          # Configuration
│   │   └── storage.py         # JSON storage layer
│   ├── schemas/
│   │   ├── case.py            # Case models
│   │   └── document.py        # Document models
│   └── services/
│       ├── case_service.py    # Case business logic
│       └── document_service.py # Document business logic
├── data/
│   ├── cases.json             # Cases data
│   └── documents.json         # Documents data
├── uploads/                   # Uploaded files
├── scripts/
│   └── seed_data.py          # Initialize data
└── env/                       # Python virtual environment
```

## Data Storage

All data is stored in simple JSON files:

- **Cases**: `data/cases.json`
- **Documents**: `data/documents.json`
- **Uploaded Files**: `uploads/{case_id}/{document_id}.{ext}`

This makes it easy to:
- Inspect data directly
- Backup by copying files
- Reset by re-running seed script
- Debug without database tools

## Frontend Integration

The backend is configured for frontend integration:

1. **CORS Enabled**: Frontend can make requests from `http://localhost:5173`
2. **Consistent Data Models**: Matches frontend expectations
3. **Error Handling**: Returns structured error responses
4. **File Upload**: Supports multipart form data

### Frontend Configuration

Update your frontend to point to:

```javascript
const API_BASE_URL = 'http://localhost:8000/api/v1';
```

## Features Implemented

### AI Document Classification

When a document is uploaded, the backend simulates AI classification by:
- Analyzing the filename
- Matching keywords to document types
- Generating confidence scores (85-99%)
- Simulating authenticity scores

### Mock Document Types

The system can classify documents as:
- Certificate of Incorporation
- Board Resolution
- AML/KYC Certificate
- Regulatory License
- Proof of Address/Identity
- Bank Reference
- Financial Statement
- Source of Funds
- Tax Certificate
- UBO Documentation
- Shareholder Register

### Dashboard Statistics

Real-time statistics calculated from JSON data:
- Total cases count
- Cases by status (In Review, Approved, Escalated, Pending Docs)
- Average completion days
- HITL reviews pending

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 8000
lsof -i :8000

# Use different port
uvicorn app.main:app --reload --port 8001
```

### Cannot Find Module

Ensure you're in the correct directory:
```bash
cd backend
source env/bin/activate
```

### CORS Errors

Add your frontend URL to `.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Data Reset

To reset data to initial state:
```bash
rm data/*.json
python scripts/seed_data.py
```

## Next Steps

### For Development

1. **Test with Frontend**: Connect frontend to backend
2. **Add More Cases**: Create test cases via API
3. **Upload Documents**: Test document upload flow
4. **Monitor Logs**: Watch console for request logs

### For Production

1. **Database**: Replace JSON with PostgreSQL
2. **Authentication**: Add JWT/OAuth2
3. **File Storage**: Use S3 or MinIO
4. **AI Integration**: Connect real ML models
5. **Caching**: Add Redis
6. **Queue**: Add Celery for background tasks
7. **Monitoring**: Add logging and metrics

## Support

For issues:
1. Check console output for errors
2. Verify virtual environment is activated
3. Ensure all dependencies are installed
4. Check API documentation at `/api/docs`

## Summary

✅ **Backend is fully functional and ready for integration with the frontend!**

The backend provides:
- Complete RESTful API
- JSON-based storage
- Document upload and classification
- Dashboard statistics
- Auto-generated documentation
- CORS support for frontend

Start the server with: `uvicorn app.main:app --reload`
