from functools import lru_cache
from supabase import create_client, Client
from app.core.config import settings


def _require_setting(value: str, name: str) -> str:
    if not value:
        raise RuntimeError(f"{name} is not configured")
    return value


@lru_cache
def get_supabase() -> Client:
    """
    Service-role client — used by the FastAPI backend for privileged
    operations (bypasses Row Level Security). Only ever called server-side.
    """
    return create_client(
        _require_setting(settings.supabase_url, "SUPABASE_URL"),
        _require_setting(settings.supabase_service_role_key, "SUPABASE_SERVICE_ROLE_KEY"),
    )


@lru_cache
def get_supabase_anon() -> Client:
    """
    Anon-key client — used for public Supabase Auth operations and token checks.
    """
    return create_client(
        _require_setting(settings.supabase_url, "SUPABASE_URL"),
        _require_setting(settings.supabase_anon_key, "SUPABASE_ANON_KEY"),
    )
