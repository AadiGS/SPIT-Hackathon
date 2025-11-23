"""
User memory manager for maintaining chat history
"""
from typing import Dict, Optional
from models.memory_schema import UserMemory, Message


class UserMemoryManager:
    """Manages chat history for multiple users"""
    
    def __init__(self):
        self.memories: Dict[str, UserMemory] = {}
    
    def get_memory(self, user_id: str) -> UserMemory:
        """Get or create memory for a user"""
        if user_id not in self.memories:
            self.memories[user_id] = UserMemory(user_id=user_id)
        return self.memories[user_id]
    
    def add_message(self, user_id: str, role: str, content: str, page_context: Optional[dict] = None):
        """Add a message to user's memory"""
        memory = self.get_memory(user_id)
        message = Message(role=role, content=content, page_context=page_context)
        memory.messages.append(message)
    
    def add_conversation_turn(self, user_id: str, user_message: str, assistant_message: str, user_page_context: Optional[dict] = None):
        """Add a complete conversation turn (user + assistant messages)"""
        self.add_message(user_id, "user", user_message, user_page_context)
        self.add_message(user_id, "assistant", assistant_message)
    
    def get_memory_count(self, user_id: str) -> int:
        """Get count of messages in user's memory"""
        memory = self.get_memory(user_id)
        return len(memory.messages)
    
    def get_conversation_history(self, user_id: str, max_messages: int = 10) -> list[Message]:
        """Get recent conversation history for a user"""
        memory = self.get_memory(user_id)
        return memory.messages[-max_messages:] if memory.messages else []
    
    def get_user_memory(self, user_id: str) -> list[Message]:
        """Get all messages for a user"""
        memory = self.get_memory(user_id)
        return memory.messages
    
    def clear_memory(self, user_id: str):
        """Clear memory for a user"""
        if user_id in self.memories:
            del self.memories[user_id]
    
    def format_memory_for_prompt(self, user_id: str, max_messages: int = 10) -> str:
        """Format conversation history as text for LLM prompt"""
        history = self.get_conversation_history(user_id, max_messages)
        
        if not history:
            return "No previous conversation."
        
        formatted = []
        for msg in history:
            role = "User" if msg.role == "user" else "Assistant"
            formatted.append(f"{role}: {msg.content}")
        
        return "\n".join(formatted)
