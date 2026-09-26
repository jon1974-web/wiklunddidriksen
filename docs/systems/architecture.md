# fampad — System Architecture

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Family organization platform built with Expo + Firebase</strong></p>

---

## Table of Contents

1. [Overview](#overview)
2. [Firebase Services](#firebase-services)
3. [Data Model](#data-model)
4. [Cloud Functions](#cloud-functions)
5. [Third-Party Integrations](#third-party-integrations)
6. [Calendar Sync Architecture](#calendar-sync-architecture)
7. [PWA Architecture](#pwa-architecture)
8. [Navigation Structure](#navigation-structure)
9. [Module System](#module-system)
10. [State Management](#state-management)
11. [Internationalization (i18n)](#internationalization)
12. [Security Architecture](#security-architecture)
13. [Key File Paths](#key-file-paths)

---

## Overview

fampad is a cross-platform family organization Progressive Web App (PWA) built with **Expo SDK 56** and **React Native Web**. It targets web browsers primarily, with native iOS support via Expo. The backend is entirely serverless using **Firebase**.

**Key architectural decisions:**
- Client reads directly from Firestore; all write mutations for family management go through Cloud Functions for security
- Every document is scoped to a `familyId` field for multi-family data isolation
- PWA-first design: installable, offline-aware, push notification capable
- Two-way calendar sync (Google Calendar via Cloud Functions + phone calendar on device)
- Multi-language support: Norwegian (Bokmål), Swedish, Danish, English, Finnish

---

## Firebase Services

### Project: `familiesenter-837bb`

| Service | Purpose | Config File |
|---------|---------|-------------|
| **Firebase Auth** | User authentication (email/password) | `src/services/firebase.ts` |
| **Cloud Firestore** | Primary database for all app data | `firestore.rules`, `firestore.indexes.json` |
| **Firebase Hosting** | PWA hosting with SPA rewrites + privacy/terms docs | `firebase.json` |
| **Cloud Functions** | Serverless API endpoints (Node.js 22) | `functions/index.js` |
| **Firebase Storage** | File uploads (chat images, avatars, pet photos, school schedules, documents) | `storage.rules` |
| **Firebase Cloud Messaging** | Push notifications for web PWA | FCM tokens stored in `users/{uid}` |

### Firebase Configuration

```typescript
// src/services/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyBlsfPOb2WcY_SQp3HgLuoOEJLtBllJxS8",
  authDomain: "familiesenter-837bb.firebaseapp.com",
  projectId: "familiesenter-837bb",
  storageBucket: "familiesenter-837bb.firebasestorage.app",
  messagingSenderId: "146555872592",
  appId: "1:146555872592:web:c16cd0d2eb179c21d17855"
};
```

### Firebase Exports

```typescript
export const db = getFirestore(app);   // Firestore
export const auth = getAuth(app);       // Authentication
export const storage = getStorage(app); // Storage
```

---

## Data Model

All collections are documented below with their key fields. Every family-scoped document includes a `familyId` field.

### Core Collections

#### `users/{uid}`
User profiles. Read by any authenticated user; create/update restricted to owner.

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Auth UID |
| `email` | string | User email |
| `displayName` | string | Display name |
| `phoneNumber` | string | Phone number (optional) |
| `familyId` | string | Associated family ID |
| `familyName` | string | Family name |
| `familyRole` | 'owner' / 'admin' / 'member' | Role within family |
| `appRole` | string | `appOwner` grants access to the Admin panel |
| `calendarProvider` | 'phone' / 'google' | Chosen calendar type |
| `calendarId` / `calendarEmail` | string | Connected Google calendar info |
| `avatarUrl` | string | Profile photo URL |
| `notificationsEnabled` | boolean | Push notification preference |
| `minUkeSections` | object | "My week" section + meal slot preferences |
| `spondConfig` | object | Spond username/groups (password encrypted) |
| `timezone` | string | Detected device timezone |
| `fcmToken` | string | FCM push token |
| `createdAt` | number | Timestamp |

#### `families/{familyId}`
Family group. Members stored as a map for role-based access.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `name` | string | Family name |
| `createdBy` | string | Creator UID |
| `members` | map | `{ [uid]: { role, displayName } }` |
| `inviteCode` | string | Current invite code (6-char hex) |
| `inviteCreatedAt` | number | Code creation timestamp |
| `inviteExpiresAt` | number | Code expiry (1 hour) |
| `createdAt` | number | Timestamp |

#### `families/{familyId}/config/{configId}`
Family configuration subcollection — including `config/spond` (Spond login, group selection, group logos).

---

### Events Module

#### `events/{eventId}`
Family-scoped events.

| Field | Type | Description |
|-------|------|-------------|
| `id` / `title` / `description` / `address` | string | Core event fields |
| `date` / `endDate` | string | Start/end date (YYYY-MM-DD) |
| `time` / `endTime` | string | Start/end time (HH:MM) |
| `reminderMinutes` | number | Reminder offset in minutes |
| `icon` | string | One of 20 event icons (`src/constants/eventIcons.ts`) |
| `persons` | array | Family members linked to the event |
| `repeatSchedule` | object | Repeat schedule (days/weeks, odd/even weeks) |
| `createdBy` / `familyId` | string | Ownership + isolation |
| `createdAt` | number | Timestamp |
| `notificationId` | string | Scheduled local notification ID |
| `calendarEventId` | string | Google Calendar event ID |
| `documentUrl` / `documentName` | string | Uploaded document |

#### `spondResponses/{responseId}`
Spond event response tracking, family-scoped.

---

### Chat Module

#### `chat/{messageId}`

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Message text (max 500 chars) |
| `senderId` / `senderName` / `senderAvatarUrl` | string | Sender info |
| `timestamp` | number | Unix timestamp |
| `imageUrl` | string | Image URL (if image message) |
| `reactions` | array | `[{ userId, type: 'like' / 'smile' / 'heart' }]` |
| `familyId` | string | Family ID |

---

### Trips Module

#### `trips/{tripId}`

| Field | Type | Description |
|-------|------|-------------|
| `title` / `city` / `country` / `icon` | string | Core trip fields |
| `startDate` / `endDate` | string | Trip dates |
| `startTime` / `endTime` | string | Optional times |
| `persons` | array | Family members (required) |
| `latitude` / `longitude` | number | Destination coordinates |
| `weatherSummary` | array | Weather forecast data (cached) |
| `destinationTips` | object | AI-generated travel tips (cached) |
| `createdBy` / `familyId` / `createdAt` | — | Ownership + isolation |

#### Trip Subcollections

| Subcollection | Type | Description |
|---------------|------|-------------|
| `trips/{tripId}/hotels/{id}` | TripHotel | Hotel/accommodation bookings |
| `trips/{tripId}/restaurants/{id}` | TripRestaurant | Restaurant reservations |
| `trips/{tripId}/activities/{id}` | TripActivity | Planned activities |
| `trips/{tripId}/transport/{id}` | TripTransport | Transport bookings (fly, tog, leiebil, båt, ferje, taxi) with utreise/hjemreise dual entries |
| `trips/{tripId}/packingLists/{id}` | TripPackingList | Packing lists with items |
| `trips/{tripId}/documents/{id}` | TripDocument | Trip documents/files |
| `trips/{tripId}/links/{id}` | TripLink | Saved URLs/links |

---

### Shopping & Birthday Modules

#### `shoppingLists/{listId}`
`title`, `items [{ name, checked }]`, `createdBy`, `familyId`, `createdAt`.

#### `birthdays/{birthdayId}`
`name`, `date`, `addedBy`, `addedByName`, `familyId`, `createdAt`, `reminderDaysBefore` (7 days).

#### `gifts/{giftId}`
`birthdayId`, `familyId`, `name`, `purchased`, `year`, `createdAt`.

---

### Health Module

Subcollections under a family document: `health/{familyId}/{subcollection}`

| Subcollection | Key Fields |
|---------------|------------|
| `appointments/{id}` | title, persons (multi-select), doctor, dateFrom/dateTo, time, location, reminderMinutes, documentUrl |
| `medications/{id}` | name, person, dosage, frequency (1–4×/daily), timeSlots `[{ time, reminderMinutes }]` |
| `vaccinations/{id}` | name, person, date, nextDue, status |
| `allergies/{id}` | allergen, person, severity (mild/moderate/severe) |
| `growth/{id}` | person, height, weight, date |

---

### Pet Module

Flat collections with `familyId` + `petId`:

| Collection | Key Fields |
|------------|------------|
| `pets/{id}` | name, type, gender, breed, birthday, idNumber, passportNumber, chipId, chipDate, photoUrl, familyId |
| `petVetVisits/{id}` | petId, title, doctor, dateFrom/dateTo, time, location, reminderMinutes, documentUrl |
| `petMedications/{id}` | petId, name, dosage, frequency |
| `petFood/{id}` | petId, name, time, amount |
| `petGrooming/{id}` | petId, name, lastDate, nextDate |
| `petVaccinations/{id}` | petId, name, date, nextDue, status |
| `petInsurance/{id}` | petId, provider, policyNumber, expiryDate, documentUrl |

---

### School / Kindergarten Modules

Flat collections (kindergarten mirrors school under own prefixes):

| Collection | Key Fields |
|------------|------------|
| `schoolChildren/{id}` | name, school, grade, phone, email, photoUrl, familyId |
| `schoolYears/{id}` | childId, year label |
| `schoolActivities/{id}` | childId, yearId, type (tur/aktivitet/møte), title, dateFrom/dateTo, timeFrom/timeTo, location, reminderMinutes, documents, repeatSchedule, group recording |
| `schoolContacts/{id}` | childId, name, role, parentName/Phone/Email |
| `schoolSchedules/{id}` | childId, semester, imageUrl, fileName |
| `schoolTimetable/{id}` | childId, day, time, subject, teacher |
| `schoolHolidays/{id}` | childId, title, dateFrom/dateTo, timeFrom/timeTo |

---

### Meal Plan & Home Modules

#### `recipes/{recipeId}`
`name`, `description`, `ingredients [{ name, amount, unit }]`, `instructions`, `time`, `portions`, `category` (kylling/kjoett/fisk/vegetar/pasta/gryte/suppe/frokost/sott), `variation`, `cuisine`, `isFavorite`, `calories` (AI-estimated), `translations { [lang]: {...} }`, `familyId`.

#### `mealPlans/{planId}`
`weekStart`, `meals { [day]: { frokost, lunsj, middag } }`, `familyId`.

#### Home Module (Våre hjem)

| Collection | Key Fields |
|------------|------------|
| `homes/{id}` | type (hus/sommerhytte/vinterhytte/leilighet), address, postalNumber/city, description, photoUrl, coordinates |
| `homeInstructions/{id}` | homeId, section (comingHome/leavingHome), title, text, imageUrl |
| `homeServices/{id}` | homeId, title, vendor, dateFrom, time, frequency (once/monthly/quarterly/yearly), repeatSchedule, reminderMinutes, calendarEventId |
| `paintColors/{id}` | homeId/projectId, name, code, hex, brand, room |
| `homeProjects/{id}` | homeId, title, status (active/onHold/completed), budget, spentAmount |
| `homeProjectShopping/{id}` | projectId, name, quantity, unitPrice |
| `homeProjectOffers/{id}` | projectId, vendorName, price |
| `homeProjectTasks/{id}` | projectId, title, status (todo/inProgress/done), linkedShoppingItemId |

---

### Google Calendar Sync

#### `googleCalendarTokens/{uid}`
OAuth tokens for the two-way Google Calendar sync (`googleCalendarAuth`/`googleCalendarCallback` flow).

---

## Cloud Functions

All Cloud Functions are deployed to `us-central1` with 256MB memory. 70+ functions Total; grouped below.

### HTTP API Endpoints (onRequest)

| Function | Purpose |
|----------|---------|
| `spondProxy` | CORS proxy for Spond API (login, groups, members, events, changeResponse) |
| `voiceToEvent` | Whisper speech-to-text + GPT-4o-mini event parsing |
| `photoToData` | GPT-4o vision: events, recipes, school/kindergarten class lists, holidays, timetables |
| `destinationTips` | GPT-4o-mini travel advice for trip destinations |
| `aiRecipeSuggestions` | GPT-4o-mini recipe generation |
| `importRecipeFromUrl` | Extract recipes from web page HTML |
| `importHolidaysFromUrl` | Extract school/kindergarten holidays from a URL |
| `estimateRecipeCalories` | AI calorie estimation |
| `translateRecipe` | Recipe translation to 5 languages |
| `aiAssistant` | Conversation assistant with navigation + confirmable actions |
| `homeExtractColor` / `homeExtractInstruction` / `homeExtractReceipt` / `homeExtractOffer` | Home OCR helpers |
| `homeSuggestTasks` | AI suggestions for home project tasks |
| `encryptSpondPassword` / `decryptSpondPassword` | Spond password encryption at rest |
| `createFamily`, `generateInviteCode`, `joinFamilyByInviteCode`, `leaveFamily`, `removeFamilyMember`, `updateMemberRole` | Family management (auth + role verified server-side) |
| `notifyNewEvent`, `notifyHealthItem` | Family push notifications |
| `backfillCalendarSync` | Scan all collections for a family and (re)sync to Google Calendar; dry-run supported |
| `grantAppOwner` / `revokeAppOwner`, `getAdminStats`, `triggerAdminStats`, `trackUsage`, `getUsageStats`, `getFamilyList`, `getFamilyDetail`, `getRateLimits`, `updateRateLimits`, `debugCheck*` | Admin panel backend |

### Scheduled Functions (onSchedule)

| Function | Schedule | Purpose |
|----------|----------|---------|
| `checkReminders` | every 1 minute (UTC) | FCM reminders for events with `reminderMinutes` |
| `checkBirthdayReminders` | every 5 minutes (checks family timezone 08:00) | Birthday notifications 7 days before + on the day |
| `checkMedicationReminders` | every 5 minutes | Medication time-slot reminders |
| `updateAdminStats` | hourly (Europe/Oslo) | Refresh admin dashboard stats |
| *(client service)* | scheduledSpondSync | Spond event sync every 30 minutes |

### Calendar Trigger Functions (onDocumentCreated/Updated/Deleted)

Two-way Google Calendar sync triggers for: **events, trips (+ transports), health appointments & medications, pet vet visits, school activities, kindergarten activities, home services** — e.g. `onEventCreatedForCalendar`, `onTripUpdatedForCalendar`, `onHomeServiceDeletedForCalendar`, etc.

### Firestore Trigger

- `notifyNewChatMessage` (`onDocumentCreated` on `chat`) — pushes to other family members.

### Authentication Pattern

All functions verify Firebase Auth tokens via `verifyAuth()` (optionally clearing `checkRateLimit()` per user + usage tracking for AI endpoints).

```javascript
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch { return null; }
}
```

Client calls via `familyService.ts:callFunction()`:

```typescript
const FUNCTIONS_BASE = 'https://us-central1-familiesenter-837bb.cloudfunctions.net';

async function callFunction(name: string, data: Record<string, unknown> = {}) {
  const idToken = await auth.currentUser.getIdToken();
  const response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Serverfeil');
  return result;
}
```

---

## Third-Party Integrations

### Spond
- `spondProxy` Cloud Function = CORS proxy to `https://api.spond.com/core/v1`
- Config: `families/{familyId}/config/spond`; password encrypted at rest
- Client service: `src/services/spondService.ts`
- Sync runs automatically every 30 minutes; group logos stored in Storage (custom logos supported)

### OpenAI API
- Key in `functions/.env` as `OPENAI_API_KEY`
- Models: `whisper-1` (speech-to-text), `gpt-4o` (vision OCR), `gpt-4o-mini` (text parsing)
- Never exposed to the client; all calls via Cloud Functions with rate limiting + usage tracking

### Google Calendar (two-way)
- OAuth flow: `googleCalendarAuth` → `googleCalendarCallback`, tokens in `googleCalendarTokens/{uid}`
- Document-triggered sync functions for all activity types
- Profile panel: choose phone calendar vs Google, connect/disconnect, run backfill (dry-run supported)

### Phone Calendar
- Native: `expo-calendar` (`src/components/CalendarSync.native.tsx`)
- Web: per-item "Add to Google/Outlook" buttons

### Google Maps
- `GOOGLE_MAPS_API_KEY` constant (client)
- `GooglePlacesInput` autocomplete, static maps, directions links

### Weather
- `src/services/weatherService.ts` — Google Weather (forecast + hourly) and Open-Meteo (historical)
- Cached on `trips/{tripId}.weatherSummary`; historical averages for future trips

### Currency
- `src/services/currencyService.ts` — Frankfurter API rates, 30-minute cache

---

## PWA Architecture

### Configuration

```json
// app.json — web section
"web": {
  "favicon": "./assets/favicon.png",
  "bundler": "metro",
  "name": "Familiesenter",
  "shortName": "Familiesenter",
  "lang": "no",
  "startUrl": "/",
  "display": "standalone",
  "backgroundColor": "#f5f5f5",
  "themeColor": "#0097A7",
  "manifest": "./public/manifest.json"
}
```

### Hosting Configuration

- **Public directory**: `dist/web`
- **SPA rewrite**: All routes redirect to `/index.html`; privacy/terms HTML files are served directly
- **Firebase Messaging SW**: `/firebase-messaging-sw.js` served directly
- **Caching strategy**: `index.html` no-cache; JS/CSS/images 1-year immutable

### Offline Support

- **OfflineBanner component** (`src/components/OfflineBanner.tsx`) via `@react-native-community/netinfo`
- Firestore offline persistence on web

### Installability

- PWA manifest configured via Expo (manifest name "Familiesenter"; splash label "fampad")
- **UpdateBanner**: checks `/version.json` every 5 minutes; "Last inn på nytt" in Profile unregisters service workers

---

## Navigation Structure

### Tab Navigator (Bottom Tabs)

```
Tab.Navigator (CustomTabBar)
├── Events Stack    (calendar icon)  — "Avtaler"
├── Chat Stack      (chat bubble)
├── Trips Stack     (house icon)     — "Våre steder" / Spaces hub
└── Profile Stack   (person icon)
```

The center "+" button opens the **QuickCreateModal** (AI assistant row + manual/voice/photo → module picker).

### Stack Details

#### Events Stack
```
EventsList (EventsScreen)
├── EventDetail (EventDetailScreen) — lazy loaded
├── EventDetail_Spond (SpondEventDetailScreen) — lazy loaded
├── VoiceEvent / PhotoEvent — lazy loaded
└── VoiceActivity / PhotoActivity — lazy loaded
```

#### Trips Stack (Spaces Hub, 40+ screens)
```
SpacesList (SpacesScreen) — 8 module cards
├── HealthSpace → HealthApptDetail / HealthMedDetail / HealthVaccDetail
├── BirthdaySpace
├── PetSpace → PetVetDetail / PetVaccDetail / PetMedDetail / PetGroomDetail
├── HomeSpace → HomeDetail:
│     ├── HomeInstructions
│     ├── HomeMaintenance → HomeServiceDetail / HomeColorDetail
│     └── HomeProjects → HomeProjectDetail
├── SchoolSpace → SchoolDetail:
│     ├── SchoolContacts (+Detail), SchoolSchedule
│     ├── SchoolActivities (+Detail), SchoolHolidays
│     └── SchoolAI (mode: classlist | holidays)
├── KindergartenSpace → (mirrors School)
├── TripsList → AddTrip / TripDetail:
│     ├── TransportDetail, TripItemDetail
│     ├── PackingListDetail
│     └── Destination tips, currency converter (inline)
├── MealPlan → RecipeDetail / ShoppingListDetail / ShoppingListDetail / PhotoRecipe
└── VoiceActivity / PhotoActivity (universal)
```

#### Profile Stack
```
ProfileMain (ProfileScreen)
└── Birthday (BirthdayScreen)
```

Global overlays at the app root: **QuickCreateModal**, **AIAssistantScreen**, **OfflineBanner**, **UpdateBanner**, **MissedRemindersBanner** (web).

### Code Splitting

Heavy screens (detail/edit/voice/photo/AI screens) are lazy-loaded with `React.lazy()`.

---

## Module System

Each module corresponds to a "Space" accessible from the Våre steder tab.

### Module Colors

Defined in `src/constants/moduleColors.ts`:

| Module | Color | Background |
|--------|-------|------------|
| Trips | `#7EC8E3` | `#EDF6FB` |
| Health | `#C67B5C` | `#F5E6E0` |
| School | `#6B8F71` | `#EDF2EE` |
| Kindergarten | `#E8836A` | `#FBE9E3` |
| Pets | `#9B7DB8` | `#F2EDF6` |
| Meal Plan | `#E8906C` | `#FBEDE8` |
| Birthdays | `#E6A817` | `#FDF5E6` |
| Home | `#6B7B8D` | `#EEF0F3` |

### Modules Detail

| Module | Screen | Service | Firestore Pattern |
|--------|--------|---------|-------------------|
| Events | `EventsScreen` | Direct Firestore queries | `events` flat collection with `familyId` |
| Spond | `SpondEventDetailScreen` | `spondService.ts` via `spondProxy` | `spondResponses` |
| Chat | `ChatScreen` | Direct Firestore real-time | `chat` flat collection |
| Trips | `TripsScreen` + `TripDetailScreen` | `tripService.ts` | `trips` + subcollections |
| Health | `HealthSpaceScreen` | `healthService.ts` | `health/{familyId}/{subcollection}` |
| Pets | `PetSpaceScreen` | `petService.ts` | Flat collections |
| School | `SchoolSpaceScreen` | `schoolService.ts` | Flat collections + years/holidays |
| Kindergarten | `KindergartenSpaceScreen` | `kindergartenService.ts` | Flat collections |
| Birthdays | `BirthdaySpaceScreen` | `birthdayService.ts` | `birthdays` + `gifts` |
| Meal Plan | `MealPlanScreen` | `mealPlanService.ts` | `recipes` + `mealPlans` |
| Home | `HomeSpaceScreen` | `homeService.ts` | Flat home collections |

---

## State Management

### Global State (Zustand)

**User Store** (`src/store/userStore.ts`): user, familyId, familyName, familyRole, pending invite code (persisted so invite links auto-join after login).

**Chat Input Store**: keeps chat input state so switching tabs does not drop drafts; used to hide the tab bar when typing.

### Theme State (React Context)

**Theme Provider** (`src/theme/ThemeContext.tsx`):
- 12 theme modes: light, dark, system, slategray, dustyrose, school, kindergarten, trips, birthdays, pets, meals, health
- Default `system` (follows device light/dark)
- Persisted in `localStorage`; provides `colors`, `mode`, `isDark`, `setMode`

---

## Internationalization

| Code | Language | File |
|------|----------|------|
| `nb` | Norwegian Bokmål (default) | `src/i18n/nb.json` |
| `sv` | Swedish | `src/i18n/sv.json` |
| `da` | Danish | `src/i18n/da.json` |
| `en` | English | `src/i18n/en.json` |
| `fi` | Finnish | `src/i18n/fi.json` |

- **Library**: `i18next` + `react-i18next`, setup in `src/i18n/index.ts`
- **Recipe AI search**: 22 languages (`src/constants/languages.ts`)
- **Recipe translations**: via `translateRecipe` Cloud Function

All user-visible strings must use `t()` keys present in all 5 language files.

---

## Security Architecture

### Firestore Rules Summary

- **Helper**: `isFamilyMember(familyId)` checks the family `members` map
- **Users**: authenticated users can read profiles; write restricted to self
- **Families**: members read; creating/joining goes through Cloud Functions
- **All data collections**: enforced through `isFamilyMember()` + `familyId` scoping
- **Sent notifications**: functions write; authenticated users read

### Key Security Patterns

1. **Family data isolation**: every document has `familyId`; rules verify membership
2. **Cloud Function auth**: all functions verify Firebase Auth tokens server-side; rate limiting via `checkRateLimit()`
3. **Invite codes**: 6-char hex, 1-hour expiry, single use
4. **Role-based access**: owner/admin/member enforced in Cloud Functions; `appOwner` grants the Admin panel and must be granted/revoked server-side
5. **Secrets**: Spond passwords encrypted at rest; OpenAI/OpenWeather/Google keys only in `functions/.env`
6. **CORS restriction**: Cloud Functions whitelist specific origins (no `*`)

---

## Key File Paths

| Path | Purpose |
|------|---------|
| `App.tsx` | Root component, navigation, auth gate, global overlays |
| `src/types/index.ts` | TypeScript interfaces |
| `src/services/*.ts` | Feature services (family, trip, health, pet, school, kindergarten, home, meal plan, weather, currency, spond, notifications) |
| `src/store/userStore.ts` | Zustand global state |
| `src/theme/ThemeContext.tsx` + `src/theme/colors.ts` | Theme provider + 12 theme palettes |
| `src/i18n/nb|en|sv|da|fi.json` | Translations |
| `src/components/QuickCreateModal.tsx` | Quick-create modal |
| `src/components/AIAssistantScreen.tsx` | AI assistant |
| `src/components/WeeklySummary.tsx` | "Din uke" weekly summary |
| `src/components/DatePickerModal.tsx` | Custom date/time picker |
| `src/components/ActionModal.tsx` | Branded edit/delete confirmation modal |
| `src/components/HelpCenter.tsx` | In-app help articles |
| `src/components/CustomTabBar.tsx` | Bottom tab bar |
| `src/constants/` | `moduleColors`, `eventIcons`, `reminderOptions`, `limits`, `languages`, `currencies` |
| `functions/index.js` | All Cloud Functions |
| `firestore.rules` / `firestore.indexes.json` / `storage.rules` | Firebase security + indexing |
| `firebase.json` / `.firebaserc` | Firebase project config |
| `public/docs/privacy-*.html`, `terms-*.html` | Published legal docs (linked from login screen) |

---

*Document generated for fampad v1.0.0*
