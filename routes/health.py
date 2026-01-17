"""
Health check and readiness endpoints for Geo-Analytics API.

Provides endpoints for monitoring application health, readiness, and liveness.
"""
import time
import psutil
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, status, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["Health"])

# Store application start time
START_TIME = time.time()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: datetime
    uptime_seconds: float
    version: str = "1.0.0"


class ReadinessResponse(BaseModel):
    """Readiness check response model."""
    status: str
    checks: Dict[str, Any]
    timestamp: datetime


class LivenessResponse(BaseModel):
    """Liveness check response model."""
    status: str
    timestamp: datetime


class DetailedHealthResponse(BaseModel):
    """Detailed health information."""
    status: str
    timestamp: datetime
    uptime_seconds: float
    version: str
    system: Dict[str, Any]
    memory: Dict[str, Any]
    cpu: Dict[str, Any]


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Basic health check",
    description="Returns basic health status of the API"
)
async def health_check() -> HealthResponse:
    """
    Basic health check endpoint.
    
    Returns:
        HealthResponse: Current health status
    """
    uptime = time.time() - START_TIME
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        uptime_seconds=uptime
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Readiness probe",
    description="Checks if the application is ready to handle requests"
)
async def readiness_check() -> ReadinessResponse:
    """
    Readiness probe endpoint.
    
    Checks critical dependencies and returns readiness status.
    Used by Kubernetes readiness probes.
    
    Returns:
        ReadinessResponse: Readiness status with dependency checks
        
    Raises:
        HTTPException: If any critical dependency is unavailable
    """
    checks = {}
    all_ready = True
    
    # Check database connection
    try:
        # Add actual database check here
        # Example: await database.execute("SELECT 1")
        checks["database"] = {"status": "ok", "message": "Database is accessible"}
    except Exception as e:
        checks["database"] = {"status": "error", "message": str(e)}
        all_ready = False
    
    # Check Redis connection
    try:
        # Add actual Redis check here
        # Example: await redis.ping()
        checks["redis"] = {"status": "ok", "message": "Redis is accessible"}
    except Exception as e:
        checks["redis"] = {"status": "error", "message": str(e)}
        all_ready = False
    
    # Check critical services
    checks["application"] = {"status": "ok", "message": "Application is running"}
    
    if not all_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )
    
    return ReadinessResponse(
        status="ready",
        checks=checks,
        timestamp=datetime.utcnow()
    )


@router.get(
    "/live",
    response_model=LivenessResponse,
    status_code=status.HTTP_200_OK,
    summary="Liveness probe",
    description="Checks if the application is alive"
)
async def liveness_check() -> LivenessResponse:
    """
    Liveness probe endpoint.
    
    Simple check to verify the application is running.
    Used by Kubernetes liveness probes.
    
    Returns:
        LivenessResponse: Liveness status
    """
    return LivenessResponse(
        status="alive",
        timestamp=datetime.utcnow()
    )


@router.get(
    "/health/detailed",
    response_model=DetailedHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Detailed health information",
    description="Returns detailed health and system information"
)
async def detailed_health() -> DetailedHealthResponse:
    """
    Detailed health information endpoint.
    
    Provides comprehensive system and application metrics.
    Should only be accessible in development or via authentication.
    
    Returns:
        DetailedHealthResponse: Detailed health metrics
    """
    uptime = time.time() - START_TIME
    
    # Get memory information
    memory = psutil.virtual_memory()
    memory_info = {
        "total_mb": round(memory.total / (1024 * 1024), 2),
        "available_mb": round(memory.available / (1024 * 1024), 2),
        "used_mb": round(memory.used / (1024 * 1024), 2),
        "percent": memory.percent
    }
    
    # Get CPU information
    cpu_info = {
        "percent": psutil.cpu_percent(interval=1),
        "count": psutil.cpu_count(),
        "physical_count": psutil.cpu_count(logical=False)
    }
    
    # Get system information
    system_info = {
        "platform": psutil.LINUX if hasattr(psutil, 'LINUX') else "unknown",
        "python_version": "3.11",  # Add actual version from sys
        "hostname": "geo-analytics-api"  # Add actual hostname
    }
    
    return DetailedHealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        uptime_seconds=uptime,
        version="1.0.0",
        system=system_info,
        memory=memory_info,
        cpu=cpu_info
    )


@router.get(
    "/ping",
    status_code=status.HTTP_200_OK,
    summary="Simple ping",
    description="Simple ping endpoint for basic connectivity test"
)
async def ping() -> Dict[str, str]:
    """
    Simple ping endpoint.
    
    Returns:
        dict: Pong response
    """
    return {"message": "pong"}
