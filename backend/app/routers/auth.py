from fastapi import APIRouter, HTTPException, Depends
from app.core.supabase_client import get_supabase
from app.core.deps import get_current_user_id
from app.models.schemas import SignUpRequest, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
def signup(body: SignUpRequest):
    """
    Creates a Supabase Auth user. The `fn_handle_new_user` trigger in
    schema.sql automatically creates a matching `profiles` row.
    """
    sb = get_supabase()
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
        raise HTTPException(status_code=400, detail=str(e))

    if result.user is None:
        raise HTTPException(status_code=400, detail="Sign up failed")

    return {
        "user": {"id": result.user.id, "email": result.user.email},
        "session": result.session.model_dump() if result.session else None,
    }


@router.post("/login")
def login(body: LoginRequest):
    sb = get_supabase()
    try:
        result = sb.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "user": {"id": result.user.id, "email": result.user.email},
        "session": result.session.model_dump() if result.session else None,
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
