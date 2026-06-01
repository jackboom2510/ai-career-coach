import os
import uuid
import json
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai  # Sử dụng thư viện google-genai mới
from supabase import create_client, Client

from agent.graph import run_agent
from .push_utils import send_push

router = APIRouter()


SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Khởi tạo client Gemini thế hệ mới (Tự động nhận API_KEY/GOOGLE_API_KEY từ .env)
client = genai.Client()



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


# Lưu danh sách thiết bị bật nhắc học trong RAM
subscriptions: list[PushSubscription] = []


class SendPushRequest(BaseModel):
    user_id: str | None = None
    title: str = "AI Career Coach"
    body: str = "Bạn có lịch học mới hôm nay."
    url: str = "/"
    actions: list[dict] = [
        {"action": "learn_now", "title": "📖 Học ngay"},
        {"action": "remind_later", "title": "⏰ Để sau"}
    ]


class CompleteWeekRequest(BaseModel):
    user_id: str
    week_number: int
    theme: str


def call_gemini_for_notification(scenario_prompt: str):
    """Giao tiếp với Gemini bằng SDK mới để tạo thông báo bằng định dạng JSON"""
    base_prompt = f"""
    Bạn là một AI Career Coach tâm lý, hài hước và sắc sảo. 
    Hãy viết 1 thông báo đẩy (Push Notification) theo yêu cầu cụ thể sau đây:
    {scenario_prompt}
    
    Yêu cầu kỹ thuật nghiêm ngặt:
    1. Giọng văn: Ngắn gọn, cuốn hút, mang tính cá nhân hóa cao, sử dụng emoji phù hợp.
    2. Độ dài: Tiêu đề dưới 10 từ, Nội dung dưới 30 từ để hiển thị trọn vẹn trên các thiết bị.
    3. Định dạng đầu ra bắt buộc: Chỉ trả về một chuỗi JSON duy nhất, không bao bọc trong ký hiệu mã lệnh ```json:
    {{"title": "Tiêu đề ở đây", "body": "Nội dung thông báo ở đây"}}
    """
    try:
        # Sử dụng mô hình gemini-1.5-flash để đảm bảo tải trọng băng thông cực kỳ ổn định
        response = client.models.generate_content(
            model='gemini/gemini-2.5-flash',
            contents=base_prompt,
        )
        
        text_content = response.text.strip()
        
        # Mẹo xử lý chuỗi: Tự gột sạch các khối định dạng bọc ngoài nếu AI lỡ tay trả về
        if text_content.startswith("```json"):
            text_content = text_content.replace("```json", "", 1).replace("```", "", -1).strip()
        elif text_content.startswith("```"):
            text_content = text_content.replace("```", "", 2).strip()

        return json.loads(text_content)
    except Exception as e:
        print(f"Lỗi phân tách hoặc nghẽn mạng từ phía Gemini: {e}")
        return None


def safe_call_gemini_notification(prompt: str, fallback_title: str, fallback_body: str) -> dict:
    """Hàm bọc an toàn: Đảm bảo nếu Gemini sập (Lỗi 503) hệ thống tự động trả về kịch bản viết sẵn"""
    ai_msg = call_gemini_for_notification(prompt)
    if ai_msg and isinstance(ai_msg, dict) and "title" in ai_msg and "body" in ai_msg:
        return ai_msg
    
    print(f"⚠️ [Gemini 503/Overloaded] Tự động kích hoạt kịch bản thông báo dự phòng.")
    return {"title": fallback_title, "body": fallback_body}



@router.get("/push/public_key")
async def get_vapid_public_key():
    return {"publicKey": os.getenv("VAPID_PUBLIC_KEY", "")}


@router.post("/push/subscribe")
async def push_subscribe(subscription: PushSubscription):
    if subscription.endpoint not in [s.endpoint for s in subscriptions]:
        subscriptions.append(subscription)
    return {"success": True}


@router.post("/push/send")
async def push_send(req: SendPushRequest):
    targets = [s for s in subscriptions if s.user_id == req.user_id] if req.user_id else subscriptions
    results = []
    
    rich_payload = {
        "title": req.title,
        "body": req.body,
        "icon": "/icons/icon-192.jpg",
        "data": {"url": req.url},
        "actions": req.actions
    }

    for sub in targets:
        ok = send_push({"endpoint": sub.endpoint, "keys": sub.keys}, rich_payload)
        results.append({"endpoint": sub.endpoint, "sent": ok})
    return {"results": results}


@router.post("/roadmap/complete")
async def complete_roadmap_week(req: CompleteWeekRequest):
    try:
        data = {
            "user_id": req.user_id,
            "week_number": req.week_number,
            "theme": req.theme,
            "is_completed": True,
            "completed_at": datetime.utcnow().isoformat()
        }
        supabase.table("user_progress").insert(data).execute()
        return {"success": True, "message": f"Đã ghi nhận hoàn thành Tuần {req.week_number}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu dữ liệu vào Supabase: {str(e)}")



def scan_morning_notifications_job():
    """HÀM CHẠY NGẦM BUỔI SÁNG (Cài chạy lúc 08:00 sáng hằng ngày)
    - Kịch bản 1: Nhắc học viên ôn tập ngắt quãng (Spaced Repetition) khi đã hoàn thành bài được 3 ngày.
    - Kịch bản 3: Phát hiện học viên đang bị kẹt bài (Stuck Detection) quá 5 ngày chưa xong chủ đề.
    """
    print(f"[{datetime.now()}] ☀️ Bot quét buổi sáng bắt đầu làm việc...")
    today = datetime.utcnow().date()
    
    try:
        response = supabase.table("user_progress").select("*").execute()
        records = response.data
        if not records:
            print("Không tìm thấy tiến độ học tập nào trên hệ thống.")
            return

        for record in records:
            u_id = record["user_id"]
            theme = record["theme"]
            w_num = record["week_number"]
            is_done = record["is_completed"]
            
            # user_targets = [s for s in subscriptions if s.user_id == u_id]
            user_targets = subscriptions
            if not user_targets:
                continue
                
            date_field = record.get("completed_at")
            if not date_field:
                continue
                
            record_date = datetime.fromisoformat(date_field.replace("Z", "")).date()
            days_passed = (today - record_date).days

            rich_payload = None

            # [KỊCH BẢN 1]: Học xong được 3 ngày -> Ôn tập ngắt quãng
            if is_done and days_passed == 3:
                prompt = f"Học viên đã hoàn thành xong chủ đề '{theme}' đúng 3 ngày trước. Viết thông báo thúc giục họ làm bài quiz ôn tập ngắn 2 phút để kích hoạt lại trí nhớ trước khi quên bài hoàn toàn."
                
                fallback_title = "🎯 Đến lúc ôn tập rồi!"
                fallback_body = f"Bạn đã hoàn thành chủ đề '{theme}' được 3 ngày. Dành 2 phút làm quiz ôn tập để lưu giữ kiến thức lâu hơn nhé!"
                
                ai_msg = safe_call_gemini_notification(prompt, fallback_title, fallback_body)
                
                rich_payload = {
                    "title": ai_msg["title"],
                    "body": ai_msg["body"],
                    "icon": "/icons/icon-192.jpg",
                    "data": {"url": f"/learning/week-{w_num}"},
                    "actions": [
                        {"action": "learn_now", "title": "📖 Ôn tập ngay"},
                        {"action": "remind_later", "title": "⏰ Để sau"}
                    ]
                }

            # [KỊCH BẢN 3]: Chưa hoàn thành và ngâm trên 5 ngày -> AI gỡ rối
            elif not is_done and days_passed >= 0:
                prompt = f"Học viên đang gặp khó khăn và bị kẹt ở Tuần {w_num} chủ đề '{theme}' đã hơn 5 ngày chưa bấm hoàn thành. Hãy viết lời khuyên động viên mang tính tâm lý, hoặc rủ họ vào chat với AI Coach để giải đáp thắc mắc."
                
                fallback_title = "💪 AI Coach đang đợi bạn!"
                fallback_body = f"Có vẻ nội dung '{theme}' đang có chút thử thách? Hãy vào chat với Coach để cùng gỡ rối ngay nào."
                
                ai_msg = safe_call_gemini_notification(prompt, fallback_title, fallback_body)
                
                rich_payload = {
                    "title": ai_msg["title"],
                    "body": ai_msg["body"],
                    "icon": "/icons/icon-192.jpg",
                    "data": {"url": f"/learning/week-{w_num}"},
                    "actions": [
                        {"action": "learn_now", "title": "💬 Chat với Coach"},
                        {"action": "remind_later", "title": "⏰ Để sau"}
                    ]
                }

            if rich_payload:
                for sub in user_targets:
                    send_push({"endpoint": sub.endpoint, "keys": sub.keys}, rich_payload)
                    
        print("☀️ Đã xử lý xong toàn bộ tác vụ quét buổi sáng.")
    except Exception as e:
        print(f"Lỗi trong quá trình chạy bot quét buổi sáng: {e}")


def scan_evening_streak_guard_job():
    """HÀM CHẠY NGẦM BUỔI TỐI (Cài chạy lúc 21:00 tối hằng ngày)
    - Kịch bản 2: Cảnh báo cứu nguy chuỗi Streak học tập (Streak Guard) phút chót.
    """
    print(f"[{datetime.now()}] 🌙 Bot quét tối muộn bắt đầu tuần tra chuỗi Streak...")
    
    try:
        response = supabase.table("user_progress").select("user_id, theme").eq("is_completed", False).execute()
        records = response.data
        if not records:
            return

        for record in records:
            u_id = record["user_id"]
            theme = record["theme"]
            
            user_targets = [s for s in subscriptions if s.user_id == u_id]
            if not user_targets:
                continue
                
            prompt = f"Bây giờ đã muộn và ngày sắp kết thúc nhưng học viên vẫn chưa vào tích hoàn thành bài học hôm nay cho chủ đề '{theme}'. Hãy viết một thông báo đẩy mang tính cảnh báo nhẹ nhàng nhưng đánh trúng tâm lý sợ mất chuỗi ngày học liên tục (Streak), thúc giục họ vào học ngay lập tức."

            fallback_title = "🔥 Cứu nguy chuỗi Streak!"
            fallback_body = f"Ngày sắp khép lại rồi, vào hoàn thành bài học '{theme}' ngay để bảo vệ chuỗi ngày học liên tục của bạn nhé!"
            
            ai_msg = safe_call_gemini_notification(prompt, fallback_title, fallback_body)
            
            rich_payload = {
                "title": ai_msg["title"],
                "body": ai_msg["body"],
                "icon": "/icons/icon-192.jpg",
                "data": {"url": "/"},
                "actions": [
                    {"action": "learn_now", "title": "🔥 Cứu Streak ngay"},
                    {"action": "remind_later", "title": "⏰ Để sau"}
                ]
            }
            for sub in user_targets:
                send_push({"endpoint": sub.endpoint, "keys": sub.keys}, rich_payload)
                    
        print("🌙 Đã bảo vệ và nhắc nhở chuỗi Streak hoàn tất cho các user đến hạn.")
    except Exception as e:
        print(f"Lỗi trong quá trình chạy bot bảo vệ Streak buổi tối: {e}")



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
        last_message = extract_message_content(messages[-1].content) if messages else "No response"
        
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