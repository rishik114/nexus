from fastapi import APIRouter, Depends
from app.core.supabase_client import get_supabase
from app.core.deps import get_current_user_id

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    res = (
        sb.table("notifications")
        .select("*, from_user:profiles(username, display_name, avatar_emoji)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return res.data


@router.put("/{notification_id}/read")
def mark_read(notification_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    res = (
        sb.table("notifications")
        .update({"read": True})
        .eq("id", notification_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else {}


@router.put("/read-all")
def mark_all_read(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    sb.table("notifications").update({"read": True}).eq("user_id", user_id).eq("read", False).execute()
    return {"success": True}
