# Familiesenter — Deployment Guide

<p align="center">
  <img src="../../assets/icon.png" alt="Familiesenter Logo" width="120" height="120" />
</p>

<p align="center"><strong>Deployment procedures for the Familiesenter application</strong></p>

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
| Firebase Auth | Active | Email/Password, Google |
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

This generates the production PWA bundle in `dist/web/`.

### Step 2: Deploy to Firebase Hosting

```bash
npx firebase-tools deploy --only hosting --project familiesenter-837bb
```

### What Gets Deployed

- `dist/web/index.html` — SPA entry point
- `dist/web/assets/` — JS bundles, CSS, images
- `dist/web/manifest.json` — PWA manifest
- `dist/web/firebase-messaging-sw.js` — Push notification service worker

### Hosting Configuration

From `firebase.json`:

```json
{
  "hosting": {
    "public": "dist/web",
    "rewrites": [
      { "source": "/firebase-messaging-sw.js", "destination": "/firebase-messaging-sw.js" },
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
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

### Deployed Functions

| Function | Memory | Region | Schedule |
|----------|--------|--------|----------|
| `spondProxy` | 256MB | us-central1 | HTTP |
| `voiceToEvent` | 256MB | us-central1 | HTTP |
| `photoToData` | 256MB | us-central1 | HTTP |
| `destinationTips` | 256MB | us-central1 | HTTP |
| `aiRecipeSuggestions` | 256MB | us-central1 | HTTP |
| `importRecipeFromUrl` | 256MB | us-central1 | HTTP |
| `translateRecipe` | 256MB | us-central1 | HTTP |
| `createFamily` | 256MB | us-central1 | HTTP |
| `generateInviteCode` | 256MB | us-central1 | HTTP |
| `joinFamilyByInviteCode` | 256MB | us-central1 | HTTP |
| `leaveFamily` | 256MB | us-central1 | HTTP |
| `removeFamilyMember` | 256MB | us-central1 | HTTP |
| `updateMemberRole` | 256MB | us-central1 | HTTP |
| `notifyNewEvent` | 256MB | us-central1 | HTTP |
| `notifyHealthItem` | 256MB | us-central1 | HTTP |
| `checkReminders` | 256MB | us-central1 | Every 1 minute |
| `checkBirthdayReminders` | 256MB | us-central1 | Daily 08:00 Oslo |

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

Contains 21 composite indexes across all collections.

### Step 2: Deploy Indexes

```bash
npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb
```

### Current Indexes

| Collection | Fields | Purpose |
|------------|--------|---------|
| `events` | familyId ASC, date ASC | List events by family and date |
| `events` | familyId ASC, createdBy ASC, date DESC | Filter by creator |
| `chat` | familyId ASC, timestamp DESC | Chat message ordering |
| `shoppingLists` | familyId ASC, createdAt DESC | Shopping list ordering |
| `trips` | familyId ASC, startDate DESC | Trip listing |
| `birthdays` | familyId ASC, date ASC | Birthday sorting |
| `gifts` | familyId ASC, birthdayId ASC, createdAt ASC | Gift listing per birthday |
| `pets` | familyId ASC, createdAt ASC | Pet listing |
| `petVetVisits` | familyId ASC, petId ASC, date DESC | Vet visits per pet |
| `petVetVisits` | familyId ASC, date DESC | All vet visits by date |
| `petMedications` | familyId ASC, petId ASC, createdAt DESC | Medications per pet |
| `petMedications` | familyId ASC, createdAt DESC | All medications by date |
| `petFood` | familyId ASC, petId ASC, createdAt DESC | Food schedule per pet |
| `petGrooming` | familyId ASC, petId ASC, lastDate DESC | Grooming per pet |
| `petVaccinations` | familyId ASC, petId ASC, date DESC | Vaccinations per pet |
| `petVaccinations` | familyId ASC, date DESC | All vaccinations by date |
| `petInsurance` | familyId ASC, petId ASC, createdAt DESC | Insurance per pet |
| `schoolChildren` | familyId ASC, createdAt ASC | School children listing |
| `schoolYears` | familyId ASC, createdAt ASC | School years listing |
| `schoolContacts` | familyId ASC, createdAt ASC | School contacts listing |
| `schoolSchedules` | familyId ASC, createdAt ASC | School schedules listing |

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
- Pet photos: Pet profile images
- School schedules: Schedule document uploads
- Trip documents: Travel document uploads

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

*Document generated for Familiesenter v1.0.0*
