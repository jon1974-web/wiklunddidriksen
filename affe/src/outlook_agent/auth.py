"""MSAL auth: interactive login, token cache, and token acquisition for Graph."""
import atexit
import os

import msal

from outlook_agent.config import CACHE_PATH, CLIENT_ID, SCOPES, TENANT


def _ensure_config() -> None:
    if not CLIENT_ID:
        raise RuntimeError(
            "AFFE_OUTLOOK_CLIENT_ID is not set. "
            "Create an app in Azure Portal and set it in .env (see docs/OUTLOOK_AUTH.md)."
        )


def _build_cache() -> msal.SerializableTokenCache:
    cache = msal.SerializableTokenCache()
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r") as f:
            cache.deserialize(f.read())

    def _save():
        if cache.has_state_changed:
            with open(CACHE_PATH, "w") as f:
                f.write(cache.serialize())

    atexit.register(_save)
    return cache


def get_token() -> str:
    """
    Return a valid access token for Microsoft Graph.
    Uses cached token if still valid; otherwise opens browser for interactive login.
    """
    _ensure_config()
    cache = _build_cache()
    app = msal.PublicClientApplication(
        client_id=CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT}",
        token_cache=cache,
    )
    accounts = app.get_accounts()
    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result:
            return result["access_token"]
    result = app.acquire_token_interactive(scopes=SCOPES)
    if "access_token" not in result:
        raise RuntimeError("Failed to get token: " + result.get("error_description", str(result)))
    return result["access_token"]
