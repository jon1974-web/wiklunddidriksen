"""
Microsoft Graph client: authenticated HTTP calls to Graph API.
"""
from __future__ import annotations

from typing import Any

import requests

from outlook_agent.auth import get_token

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


def _headers() -> dict[str, str]:
    return {
        "Authorization": "Bearer " + get_token(),
        "Content-Type": "application/json",
    }


def get(path: str, params: dict[str, str] | None = None) -> dict[str, Any]:
    """GET a Graph API resource. path is e.g. /me/calendar/calendarView."""
    url = GRAPH_BASE + path
    r = requests.get(url, headers=_headers(), params=params or {}, timeout=30)
    r.raise_for_status()
    return r.json()


def post(path: str, json: dict[str, Any]) -> None | dict[str, Any]:
    """POST to Graph. Some endpoints return 202 No Content."""
    url = GRAPH_BASE + path
    r = requests.post(url, headers=_headers(), json=json, timeout=30)
    if r.status_code == 204 or r.status_code == 202:
        return None
    r.raise_for_status()
    return r.json() if r.content else None
