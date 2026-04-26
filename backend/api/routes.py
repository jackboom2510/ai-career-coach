from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
from agent.graph import run_agent
import uuid

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    user_profile: dict | None = None
    roadmap_state: list | None = None
    current_week: int = 1
    user_id: str = "default"
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    tools_called: list[dict] | None = None


@router.post("/agent/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        result = await run_agent(
            user_message=request.message,
            user_profile=request.user_profile,
            roadmap_state=request.roadmap_state,
            current_week=request.current_week,
            user_id=request.user_id,
            conversation_id=conversation_id,
        )

        messages = result.get("messages", [])
        last_message = messages[-1].content if messages else "No response"

        tools_called = []
        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tools_called.append({
                        "name": tc.get("name", "unknown"),
                        "args": tc.get("args", {})
                    })

        return ChatResponse(
            response=last_message,
            conversation_id=conversation_id,
            tools_called=tools_called if tools_called else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agent/health")
async def agent_health():
    return {"status": "agent_ready", "tools_count": 9}


@router.post("/agent/reset")
async def reset_conversation(conversation_id: str):
    try:
        from memory.manager import memory_manager
        success = memory_manager.conversation_manager.delete_conversation(conversation_id)
        return {"success": success, "conversation_id": conversation_id}
    except Exception as e:
        return {"success": False, "error": str(e)}