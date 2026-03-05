from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, videos

app = FastAPI(
    title="EchoFeed API",
    version="0.1.0",
    docs_url="/docs",  # Visit /docs to see auto-generated API docs
)

# CORS — allow your frontend to call this API
# In production, replace "*" with your actual Vercel URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dev: allow all. Prod: ["https://echofeed.vercel.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(videos.router, prefix="/videos", tags=["videos"])

@app.get("/")
def root():
    return {"message": "EchoFeed API is running"}