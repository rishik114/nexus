from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.supabase_client import get_supabase
from app.core.deps import get_current_user_id, get_optional_user_id
from app.models.schemas import PostCreate, PostUpdate, CommentCreate

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _enrich(sb, post: dict, viewer_id: str | None) -> dict:
    author = sb.table("profiles").select("id, username, display_name, avatar_emoji, verified").eq(
        "id", post["user_id"]
    ).single().execute()
    liked = False
    if viewer_id:
        l = sb.table("likes").select("id").eq("post_id", post["id"]).eq("user_id", viewer_id).execute()
        liked = len(l.data) > 0
    return {**post, "author": author.data, "liked": liked}


@router.get("/feed")
def get_feed(
    type: str = Query("foryou", pattern="^(foryou|following|trending)$"),
    page: int = 1,
    limit: int = 10,
    user_id: str | None = Depends(get_optional_user_id),
):
    sb = get_supabase()
    query = sb.table("posts").select("*", count="exact")

    if type == "following" and user_id:
        following = sb.table("follows").select("following_id").eq("follower_id", user_id).execute()
        ids = [f["following_id"] for f in following.data]
        if not ids:
            return {"posts": [], "total": 0, "page": page, "pages": 0}
        query = query.in_("user_id", ids)

    order_col = "likes_count" if type == "trending" else "created_at"
    start = (page - 1) * limit
    res = query.order(order_col, desc=True).range(start, start + limit - 1).execute()

    posts = [_enrich(sb, p, user_id) for p in res.data]
    total = res.count or 0
    return {"posts": posts, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/{post_id}")
def get_post(post_id: str, user_id: str | None = Depends(get_optional_user_id)):
    sb = get_supabase()
    res = sb.table("posts").select("*").eq("id", post_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Post not found")
    return _enrich(sb, res.data, user_id)


@router.post("")
def create_post(body: PostCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    res = sb.table("posts").insert({**body.model_dump(), "user_id": user_id}).execute()
    post = res.data[0]

    followers = sb.table("follows").select("follower_id").eq("following_id", user_id).execute()
    if followers.data:
        notifs = [
            {"user_id": f["follower_id"], "from_user_id": user_id, "type": "new_post", "post_id": post["id"]}
            for f in followers.data
        ]
        sb.table("notifications").insert(notifs).execute()

    return _enrich(sb, post, user_id)


@router.put("/{post_id}")
def update_post(post_id: str, body: PostUpdate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    existing = sb.table("posts").select("user_id").eq("id", post_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Post not found")
    if existing.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your post")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    res = sb.table("posts").update(updates).eq("id", post_id).execute()
    return _enrich(sb, res.data[0], user_id)


@router.delete("/{post_id}")
def delete_post(post_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    existing = sb.table("posts").select("user_id").eq("id", post_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Post not found")
    if existing.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your post")
    sb.table("posts").delete().eq("id", post_id).execute()
    return {"success": True}


@router.post("/{post_id}/like")
def toggle_like(post_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    post = sb.table("posts").select("user_id, likes_count").eq("id", post_id).single().execute()
    if not post.data:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = sb.table("likes").select("id").eq("post_id", post_id).eq("user_id", user_id).execute()
    if existing.data:
        sb.table("likes").delete().eq("id", existing.data[0]["id"]).execute()
        liked = False
    else:
        sb.table("likes").insert({"post_id": post_id, "user_id": user_id}).execute()
        if post.data["user_id"] != user_id:
            sb.table("notifications").insert(
                {"user_id": post.data["user_id"], "from_user_id": user_id, "type": "like", "post_id": post_id}
            ).execute()
        liked = True

    updated = sb.table("posts").select("likes_count").eq("id", post_id).single().execute()
    return {"liked": liked, "likes_count": updated.data["likes_count"]}


@router.get("/{post_id}/comments")
def get_comments(post_id: str):
    sb = get_supabase()
    res = (
        sb.table("comments")
        .select("*, author:profiles(username, display_name, avatar_emoji)")
        .eq("post_id", post_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/{post_id}/comments")
def add_comment(post_id: str, body: CommentCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    post = sb.table("posts").select("user_id").eq("id", post_id).single().execute()
    if not post.data:
        raise HTTPException(status_code=404, detail="Post not found")

    payload = {"post_id": post_id, "user_id": user_id, "text": body.text}
    if body.parent_comment_id:
        payload["parent_comment_id"] = str(body.parent_comment_id)

    res = sb.table("comments").insert(payload).execute()
    comment = res.data[0]

    if post.data["user_id"] != user_id:
        sb.table("notifications").insert(
            {"user_id": post.data["user_id"], "from_user_id": user_id, "type": "comment", "post_id": post_id}
        ).execute()

    author = sb.table("profiles").select("username, display_name, avatar_emoji").eq("id", user_id).single().execute()
    return {**comment, "author": author.data}
