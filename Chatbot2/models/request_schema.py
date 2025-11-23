"""
Request and response schemas for the chat API
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class ChatRequest(BaseModel):
    """Request model for the /chat endpoint"""
    user_id: str = Field(..., description="Unique identifier for the user")
    question: str = Field(..., description="User's question or message")
    user_role: str = Field(default="Business Analyst", description="Role of the user (e.g., 'Business Analyst', 'Manager', 'Data Scientist')")
    current_page: str = Field(default="Dashboard", description="Current page/section user is viewing (e.g., 'Sales Dashboard', 'Inventory Page', 'Forecast Page')")
    page_content: Dict[str, Any] = Field(default_factory=dict, description="Page-specific data and content (charts, metrics, etc.)")


class ChatResponse(BaseModel):
    """Response model for the /chat endpoint"""
    answer: str = Field(..., description="Assistant's response")
    memory_used: bool = Field(..., description="Whether previous chat history was used")
    messages_in_memory: int = Field(..., description="Number of messages in user's history")

