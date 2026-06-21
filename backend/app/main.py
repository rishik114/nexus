from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, users, posts, collab, stories, spaces, notifications, messages

app = FastAPI(
    title="Nexus API",
    description="Backend API for Nexus — an advanced social platform with AI feeds, live collab, and spaces.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(collab.router)
app.include_router(stories.router)
app.include_router(spaces.router)
app.include_router(notifications.router)
app.include_router(messages.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "nexus-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
