import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
from agent.graph import run_agent
import uuid
from .push_utils import send_push
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
class PushSubscription(BaseModel):
    endpoint: str
    keys: dict[str, str]
    user_id: str | None = None

subscriptions: list[PushSubscription] = []
@router.get("/push/public_key")
async def get_vapid_public_key():
    return {"publicKey": os.getenv("VAPID_PUBLIC_KEY", "")}


@router.post("/push/subscribe")
async def push_subscribe(subscription: PushSubscription):
    # Lưu vào bộ nhớ tạm. Tốt hơn nên lưu DB hoặc Supabase trong production.
    subscriptions.append(subscription)
    return {"success": True}


@router.post("/push/send")
async def push_send(user_id: str | None = None):
    targets = [s for s in subscriptions if s.user_id == user_id] if user_id else subscriptions
    results = []
    for sub in targets:
        ok = send_push(
            {"endpoint": sub.endpoint, "keys": sub.keys},
            "AI Career Coach",
            "Bạn có lịch học mới hôm nay. Quay lại app ngay!"
        )
        results.append({"endpoint": sub.endpoint, "sent": ok})
    return {"results": results}

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
            user_language=request.user_language,
        )

        messages = result.get("messages", [])
        last_message = (
            extract_message_content(messages[-1].content) if messages else "No response"
        )

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
