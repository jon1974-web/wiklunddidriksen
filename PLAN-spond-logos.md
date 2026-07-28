# Spond Group Logos Plan

## Goal
Replace hardcoded Spond group logos with dynamic, user-uploadable logos that work across Events, Min uke, and event filtering.

## Current State
- `SPOND_GROUP_LOGOS` is a hardcoded map in EventsScreen (2 groups only)
- SpondGroup type has only `id` and `name`
- Profile group selection has no logo UI
- WeeklySummary uses hardcoded 🏟️ for all Spond events

## Architecture

### 1. SpondGroup Type Update
Add `logoUrl?: string` to `SpondGroup` in `types/index.ts`

### 2. Spond API — Extract Logo URL
- Update `spondProxy` to return full group data (already does)
- Update `getSpondGroups` in `spondService.ts` to also extract `logoUrl` if the Spond API provides it
- Log the full group response to see what fields are available

### 3. SpondConfig Storage
- Store `logoUrl` per group in `SpondConfig.groups[]`
- Logo uploaded to Firebase Storage at `spond-logos/{familyId}/{groupId}`
- URL saved in config alongside group id/name

### 4. ProfileScreen — Logo Upload
- After selecting groups, show each selected group with:
  - Group name
  - Current logo (or placeholder)
  - "Change logo" button → image picker
- Upload to Firebase Storage, save URL in config

### 5. EventsScreen — Dynamic Logos
- Replace hardcoded `SPOND_GROUP_LOGOS` with config-based lookup
- Build a `Record<string, string>` map from `config.groups` (groupId → logoUrl)
- Use in event cards, filter bar, and SpondEventDetailScreen

### 6. WeeklySummary — Group Logos
- Pass group logos map to WeeklySummary
- Show logo image instead of 🏟️ emoji for Spond events

### 7. Event Filtering
- Replace hardcoded filter keys with dynamic group-based filtering
- Filter bar shows uploaded logos

## Files to Change
| File | Change |
|------|--------|
| `src/types/index.ts` | Add `logoUrl` to SpondGroup |
| `src/services/spondService.ts` | Extract logoUrl from API response |
| `functions/index.js` | Log raw group response for debugging |
| `src/screens/ProfileScreen.tsx` | Logo upload UI per group |
| `src/screens/EventsScreen.tsx` | Dynamic logo lookup, replace hardcoded map |
| `src/screens/SpondEventDetailScreen.tsx` | Dynamic logo lookup |
| `src/components/WeeklySummary.tsx` | Accept + show group logos |

## Estimated Work
~300-400 lines across 7 files
