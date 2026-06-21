from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from app.core.supabase_client import get_supabase
from app.core.deps import get_current_user_id

router = APIRouter(prefix="/api/stories", tags=["stories"])


@router.get("")
def list_active_stories():
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    res = (
        sb.table("stories")
        .select("*, author:profiles(username, display_name, avatar_emoji)")
        .gt("expires_at", now)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("")
def create_story(media_emoji: str, caption: str = "", user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    res = sb.table("stories").insert(
        {"user_id": user_id, "media_emoji": media_emoji, "caption": caption}
    ).execute()
    return res.data[0]


@router.post("/{story_id}/view")
def view_story(story_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    existing = (
        sb.table("story_views").select("id").eq("story_id", story_id).eq("viewer_id", user_id).execute()
    )
    if not existing.data:
        sb.table("story_views").insert({"story_id": story_id, "viewer_id": user_id}).execute()
        story = sb.table("stories").select("views_count").eq("id", story_id).single().execute()
        sb.table("stories").update({"views_count": story.data["views_count"] + 1}).eq("id", story_id).execute()
    return {"success": True}
