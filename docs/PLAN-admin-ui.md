# Admin UI Plan

## Overview
An admin panel for the fampad app to manage system settings, monitor usage, and handle administrative tasks.

---

## Features

### 1. Rate Limits Management
**Status:** Rate limiting implemented (hardcoded). Future: configurable from admin UI.

| Function | Current Limit | Configurable? |
|----------|--------------|---------------|
| spondProxy | 30 req/min | ⬜ |
| photoToData | 5 req/min | ⬜ |
| voiceToEvent | 5 req/min | ⬜ |
| aiRecipeSuggestions | 10 req/min | ⬜ |
| importRecipeFromUrl | 5 req/min | ⬜ |
| translateRecipe | 10 req/min | ⬜ |
| destinationTips | 10 req/min | ⬜ |
| notifyNewEvent | 10 req/min | ⬜ |
| notifyHealthItem | 10 req/min | ⬜ |

**Implementation:**
- Store limits in `systemConfig/rateLimits` Firestore document
- Read with 5-minute in-memory cache in Cloud Functions
- Admin UI to view/edit limits
- Save button updates Firestore document
- Cloud Functions pick up changes on next cache refresh

---

### 2. Dashboard & Analytics
**Status:** Not started.

Display key metrics:
- **Family stats**: Total families registered, new families this week/month
- **User stats**: Total users, active users (last 7 days), new registrations
- **Feature usage**: Events created, health items added, photos uploaded, recipes searched
- **Module breakdown**: Usage per module (events, health, pets, school, trips, meals)
- **Notification stats**: Notifications sent, delivery rate, failures
- **Cloud Function metrics**: Calls per function, error rates, avg response time
- **Storage usage**: Files stored, total size, by type

**Implementation:**
- New Cloud Function `getAdminStats` that queries Firestore for counts
- Cache results for 5 minutes to avoid expensive queries
- Admin UI dashboard with charts/graphs
- Real-time updates via Firestore snapshots (optional)

---

### 3. User Management
- View all users with family memberships
- Search users by name/email
- View user profiles
- Manage family roles (promote/demote)
- View user activity (last login, events created)

### 4. Family Management
- View all families
- See family member lists
- View family data counts (events, health items, etc.)
- Manage invite codes

### 5. System Health
- Cloud Function error rates
- Recent error logs
- Firestore usage (reads/writes/storage)
- Active FCM tokens

### 6. Content Management
- Manage event icons
- Manage default translations
- System announcements

---

## Technical Architecture

### Storage
- Rate limits: `systemConfig/rateLimits` (Firestore document)
- Stats: `systemConfig/stats` (Firestore document, updated by scheduled function)
- Activity logs: `adminActivityLogs` collection

### Cloud Functions
- `getAdminStats` — returns cached dashboard data
- `updateRateLimits` — updates rate limit config
- `getAuditLogs` — returns recent activity

### Admin UI
- New screen: `AdminScreen` in ProfileStack
- Access: Only for users with `familyRole === 'owner'`
- Tab-based layout: Dashboard | Settings | Users | Families

---

## Implementation Priority

| Priority | Feature | Effort |
|----------|---------|--------|
| 1 | Rate limits config page | 3-4 hours |
| 2 | Dashboard with key metrics | 4-6 hours |
| 3 | User management | 3-4 hours |
| 4 | Family management | 2-3 hours |
| 5 | System health monitoring | 2-3 hours |

---

## Current Status
- ⬜ Rate limits hardcoded (implemented)
- ⬜ Rate limits configurable from UI
- ⬜ Dashboard metrics
- ⬜ User management
- ⬜ Family management
- ⬜ System health monitoring
