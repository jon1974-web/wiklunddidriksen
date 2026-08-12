# Familiesenter — System Architecture

<p align="center">
  <img src="../../assets/icon.png" alt="Familiesenter Logo" width="120" height="120" />
</p>

<p align="center"><strong>Family organization platform built with Expo + Firebase</strong></p>

---

## Table of Contents

1. [Overview](#overview)
2. [Firebase Services](#firebase-services)
3. [Data Model](#data-model)
4. [Cloud Functions](#cloud-functions)
5. [Third-Party Integrations](#third-party-integrations)
6. [PWA Architecture](#pwa-architecture)
7. [Navigation Structure](#navigation-structure)
8. [Module System](#module-system)
9. [State Management](#state-management)
10. [Internationalization (i18n)](#internationalization)
11. [Security Architecture](#security-architecture)
12. [Key File Paths](#key-file-paths)

---

## Overview

Familiesenter is a cross-platform family organization Progressive Web App (PWA) built with **Expo SDK 56** and **React Native Web**. It targets web browsers primarily, with native iOS support via Expo. The backend is entirely serverless using **Firebase**.

**Key architectural decisions:**
- Client reads directly from Firestore; all write mutations for family management go through Cloud Functions for security
- Every document is scoped to a `familyId` field for multi-family data isolation
- PWA-first design: installable, offline-aware, push notification capable
- Multi-language support: Norwegian (Bokmal), Swedish, Danish, English, Finnish

---

## Firebase Services

### Project: `familiesenter-837bb`

| Service | Purpose | Config File |
|---------|---------|-------------|
| **Firebase Auth** | User authentication (email/password, Google) | `src/services/firebase.ts` |
| **Cloud Firestore** | Primary database for all app data | `firestore.rules`, `firestore.indexes.json` |
| **Firebase Hosting** | PWA hosting with SPA rewrites | `firebase.json` |
| **Cloud Functions** | Serverless API endpoints (Node.js 22) | `functions/index.js` |
| **Firebase Storage** | File uploads (chat images, pet photos, school schedules) | `storage.rules` |
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

All collections are documented below with their fields. Every family-scoped document includes a `familyId` field.

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
| `calendarId` | string | Google/Outlook calendar ID |
| `calendarEmail` | string | Calendar email |
| `calendarProvider` | 'google' / 'outlook' | Calendar provider |
| `avatarUrl` | string | Profile photo URL |
| `notificationsEnabled` | boolean | Push notification preference |
| `minUkeSections` | object | Weekly summary section preferences |
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
| `inviteCode` | string | Current invite code (hex) |
| `inviteCreatedAt` | number | Code creation timestamp |
| `inviteExpiresAt` | number | Code expiry (1 hour) |
| `createdAt` | number | Timestamp |

#### `families/{familyId}/config/{configId}`
Family configuration subcollection.

---

### Events Module

#### `events/{eventId}`
Family-scoped events.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `title` | string | Event title |
| `description` | string | Event description |
| `address` | string | Location address |
| `date` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |
| `time` | string | Start time (HH:MM) |
| `endTime` | string | End time (HH:MM) |
| `reminderMinutes` | number | Reminder offset in minutes |
| `createdBy` | string | Creator UID |
| `familyId` | string | Family ID |
| `createdAt` | number | Timestamp |
| `notificationId` | string | Scheduled notification ID |
| `calendarEventId` | string | Google Calendar event ID |
| `icon` | string | Event icon |

#### `spondResponses/{responseId}`
Spond event response tracking, family-scoped.

---

### Chat Module

#### `chat/{messageId}`
Family chat messages.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `text` | string | Message text |
| `senderId` | string | Sender UID |
| `senderName` | string | Sender display name |
| `senderAvatarUrl` | string | Sender avatar URL |
| `timestamp` | number | Unix timestamp |
| `imageUrl` | string | Image URL (if image message) |
| `reactions` | array | `[{ userId, type: 'like' / 'smile' / 'heart' }]` |
| `familyId` | string | Family ID |

---

### Trips Module

#### `trips/{tripId}`
Family-scoped trip documents.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `title` | string | Trip title |
| `city` | string | Destination city |
| `country` | string | Destination country |
| `startDate` | string | Trip start date |
| `endDate` | string | Trip end date |
| `icon` | string | Trip icon |
| `latitude` | number | Destination latitude |
| `longitude` | number | Destination longitude |
| `weatherSummary` | array | Weather forecast data |
| `destinationTips` | array | AI-generated travel tips |
| `createdBy` | string | Creator UID |
| `familyId` | string | Family ID |
| `createdAt` | number | Timestamp |

#### Trip Subcollections

| Subcollection | Type | Description |
|---------------|------|-------------|
| `trips/{tripId}/hotels/{id}` | TripHotel | Hotel/accommodation bookings |
| `trips/{tripId}/restaurants/{id}` | TripRestaurant | Restaurant reservations |
| `trips/{tripId}/activities/{id}` | TripActivity | Planned activities |
| `trips/{tripId}/transport/{id}` | TripTransport | Transport bookings (fly, tog, bil, boat, taxi, ferry) |
| `trips/{tripId}/packingLists/{id}` | PackingList | Packing lists with items |
| `trips/{tripId}/documents/{id}` | TripDocument | Trip documents/files |
| `trips/{tripId}/links/{id}` | TripLink | Saved URLs/links |

---

### Shopping Module

#### `shoppingLists/{listId}`
Family shopping lists.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `title` | string | List title |
| `items` | array | `[{ name, checked }]` |
| `createdBy` | string | Creator UID |
| `familyId` | string | Family ID |
| `createdAt` | number | Timestamp |

---

### Birthday Module

#### `birthdays/{birthdayId}`
Family birthdays.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `name` | string | Person's name |
| `date` | string | Birthday date |
| `addedBy` | string | Added by UID |
| `addedByName` | string | Added by display name |
| `familyId` | string | Family ID |
| `createdAt` | number | Timestamp |

#### `gifts/{giftId}`
Gift ideas linked to birthdays.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `birthdayId` | string | Associated birthday ID |
| `familyId` | string | Family ID |
| `name` | string | Gift idea name |
| `purchased` | boolean | Purchase status |
| `year` | number | Gift year |
| `createdAt` | number | Timestamp |

---

### Health Module

#### `health/{familyId}/` (Subcollection pattern)
Health data is organized as subcollections under a family-scoped document.

| Subcollection | Type | Key Fields |
|---------------|------|------------|
| `health/{familyId}/medications/{id}` | HealthMedication | name, person, dosage, frequency |
| `health/{familyId}/appointments/{id}` | HealthAppointment | title, person, doctor, date, time, location |
| `health/{familyId}/vaccinations/{id}` | HealthVaccination | name, person, date, nextDue, status |
| `health/{familyId}/allergies/{id}` | HealthAllergy | allergen, person, severity |
| `health/{familyId}/growth/{id}` | HealthGrowth | person, height, weight, date |

---

### Pet Module

#### Flat collections with `familyId` + `petId`

| Collection | Type | Key Fields |
|------------|------|------------|
| `pets/{id}` | Pet | name, type, gender, breed, birthday, chipId, photoUrl, familyId |
| `petVetVisits/{id}` | PetVetVisit | petId, title, doctor, date, time, location, status, familyId |
| `petMedications/{id}` | PetMedication | petId, name, dosage, frequency, familyId |
| `petFood/{id}` | PetFood | petId, name, time, amount, familyId |
| `petGrooming/{id}` | PetGrooming | petId, name, lastDate, nextDate, familyId |
| `petVaccinations/{id}` | PetVaccination | petId, name, date, nextDue, status, familyId |
| `petInsurance/{id}` | PetInsurance | petId, provider, policyNumber, expiryDate, familyId |

---

### School Module

| Collection | Type | Key Fields |
|------------|------|------------|
| `schoolChildren/{id}` | SchoolChild | name, school, phone, email, photoUrl, familyId |
| `schoolYears/{id}` | SchoolYear | childId, year, grade, school, familyId |
| `schoolContacts/{id}` | SchoolContact | yearId, childId, name, role, parentName/Phone/Email, familyId |
| `schoolSchedules/{id}` | SchoolSchedule | yearId, childId, semester, imageUrl, fileName, familyId |

---

### Meal Plan Module

#### `recipes/{recipeId}`
Family recipes with multi-language translations.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `name` | string | Recipe name |
| `description` | string | Recipe description |
| `ingredients` | array | `[{ name, amount, unit }]` |
| `instructions` | array | Step-by-step instructions |
| `time` | number | Cooking time in minutes |
| `portions` | number | Number of servings |
| `category` | string | kylling, kjoett, fisk, vegetar, pasta, gryte, suppe, frokost, sott |
| `variation` | string | Klassisk, Raskere, Med en vri |
| `cuisine` | string | Country/cuisine |
| `isFavorite` | boolean | Favorite status |
| `createdBy` | string | Creator UID |
| `familyId` | string | Family ID |
| `translations` | map | `{ [lang]: { name, description, ingredients, instructions } }` |

#### `mealPlans/{planId}`
Weekly meal plans.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `weekStart` | string | Week start date |
| `meals` | map | `{ [day]: { frokost, lunsj, middag } }` |
| `familyId` | string | Family ID |
| `createdBy` | string | Creator UID |

---

### Notification Tracking

#### `sentNotifications/{eventId}`
Tracks sent notifications to prevent duplicates.

| Field | Type | Description |
|-------|------|-------------|
| `sentAt` | string | ISO timestamp |
| `uid` | string | Recipient UID |
| `eventId` | string | Related event ID |
| `type` | string | Notification type (birthday, etc.) |

---

## Cloud Functions

All Cloud Functions are HTTP-triggered (`onRequest`) and deployed to `us-central1` with 256MB memory.

### API Endpoints

| Function | Line | Purpose |
|----------|------|---------|
| `spondProxy` | `functions/index.js:49` | CORS proxy for Spond API (login, groups, members, events, changeResponse) |
| `voiceToEvent` | `functions/index.js:189` | Whisper speech-to-text + GPT-4o-mini event parsing |
| `photoToData` | `functions/index.js:352` | GPT-4o vision for extracting events, recipes, or class lists from photos |
| `destinationTips` | `functions/index.js:716` | GPT-4o-mini travel advice for trip destinations |
| `aiRecipeSuggestions` | `functions/index.js:1327` | GPT-4o-mini recipe generation based on user prompts |
| `importRecipeFromUrl` | `functions/index.js:1448` | Extract recipes from web page HTML via GPT-4o-mini |
| `translateRecipe` | `functions/index.js:1536` | GPT-4o recipe translation to 5 languages (nb, sv, da, en, fi) |

### Family Management Functions

| Function | Line | Purpose |
|----------|------|---------|
| `createFamily` | `functions/index.js:802` | Create a new family group |
| `generateInviteCode` | `functions/index.js:840` | Generate 6-char hex invite code (1-hour expiry) |
| `joinFamilyByInviteCode` | `functions/index.js:875` | Join a family using invite code |
| `leaveFamily` | `functions/index.js:925` | Leave current family (non-owners only) |
| `removeFamilyMember` | `functions/index.js:961` | Admin/owner removes a member |
| `updateMemberRole` | `functions/index.js:1068` | Admin/owner changes member role |

### Notification Functions

| Function | Line | Purpose |
|----------|------|---------|
| `checkReminders` | `functions/index.js:590` | Scheduled (every 1 min): sends FCM reminders for events |
| `checkBirthdayReminders` | `functions/index.js:1235` | Scheduled (daily 08:00 Oslo): birthday notifications |
| `notifyNewEvent` | `functions/index.js:1111` | Push notification to family when event is created |
| `notifyHealthItem` | `functions/index.js:1173` | Push notification to family when health item is created |

### Migration Functions (one-time use)

| Function | Line | Purpose |
|----------|------|---------|
| `migrateFamilyMembers` | `functions/index.js:1003` | Migrate family members from array to map with roles |
| `migrateRecipeTranslations` | `functions/index.js:1629` | Batch translate all existing recipes |
| `migrateTransportData` | `functions/index.js:1737` | Migrate transport subcollections to unified format |

### Authentication Pattern

All functions verify Firebase Auth tokens via `verifyAuth()`:

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

### Spond Integration
- **Purpose**: Sync sports club events from Spond into the app
- **Architecture**: Cloud Function `spondProxy` acts as CORS proxy to `https://api.spond.com/core/v1`
- **Config stored in**: `families/{familyId}/config/spond`
- **Client service**: `src/services/spondService.ts`
- **Features**: Login, list groups, fetch events, change RSVP responses
- **Data model**: `SpondEvent`, `SpondGroup`, `SpondConfig`, `SpondRespondent`

### OpenAI API
- **Purpose**: AI-powered features (voice transcription, photo OCR, recipe generation, destination tips)
- **API Key**: Stored in `functions/.env` as `OPENAI_API_KEY`
- **Models used**: `whisper-1` (speech-to-text), `gpt-4o` (vision), `gpt-4o-mini` (text)
- **Usage**: All through Cloud Functions (never exposed to client)

### Google Calendar
- **Purpose**: Export events to user's Google Calendar
- **Plugin**: `expo-calendar`
- **Config**: `calendarId`, `calendarEmail`, `calendarProvider` stored in user profile

### Google Maps
- **Purpose**: Location selection, static map images, directions
- **API Key**: Client-side via `GOOGLE_MAPS_API_KEY` constant
- **Usage**: `GooglePlacesInput` component, static map URLs for event/health details

### Weather API
- **Service**: `src/services/weatherService.ts`
- **Purpose**: Trip weather forecasts
- **Data stored in**: `trips/{tripId}.weatherSummary`

### Currency Service
- **Service**: `src/services/currencyService.ts`
- **Purpose**: Currency conversion for international trips

---

## PWA Architecture

### Configuration

```json
// app.json — web section
"web": {
  "bundler": "metro",
  "name": "Familiesenter",
  "shortName": "Familiesenter",
  "display": "standalone",
  "startUrl": "/",
  "backgroundColor": "#f5f5f5",
  "themeColor": "#4CAF50",
  "lang": "no"
}
```

### Hosting Configuration

- **Public directory**: `dist/web`
- **SPA rewrite**: All routes redirect to `/index.html`
- **Firebase Messaging SW**: `/firebase-messaging-sw.js` served directly
- **Caching strategy**:
  - `index.html`: No-cache (always fresh)
  - JS/CSS bundles: 1-year immutable cache
  - Images: 1-year immutable cache

### Offline Support

- **OfflineBanner component**: Shows when network is unavailable (`src/components/OfflineBanner.tsx`)
- **Network detection**: `@react-native-community/netinfo`
- Firestore provides offline persistence by default on web

### Installability

- PWA manifest configured via Expo
- App can be "installed" from browser
- Standalone display mode
- Custom splash screen via `assets/icon.png`

---

## Navigation Structure

### Tab Navigator (Bottom Tabs)

```
Tab.Navigator (CustomTabBar)
├── Events Stack    (calendar icon)
├── Chat Stack      (chat icon)
├── Trips Stack     (compass/house icon) — serves as "Hjem" / Spaces hub
└── Profile Stack   (person icon)
```

The center "+" button opens the **QuickCreateModal**.

### Stack Details

#### Events Stack
```
EventsList (EventsScreen)
├── AddEvent (AddEventScreen) — lazy loaded
├── EventDetail (EventDetailScreen) — lazy loaded
├── EventDetail_Spond (SpondEventDetailScreen) — lazy loaded
├── VoiceEvent (VoiceEventScreen) — lazy loaded
└── PhotoEvent (PhotoEventScreen) — lazy loaded
```

#### Trips Stack (Spaces Hub)
```
SpacesList (SpacesScreen)
├── HealthSpace (HealthSpaceScreen)
├── BirthdaySpace (BirthdaySpaceScreen)
├── PetSpace (PetSpaceScreen)
├── MealPlan (MealPlanScreen)
├── SchoolSpace (SchoolSpaceScreen)
│   ├── SchoolAI (SchoolAIScreen)
│   └── SchoolContactDetail (SchoolContactDetailScreen)
├── TripsList (TripsScreen)
│   ├── AddTrip (AddTripScreen)
│   └── TripDetail (TripDetailScreen)
│       ├── TransportDetail (TransportDetailScreen)
│       ├── TripItemDetail (TripItemDetailScreen)
│       ├── PackingListDetail (PackingListDetailScreen)
│       ├── RecipeDetail (RecipeDetailScreen)
│       └── ShoppingListDetail (ShoppingListDetailScreen)
├── RecipeDetail (RecipeDetailScreen)
├── ShoppingListDetail (ShoppingListDetailScreen)
└── PhotoRecipe (PhotoRecipeScreen)
```

#### MealPlan Stack (standalone in tab bar)
```
MealPlan (MealPlanScreen)
├── RecipeDetail (RecipeDetailScreen)
├── ShoppingListDetail (ShoppingListDetailScreen)
└── PhotoRecipe (PhotoRecipeScreen)
```

#### Chat Stack
```
ChatMain (ChatScreen)
```

#### Profile Stack
```
ProfileMain (ProfileScreen)
└── Birthday (BirthdayScreen)
```

### Code Splitting

Heavy screens are lazy-loaded with `React.lazy()`:
- `AddEventScreen`, `EventDetailScreen`, `VoiceEventScreen`, `PhotoEventScreen`
- `AddTripScreen`, `TripDetailScreen`, `TransportDetailScreen`
- `SchoolAIScreen`, `PackingListDetailScreen`
- `RecipeDetailScreen`, `ShoppingListDetailScreen`, `PhotoRecipeScreen`

---

## Module System

Each module corresponds to a "Space" accessible from the Trips/Hjem tab.

### Module Colors

Defined in `src/constants/moduleColors.ts`:

| Module | Color | Background | Hex |
|--------|-------|------------|-----|
| Trips | Blue | Light blue | `#42A5F5` / `#E3F2FD` |
| Health | Red | Light red | `#E53935` / `#FFEBEE` |
| School | Green | Light green | `#43A047` / `#E8F5E9` |
| Birthdays | Orange | Light orange | `#FB8C00` / `#FFF3E0` |
| Pets | Purple | Light purple | `#8E24AA` / `#F3E5F5` |
| Meal Plan | Teal | Light teal | `#0097A7` / `#E0F7FA` |
| Home | Indigo | Light indigo | `#5C6BC0` / `#E8EAF6` |

### Modules Detail

| Module | Screen | Service | Firestore Pattern |
|--------|--------|---------|-------------------|
| Events | `EventsScreen` | Direct Firestore queries | `events` flat collection with `familyId` |
| Spond Events | `SpondEventDetailScreen` | `spondService.ts` via `spondProxy` Cloud Function | `spondResponses` collection |
| Shopping | `ShoppingListsScreen` | Direct Firestore queries | `shoppingLists` flat collection with `familyId` |
| Chat | `ChatScreen` | Direct Firestore real-time | `chat` flat collection with `familyId` |
| Trips | `TripsScreen` + `TripDetailScreen` | `tripService.ts` | `trips` + subcollections |
| Health | `HealthSpaceScreen` | `healthService.ts` | `health/{familyId}/{subcollection}` |
| Pets | `PetSpaceScreen` | `petService.ts` | Flat collections: `pets`, `petVetVisits`, etc. |
| School | `SchoolSpaceScreen` | `schoolService.ts` | Flat collections: `schoolChildren`, `schoolYears`, etc. |
| Birthdays | `BirthdaySpaceScreen` | `birthdayService.ts` | `birthdays` + `gifts` flat collections |
| Meal Plan | `MealPlanScreen` | Direct Firestore queries | `recipes` + `mealPlans` flat collections |

---

## State Management

### Global State (Zustand)

**User Store** (`src/store/userStore.ts`):
```typescript
interface UserState {
  user: User | null;
  familyId: string | null;
  familyName: string | null;
  familyRole: 'owner' | 'admin' | 'member' | null;
  pendingInviteCode: string | null;
  pendingInviteFamilyName: string | null;
  setUser: (user: User | null) => void;
  setFamily: (familyId, familyName, familyRole?) => void;
  setPendingInviteCode: (code, familyName?) => void;
}
```

### Theme State (React Context)

**Theme Provider** (`src/theme/ThemeContext.tsx`):
- 9 theme modes: light, dark, system, orange, deepblue, silver, purple, pink, teal
- Persisted in `localStorage`
- Provides `colors`, `mode`, `isDark`, `setMode`

---

## Internationalization

### Languages Supported

| Code | Language | File |
|------|----------|------|
| `nb` | Norwegian Bokmal (default) | `src/i18n/nb.json` |
| `sv` | Swedish | `src/i18n/sv.json` |
| `da` | Danish | `src/i18n/da.json` |
| `en` | English | `src/i18n/en.json` |
| `fi` | Finnish | `src/i18n/fi.json` |

### Implementation

- **Library**: `i18next` + `react-i18next`
- **Setup**: `src/i18n/index.ts`
- **Default language**: Norwegian Bokmal (`nb`)
- **Language selection**: Stored in `localStorage`, configurable in Profile
- **Recipe translations**: Server-side via `translateRecipe` Cloud Function (GPT-4o)

---

## Security Architecture

### Firestore Rules Summary

The `firestore.rules` file implements family-scoped access control:

- **Helper function**: `isFamilyMember(familyId)` checks if requesting user is in the family's `members` map
- **Users**: Any authenticated user can read profiles; create/update restricted to self
- **Families**: Members can read; any authenticated user can create; members can update
- **All data collections**: Use `isFamilyMember()` to enforce family isolation
- **Trip subcollections**: Currently allow any authenticated user (relaxed rules for subcollections)
- **Sent notifications**: Cloud Functions write; authenticated users read

### Key Security Patterns

1. **Family data isolation**: Every document has `familyId`; rules verify membership
2. **Cloud Function auth**: All functions verify Firebase Auth tokens server-side
3. **Invite codes**: 6-character hex, 1-hour expiry, single use
4. **Role-based access**: Owner, Admin, Member roles enforced in Cloud Functions
5. **CORS restriction**: Cloud Functions whitelist specific origins

---

## Key File Paths

| Path | Purpose |
|------|---------|
| `App.tsx` | Root component, navigation setup, auth flow |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/services/firebase.ts` | Firebase initialization |
| `src/services/familyService.ts` | Family operations + Cloud Function caller |
| `src/services/tripService.ts` | Trip CRUD operations |
| `src/services/healthService.ts` | Health data operations |
| `src/services/petService.ts` | Pet data operations |
| `src/services/schoolService.ts` | School data operations |
| `src/services/spondService.ts` | Spond API integration |
| `src/services/notificationService.ts` | Push notification configuration |
| `src/store/userStore.ts` | Zustand global state |
| `src/theme/ThemeContext.tsx` | Theme provider (9 themes) |
| `src/i18n/index.ts` | i18n initialization |
| `src/components/QuickCreateModal.tsx` | Quick-create modal |
| `src/components/WeeklySummary.tsx` | "Min uke" weekly summary |
| `src/components/CustomTabBar.tsx` | Bottom tab bar |
| `src/constants/moduleColors.ts` | Module color definitions |
| `functions/index.js` | All Cloud Functions |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Composite index definitions |
| `storage.rules` | Storage security rules |
| `firebase.json` | Firebase project configuration |
| `.firebaserc` | Firebase project alias |

---

*Document generated for Familiesenter v1.0.0*
