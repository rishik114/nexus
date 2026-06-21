from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.supabase_client import get_supabase
from app.core.deps import get_current_user_id, get_optional_user_id
from app.models.schemas import ProfileUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/search")
def search_users(q: str = Query(..., min_length=1)):
    sb = get_supabase()
    res = (
        sb.table("profiles")
        .select("id, username, display_name, avatar_emoji, verified")
        .or_(f"username.ilike.%{q}%,display_name.ilike.%{q}%")
        .limit(10)
        .execute()
    )
    return res.data


@router.get("/suggestions")
def suggestions(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    following = sb.table("follows").select("following_id").eq("follower_id", user_id).execute()
    excluded_ids = [f["following_id"] for f in following.data] + [user_id]

    res = (
        sb.table("profiles")
        .select("id, username, display_name, avatar_emoji, verified, followers_count")
        .not_.in_("id", excluded_ids)
        .limit(5)
        .execute()
    )
    return res.data


@router.get("/{username}")
def get_profile(username: str, viewer_id: str | None = Depends(get_optional_user_id)):
    sb = get_supabase()
    res = sb.table("profiles").select("*").eq("username", username).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")

    profile = res.data
    is_following = False
    if viewer_id:
        f = (
            sb.table("follows")
            .select("id")
            .eq("follower_id", viewer_id)
            .eq("following_id", profile["id"])
            .execute()
        )
        is_following = len(f.data) > 0

    posts = (
        sb.table("posts")
        .select("*")
        .eq("user_id", profile["id"])
        .order("created_at", desc=True)
        .execute()
    )

    return {**profile, "is_following": is_following, "posts": posts.data}


@router.put("/me")
def update_profile(body: ProfileUpdate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = sb.table("profiles").update(updates).eq("id", user_id).execute()
    return res.data[0] if res.data else {}


@router.post("/{username}/follow")
def toggle_follow(username: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    target = sb.table("profiles").select("id").eq("username", username).single().execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found")
    target_id = target.data["id"]
    if target_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = (
        sb.table("follows")
        .select("id")
        .eq("follower_id", user_id)
        .eq("following_id", target_id)
        .execute()
    )

    if existing.data:
        sb.table("follows").delete().eq("id", existing.data[0]["id"]).execute()
        following = False
    else:
        sb.table("follows").insert({"follower_id": user_id, "following_id": target_id}).execute()
        sb.table("notifications").insert(
            {"user_id": target_id, "from_user_id": user_id, "type": "follow"}
        ).execute()
        following = True

    updated = sb.table("profiles").select("followers_count").eq("id", target_id).single().execute()
    return {"following": following, "followers_count": updated.data["followers_count"]}


@router.get("/{username}/followers")
def get_followers(username: str):
    sb = get_supabase()
    user = sb.table("profiles").select("id").eq("username", username).single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    res = (
        sb.table("follows")
        .select("follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_emoji, verified)")
        .eq("following_id", user.data["id"])
        .execute()
    )
    return [r["follower"] for r in res.data]


@router.get("/{username}/following")
def get_following(username: str):
    sb = get_supabase()
    user = sb.table("profiles").select("id").eq("username", username).single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    res = (
        sb.table("follows")
        .select("following:profiles!follows_following_id_fkey(id, username, display_name, avatar_emoji, verified)")
        .eq("follower_id", user.data["id"])
        .execute()
    )
    return [r["following"] for r in res.data]
