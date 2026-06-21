from fastapi import APIRouter, HTTPException, Depends
from app.core.supabase_client import get_supabase
from app.core.deps import get_current_user_id
from app.models.schemas import (
    CollabSessionCreate, CollabInvite, LayerCreate, LayerUpdate,
    CollabCommentCreate, PublishCollab,
)

router = APIRouter(prefix="/api/collab", tags=["collab"])


def _require_participant(sb, session_id: str, user_id: str, roles=("owner", "editor", "viewer")):
    p = (
        sb.table("collab_participants")
        .select("role")
        .eq("session_id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not p.data or p.data[0]["role"] not in roles:
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    return p.data[0]["role"]


@router.post("/sessions")
def create_session(body: CollabSessionCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    res = sb.table("collab_sessions").insert({"title": body.title, "owner_id": user_id}).execute()
    session = res.data[0]
    sb.table("collab_participants").insert(
        {"session_id": session["id"], "user_id": user_id, "role": "owner"}
    ).execute()
    return session


@router.get("/sessions/{session_id}")
def get_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id)

    session = sb.table("collab_sessions").select("*").eq("id", session_id).single().execute()
    participants = (
        sb.table("collab_participants")
        .select("role, joined_at, user:profiles(id, username, display_name, avatar_emoji)")
        .eq("session_id", session_id)
        .execute()
    )
    layers = (
        sb.table("collab_layers")
        .select("*, owner:profiles(username, display_name, avatar_emoji)")
        .eq("session_id", session_id)
        .order("z_index")
        .execute()
    )
    comments = (
        sb.table("collab_comments")
        .select("*, author:profiles(username, display_name, avatar_emoji)")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )

    return {
        **session.data,
        "participants": participants.data,
        "layers": layers.data,
        "comments": comments.data,
    }


@router.post("/sessions/{session_id}/invite")
def invite(session_id: str, body: CollabInvite, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id, roles=("owner",))

    target = sb.table("profiles").select("id").eq("username", body.username).single().execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        sb.table("collab_participants")
        .select("id")
        .eq("session_id", session_id)
        .eq("user_id", target.data["id"])
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Already a participant")

    sb.table("collab_participants").insert(
        {"session_id": session_id, "user_id": target.data["id"], "role": body.role}
    ).execute()
    sb.table("notifications").insert(
        {
            "user_id": target.data["id"],
            "from_user_id": user_id,
            "type": "collab_invite",
            "collab_session_id": session_id,
        }
    ).execute()
    return {"success": True}


# ── Layers (the canvas objects) ─────────────────────────────────────────
@router.post("/sessions/{session_id}/layers")
def add_layer(session_id: str, body: LayerCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id, roles=("owner", "editor"))

    res = sb.table("collab_layers").insert(
        {
            "session_id": session_id,
            "owner_id": user_id,
            "layer_type": body.layer_type,
            "content": body.content,
            "z_index": body.z_index,
        }
    ).execute()
    # Supabase Realtime broadcasts this INSERT automatically to subscribed clients —
    # see frontend/lib/collab-realtime.ts
    return res.data[0]


@router.put("/sessions/{session_id}/layers/{layer_id}")
def update_layer(session_id: str, layer_id: str, body: LayerUpdate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id, roles=("owner", "editor"))

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    res = sb.table("collab_layers").update(updates).eq("id", layer_id).eq("session_id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Layer not found")
    return res.data[0]


@router.delete("/sessions/{session_id}/layers/{layer_id}")
def delete_layer(session_id: str, layer_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id, roles=("owner", "editor"))
    sb.table("collab_layers").delete().eq("id", layer_id).eq("session_id", session_id).execute()
    return {"success": True}


# ── Pinned comments ──────────────────────────────────────────────────────
@router.post("/sessions/{session_id}/comments")
def add_comment(session_id: str, body: CollabCommentCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id)

    payload = {"session_id": session_id, "user_id": user_id, "text": body.text}
    if body.layer_id:
        payload["layer_id"] = str(body.layer_id)
    if body.x is not None:
        payload["x"] = body.x
    if body.y is not None:
        payload["y"] = body.y

    res = sb.table("collab_comments").insert(payload).execute()
    return res.data[0]


@router.put("/sessions/{session_id}/comments/{comment_id}/resolve")
def resolve_comment(session_id: str, comment_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id)
    res = sb.table("collab_comments").update({"resolved": True}).eq("id", comment_id).execute()
    return res.data[0] if res.data else {}


# ── Version history ──────────────────────────────────────────────────────
@router.post("/sessions/{session_id}/versions")
def save_version(session_id: str, description: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id, roles=("owner", "editor"))

    layers = sb.table("collab_layers").select("*").eq("session_id", session_id).execute()
    res = sb.table("collab_versions").insert(
        {
            "session_id": session_id,
            "user_id": user_id,
            "description": description,
            "snapshot": layers.data,
        }
    ).execute()
    return res.data[0]


@router.get("/sessions/{session_id}/versions")
def list_versions(session_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id)
    res = (
        sb.table("collab_versions")
        .select("id, description, created_at, user:profiles(username, display_name)")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/sessions/{session_id}/versions/{version_id}/restore")
def restore_version(session_id: str, version_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id, roles=("owner", "editor"))

    version = sb.table("collab_versions").select("snapshot").eq("id", version_id).single().execute()
    if not version.data:
        raise HTTPException(status_code=404, detail="Version not found")

    # wipe current layers, replace with the snapshot
    sb.table("collab_layers").delete().eq("session_id", session_id).execute()
    snapshot = version.data["snapshot"]
    if snapshot:
        for layer in snapshot:
            layer.pop("id", None)
            layer.pop("created_at", None)
            layer.pop("updated_at", None)
        sb.table("collab_layers").insert(snapshot).execute()

    return {"success": True}


# ── Publish ───────────────────────────────────────────────────────────────
@router.post("/sessions/{session_id}/publish")
def publish(session_id: str, body: PublishCollab, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    _require_participant(sb, session_id, user_id, roles=("owner",))

    post_res = sb.table("posts").insert(
        {
            "user_id": user_id,
            "caption": body.caption,
            "tags": body.tags,
            "is_collab": True,
            "collab_session_id": session_id,
            "ai_enhanced": True,
        }
    ).execute()
    post = post_res.data[0]

    sb.table("collab_sessions").update(
        {"status": "published", "published_post_id": post["id"]}
    ).eq("id", session_id).execute()

    # Notify all contributors so they get credit/visibility
    participants = sb.table("collab_participants").select("user_id").eq("session_id", session_id).execute()
    for p in participants.data:
        if p["user_id"] != user_id:
            sb.table("notifications").insert(
                {
                    "user_id": p["user_id"],
                    "from_user_id": user_id,
                    "type": "collab_invite",
                    "post_id": post["id"],
                }
            ).execute()

    return post
