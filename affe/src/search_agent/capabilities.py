"""
Search subagent: web search via DuckDuckGo Instant Answer API (no key).
"""
from __future__ import annotations

import urllib.parse
import urllib.request


def search(query: str) -> str:
    """Search and return a short answer or summary. Uses DuckDuckGo Instant Answer API."""
    url = "https://api.duckduckgo.com/?q=" + urllib.parse.quote(query) + "&format=json"
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            data = __import__("json").loads(r.read().decode())
    except Exception as e:
        return f"Search failed: {e}"
    abstract = (data.get("AbstractText") or "").strip()
    if abstract:
        source = (data.get("AbstractURL") or "").strip()
        if source:
            return abstract + "\nSource: " + source
        return abstract
    related = data.get("RelatedTopics") or []
    if related and isinstance(related[0], dict) and related[0].get("Text"):
        return related[0]["Text"]
    return f"No short answer for '{query}'. Try rephrasing or ask for weather, time, or notes."
