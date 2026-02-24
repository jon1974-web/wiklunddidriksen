"""Load Outlook/Graph config from environment."""
import os

from dotenv import load_dotenv

load_dotenv()

# Azure AD app (register at https://portal.azure.com → App registrations)
CLIENT_ID = os.getenv("AFFE_OUTLOOK_CLIENT_ID", "")
TENANT = os.getenv("AFFE_OUTLOOK_TENANT", "common")  # "common" = personal + work accounts

# Scopes for mail, calendar, contacts, and user profile
SCOPES = [
    "User.Read",
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "Calendars.Read",
    "Calendars.ReadWrite",
    "Contacts.Read",
    "Contacts.ReadWrite",
]

# Token cache path (persisted so user doesn't re-auth every run)
def _cache_path() -> str:
    base = os.getenv("AFFE_DATA_DIR")
    if base:
        path = os.path.join(base, "outlook_token_cache.json")
    else:
        home = os.path.expanduser("~")
        path = os.path.join(home, ".affe", "outlook_token_cache.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


CACHE_PATH = _cache_path()
