from fastapi import APIRouter, HTTPException, Depends
from app.core.supabase_client import get_supabase, get_supabase_anon
from app.core.deps import get_current_user_id
from app.models.schemas import SignUpRequest, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
def signup(body: SignUpRequest):
    """
    Creates a Supabase Auth user. The `fn_handle_new_user` trigger in
    schema.sql automatically creates a matching `profiles` row.
    """
    admin = get_supabase()
    existing = (
        admin.table("profiles")
        .select("id")
        .eq("username", body.username)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Username is already taken")

    sb = get_supabase_anon()
    try:
        result = sb.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {
                    "data": {
                        "username": body.username,
                        "display_name": body.display_name or body.username,
                    }
                },
            }
        )
    except Exception as e:
        message = str(e)
        if "database error saving new user" in message.lower():
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not create your profile. Try a different username, "
                    "or re-run database/schema.sql in Supabase if this happens for every username."
                ),
            )
        raise HTTPException(status_code=400, detail=message)

    if result.user is None:
        raise HTTPException(status_code=400, detail="Sign up failed")

    profile = (
        admin.table("profiles")
        .select("*")
        .eq("id", result.user.id)
        .single()
        .execute()
    )

    return {
        "user": {"id": result.user.id, "email": result.user.email},
        "session": result.session.model_dump() if result.session else None,
        "profile": profile.data if profile.data else None,
    }


@router.post("/login")
def login(body: LoginRequest):
    sb = get_supabase_anon()
    try:
        result = sb.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "user": {"id": result.user.id, "email": result.user.email},
        "session": result.session.model_dump() if result.session else None,
        "profile": None,
    }


@router.post("/logout")
def logout(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    sb.auth.sign_out()
    return {"success": True}


@router.get("/me")
def me(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    res = sb.table("profiles").select("*").eq("id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return res.data
