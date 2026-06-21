from fastapi import APIRouter, HTTPException, Depends
from app.core.supabase_client import get_supabase
from app.core.deps import get_current_user_id
from app.models.schemas import SpaceCreate

router = APIRouter(prefix="/api/spaces", tags=["spaces"])


@router.get("")
def list_live_spaces():
    sb = get_supabase()
    res = (
        sb.table("spaces")
        .select("*, host:profiles(username, display_name, avatar_emoji)")
        .eq("is_live", True)
        .order("listeners_count", desc=True)
        .execute()
    )
    return res.data


@router.post("")
def create_space(body: SpaceCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    res = sb.table("spaces").insert({**body.model_dump(), "host_id": user_id}).execute()
    space = res.data[0]
    sb.table("space_speakers").insert({"space_id": space["id"], "user_id": user_id, "role": "host"}).execute()
    return space


@router.post("/{space_id}/join")
def join_space(space_id: str, as_speaker: bool = False, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    role = "speaker" if as_speaker else "listener"
    sb.table("space_speakers").upsert(
        {"space_id": space_id, "user_id": user_id, "role": role}
    ).execute()

    listeners = sb.table("space_speakers").select("user_id", count="exact").eq("space_id", space_id).execute()
    sb.table("spaces").update({"listeners_count": listeners.count}).eq("id", space_id).execute()
    return {"success": True, "role": role}


@router.post("/{space_id}/end")
def end_space(space_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    space = sb.table("spaces").select("host_id").eq("id", space_id).single().execute()
    if not space.data or space.data["host_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the host can end this space")
    sb.table("spaces").update({"is_live": False, "ended_at": "now()"}).eq("id", space_id).execute()
    return {"success": True}
