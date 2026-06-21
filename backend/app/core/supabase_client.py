from functools import lru_cache
from supabase import create_client, Client
from app.core.config import settings


@lru_cache
def get_supabase() -> Client:
    """
    Service-role client — used by the FastAPI backend for privileged
    operations (bypasses Row Level Security). Only ever called server-side.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache
def get_supabase_anon() -> Client:
    """
    Anon-key client — used to verify user JWTs issued by Supabase Auth.
    """
    return create_client(settings.supabase_url, settings.supabase_anon_key)
