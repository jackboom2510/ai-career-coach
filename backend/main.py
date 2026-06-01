import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

from api.routes import router as api_router
from api.routes import scan_morning_notifications_job, scan_evening_streak_guard_job

app = FastAPI(title="AI Career Coach Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "agent"}


scheduler = BackgroundScheduler()

# Ca 1: Đúng 8h00 sáng hằng ngày -> Chạy Kịch bản 1 (Ôn tập) & Kịch bản 3 (Bị kẹt bài)
scheduler.add_job(scan_morning_notifications_job, trigger='cron', hour=8, minute=0)

# Ca 2: Đúng 21h00 tối hằng ngày -> Chạy Kịch bản 2 (Cứu nguy chuỗi Streak)
scheduler.add_job(scan_evening_streak_guard_job, trigger='cron', hour=21, minute=0)

# # KÍCH HOẠT DÒNG NÀY ĐỂ TEST: Cứ mỗi 1 phút hệ thống tự động quét DB một lần
# scheduler.add_job(scan_morning_notifications_job, trigger='interval', minutes=1)
# scheduler.add_job(scan_evening_streak_guard_job, trigger='interval', minutes=1)
@app.on_event("startup")
def start_scheduler():
    # Khởi động bộ đếm giờ cùng lúc khi server FastAPI bật lên
    scheduler.start()


@app.on_event("shutdown")
def stop_scheduler():
    # Tắt bộ đếm giờ khi tắt server để giải phóng tài nguyên RAM
    scheduler.shutdown()