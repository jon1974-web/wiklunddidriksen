"""
AFFE manager: receives user message, routes to one or more subagents, returns combined reply.
Uses keyword-based intent; multiple intents can run together (e.g. weather + time).
"""
from __future__ import annotations

from datetime import datetime, timedelta

from outlook_agent import capabilities as outlook
from time_agent import capabilities as time_agent
from notes_agent import capabilities as notes_agent
from search_agent import capabilities as search_agent
from weather_agent import capabilities as weather_agent


def _parse_date(s: str) -> tuple[str, str]:
    """Return (start, end) ISO strings for today or tomorrow."""
    today = datetime.utcnow().date()
    if "tomorrow" in s.lower():
        d = today + timedelta(days=1)
    else:
        d = today
    start = d.isoformat() + "T00:00:00Z"
    end = d.isoformat() + "T23:59:59Z"
    return start, end


# ---------- Outlook (optional: may fail if no consent) ----------
def _intent_outlook_calendar(msg: str) -> bool:
    m = msg.lower()
    return any(w in m for w in ("meeting", "meetings", "calendar", "event", "events", "today", "tomorrow", "schedule", "agenda"))


def _intent_outlook_mail(msg: str) -> bool:
    m = msg.lower()
    return any(w in m for w in ("email", "emails", "mail", "inbox", "read mail", "recent mail"))


def _intent_outlook_contacts(msg: str) -> bool:
    m = msg.lower()
    return any(w in m for w in ("contact", "contacts", "find contact", "look up contact")) and "search" not in m


def _handle_outlook_calendar(msg: str) -> str:
    start, end = _parse_date(msg)
    events = outlook.get_calendar_events(start, end)
    if not events:
        return "You have no calendar events in that period."
    lines = ["Your calendar:"]
    for e in events:
        start_str = (e.get("start") or "")[:16].replace("T", " ")
        subj = e.get("subject", "(No title)")
        loc = e.get("location", "")
        lines.append(f"- {start_str}  {subj}" + (f"  ({loc})" if loc else ""))
    return "\n".join(lines)


def _handle_outlook_mail(msg: str) -> str:
    emails = outlook.list_emails(folder="inbox", top=10)
    if not emails:
        return "Your inbox is empty."
    lines = ["Recent inbox:"]
    for m in emails:
        subj = m.get("subject", "(No subject)")
        from_ = m.get("from_name") or m.get("from", "")
        date = (m.get("received") or "")[:10]
        lines.append(f"- [{date}] {from_}: {subj}")
    return "\n".join(lines)


def _handle_outlook_contacts(msg: str) -> str:
    words = msg.lower().split()
    search = ""
    for w in ("contact", "contacts", "find", "who", "is"):
        if w in words and words.index(w) + 1 < len(words):
            search = words[words.index(w) + 1]
            break
    if not search:
        search = msg.strip()
    contacts = outlook.find_contacts(search, top=5)
    if not contacts:
        return f"No contacts found for '{search}'."
    lines = [f"- {c.get('displayName', '')}  {c.get('email', '')}" for c in contacts]
    return "Contacts:\n" + "\n".join(lines)


# ---------- Time ----------
def _intent_time(msg: str) -> bool:
    m = msg.lower()
    return any(w in m for w in ("time", "what time", "date", "what date", "what day", "day of week", "what's the time", "what's the date"))


def _handle_time(msg: str) -> str:
    m = msg.lower()
    if "date" in m and "time" not in m:
        return f"Today's date: {time_agent.current_date()}."
    if "day" in m:
        return f"Today is {time_agent.current_date()}."
    return f"Current time: {time_agent.current_time()}. Date: {time_agent.current_date()}."


# ---------- Notes ----------
def _intent_notes(msg: str) -> bool:
    m = msg.lower()
    return any(w in m for w in ("note", "notes", "add note", "list notes", "read note", "search notes", "my notes", "save a note"))


def _handle_notes(msg: str) -> str:
    m = msg.lower()
    if "add" in m or "save" in m or "write" in m:
        # "add note: buy milk" or "save note shopping: milk, bread"
        rest = msg
        for prefix in ("add note", "add a note", "save note", "save a note", "write note"):
            if rest.lower().startswith(prefix):
                rest = rest[len(prefix):].strip().lstrip(":").strip()
                break
        if ":" in rest:
            title, content = rest.split(":", 1)
            title, content = title.strip(), content.strip()
        else:
            title = "note"
            content = rest
        if not content:
            return "Say what to save, e.g. 'Add note: buy milk'."
        return notes_agent.add_note(title or "note", content)
    if "list" in m or "show" in m or "my notes" in m:
        titles = notes_agent.list_notes()
        if not titles:
            return "You have no notes."
        return "Notes: " + ", ".join(titles)
    if "read" in m or "open" in m:
        words = msg.split()
        for i, w in enumerate(words):
            if w.lower() in ("read", "open") and i + 1 < len(words):
                title = words[i + 1]
                return notes_agent.read_note(title)
        return "Say which note to read, e.g. 'Read note shopping'."
    if "search" in m:
        rest = msg.lower().replace("search notes", "").replace("search note", "").strip()
        if not rest:
            return "Say what to search for."
        hits = notes_agent.search_notes(rest)
        if not hits:
            return f"No notes matching '{rest}'."
        return "\n".join([f"- {t}: {s[:80]}…" if len(s) > 80 else f"- {t}: {s}" for t, s in hits])
    titles = notes_agent.list_notes()
    if not titles:
        return "You have no notes. Say 'Add note: ...' to create one."
    return "Notes: " + ", ".join(titles)


# ---------- Search ----------
def _intent_search(msg: str) -> bool:
    m = msg.lower()
    return any(w in m for w in ("search", "look up", "what is", "who is", "find out", "google")) and "note" not in m and "contact" not in m


def _handle_search(msg: str) -> str:
    for prefix in ("search for", "search", "look up", "what is", "who is", "find out"):
        if msg.lower().startswith(prefix):
            query = msg[len(prefix):].strip().lstrip(":").strip()
            break
    else:
        query = msg.strip()
    if not query:
        return "Say what to search for, e.g. 'Search for Python'."
    return search_agent.search(query)


# ---------- Weather ----------
def _intent_weather(msg: str) -> bool:
    m = msg.lower()
    return any(w in m for w in ("weather", "temperature", "forecast", "rain", "snow", "how hot", "how cold"))


def _handle_weather(msg: str) -> str:
    m = msg.lower()
    place = ""
    for prefix in ("weather in", "weather at", "weather for", "temperature in", "forecast for"):
        if prefix in m:
            idx = m.index(prefix) + len(prefix)
            place = msg[idx:].split()[0] if msg[idx:].split() else ""
            break
    if not place:
        words = msg.split()
        for i, w in enumerate(words):
            if w.lower() in ("weather", "temperature", "forecast") and i + 1 < len(words):
                place = words[i + 1]
                break
    return weather_agent.get_weather(place or "Oslo")


# ---------- Handler list: (intent_check, handler) ----------
_HANDLERS = [
    (_intent_time, _handle_time),
    (_intent_weather, _handle_weather),
    (_intent_notes, _handle_notes),
    (_intent_search, _handle_search),
    (_intent_outlook_calendar, _handle_outlook_calendar),
    (_intent_outlook_mail, _handle_outlook_mail),
    (_intent_outlook_contacts, _handle_outlook_contacts),
]


def handle(user_message: str) -> str:
    """Process user input; run all matching agents and combine replies."""
    msg = (user_message or "").strip()
    if not msg:
        return (
            "Say something. You can ask for time, date, weather (e.g. 'weather in Oslo'), "
            "notes ('add note: ...', 'list notes'), search ('search for ...'), "
            "or calendar/inbox/contacts when Outlook is allowed."
        )

    results = []
    for intent_fn, handler_fn in _HANDLERS:
        if not intent_fn(msg):
            continue
        try:
            reply = handler_fn(msg)
            if reply:
                results.append(reply)
        except Exception as e:
            if "outlook" in handler_fn.__name__.lower() or "outlook" in str(e).lower():
                results.append("Outlook is not available yet (waiting for admin consent).")
            else:
                results.append(f"Error: {e}")

    if not results:
        return (
            "I didn't understand that. Try: 'What time is it?', 'Weather in Oslo', "
            "'Add note: buy milk', 'Search for Python', or calendar/inbox when Outlook is allowed."
        )
    return "\n\n".join(results)
