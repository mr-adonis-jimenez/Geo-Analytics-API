"""Custom error handling middleware and exceptions for Geo-Analytics API.

Provides structured error responses, exception tracking, and debugging context.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
from typing import Any, Dict, Optional
import uuid
from datetime import datetime


# Custom Exception Classes
class GeoAnalyticsAPIException(Exception):
    """Base exception for all Geo-Analytics API errors."""
    
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "INTERNAL_ERROR"
        self.details = details or {}
        super().__init__(self.message)


class DatasetNotFoundException(GeoAnalyticsAPIException):
    """Raised when a requested dataset is not found."""
    
    def __init__(self, dataset_id: str, **kwargs):
        super().__init__(
            message=f"Dataset '{dataset_id}' not found",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="DATASET_NOT_FOUND",
            details={"dataset_id": dataset_id, **kwargs}
        )


class InvalidDataFormatException(GeoAnalyticsAPIException):
    """Raised when data format is invalid."""
    
    def __init__(self, reason: str, **kwargs):
        super().__init__(
            message=f"Invalid data format: {reason}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_DATA_FORMAT",
            details={"reason": reason, **kwargs}
        )


class AnalyticsProcessingException(GeoAnalyticsAPIException):
    """Raised when analytics processing fails."""
    
    def __init__(self, operation: str, reason: str, **kwargs):
        super().__init__(
            message=f"Analytics processing failed: {reason}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="ANALYTICS_PROCESSING_ERROR",
            details={"operation": operation, "reason": reason, **kwargs}
        )


class RateLimitExceededException(GeoAnalyticsAPIException):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, retry_after: int = 60, **kwargs):
        super().__init__(
            message="Rate limit exceeded. Please try again later.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            details={"retry_after_seconds": retry_after, **kwargs}
        )


# Error Response Builder
def build_error_response(
    error_id: str,
    status_code: int,
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    include_traceback: bool = False,
    traceback_str: Optional[str] = None
) -> Dict[str, Any]:
    """Build a standardized error response."""
    
    response = {
        "error": {
            "id": error_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status_code": status_code,
            "error_code": error_code,
            "message": message,
        }
    }
    
    if details:
        response["error"]["details"] = details
    
    if include_traceback and traceback_str:
        response["error"]["traceback"] = traceback_str
    
    return response


# Exception Handlers
async def custom_exception_handler(
    request: Request,
    exc: GeoAnalyticsAPIException
) -> JSONResponse:
    """Handle custom Geo-Analytics API exceptions."""
    
    error_id = str(uuid.uuid4())
    
    # Log the error (assuming logger is available)
    try:
        from utils.logger import get_logger
        logger = get_logger()
        logger.error(
            f"API Error: {exc.error_code}",
            extra={
                "extra_fields": {
                    "error_id": error_id,
                    "error_code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                    "path": str(request.url),
                    "method": request.method
                }
            },
            exc_info=True
        )
    except ImportError:
        pass  # Logger not available yet
    
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_response(
            error_id=error_id,
            status_code=exc.status_code,
            error_code=exc.error_code,
            message=exc.message,
            details=exc.details
        )
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
    """Handle request validation errors."""
    
    error_id = str(uuid.uuid4())
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=build_error_response(
            error_id=error_id,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            message="Request validation failed",
            details={"validation_errors": exc.errors()}
        )
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException
) -> JSONResponse:
    """Handle HTTP exceptions."""
    
    error_id = str(uuid.uuid4())
    
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_response(
            error_id=error_id,
            status_code=exc.status_code,
            error_code="HTTP_ERROR",
            message=exc.detail
        )
    )


async def general_exception_handler(
    request: Request,
    exc: Exception
) -> JSONResponse:
    """Handle all other unhandled exceptions."""
    
    error_id = str(uuid.uuid4())
    traceback_str = traceback.format_exc()
    
    # Log critical error
    try:
        from utils.logger import get_logger
        logger = get_logger()
        logger.critical(
            f"Unhandled exception: {type(exc).__name__}",
            extra={
                "extra_fields": {
                    "error_id": error_id,
                    "exception_type": type(exc).__name__,
                    "exception_message": str(exc),
                    "path": str(request.url),
                    "method": request.method
                }
            },
            exc_info=True
        )
    except ImportError:
        print(f"CRITICAL ERROR [{error_id}]: {exc}\n{traceback_str}")
    
    # In production, don't expose internal error details
    import os
    include_traceback = os.getenv("DEBUG", "false").lower() == "true"
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=build_error_response(
            error_id=error_id,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred. Please contact support with the error ID.",
            details={"error_id": error_id},
            include_traceback=include_traceback,
            traceback_str=traceback_str if include_traceback else None
        )
    )


def setup_error_handlers(app):
    """Register all error handlers with the FastAPI app."""
    
    app.add_exception_handler(GeoAnalyticsAPIException, custom_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
