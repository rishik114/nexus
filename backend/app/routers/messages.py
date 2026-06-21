from fastapi import APIRouter, HTTPException, Depends
from app.core.supabase_client import get_supabase
from app.core.deps import get_current_user_id
from app.models.schemas import MessageCreate, ConversationCreate

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/conversations")
def list_conversations(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    parts = sb.table("conversation_participants").select("conversation_id").eq("user_id", user_id).execute()
    conv_ids = [p["conversation_id"] for p in parts.data]
    if not conv_ids:
        return []

    results = []
    for cid in conv_ids:
        others = (
            sb.table("conversation_participants")
            .select("user:profiles(username, display_name, avatar_emoji)")
            .eq("conversation_id", cid)
            .neq("user_id", user_id)
            .execute()
        )
        last_msg = (
            sb.table("messages")
            .select("*")
            .eq("conversation_id", cid)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        results.append(
            {
                "conversation_id": cid,
                "participants": [o["user"] for o in others.data],
                "last_message": last_msg.data[0] if last_msg.data else None,
            }
        )
    return results


@router.post("/conversations")
def start_conversation(body: ConversationCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    target = sb.table("profiles").select("id").eq("username", body.username).single().execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found")
    target_id = target.data["id"]

    # check if a conversation already exists between these two
    mine = sb.table("conversation_participants").select("conversation_id").eq("user_id", user_id).execute()
    theirs = sb.table("conversation_participants").select("conversation_id").eq("user_id", target_id).execute()
    mine_ids = {p["conversation_id"] for p in mine.data}
    theirs_ids = {p["conversation_id"] for p in theirs.data}
    shared = mine_ids & theirs_ids
    if shared:
        return {"conversation_id": list(shared)[0], "existing": True}

    conv = sb.table("conversations").insert({}).execute()
    conv_id = conv.data[0]["id"]
    sb.table("conversation_participants").insert(
        [{"conversation_id": conv_id, "user_id": user_id}, {"conversation_id": conv_id, "user_id": target_id}]
    ).execute()
    return {"conversation_id": conv_id, "existing": False}


@router.get("/conversations/{conversation_id}")
def get_messages(conversation_id: str, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    part = (
        sb.table("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not part.data:
        raise HTTPException(status_code=403, detail="Not a participant")

    res = (
        sb.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return res.data


@router.post("/conversations/{conversation_id}")
def send_message(conversation_id: str, body: MessageCreate, user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    part = (
        sb.table("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not part.data:
        raise HTTPException(status_code=403, detail="Not a participant")

    res = sb.table("messages").insert(
        {"conversation_id": conversation_id, "sender_id": user_id, "text": body.text}
    ).execute()
    # Realtime broadcasts this to the other participant automatically
    return res.data[0]
