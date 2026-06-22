from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase_client import get_supabase_anon

bearer_scheme = HTTPBearer(auto_error=False)


def _user_id_from_credentials(creds: HTTPAuthorizationCredentials) -> str:
    try:
        response = get_supabase_anon().auth.get_user(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = response.user.id if response and response.user else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")
    return user_id


def get_current_user_id(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """
    Verifies the browser's Supabase access token with Supabase Auth and
    returns the authenticated user's UUID.
    """
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return _user_id_from_credentials(creds)


def get_optional_user_id(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str | None:
    """Same as above, but returns None instead of raising when no token is present."""
    if creds is None:
        return None
    try:
        return _user_id_from_credentials(creds)
    except HTTPException:
        return None
