"""
Pydantic models for API request/response validation.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional


class UploadResponse(BaseModel):
    """Response for /upload-csv endpoint."""
    file_id: str
    message: str


class ForecastRequest(BaseModel):
    """Request for /forecast endpoint."""
    file_id: str = Field(..., description="Unique file identifier from upload")
    model: str = Field(default="prophet", description="Model type (only 'prophet' supported)")


class ForecastPoint(BaseModel):
    """Single forecast data point."""
    date: str
    yhat: float
    yhat_lower: float
    yhat_upper: float


class ForecastResponse(BaseModel):
    """Response for /forecast endpoint."""
    model_config = ConfigDict(protected_namespaces=())
    
    forecast: List[ForecastPoint]
    model_path: str
    notes: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str
