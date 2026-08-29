# Admin UI Plan — fampad

## Overview
An admin panel for the fampad app to manage system settings, monitor usage, handle administrative tasks, and prepare for subscriptions.

**Access:** Only for users with `appRole: 'appOwner'` (separate from `familyRole`).
**URL:** `fampad.app/admin`
**Design:** fampad colors, responsive (mobile + desktop), charts and tables.

---

## Responsive Design Strategy

The admin panel must work beautifully on:
- **Mobile phones** (375px-428px) — stacked layout, full-width cards
- **Tablets** (768px+) — 2-column grid
- **Desktop** (1024px+) — sidebar + main content, 3-column dashboard

**Implementation:**
- Use React Native's `Dimensions` API or `useWindowDimensions` hook
- CSS media-like breakpoints via responsive style helpers
- Flexible grid layouts with `flexDirection: 'row'` on larger screens
- Cards stack vertically on mobile, grid on desktop
- Tables become scrollable cards on mobile
- Sidebar navigation collapses to bottom tabs on mobile

**Responsive breakpoints:**
- `< 768px`: Mobile — stacked, single column
- `768px - 1023px`: Tablet — 2-column grid
- `>= 1024px`: Desktop — sidebar + main content, 3-column dashboard

---

## Feature Roadmap

### Phase 1: Access Control + AppOwner Role (Start here)
**Est: 2-3 hours**

1. Add `appRole?: 'appOwner' | null` to `UserProfile` type
2. Add `appRole` to user store
3. Create `verifyAppOwner()` Cloud Function helper
4. Create `grantAppOwner` / `revokeAppOwner` Cloud Functions
5. Add AdminScreen to ProfileStack
6. Add Admin Panel button to ProfileScreen (visible only to appOwners)
7. Create basic AdminScreen with responsive tab layout
8. Add translations

### Phase 2: Dashboard with Key Metrics
**Est: 4-6 hours**

1. `getAdminStats` Cloud Function (cached hourly)
2. Scheduled function to update stats
3. Dashboard with metric cards (responsive grid)
4. Simple bar charts for usage trends

### Phase 3: Family Management
**Est: 3-4 hours**

1. `getFamilyList` Cloud Function
2. `getFamilyDetail` Cloud Function
3. Searchable family list
4. Family detail view with data counts

### Phase 4: Usage Tracking + Cost Dashboard
**Est: 4-5 hours**

1. `trackUsage` logging in Cloud Functions
2. `getUsageStats` aggregation Cloud Function
3. Charts for API calls per day/function/family
4. Cost estimation display

### Phase 5: Rate Limit Controls
**Est: 2-3 hours**

1. `getRateLimits` / `updateRateLimits` Cloud Functions
2. Editable rate limit table
3. Real-time updates via Firestore cache

### Phase 6: Subscription Management
**Est: 3-4 hours**

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

## Translation Keys

All admin UI text needs translations in 5 languages (nb, en, sv, da, fi):
- `admin.dashboard`, `admin.families`, `admin.users`, `admin.settings`
- `admin.totalFamilies`, `admin.totalUsers`, `admin.newThisWeek`
- `admin.apiCalls`, `admin.storageUsed`, `admin.estimatedCost`
- `admin.rateLimits`, `admin.save`, `admin.cancel`
- `admin.appOwner`, `admin.grantAccess`, `admin.revokeAccess`
- etc.
