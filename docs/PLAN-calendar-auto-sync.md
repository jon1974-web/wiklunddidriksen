# Calendar Auto-Sync Plan

## Goal
Automatically save app-created items to the user's calendar. Remove manual "Add to calendar" buttons.

## Items to Auto-Sync
- Events (app events)
- Health appointments (timer)
- Health vaccinations
- Pet vet visits
- Pet vaccinations
- Trips

## NOT Auto-Synced
- Spond events (already handled by Spond's own calendar sync)

## What Gets Removed
- Manual "Add to calendar" button on event detail cards

## Calendar Options in Profile
- Toggle: Telefon-kalender / Google Kalender
- Phone calendar: expo-calendar (no API needed, works on mobile)
- Google Calendar: OAuth + Cloud Functions (works on PWA + mobile)

## Required Setup (User Action)
1. Google Calendar API enabled in GCP (DONE)
2. Create OAuth credentials in GCP
3. Store OAuth refresh tokens securely in Firestore

## Implementation

### Cloud Functions (Google Calendar path)
- `onEventCreated` — triggers on `events/{eventId}`
- `onTripCreated` — triggers on `trips/{tripId}`
- `onHealthAppointmentCreated` — triggers on `healthAppointments/{docId}`
- `onHealthVaccinationCreated` — triggers on health vaccinations collection
- `onPetVetVisitCreated` — triggers on `petVetVisits/{docId}`
- `onPetVaccinationCreated` — triggers on pet vaccinations collection

Each function:
1. Look up the `createdBy` user's profile
2. Check if `calendarType === 'google'` and tokens exist
3. Create calendar entry via Google Calendar API
4. Store the external calendar event ID for future updates/deletions

### Phone Calendar Path (no API needed)
- Use `expo-calendar` on iOS/Android to add events directly
- On PWA: generate .ics file or use webcal:// links
- Request calendar permission once in Profile

### Profile Updates
- Add `calendarType: 'phone' | 'google'` field
- Add toggle in Profile calendar section
- Store Google OAuth tokens: `calendarAccessToken`, `calendarRefreshToken`, `calendarTokenExpiry`

### Calendar Event Format
- Events: Title, date/time, location, description
- Trips: All-day events for trip duration, title = "✈️ {city}"
- Health appointments: Title, date/time, location
- Health vaccinations: Title, date, description
- Pet vet visits: Title, date/time, location
- Pet vaccinations: Title, date, description

### Error Handling
- If token expired → refresh using refresh token
- If refresh fails → disable sync, notify user
- Log sync status for debugging

## Dependencies
- Google Calendar API credentials (user setting up now)
- OAuth flow for token acquisition

## Priority
High — requested feature
