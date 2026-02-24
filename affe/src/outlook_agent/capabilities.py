"""
Outlook subagent capabilities exposed to AFFE.
Each function uses the Graph client and returns structured data (or raises).
"""
from __future__ import annotations

from outlook_agent.graph_client import get, post


def list_emails(
    folder: str = "inbox",
    top: int = 10,
    query: str | None = None,
) -> list[dict]:
    """List emails. Returns list of dicts with subject, from, date, id, bodyPreview."""
    path = f"/me/mailFolders/{folder}/messages"
    params = {"$top": str(top), "$orderby": "receivedDateTime desc"}
    if query:
        escaped = query.replace("'", "''")
        params["$filter"] = f"contains(subject,'{escaped}')"
    data = get(path, params)
    out = []
    for m in data.get("value", []):
        from_ = (m.get("from", {}) or {}).get("emailAddress", {})
        out.append({
            "id": m.get("id"),
            "subject": m.get("subject", ""),
            "from": from_.get("address", ""),
            "from_name": from_.get("name", ""),
            "received": m.get("receivedDateTime"),
            "bodyPreview": (m.get("bodyPreview") or "")[:200],
        })
    return out


def get_calendar_events(start: str, end: str) -> list[dict]:
    """Get calendar events in range. start/end as ISO date or datetime strings."""
    # Graph expects ISO 8601; if only date, use midnight UTC for start and end-of-day for end
    if "T" not in start:
        start = start + "T00:00:00Z"
    if "T" not in end:
        end = end + "T23:59:59Z"
    data = get(
        "/me/calendar/calendarView",
        params={"startDateTime": start, "endDateTime": end},
    )
    out = []
    for e in data.get("value", []):
        out.append({
            "id": e.get("id"),
            "subject": e.get("subject", "(No title)"),
            "start": e.get("start", {}).get("dateTime"),
            "end": (e.get("end") or {}).get("dateTime"),
            "location": (e.get("location") or {}).get("displayName") or "",
            "isAllDay": e.get("isAllDay", False),
        })
    return out


def send_email(
    to: list[str],
    subject: str,
    body: str,
    cc: list[str] | None = None,
) -> None:
    """Send an email. to/cc are lists of email addresses."""
    to_list = [{"emailAddress": {"address": addr}} for addr in to]
    cc_list = [{"emailAddress": {"address": addr}} for addr in (cc or [])]
    payload = {
        "message": {
            "subject": subject,
            "body": {"contentType": "Text", "content": body},
            "toRecipients": to_list,
            "ccRecipients": cc_list,
        },
        "saveToSentItems": True,
    }
    post("/me/sendMail", payload)


def create_event(
    subject: str,
    start: str,
    end: str,
    attendees: list[str] | None = None,
    body: str | None = None,
) -> dict:
    """Create a calendar event. start/end ISO datetime. Returns created event."""
    payload = {
        "subject": subject,
        "start": {"dateTime": start, "timeZone": "UTC"},
        "end": {"dateTime": end, "timeZone": "UTC"},
        "body": {"contentType": "Text", "content": body or ""},
    }
    if attendees:
        payload["attendees"] = [
            {"emailAddress": {"address": a}, "type": "required"} for a in attendees
        ]
    return post("/me/events", payload) or {}


def find_contacts(search: str, top: int = 10) -> list[dict]:
    """Search contacts by name or email. Returns list of contact dicts."""
    # Graph doesn't have a simple search; we fetch and filter, or use $filter with startswith
    path = "/me/contacts"
    params = {"$top": "50"}
    data = get(path, params)
    search_lower = search.lower()
    out = []
    for c in data.get("value", []):
        name = (c.get("displayName") or "").lower()
        email = (c.get("emailAddresses") or [{}])[0].get("address", "").lower()
        if search_lower in name or search_lower in email:
            out.append({
                "id": c.get("id"),
                "displayName": c.get("displayName", ""),
                "email": (c.get("emailAddresses") or [{}])[0].get("address", ""),
            })
            if len(out) >= top:
                break
    return out
