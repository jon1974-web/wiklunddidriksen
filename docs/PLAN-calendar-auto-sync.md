# Calendar Auto-Sync Plan

## Goal
Automatically save events, trips, health appointments, and pet vet visits to the user's calendar when they register their email under the Calendar section in Profile.

## Current State
- User can register calendar email (Google/Outlook) in Profile
- Manual "Add to calendar" button on events opens calendar app (requires user confirmation)
- No API credentials for Google Calendar or Microsoft Graph

## Required Setup (User Action)
1. **Google Calendar API**: Enable in Google Cloud Console, create OAuth credentials
2. **Microsoft Graph API**: Register app in Azure AD, get OAuth credentials
3. Store OAuth refresh tokens securely in Firestore (encrypted)

## Implementation

### Cloud Functions
- `onEventCreated` — triggers on `events/{eventId}`
- `onTripCreated` — triggers on `trips/{tripId}`  
- `onHealthAppointmentCreated` — triggers on `healthAppointments/{docId}`
- `onPetVetVisitCreated` — triggers on `petVetVisits/{docId}`

Each function:
1. Look up the `createdBy` user's profile
2. Check if `calendarEmail` + `calendarProvider` are set
3. Check if `calendarSyncEnabled` is true (new profile field)
4. Create calendar entry via Google Calendar API or Microsoft Graph API
5. Store the external calendar event ID for future updates/deletions

### Profile Updates
- Add `calendarSyncEnabled: boolean` field
- Add toggle in Profile calendar section
- Store OAuth tokens: `calendarAccessToken`, `calendarRefreshToken`, `calendarTokenExpiry`

### Calendar Event Format
- **Events**: Title, date/time, location, description
- **Trips**: All-day events for trip duration, title = "✈️ {city}"
- **Health appointments**: Title, date/time, location
- **Pet vet visits**: Title, date/time, location

### Error Handling
- If token expired → refresh using refresh token
- If refresh fails → disable sync, notify user
- Log sync status for debugging

## Dependencies
- Google Calendar API credentials (user must set up)
- Microsoft Graph API credentials (user must set up)
- OAuth flow for token acquisition

## Priority
Medium — nice to have, requires external API setup first
