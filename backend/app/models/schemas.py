from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


# ── Auth ─────────────────────────────────────────────────────────────────
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = Field(min_length=3, max_length=30)
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Profiles ─────────────────────────────────────────────────────────────
class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_emoji: Optional[str] = None


# ── Posts ────────────────────────────────────────────────────────────────
class PostCreate(BaseModel):
    caption: str
    media_url: Optional[str] = None
    media_type: Literal["image", "video", "reel", "text"] = "image"
    location: Optional[str] = None
    tags: list[str] = []


class PostUpdate(BaseModel):
    caption: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[list[str]] = None


class CommentCreate(BaseModel):
    text: str
    parent_comment_id: Optional[UUID] = None


# ── Collab ───────────────────────────────────────────────────────────────
class CollabSessionCreate(BaseModel):
    title: str = "Untitled collab"


class CollabInvite(BaseModel):
    username: str
    role: Literal["editor", "viewer"] = "editor"


class LayerCreate(BaseModel):
    layer_type: Literal["image", "text", "drawing", "sticker"]
    content: dict  # { x, y, w, h, text, color, src, rotation }
    z_index: int = 0


class LayerUpdate(BaseModel):
    content: Optional[dict] = None
    z_index: Optional[int] = None


class CollabCommentCreate(BaseModel):
    text: str
    layer_id: Optional[UUID] = None
    x: Optional[float] = None
    y: Optional[float] = None


class PublishCollab(BaseModel):
    caption: str
    tags: list[str] = []


# ── Spaces ───────────────────────────────────────────────────────────────
class SpaceCreate(BaseModel):
    title: str
    description: Optional[str] = None


# ── Messages ─────────────────────────────────────────────────────────────
class MessageCreate(BaseModel):
    text: str


class ConversationCreate(BaseModel):
    username: str  # the other participant
