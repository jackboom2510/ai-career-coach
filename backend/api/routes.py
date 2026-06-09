from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
from agent.graph import run_agent
import uuid

router = APIRouter()


def extract_message_content(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts = []

        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    parts.append(item.get("text", ""))

            elif hasattr(item, "text"):
                parts.append(item.text)

            else:
                parts.append(str(item))

        return "\n".join(parts)

    return str(content)


class ChatRequest(BaseModel):
    message: str
    user_profile: dict[str, Any] | None = None
    roadmap_state: list[dict[str, Any]] | None = None
    current_week: int = 1
    user_id: str = "default"
    conversation_id: str | None = None
    user_language: str = "Vietnamese"


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    tools_called: list[dict] | None = None


class ResetRequest(BaseModel):
    conversation_id: str


@router.post("/agent/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        conversation_id = request.conversation_id or str(uuid.uuid4())
        from memory.manager import memory_manager

        conversation_id = memory_manager.conversation_manager.get_or_create_conversation(
            request.user_id,
            conversation_id,
        )

        result = await run_agent(
            user_message=request.message,
            user_profile=request.user_profile,
            roadmap_state=request.roadmap_state,
            current_week=request.current_week,
            user_id=request.user_id,
            conversation_id=conversation_id,
            user_language=request.user_language,
        )

        messages = result.get("messages", [])
        last_message = (
            extract_message_content(messages[-1].content) if messages else "No response"
        )

        try:
            memory_manager.conversation_manager.update_conversation_summary(
                conversation_id, last_message
            )
        except Exception:
            pass

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
async def reset_conversation(request: ResetRequest):
    try:
        from memory.manager import memory_manager
        success = memory_manager.conversation_manager.delete_conversation(
            request.conversation_id
        )
        return {"success": success, "conversation_id": request.conversation_id}
    except Exception as e:
        return {"success": False, "error": str(e)}
