# Phone Calendar Sync Plan

## Current State
- **Google Calendar**: Synced via Cloud Functions (triggers on create/update/delete)
  - Events ✅
  - Trips ✅
  - Health appointments ✅
  - Pet vet visits ✅
- **Phone Calendar**: Synced via `CalendarSync` (expo-calendar on native)
  - Events ✅
  - Trips ❌
  - Health appointments ❌
  - Pet vet visits ❌

## Rule
When adding or modifying calendar sync for any module, **both** Google Calendar (Cloud Functions) AND Phone Calendar (`CalendarSync`) must be updated. Never implement one without the other.

## Modules Needing Phone Calendar Sync

### 1. Trips
- Sync trip to phone calendar on create (with times if available)
- Update trip in phone calendar on edit
- Delete trip from phone calendar on delete
- Pattern: Follow the same flow as events in `AddTripScreen` / `TripDetailScreen`

### 2. Health Appointments
- Sync appointment to phone calendar on create
- Update appointment on edit
- Delete from calendar on delete
- Pattern: Follow `HealthSpaceScreen` CRUD flow

### 3. Pet Vet Visits
- Sync vet visit to phone calendar on create
- Update on edit
- Delete from calendar on delete
- Pattern: Follow `PetSpaceScreen` vet visit CRUD flow

## Implementation Notes
- `CalendarSync.native.tsx` — uses `expo-calendar` for native iOS/Android
- `CalendarSync.web.tsx` — stub implementation (no-op on web)
- `calendarService.ts` — wraps CalendarSync, used by all screens
- Phone calendar sync requires `calendarId` from user profile
- All-day events: trips (no time), health/pet with time (timed events)
- `syncEventToCalendar` and `updateCalendarEvent` already exist in `CalendarSync`
