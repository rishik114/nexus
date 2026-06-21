from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """
    Verifies the Supabase-issued JWT sent as `Authorization: Bearer <token>`.
    Supabase signs access tokens with the project's JWT secret (HS256).
    Returns the authenticated user's UUID (the `sub` claim).
    """
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")
    return user_id


def get_optional_user_id(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str | None:
    """Same as above, but returns None instead of raising when no token is present."""
    if creds is None:
        return None
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload.get("sub")
    except JWTError:
        return None
