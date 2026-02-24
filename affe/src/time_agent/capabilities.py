"""
Time & date subagent: current time, date, day of week.
"""
from __future__ import annotations

from datetime import datetime


def current_time() -> str:
    """Return current local time as a short string."""
    return datetime.now().strftime("%H:%M")


def current_date() -> str:
    """Return current local date."""
    return datetime.now().strftime("%A, %d %B %Y")


def day_of_week(date_str: str | None = None) -> str:
    """Return day of week for a date string (YYYY-MM-DD or similar) or today."""
    if date_str:
        try:
            # Try common formats
            for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%B %d %Y"):
                try:
                    d = datetime.strptime(date_str.strip(), fmt)
                    return d.strftime("%A")
                except ValueError:
                    continue
        except Exception:
            pass
        return f"Could not parse date: {date_str}"
    return datetime.now().strftime("%A")
