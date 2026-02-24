# AFFE – High-level architecture

## Overview

- **AFFE** is the manager agent: it receives user requests, decides which subagent(s) to use, delegates work, and returns a single response. **Multiple subagents can run together** when the user asks for several things (e.g. weather + time). Memory for learning to be added later.
- **Subagents** handle specific domains. Each exposes capabilities; AFFE routes and combines replies.
- The **UI** (web: text + push-to-talk voice) sends input to AFFE and displays the reply.

## Components

```
┌─────────────────────────────────────────────────────────────┐
│  Web UI (text + voice) → AFFE → one or more subagents       │
└─────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  AFFE (manager)                                              │
│  - Detect one or more intents from user message              │
│  - Call each matching subagent                               │
│  - Combine replies into one response                         │
└─────────────────────────────┬───────────────────────────────┘
         ┌────────────────────┼────────────────────┬──────────────────┐
         ▼                    ▼                    ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Time agent   │  │ Notes agent │  │ Search agent │  │ Weather agent│  │ Outlook      │
│ time, date   │  │ list/add/   │  │ DuckDuckGo   │  │ Open-Meteo   │  │ mail,        │
│ day of week  │  │ read/search │  │ instant     │  │ (no key)     │  │ calendar,    │
│              │  │ ~/.affe/    │  │ answer      │  │              │  │ contacts     │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

## Outlook subagent

- **Role:** All interaction with Microsoft 365 (mail, calendar, contacts).
- **API:** Microsoft Graph (HTTP). Same code runs on Mac and Windows.
- **Auth:** OAuth2 (MSAL). User signs in once in browser; tokens stored and refreshed by the app.
- **Capabilities (to implement step by step):**
  - **Read:** list/search emails, get calendar events in a range, look up contacts.
  - **Write:** send email, create/update calendar events, create/update contacts.
- **Interface to AFFE:** Clear functions, e.g. `list_emails(...)`, `get_calendar(...)`, `send_email(...)`, `create_event(...)`, `find_contact(...)`. AFFE calls these; subagent hides Graph and auth details.

## Technology choices

- **Language:** Python (good for agents, Graph SDK, and later packaging for Mac/PC).
- **Microsoft 365:** `msal` (auth) + `msgraph-sdk` or direct REST with `requests`.
- **AFFE core:** Start with simple intent routing (e.g. keywords or a small LLM call); memory and learning later.
- **UI:** Minimal for now (CLI or a simple window); voice and richer UI later.

## Data flow (example)

1. User: “What meetings do I have tomorrow?”
2. UI sends text to AFFE.
3. AFFE infers intent: “calendar query” → call Outlook subagent.
4. Outlook subagent: `get_calendar(date_range="tomorrow")` → Graph API → list of events.
5. AFFE turns event list into a short reply.
6. AFFE (optional) logs: user query, chosen subagent, result.
7. UI shows reply to user.

## Other subagents

- **Time agent**: current time, date, day of week (no API).
- **Notes agent**: list, add, read, search notes in `~/.affe/notes/` (local files).
- **Search agent**: web search via DuckDuckGo Instant Answer API (no key).
- **Weather agent**: current weather via Open-Meteo geocoding + forecast (no key).

## Next steps

- Add memory schema and logging when the first flows are stable.
- Outlook: wait for admin consent; then calendar/mail/contacts work as now.
