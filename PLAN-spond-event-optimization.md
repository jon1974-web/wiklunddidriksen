# Plan: Optimize Spond Event Loading

## Current State
- Fetches up to 100 events per group from Spond API
- All events stored in state, past events filtered client-side
- No date range filtering on API call

## Proposed Optimization

### Option A: Add date range to API call (recommended)
- Fetch only events from 1 month ago to 3 months ahead
- Reduces payload size significantly
- Spond API supports date filtering

### Option B: Reduce max from 100 to 50
- Quick fix but less impactful

### Option C: Lazy load past events
- Only fetch past events when user toggles "Show past events"
- Most complex but best UX

## Recommendation
Option A — add date range filtering to the Spond API call. Clean, simple, and reduces load time.

## Files to Change
| File | Change |
|------|--------|
| `functions/index.js` | Add date params to Spond API call in `spondProxy` |
| `src/services/spondService.ts` | Pass date range to `getSpondEvents` |
| `src/screens/EventsScreen.tsx` | Pass date range when calling `getSpondEvents` |

## Status
Saved for later implementation.
