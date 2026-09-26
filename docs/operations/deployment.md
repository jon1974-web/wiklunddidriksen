# fampad — Deployment Guide

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Deployment procedures for the fampad application</strong></p>

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Project Configuration](#firebase-project-configuration)
3. [Environment Variables](#environment-variables)
4. [Web App Deployment](#web-app-deployment)
5. [Cloud Functions Deployment](#cloud-functions-deployment)
6. [Firestore Rules Deployment](#firestore-rules-deployment)
7. [Firestore Indexes Deployment](#firestore-indexes-deployment)
8. [Storage Rules Deployment](#storage-rules-deployment)
9. [Full Deployment Workflow](#full-deployment-workflow)
10. [Rollback Procedures](#rollback-procedures)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Runtime for Cloud Functions |
| npm | 10+ | Package manager |
| Firebase CLI | Latest | `npx firebase-tools` |
| Expo CLI | Latest | `npx expo` |
| Git | Latest | Version control |

### Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Verify Firebase Project Access

```bash
firebase projects:list
firebase use familiesenter-837bb
```

---

## Firebase Project Configuration

### Project: `familiesenter-837bb`

**File**: `.firebaserc`
```json
{
  "projects": {
    "default": "familiesenter-837bb"
  }
}
```

**File**: `firebase.json`
- Firestore rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Storage rules: `storage.rules`
- Cloud Functions source: `functions/`
- Cloud Functions runtime: Node.js 22
- Hosting public directory: `dist/web`

### Firebase Services Enabled

| Service | Status | Configuration |
|---------|--------|---------------|
| Firebase Auth | Active | Email/Password |
| Cloud Firestore | Active | Native mode |
| Firebase Hosting | Active | SPA with rewrites |
| Cloud Functions | Active | Node.js 22, us-central1 |
| Firebase Storage | Active | Default bucket |
| Cloud Messaging | Active | Web push notifications |

---

## Environment Variables

### Cloud Functions

**File**: `functions/.env` (not committed to git)

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
SPOND_ENCRYPTION_KEY=32-byte-key-for-spond-password-encryption
```

This file is loaded by `dotenv` at the top of `functions/index.js`:

```javascript
require("dotenv").config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
```

### Client-Side Constants

Hardcoded in source (not secrets):

```typescript
// src/services/firebase.ts — Firebase config (public, not secret)
const firebaseConfig = { ... };

// src/constants/maps.ts — Google Maps API key
export const GOOGLE_MAPS_API_KEY = '...';
```

### Security Notes

- **NEVER** commit `functions/.env` to version control
- Firebase config (apiKey, projectId) is designed to be public
- Google Maps API key is restricted by domain in Google Cloud Console
- OpenAI API key is server-side only — never exposed to client

---

## Web App Deployment

### Step 1: Build the Web App

```bash
npx expo export --platform web --output-dir dist/web
```

### Step 1b: Inject Version Manifest (PWA update banner)

```bash
node scripts/inject-manifest.js
```

This writes `version.json` used by the UpdateBanner to detect new versions (checked every 5 minutes in the app).

This generates the production PWA bundle in `dist/web/`.

### Step 2: Deploy to Firebase Hosting

```bash
npx firebase-tools deploy --only hosting --project familiesenter-837bb
```

### Full Web Deploy Command (AGENTS.md canonical)

```bash
npx expo export --platform web --output-dir dist/web && node scripts/inject-manifest.js && npx firebase-tools deploy --only hosting --project familiesenter-837bb
```

### What Gets Deployed

- `dist/web/index.html` — SPA entry point
- `dist/web/assets/` — JS bundles, CSS, images
- `dist/web/manifest.json` — PWA manifest
- `dist/web/version.json` — PWA update banner version file
- `dist/web/firebase-messaging-sw.js` — Push notification service worker
- `dist/web/docs/privacy-*.html` and `terms-*.html` — published legal documents (linked from the login screen)

### Hosting Configuration

From `firebase.json`:

```json
{
  "hosting": {
    "public": "dist/web",
    "rewrites": [
      { "source": "/firebase-messaging-sw.js", "destination": "/firebase-messaging-sw.js" },
      { "source": "/docs/privacy-nb.html", "destination": "/docs/privacy-nb.html" },
      { "source": "/docs/terms-nb.html", "destination": "/docs/terms-nb.html" },
      { "source": "/docs/privacy-en.html", "destination": "/docs/privacy-en.html" },
      { "source": "/docs/terms-en.html", "destination": "/docs/terms-en.html" },
      { "source": "/docs/privacy-sv.html", "destination": "/docs/privacy-sv.html" },
      { "source": "/docs/terms-sv.html", "destination": "/docs/terms-sv.html" },
      { "source": "/docs/privacy-da.html", "destination": "/docs/privacy-da.html" },
      { "source": "/docs/terms-da.html", "destination": "/docs/terms-da.html" },
      { "source": "/docs/privacy-fi.html", "destination": "/docs/privacy-fi.html" },
      { "source": "/docs/terms-fi.html", "destination": "/docs/terms-fi.html" },
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      { "source": "**", "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(self), geolocation=(self), payment=()" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]},
      { "source": "index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }] },
      { "source": "**/*.@(js|css)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
      { "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
    ]
  }
}
```

### PWA Install

After deployment, the app is installable at:
- Production: `https://familiesenter-837bb.web.app`
- Alternate: `https://familiesenter-837bb.firebaseapp.com`

---

## Cloud Functions Deployment

### Step 1: Install Dependencies

```bash
cd functions
npm install
```

### Step 2: Set Environment Variables

```bash
# Edit functions/.env with your OpenAI API key
echo "OPENAI_API_KEY=sk-your-key-here" > functions/.env
```

### Step 3: Deploy

```bash
npx firebase-tools deploy --only functions --project familiesenter-837bb
```

### Deployed Functions (grouped)

There are 70+ functions deployed to `us-central1` with 256MB memory. Overview by group:

| Group | Functions | Trigger |
|-------|-----------|---------|
| AI features | `spondProxy`, `voiceToEvent`, `photoToData`, `destinationTips`, `aiRecipeSuggestions`, `importRecipeFromUrl`, `importHolidaysFromUrl`, `estimateRecipeCalories`, `translateRecipe`, `aiAssistant`, `homeExtractColor/Instruction/Receipt/Offer`, `homeSuggestTasks`, `transcribeAudio` | HTTP |
| Family management | `createFamily`, `generateInviteCode`, `joinFamilyByInviteCode`, `leaveFamily`, `removeFamilyMember`, `updateMemberRole`, `encryptSpondPassword`, `decryptSpondPassword` | HTTP |
| Notifications | `notifyNewEvent`, `notifyHealthItem` | HTTP |
| Push to family | `notifyNewChatMessage` | Firestore `onDocumentCreated(chat)` |
| Calendar sync (Google) | `googleCalendarAuth`, `googleCalendarCallback`, `onEvent/Trip/HealthAppointment/Medication/PetVetVisit/SchoolActivity/KindergartenActivity/HomeService Created/Updated/Deleted ForCalendar`, `backfillCalendarSync` | HTTP + Firestore document triggers |
| Schedulers | `checkReminders` (every 1 min), `checkBirthdayReminders` (every 5 min, sends at 08:00 in the family's timezone), `checkMedicationReminders` (every 5 min), `updateAdminStats` (hourly) | onSchedule |
| Admin panel | `grantAppOwner`, `revokeAppOwner`, `getAdminStats`, `updateAdminStats`, `triggerAdminStats`, `trackUsage`, `getUsageStats`, `getFamilyList`, `getFamilyDetail`, `getRateLimits`, `updateRateLimits` | HTTP |
| Migration (one-time) | `migrateFamilyMembers`, `migrateRecipeTranslations`, `migrateTransportData` | HTTP |

### Function URL Pattern

```
https://us-central1-familiesenter-837bb.cloudfunctions.net/{functionName}
```

---

## Firestore Rules Deployment

### Step 1: Review Changes

```bash
cat firestore.rules
```

### Step 2: Deploy

```bash
npx firebase-tools deploy --only firestore:rules --project familiesenter-837bb
```

### Rules Structure

The rules file (`firestore.rules`) implements:

1. **Helper function**: `isFamilyMember(familyId)` — verifies user is in family's members map
2. **Users collection**: Read by any authenticated user; create/update self only
3. **Families collection**: Read by members; create by any authenticated user
4. **All data collections**: Family-scoped via `isFamilyMember()` check

### Testing Rules Locally

```bash
# Start Firebase Emulator
firebase emulators:start --only firestore

# Test rules with emulator
```

---

## Firestore Indexes Deployment

### Step 1: Review Index Definitions

**File**: `firestore.indexes.json`

Contains composite indexes across all collections.

### Step 2: Deploy Indexes

```bash
npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb
```

### Current Indexes (38 composite indexes)

Verified from `firestore.indexes.json`:

| Collection | Fields |
|------------|--------|
| `events` | familyId+date, familyId+scheduleGroupId, familyId+createdBy+date |
| `chat` | familyId+timestamp |
| `shoppingLists` | familyId+createdAt |
| `trips` | familyId+startDate |
| `birthdays` / `gifts` | familyId+date / familyId+birthdayId+createdAt |
| `pets` etc. | familyId+petId (+date/createdAt) for petVetVisits, petMedications, petFood, petGrooming, petVaccinations, petInsurance |
| `school*`, `kindergarten*` | Children/Years/Contacts/Schedules: familyId+createdAt |
| `homes` + home subcollections | familyId+homeId(+projectId)+createdAt/dateFrom for homeProjects, homePaintColors, homeInstructions, homeServices, homeShoppingItems, homeOffers, homeTasks |
| `activities` | childId+dateFrom |
| `aiLearnedCorrections` | familyId+createdAt |

### Adding New Indexes

When adding a new Firestore collection with multi-field queries:

1. Add the index definition to `firestore.indexes.json`
2. Deploy with `firebase deploy --only firestore:indexes`
3. Indexes take a few minutes to build in production
4. Test with Firebase Emulator for instant feedback

---

## Storage Rules Deployment

### Step 1: Review Rules

**File**: `storage.rules`
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Step 2: Deploy

```bash
npx firebase-tools deploy --only storage --project familiesenter-837bb
```

### Storage Usage

- Chat images: `chat/{timestamp}_{random}`
- User avatars: Profile pictures
- Pet photos: Pet profile images
- Spond group logos: Custom group logos
- School schedules: Schedule document uploads
- School/kindergarten activity documents: Permission slips, forms
- Trip documents: Travel document uploads
- Home photos: Home and project images

---

## Full Deployment Workflow

### Standard Release Process

```bash
# 1. Ensure all changes are committed
git status
git add .
git commit -m "Release: feature description"

# 2. Build the web app
npx expo export --platform web --output-dir dist/web

# 2b. Inject version manifest
node scripts/inject-manifest.js

# 3. Deploy web app
npx firebase-tools deploy --only hosting --project familiesenter-837bb

# 4. Deploy Cloud Functions (if changed)
npx firebase-tools deploy --only functions --project familiesenter-837bb

# 5. Deploy Firestore rules (if changed)
npx firebase-tools deploy --only firestore:rules --project familiesenter-837bb

# 6. Deploy Firestore indexes (if changed)
npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb

# 7. Deploy Storage rules (if changed)
npx firebase-tools deploy --only storage --project familiesenter-837bb
```

### Quick Deploy (All at Once)

```bash
npx firebase-tools deploy --project familiesenter-837bb
```

### Deploy Only Changed Components

```bash
# Check what changed
git diff --name-only HEAD~1

# Deploy only what's needed based on changed files
# - src/** changes → hosting only
# - functions/** changes → functions only
# - firestore.rules changes → firestore:rules only
# - firestore.indexes.json changes → firestore:indexes only
# - storage.rules changes → storage only
```

---

## Rollback Procedures

### Hosting Rollback

```bash
# List recent deployments
firebase hosting:channel:list --project familiesenter-837bb

# Rollback to previous version
firebase hosting:rollback --project familiesenter-837bb
```

### Cloud Functions Rollback

Cloud Functions do not have built-in rollback. To revert:

1. Revert the code change in `functions/index.js`
2. Redeploy: `npx firebase-tools deploy --only functions --project familiesenter-837bb`

### Firestore Rules Rollback

1. Revert `firestore.rules` to previous version
2. Redeploy: `npx firebase-tools deploy --only firestore:rules --project familiesenter-837bb`

---

## Troubleshooting

### Common Issues

#### "The query requires an index" Error

**Cause**: A composite index is missing for a Firestore query.

**Fix**:
1. Check `firestore.indexes.json` for the missing index
2. Add the index definition
3. Deploy: `npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb`
4. Wait 2-3 minutes for the index to build

#### Cloud Function Deployment Fails

**Cause**: Usually a syntax error or missing dependency.

**Fix**:
1. Check `functions/index.js` for syntax errors
2. Ensure `functions/node_modules` exists: `cd functions && npm install`
3. Check `.env` file exists with required keys
4. Deploy with verbose output: `firebase deploy --only functions --debug`

#### Web App Shows Blank Screen

**Cause**: Import error or missing React hook import.

**Fix**:
1. Check browser console for errors
2. Common causes:
   - `i18n` imported from `'react-i18next'` instead of `'../i18n'`
   - Missing React hook import (`useState`, `useEffect`, etc.)
   - Named vs default export mismatch

#### Push Notifications Not Working

**Cause**: FCM token not registered or service worker not loaded.

**Fix**:
1. Verify `firebase-messaging-sw.js` is in `dist/web/`
2. Check that user has `notificationsEnabled: true` in profile
3. Verify FCM token is stored in `users/{uid}.fcmToken`
4. Check Cloud Function logs for `checkReminders` execution

#### iOS PWA Input Zoom Issue

**Cause**: TextInput font-size below 16px triggers iOS Safari auto-zoom.

**Fix**: Ensure all `TextInput` components use `fontSize: 16` or higher.

---

*Document generated for fampad v1.0.0*
