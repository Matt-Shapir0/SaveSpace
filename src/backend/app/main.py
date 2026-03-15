from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, videos, chat, profiles, stats, episodes

app = FastAPI(title="EchoFeed API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(videos.router, prefix="/videos", tags=["videos"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])
app.include_router(episodes.router, prefix="/episodes", tags=["episodes"])
