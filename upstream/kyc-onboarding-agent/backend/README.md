# the global bank Investor Risk Assessment (IRA) - Backend

FastAPI-based backend for AI-Powered KYC/AML Compliance Platform

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **JSON Storage** - Simple file-based storage (no database required)
- **CORS Enabled** - Ready for frontend integration
- **Auto Documentation** - Swagger UI and ReDoc
- **Type Safety** - Pydantic schemas for data validation
- **Async Support** - Asynchronous request handling

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── api/
│   │   └── v1/
│   │       ├── cases.py     # Cases endpoints
│   │       └── documents.py # Documents endpoints
│   ├── core/
│   │   ├── config.py        # Configuration management
│   │   └── storage.py       # JSON file storage utilities
│   ├── schemas/
│   │   ├── case.py          # Case Pydantic models
│   │   └── document.py      # Document Pydantic models
│   └── services/
│       ├── case_service.py      # Case business logic
│       └── document_service.py  # Document business logic
├── data/                    # JSON data files (auto-created)
├── uploads/                 # Uploaded documents (auto-created)
├── scripts/
│   └── seed_data.py        # Initialize seed data
├── env/                    # Python virtual environment
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Setup Instructions

### 1. Prerequisites

- Python 3.11 or higher
- pip (Python package installer)

### 2. Install Dependencies

The virtual environment is already created in the `env` folder. Activate it and install dependencies:

```bash
# Activate virtual environment
# On macOS/Linux:
source env/bin/activate

# On Windows:
# env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

The default configuration works for local development. Key settings:

```env
APP_NAME="the global bank Investor Risk Assessment"
ENVIRONMENT=development
PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Initialize Seed Data

Run the seed data script to create initial sample data:

```bash
python scripts/seed_data.py
```

This creates:
- `data/cases.json` - Sample cases
- `data/documents.json` - Empty documents list
- `uploads/` - Directory for document uploads

### 5. Run the Server

Start the FastAPI server with uvicorn:

```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python module
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or run the main.py directly
python app/main.py
```

The server will start at: **http://localhost:8000**

### 6. Access API Documentation

Once the server is running, you can access:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json
- **Health Check**: http://localhost:8000/health

## API Endpoints

### System Endpoints

- `GET /` - API information
- `GET /health` - Health check

### Cases API (`/api/v1/cases`)

- `GET /api/v1/cases` - List all cases (with pagination)
- `GET /api/v1/cases/stats` - Get dashboard statistics
- `GET /api/v1/cases/{case_id}` - Get case by ID
- `POST /api/v1/cases` - Create a new case
- `PUT /api/v1/cases/{case_id}` - Update a case
- `PATCH /api/v1/cases/{case_id}/mark-viewed` - Mark case as viewed
- `DELETE /api/v1/cases/{case_id}` - Delete a case

### Documents API (`/api/v1/documents`)

- `GET /api/v1/documents` - List all documents (optional case_id filter)
- `GET /api/v1/documents/{document_id}` - Get document by ID
- `POST /api/v1/documents/upload` - Upload a document
- `PUT /api/v1/documents/{document_id}` - Update document metadata
- `POST /api/v1/documents/{document_id}/classify` - Classify document with AI
- `GET /api/v1/documents/{document_id}/download` - Download document file
- `DELETE /api/v1/documents/{document_id}` - Delete a document

## Usage Examples

### Create a New Case

```bash
curl -X POST http://localhost:8000/api/v1/cases \
  -H "Content-Type: application/json" \
  -d '{
    "investor_name": "Global Investment Partners",
    "investor_type": "Hedge Fund",
    "jurisdiction": "United States",
    "status": "Draft",
    "assigned_to": "John Doe"
  }'
```

### Upload a Document

```bash
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "case_id=CASE-2024-0847" \
  -F "file=@/path/to/document.pdf"
```

### Get Dashboard Statistics

```bash
curl http://localhost:8000/api/v1/cases/stats
```

## Development

### Code Structure

- **Schemas** (`app/schemas/`) - Pydantic models for request/response validation
- **Services** (`app/services/`) - Business logic layer
- **Storage** (`app/core/storage.py`) - JSON file operations
- **API Routes** (`app/api/v1/`) - FastAPI route handlers

### Adding New Endpoints

1. Define schemas in `app/schemas/`
2. Implement business logic in `app/services/`
3. Create route handlers in `app/api/v1/`
4. Register router in `app/main.py`

### Testing

Test the API using:
- Swagger UI at http://localhost:8000/api/docs
- cURL commands
- Postman or similar API client
- Frontend application

## Data Storage

The backend uses simple JSON files for data storage:

- **Cases**: `data/cases.json`
- **Documents**: `data/documents.json`
- **Uploads**: `uploads/{case_id}/{document_id}.{ext}`

### Backup Data

To backup your data:

```bash
# Backup data directory
cp -r data data_backup_$(date +%Y%m%d)

# Backup uploads
cp -r uploads uploads_backup_$(date +%Y%m%d)
```

## Troubleshooting

### Port Already in Use

If port 8000 is already in use:

```bash
# Use a different port
uvicorn app.main:app --reload --port 8001
```

Or update `.env`:
```env
PORT=8001
```

### CORS Issues

If you experience CORS errors, ensure the frontend URL is in `CORS_ORIGINS`:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Module Not Found

Ensure you're in the backend directory and virtual environment is activated:

```bash
cd backend
source env/bin/activate  # or env\Scripts\activate on Windows
```

## Production Considerations

This is a simplified development version using JSON storage. For production:

1. **Database**: Replace JSON storage with PostgreSQL/MongoDB
2. **Authentication**: Implement JWT/OAuth2 authentication
3. **File Storage**: Use S3/MinIO for document storage
4. **Background Tasks**: Use Celery/RQ for async processing
5. **Caching**: Add Redis for caching
6. **Monitoring**: Implement logging and monitoring
7. **Rate Limiting**: Add rate limiting middleware
8. **HTTPS**: Use HTTPS in production

## License

Proprietary - the global bank Corporation

## Support

For issues or questions, contact the development team.
