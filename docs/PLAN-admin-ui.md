# Admin UI Plan — fampad

## Overview
An admin panel for the fampad app to manage system settings, monitor usage, handle administrative tasks, and prepare for subscriptions.

**Access:** Only for users with `appRole: 'appOwner'` (separate from `familyRole`).
**URL:** `fampad.app/admin`
**Design:** fampad colors, responsive (mobile + desktop), charts and tables.

---

## Responsive Design Strategy

The admin panel works on:
- **Mobile phones** (375px-428px) — stacked layout, full-width cards
- **Tablets** (768px+) — 2-column grid
- **Desktop** (1024px+) — sidebar + main content, 3-column dashboard

**Responsive breakpoints:**
- `< 768px`: Mobile — stacked, single column
- `768px - 1023px`: Tablet — 2-column grid
- `>= 1024px`: Desktop — sidebar + main content, 3-column dashboard

---

## Implementation Status

### Phase 1: Access Control + AppOwner Role ✅

- ✅ `appRole?: 'appOwner' | null` added to `UserProfile` type
- ✅ `appRole` added to Zustand user store
- ✅ `verifyAppOwner()` Cloud Function helper
- ✅ `grantAppOwner` / `revokeAppOwner` Cloud Functions
- ✅ AdminScreen added to ProfileStack
- ✅ Admin Panel button on ProfileScreen (appOwner only)
- ✅ Basic AdminScreen with responsive tab layout
- ✅ Translations in all 5 languages

### Phase 2: Dashboard with Key Metrics ✅

- ✅ `getAdminStats` Cloud Function (cached hourly)
- ✅ `updateAdminStats` scheduled function (hourly)
- ✅ `triggerAdminStats` manual HTTP endpoint
- ✅ Dashboard with metric cards (families, users, new this week, API calls)
- ✅ Mini bar charts on cards
- ✅ Quick stats row (total events, storage used)
- ✅ Auto-refresh every 5 minutes
- ✅ Last updated timestamp

### Phase 3: Family Management ✅

- ✅ `getFamilyList` Cloud Function
- ✅ `getFamilyDetail` Cloud Function
- ✅ Searchable family list
- ✅ Family detail view with data counts
- ✅ Member list with role badges

### Phase 4: Usage Tracking + Cost Dashboard ✅

- ✅ `getUsageStats` Cloud Function
- ✅ `trackUsageLog` helper called from 7 key Cloud Functions
- ✅ Daily API calls bar chart
- ✅ Function breakdown with call count and cost
- ✅ Cost estimates per function
- ✅ Total cost display

### Phase 5: Rate Limit Controls ✅

- ✅ `getRateLimits` Cloud Function
- ✅ `updateRateLimits` Cloud Function
- ✅ `checkRateLimit` now reads from Firestore config (5-min cache)
- ✅ Editable rate limit table in Settings tab
- ✅ Audit logging for changes

### Phase 6: Subscription Management ⬜ Pending

1. `subscriptions` collection schema
2. Subscription status on family data
3. Admin UI for plan management
4. Trial period logic

---

## Subscription Tiers

| Plan | Price | Users | Features |
|------|-------|-------|----------|
| Trial | Free | 1-5 | All features, 14 days |
| Family | TBD | 1-5 | All features |
| Large Family | TBD | 6+ | All features |

---

## Security

1. **Client-side:** Admin page only shows if `appRole === 'appOwner'`
2. **Cloud Functions:** `verifyAppOwner()` helper
3. **Firestore Rules:** Admin collections require owner verification
4. **Audit Log:** All admin actions logged

---

## Cloud Functions Reference

| Function | Method | Purpose |
|----------|--------|---------|
| `getAdminStats` | GET | Cached dashboard data |
| `updateAdminStats` | Scheduled | Updates stats hourly |
| `triggerAdminStats` | POST | Manual stats trigger |
| `getFamilyList` | GET | All families with counts |
| `getFamilyDetail` | GET | Family detail with members |
| `getUsageStats` | GET | Usage analytics |
| `getRateLimits` | GET | Current rate limits |
| `updateRateLimits` | POST | Update rate limits |
| `grantAppOwner` | POST | Grant app owner role |
| `revokeAppOwner` | POST | Revoke app owner role |
| `trackUsage` | POST | Log API usage |

---

## Translation Keys

All admin UI text in 5 languages (nb, en, sv, da, fi):
- `admin.dashboard`, `admin.families`, `admin.users`, `admin.settings`, `admin.usage`
- `admin.totalFamilies`, `admin.totalUsers`, `admin.newThisWeek`
- `admin.apiCallsToday`, `admin.storageUsed`, `admin.estimatedCost`
- `admin.rateLimits`, `admin.save`, `admin.cancel`
- `admin.appOwner`, `admin.grantAccess`, `admin.revokeAccess`
- `admin.familyDetail`, `admin.members`, `admin.dataCounts`
- `admin.usageTotalCalls`, `admin.usageDailyChart`, `admin.usageByFunction`
- etc.

---

## Known Issues

- PWA caches old files — user needs to remove/reinstall PWA for updates
- CORS requires GET in allowed methods (fixed)
- Family detail modal uses overlay pattern instead of RN Modal (web compatibility)
