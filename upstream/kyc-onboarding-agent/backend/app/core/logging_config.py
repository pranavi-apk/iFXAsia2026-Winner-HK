"""
Logging configuration for the application.
"""
import logging
import sys
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler
from app.core.config import settings


def setup_logging():
    """Configure application logging with both console and file handlers."""

    # Create logs directory
    log_dir = Path("./logs")
    log_dir.mkdir(exist_ok=True)

    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )

    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG)
    console_handler.setFormatter(simple_formatter)

    # File handler for all logs (rotating)
    file_handler = RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(detailed_formatter)

    # File handler for errors only
    error_handler = RotatingFileHandler(
        log_dir / "error.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)

    # File handler for API requests
    api_handler = RotatingFileHandler(
        log_dir / "api.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    api_handler.setLevel(logging.INFO)
    api_handler.setFormatter(detailed_formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)

    # Configure API logger
    api_logger = logging.getLogger("api")
    api_logger.addHandler(api_handler)
    api_logger.propagate = False  # Don't propagate to root logger

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)

    # Log startup
    logger = logging.getLogger(__name__)
    logger.info("=" * 80)
    logger.info(f"Application starting: {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Log directory: {log_dir.absolute()}")
    logger.info("=" * 80)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)


def log_api_request(method: str, path: str, status_code: int, duration_ms: float, user_agent: str = None):
    """Log API request details."""
    api_logger = logging.getLogger("api")
    api_logger.info(
        f"{method} {path} - Status: {status_code} - Duration: {duration_ms:.2f}ms"
        + (f" - UA: {user_agent}" if user_agent else "")
    )
