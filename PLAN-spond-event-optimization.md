# Plan: Optimize Spond Event Loading

## Current State
- Fetches up to 100 events per group from Spond API (`max=100`)
- All events stored in state, past events filtered client-side
- No date range filtering on API call
- If one group fails, the all-or-nothing code used to block all events (now fixed with try/catch)

## Option A: Add date range to API call (recommended)
**How it works:** Pass `startDate` and `endDate` parameters to the Spond API call in the `spondProxy` Cloud Function.

**Changes:**
- `functions/index.js`: Add date params to Spond API URL: `${SPOND_API_BASE}/sponds/?groupId=${gid}&max=${max || 100}&from=${fromDate}&to=${toDate}`
- `src/services/spondService.ts`: Accept and pass date range to proxy
- `src/screens/EventsScreen.tsx`: Calculate date range (1 month ago to 3 months ahead) and pass to `getSpondEvents`

**Pros:** Clean, simple, reduces payload size significantly
**Cons:** Depends on Spond API supporting date params (needs verification)

## Option B: Reduce max from 100 to 50
**How it works:** Simply change the default `max` parameter from 100 to 50.

**Changes:**
- `functions/index.js`: Change `max || 100` to `max || 50`

**Pros:** One-line change, immediate improvement
**Cons:** Still fetches all events (no date filtering), might miss events if a group has many

## Option C: Lazy load past events
**How it works:** Only fetch future events by default. When user toggles "Show past events", make a separate API call for past events.

**Changes:**
- `functions/index.js`: Add a `direction` param (future/past) to the Spond API call
- `src/services/spondService.ts`: Accept direction param
- `src/screens/EventsScreen.tsx`: 
  - Default fetch: only future events
  - On "Show past events" toggle: fetch past events and merge

**Pros:** Best UX — fast initial load, past events on demand
**Cons:** Most complex implementation, two API calls instead of one

## Recommendation
Option A — add date range filtering to the Spond API call. Clean, simple, and reduces load time. If the Spond API doesn't support date params, fall back to Option B.

## Files to Change
| File | Change |
|------|--------|
| `functions/index.js` | Add date params to Spond API call in `spondProxy` |
| `src/services/spondService.ts` | Pass date range to `getSpondEvents` |
| `src/screens/EventsScreen.tsx` | Pass date range when calling `getSpondEvents` |

## Status
Saved for later implementation.
