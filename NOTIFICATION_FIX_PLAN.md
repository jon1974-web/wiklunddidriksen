# Notification Fix Plan

## Problem
Users on PWA get duplicate notifications.

## Root Causes Found

### 1. `onMessage` handler stacking (HIGH PRIORITY)
- **File**: `src/platform/Notifications.web.tsx` line 28 + `App.tsx` line 411
- `configureNotifications()` is called inside a `useEffect` dependent on `user?.uid`
- Each time `user?.uid` changes, a new `onMessage` handler is added without unsubscriging the old one
- Firebase `onMessage` is additive — each call adds another listener
- Result: N browser notifications per message after multiple auth state changes

**Fix**: Capture the unsubscribe function and only register once:
```typescript
let unsubscribe: (() => void) | null = null;

export const configureNotifications = () => {
  if (unsubscribe) return;
  const m = initMessaging();
  if (!m) return;
  unsubscribe = onMessage(m, (payload) => {
    if (payload.notification) {
      new Notification(payload.notification.title || 'Familiesenter', {
        body: payload.notification.body,
        icon: '/favicon.ico',
      });
    }
  });
};
```

### 2. PetSpaceScreen double notification (HIGH PRIORITY)
- **File**: `src/screens/PetSpaceScreen.tsx` lines 222-223, 268-269
- Creating a vet visit/vaccination does TWO things:
  1. Creates a Firestore event with `reminderMinutes` → triggers `checkReminders` later
  2. Calls `notifyHealthItem` immediately
- Family members receive both an immediate "X la til en Time" AND a later "Påminnelse" for the same item
- Different tags (`"health-reminder"` vs event ID), so OS doesn't collapse them

**Fix options**:
- Option A: Remove `notifyHealthItem` call, keep event creation (checkReminders handles it)
- Option B: Remove event creation, keep `notifyHealthItem` (no reminder from checkReminders)
- Option C: Keep both but add shared deduplication between the two cloud functions

### 3. Regular events — "new event" + "reminder" (MEDIUM PRIORITY)
- **File**: `AddEventScreen.tsx` line 153 + `functions/index.js`
- Creating an event with a reminder sends:
  1. Immediate "X la til et arrangement" via `notifyNewEvent`
  2. Later "Påminnelse om X minutter" via `checkReminders`
- This is arguably by design (informational + reminder), but causes notification fatigue

**Fix options**:
- Option A: Remove `notifyNewEvent` for events with reminders (checkReminders handles it)
- Option B: Keep both (by design)
- Option C: Make `notifyNewEvent` only fire for events WITHOUT reminders

## Recommendation
1. Fix #1 first (handler stacking) — this is the most likely cause of visible duplicates
2. Fix #2 — decide with user whether pet items need both notifications
3. Fix #3 — discuss with user whether event notifications should be "new event" OR "reminder", not both

## Files to modify
- `src/platform/Notifications.web.tsx` — fix handler stacking
- `src/screens/PetSpaceScreen.tsx` — remove duplicate notification path
- Possibly `functions/index.js` — add cross-deduplication between notifyNewEvent and checkReminders
