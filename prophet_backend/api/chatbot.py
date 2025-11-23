"""
AI Chatbot API with LM Studio integration and database persistence.
Provides context-aware chat with memory for each user.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import httpx
import json
import logging

from utils.auth import get_current_user
from db.database import get_connection
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chatbot"])

# LM Studio configuration
LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"
LM_STUDIO_API_KEY = "lm-studio"


# ==================== REQUEST/RESPONSE MODELS ====================

class ChatRequest(BaseModel):
    """Chat request with page context"""
    question: str = Field(..., description="User's question")
    current_page: str = Field(..., description="Current page name (e.g., 'Marketing Dashboard')")
    page_data: Dict[str, Any] = Field(default_factory=dict, description="Page-specific data (KPIs, graphs)")


class ChatResponse(BaseModel):
    """Chat response with metadata"""
    answer: str = Field(..., description="AI assistant's response")
    memory_used: bool = Field(..., description="Whether chat history was used")
    messages_in_memory: int = Field(..., description="Number of messages in history")


# ==================== DATABASE FUNCTIONS ====================

def get_chat_history(user_id: str, company_id: str, max_messages: int = 20) -> List[Dict]:
    """Fetch recent chat history for a user"""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT role, content, page_context, page_data, created_at
                FROM chat_history
                WHERE user_id = %s AND company_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (user_id, company_id, max_messages))
            results = cursor.fetchall()
    
    # Reverse to get chronological order (oldest first)
    return list(reversed([dict(row) for row in results]))


def save_chat_message(
    user_id: str,
    company_id: str,
    role: str,
    content: str,
    page_context: Optional[str] = None,
    page_data: Optional[Dict] = None
):
    """Save a chat message to database"""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO chat_history (user_id, company_id, role, content, page_context, page_data)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (user_id, company_id, role, content, page_context, json.dumps(page_data) if page_data else None))
        conn.commit()


def get_chat_history_count(user_id: str, company_id: str) -> int:
    """Get count of messages in user's history"""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM chat_history
                WHERE user_id = %s AND company_id = %s
            """, (user_id, company_id))
            return cursor.fetchone()[0]


# ==================== PROMPT BUILDING ====================

def build_system_prompt() -> str:
    """Build the system prompt for the assistant"""
    return (
        "You are an AI assistant inside a retail analytics dashboard. "
        "You explain insights strictly based on provided context or prior conversation memory. "
        "Keep responses clear, concise, and actionable. "
        "If information is missing, say so. "
        "Focus on helping users understand their data and make business decisions."
    )


def build_user_role_description(role: str) -> str:
    """Build user role description based on their RBAC role"""
    role_guidelines = {
        "super_admin": "You have full system access. Provide comprehensive insights across all departments.",
        "admin": "Focus on team management and overall company performance.",
        "marketing": "Focus on customer behavior, RFM segments, campaign effectiveness, and customer lifetime value.",
        "sales": "Focus on revenue trends, forecasts, top regions, and sales performance metrics.",
        "product_management": "Focus on product clusters, category performance, and product trends.",
        "operations": "Focus on order volumes, capacity planning, and operational efficiency.",
        "accounting_finance": "Focus on financial metrics, revenue analysis, and profitability.",
    }
    
    guideline = role_guidelines.get(role, "Provide clear, professional analytics insights.")
    return f"The user's role is {role}. {guideline}"


def format_page_context(page_name: str, page_data: Dict) -> str:
    """Format page data for the prompt"""
    if not page_data:
        return f"User is viewing: {page_name}\nNo specific data provided."
    
    try:
        # Pretty-print the JSON with indentation
        formatted_data = json.dumps(page_data, indent=2)
        return f"User is viewing: {page_name}\n\nPage Data:\n{formatted_data}"
    except:
        return f"User is viewing: {page_name}\n\nPage Data:\n{str(page_data)}"


def format_chat_history(history: List[Dict]) -> str:
    """Format chat history for the prompt"""
    if not history:
        return "No previous conversation."
    
    formatted = []
    for msg in history:
        role_name = "User" if msg['role'] == 'user' else "Assistant"
        formatted.append(f"{role_name}: {msg['content']}")
    
    return "\n".join(formatted)


def build_final_prompt(
    user_role_desc: str,
    chat_history: str,
    page_context: str,
    question: str
) -> str:
    """Build the complete prompt with all context"""
    return f"""USER ROLE:
{user_role_desc}

CONVERSATION HISTORY:
{chat_history}

CURRENT PAGE CONTEXT:
{page_context}

USER QUESTION:
{question}"""


# ==================== LM STUDIO INTEGRATION ====================

async def call_lm_studio(system_prompt: str, user_prompt: str) -> str:
    """Call LM Studio local LLM API"""
    headers = {
        "Authorization": f"Bearer {LM_STUDIO_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "meta-llama-3.1-8b-instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(LM_STUDIO_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"]
            else:
                raise HTTPException(status_code=500, detail="Invalid response from LM Studio")
                
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to LM Studio. Ensure it's running on http://127.0.0.1:1234"
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="LM Studio request timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"LM Studio error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"LM Studio error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


# ==================== API ENDPOINTS ====================

@router.post("/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Send a chat message with page context.
    
    Process:
    1. Fetch user's chat history from database
    2. Build prompt with user role, history, page context
    3. Call LM Studio
    4. Save conversation to database
    5. Return response
    """
    user_id = current_user['user_id']
    company_id = current_user['company_id']
    user_role = current_user.get('role', 'employee')
    
    logger.info(f"Chat request from user {user_id} on page {request.current_page}")
    
    try:
        # Fetch chat history
        history = get_chat_history(user_id, company_id, max_messages=20)
        memory_count = get_chat_history_count(user_id, company_id)
        memory_used = memory_count > 0
        
        # Build prompt
        system_prompt = build_system_prompt()
        user_role_desc = build_user_role_description(user_role)
        chat_history_text = format_chat_history(history)
        page_context_text = format_page_context(request.current_page, request.page_data)
        
        final_prompt = build_final_prompt(
            user_role_desc=user_role_desc,
            chat_history=chat_history_text,
            page_context=page_context_text,
            question=request.question
        )
        
        # Call LM Studio
        answer = await call_lm_studio(system_prompt, final_prompt)
        
        # Save conversation to database
        save_chat_message(
            user_id=user_id,
            company_id=company_id,
            role='user',
            content=request.question,
            page_context=request.current_page,
            page_data=request.page_data
        )
        
        save_chat_message(
            user_id=user_id,
            company_id=company_id,
            role='assistant',
            content=answer,
            page_context=request.current_page
        )
        
        # Get updated count
        updated_count = get_chat_history_count(user_id, company_id)
        
        logger.info(f"Chat response generated successfully for user {user_id}")
        
        return ChatResponse(
            answer=answer,
            memory_used=memory_used,
            messages_in_memory=updated_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    """Get chat history for current user"""
    user_id = current_user['user_id']
    company_id = current_user['company_id']
    
    try:
        history = get_chat_history(user_id, company_id, max_messages=50)
        
        # Convert timestamps to ISO strings
        for msg in history:
            if msg.get('created_at'):
                msg['created_at'] = msg['created_at'].isoformat()
        
        return {
            "user_id": user_id,
            "message_count": len(history),
            "messages": history
        }
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    """Clear chat history for current user"""
    user_id = current_user['user_id']
    company_id = current_user['company_id']
    
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM chat_history
                    WHERE user_id = %s AND company_id = %s
                """, (user_id, company_id))
            conn.commit()
        
        logger.info(f"Chat history cleared for user {user_id}")
        
        return {
            "status": "success",
            "message": "Chat history cleared"
        }
    except Exception as e:
        logger.error(f"Failed to clear history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

