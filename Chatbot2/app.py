"""
FastAPI backend with memory-enabled chatbot
Each user has their own persistent chat history
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json
from typing import Optional

from models.request_schema import ChatRequest, ChatResponse
from memory.user_memory import UserMemoryManager

app = FastAPI(
    title="Memory-Enabled Retail Analytics Chatbot",
    description="FastAPI backend with per-user chat memory and LM Studio integration",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize memory manager
memory_manager = UserMemoryManager()

# LM Studio configuration
LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"
LM_STUDIO_API_KEY = "lm-studio"


def build_system_prompt() -> str:
    """Build the system prompt for the assistant"""
    return (
        "You are an AI assistant inside a retail analytics dashboard. "
        "You explain insights strictly based on provided context or prior conversation memory. "
        "If information is missing, say so."
    )


def build_user_role_description(user_role: str) -> str:
    """Build the user role description"""
    role_guidelines = {
        "Business Analyst": "Keep explanations simple, insight-driven, and non-technical.",
        "Manager": "Focus on high-level insights, key takeaways, and actionable recommendations.",
        "Data Scientist": "You can use technical terminology and provide detailed statistical insights.",
        "Executive": "Provide concise, strategic insights focused on business impact.",
    }
    
    guideline = role_guidelines.get(user_role, "Keep explanations clear and professional.")
    
    return f"The user is a {user_role}. {guideline}"


def format_page_content(current_page: str, page_content: dict) -> str:
    """Format the page context for the prompt"""
    if not page_content:
        return f"User is viewing: {current_page}\nNo specific data provided on this page."
    
    try:
        formatted = f"User is viewing: {current_page}\n\nPage Data:\n{json.dumps(page_content, indent=2)}"
        return formatted
    except:
        return f"User is viewing: {current_page}\n\nPage Data:\n{str(page_content)}"


def build_final_prompt(
    user_role: str,
    memory_text: str,
    current_page: str,
    page_content: dict,
    question: str
) -> str:
    """
    Build the final merged prompt combining all components
    
    Args:
        user_role: Description of user's role
        memory_text: Formatted conversation history
        current_page: Current page user is viewing
        page_content: Page-specific content and data
        question: User's question
        
    Returns:
        Complete formatted prompt
    """
    page_context_formatted = format_page_content(current_page, page_content)
    
    prompt = f"""USER ROLE:
{user_role}

MEMORY (past conversation for THIS user only):
{memory_text}

CURRENT PAGE CONTEXT:
{page_context_formatted}

USER QUESTION:
{question}
"""
    return prompt


async def call_lm_studio(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    """
    Call LM Studio local LLM API
    
    Args:
        system_prompt: System-level instructions
        user_prompt: Combined user prompt with context and memory
        temperature: Model temperature (0-1)
        
    Returns:
        Model's response text
        
    Raises:
        HTTPException: If LM Studio call fails
    """
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
        "temperature": temperature
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(LM_STUDIO_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            
            # Extract the assistant's message from LM Studio response
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"]
            else:
                raise HTTPException(status_code=500, detail="Invalid response format from LM Studio")
                
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to LM Studio. Ensure it's running on http://127.0.0.1:1234"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="LM Studio request timed out"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"LM Studio error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error calling LM Studio: {str(e)}"
        )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Memory-Enabled Retail Analytics Chatbot",
        "version": "1.0.0"
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint with per-user memory
    
    Process flow:
    1. Extract user_id, question, user_role, current_page, page_content from request
    2. Fetch user's past message history
    3. Build complete prompt with system instructions, memory, page context, and question
    4. Call LM Studio local LLM
    5. Store conversation turn in user's memory
    6. Return response with metadata
    """
    user_id = request.user_id
    question = request.question
    user_role_value = request.user_role
    current_page = request.current_page
    page_content = request.page_content
    
    # Fetch user's conversation history
    memory_text = memory_manager.format_memory_for_prompt(user_id, max_messages=20)
    memory_count = memory_manager.get_memory_count(user_id)
    memory_used = memory_count > 0
    
    # Build prompt components
    system_prompt = build_system_prompt()
    user_role_description = build_user_role_description(user_role_value)
    
    # Merge everything into final prompt
    final_prompt = build_final_prompt(
        user_role=user_role_description,
        memory_text=memory_text,
        current_page=current_page,
        page_content=page_content,
        question=question
    )
    
    # Call LM Studio
    assistant_response = await call_lm_studio(system_prompt, final_prompt)
    
    # Store the conversation turn in user's memory with page context
    # Only store page_content if it's not empty
    context_to_store = page_content if page_content else None
    memory_manager.add_conversation_turn(
        user_id, 
        question, 
        assistant_response,
        user_page_context=context_to_store
    )
    
    # Update memory count after adding new messages
    updated_memory_count = memory_manager.get_memory_count(user_id)
    
    return ChatResponse(
        answer=assistant_response,
        memory_used=memory_used,
        messages_in_memory=updated_memory_count
    )


@app.delete("/memory/{user_id}")
async def clear_memory(user_id: str):
    """
    Clear chat history for a specific user
    
    Args:
        user_id: User identifier
        
    Returns:
        Success message
    """
    memory_manager.clear_user_memory(user_id)
    return {
        "status": "success",
        "message": f"Memory cleared for user {user_id}"
    }


@app.get("/memory/{user_id}")
async def get_memory(user_id: str):
    """
    Retrieve chat history for a specific user
    
    Args:
        user_id: User identifier
        
    Returns:
        User's message history
    """
    messages = memory_manager.get_user_memory(user_id)
    return {
        "user_id": user_id,
        "message_count": len(messages),
        "messages": [msg.model_dump() for msg in messages]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)

