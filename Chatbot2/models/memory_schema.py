"""
Memory schema models for storing chat messages
"""
from pydantic import BaseModel
from typing import Literal, Dict, Any, Optional


class Message(BaseModel):
    """Represents a single message in the conversation"""
    role: Literal["user", "assistant"]
    content: str
    page_context: Optional[Dict[str, Any]] = None  # Store page data with each message


class UserMemory(BaseModel):
    """Represents the complete chat history for a user"""
    user_id: str
    messages: list[Message] = []

