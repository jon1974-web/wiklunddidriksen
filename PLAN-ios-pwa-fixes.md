# iOS PWA Fixes Plan (Completed)

## Problem
Firebase Storage operations (profile picture upload/display, document open/download) failed on iOS in standalone PWA mode. Worked fine on Mac Chrome and Safari.

## Root Cause
Express VPN on the phone was blocking `firebasestorage.googleapis.com`. Additionally:
- `window.open` doesn't work in iOS standalone PWA
- Firebase SDK's internal fetch calls could fail on iOS
- Service worker had wrong Firebase credentials (different messagingSenderId/appId)
- Destructive `onError` handler permanently removed avatar URLs after transient failures

## Fixes Applied

### 1. Document opening (TripDetailScreen.tsx)
- Replaced `window.open(url, '_blank')` with fetch-as-blob + `<a>` download
- Works in iOS standalone PWA where `window.open` is blocked

### 2. Profile picture display (ProfileScreen.tsx)
- Removed destructive `onError` handler that permanently cleared `avatarUrl`

### 3. Profile picture upload (ProfileScreen.tsx)
- Added `auth.currentUser` check before upload
- Added `getIdToken(true)` to force token refresh

### 4. Chat avatars (MessageBubble.tsx)
- Added `onError` fallback showing initials when avatar URL fails

### 5. Service worker (firebase-messaging-sw.js)
- Fixed wrong Firebase credentials (messagingSenderId, appId)
- Updated SDK from v10.12.0 → v11.6.0
- Added error handling around `importScripts`
- Added pass-through fetch handler

### 6. AuthScreen.tsx
- Added `avatarUrl` to `setUser()` at login to fix race condition

### 7. Direct REST API bypass (webStorage.ts)
- Created `webStorage.ts` with fetch-based upload/download using Firebase REST API
- Bypasses Firebase SDK's internal fetch for more reliability
- Used by ProfileScreen upload, TripDocumentUpload, and document opening

## Files Modified
- `src/screens/TripDetailScreen.tsx` — document opening
- `src/screens/ProfileScreen.tsx` — upload + display
- `src/screens/AuthScreen.tsx` — avatarUrl in setUser
- `src/components/MessageBubble.tsx` — onError fallback
- `src/components/TripDocumentUpload.web.tsx` — REST API upload
- `public/firebase-messaging-sw.js` — credentials + SDK update
- `src/services/webStorage.ts` — **new file**, REST API Storage service
