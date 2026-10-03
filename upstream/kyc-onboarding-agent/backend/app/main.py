"""
the global bank Investor Risk Assessment - FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
import logging
from datetime import datetime

from app.core.config import settings
from app.core.logging_config import setup_logging, log_api_request
from app.api.v1 import cases, documents

# Setup logging before anything else
setup_logging()
logger = logging.getLogger(__name__)


# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered KYC/AML Compliance Platform for Institutional Investor Onboarding",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


# ============================================================================
# Middleware Configuration
# ============================================================================

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)

# Gzip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ============================================================================
# Request Timing Middleware
# ============================================================================

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers and log requests."""
    start_time = time.time()

    # Log incoming request
    logger.info(f"➡️  {request.method} {request.url.path} - Client: {request.client.host if request.client else 'unknown'}")

    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        duration_ms = process_time * 1000

        response.headers["X-Process-Time"] = f"{process_time:.4f}"

        # Log completed request
        user_agent = request.headers.get("user-agent", "")
        log_api_request(
            method=request.method,
            path=str(request.url.path),
            status_code=response.status_code,
            duration_ms=duration_ms,
            user_agent=user_agent[:50] if user_agent else None
        )

        logger.info(f"⬅️  {request.method} {request.url.path} - Status: {response.status_code} - {duration_ms:.2f}ms")

        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"❌ {request.method} {request.url.path} - Error: {str(e)} - {process_time*1000:.2f}ms", exc_info=True)
        raise


# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with structured logging."""
    logger.warning(
        f"HTTP {exc.status_code}: {request.method} {request.url.path} - {exc.detail}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "path": str(request.url.path),
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning(
        f"Validation error: {request.method} {request.url.path} - {exc.errors()}"
    )
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": 422,
                "message": "Validation error",
                "details": exc.errors(),
                "path": str(request.url.path),
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors."""
    logger.error(
        f"Unhandled exception: {request.method} {request.url.path} - {str(exc)}",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
                "path": str(request.url.path),
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


# ============================================================================
# Event Handlers
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Execute tasks on application startup."""
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📝 Environment: {settings.ENVIRONMENT}")
    print(f"📚 API Documentation: http://localhost:{settings.PORT}/api/docs")
    print(f"🔄 Swagger UI: http://localhost:{settings.PORT}/api/redoc")

    # Ensure data directories exist
    import os
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"✅ Data directories initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Execute tasks on application shutdown."""
    print(f"👋 Shutting down {settings.APP_NAME}")


# ============================================================================
# API Routes
# ============================================================================

# Health Check
@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint for load balancers and monitoring.

    Returns:
        dict: Health status and system information
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
    }


# Root Endpoint
@app.get("/", tags=["System"])
async def root():
    """
    API root endpoint with service information.
    """
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "AI-Powered KYC/AML Compliance Platform",
        "documentation": "/api/docs",
        "health": "/health",
        "api_prefix": settings.API_V1_PREFIX,
    }


# API v1 Routes
from app.api.v1 import case_tabs, dashboard

app.include_router(
    cases.router,
    prefix=f"{settings.API_V1_PREFIX}/cases",
    tags=["Cases"]
)
app.include_router(
    case_tabs.router,
    prefix=f"{settings.API_V1_PREFIX}/cases",
    tags=["Case Details"]
)
app.include_router(
    documents.router,
    prefix=f"{settings.API_V1_PREFIX}/documents",
    tags=["Documents"]
)
app.include_router(
    dashboard.router,
    prefix=f"{settings.API_V1_PREFIX}/dashboard",
    tags=["Dashboard"]
)


# ============================================================================
# Development Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level="info",
    )
