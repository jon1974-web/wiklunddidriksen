# Notification System Refactoring Plan

## Current State
5 separate Cloud Functions with duplicated logic:
- `checkReminders` — event reminders (UTC, every 1 min)
- `checkMedicationReminders` — medication reminders (Oslo, every 5 min)
- `checkBirthdayReminders` — birthday reminders (Oslo, daily 08:00)
- `notifyNewEvent` — client-called, "new event" push
- `notifyHealthItem` — client-called, "health item" push

**Problems:**
- Duplicated auth check, family member lookup, FCM send in each function
- Different timezones (some UTC, some Oslo)
- Hard to add new notification types
- Hard to debug — different functions, different logic

---

## Proposed Solution: Centralized `sendNotification` Helper

### 1. Create `sendNotification` helper function

```javascript
// Shared helper used by all notification functions
async function sendNotification({ familyId, title, body, notifKey, excludeUid }) {
  const db = getFirestore();
  
  // Get family members with FCM tokens
  const familySnap = await db.collection("families").doc(familyId).get();
  if (!familySnap.exists) return 0;
  const membersMap = familySnap.data().members || {};
  const memberUids = Object.keys(membersMap).filter(uid => uid !== excludeUid);
  
  const tokens = [];
  for (let i = 0; i < memberUids.length; i += 10) {
    const batch = memberUids.slice(i, i + 10);
    const usersSnap = await db.collection("users").where("__name__", "in", batch).get();
    usersSnap.forEach((uDoc) => {
      const uData = uDoc.data();
      if (uData.fcmToken && uData.notificationsEnabled !== false) {
        tokens.push({ uid: uDoc.id, fcmToken: uData.fcmToken });
      }
    });
  }
  
  if (tokens.length === 0) return 0;
  
  // Deduplication check
  if (notifKey) {
    const notifSnap = await db.collection("sentNotifications").doc(notifKey).get();
    if (notifSnap.exists) return 0;
  }
  
  // Send to all family members
  const results = await Promise.allSettled(
    tokens.map(async (t) => {
      await getMessaging().send({
        token: t.fcmToken,
        notification: { title, body },
        webpush: {
          notification: { icon: "/favicon.ico", badge: "/favicon.ico", tag: notifKey || title },
          fcmOptions: { link: "/" },
        },
        data: { url: "/", type: "notification" },
      });
      // Mark as sent
      if (notifKey) {
        await db.collection("sentNotifications").doc(notifKey).set({
          sentAt: new Date().toISOString(),
          uid: t.uid,
        });
      }
    })
  );
  
  return results.filter(r => r.status === "fulfilled").length;
}
```

### 2. Simplify each trigger function

**checkReminders** — just finds events due for reminders and calls `sendNotification`:
```javascript
exports.checkReminders = onSchedule({ schedule: "every 1 minutes", region: "us-central1" }, async (event) => {
  // Find events with reminders due now
  // For each, call sendNotification({ familyId, title, body, notifKey })
});
```

**checkMedicationReminders** — same pattern:
```javascript
exports.checkMedicationReminders = onSchedule({ schedule: "every 5 minutes", timeZone: "Europe/Oslo", region: "us-central1" }, async (event) => {
  // Find medications with reminders due now
  // For each, call sendNotification({ familyId, title, body, notifKey })
});
```

**checkBirthdayReminders** — same pattern:
```javascript
exports.checkBirthdayReminders = onSchedule({ schedule: "every day 08:00", timeZone: "Europe/Oslo" }, async (event) => {
  // Find birthdays today/in coming days
  // For each, call sendNotification({ familyId, title, body, notifKey })
});
```

**notifyNewEvent** — client-called, just calls `sendNotification`:
```javascript
exports.notifyNewEvent = onRequest({ ... }, async (req, res) => {
  // Validate, then call sendNotification({ familyId, title, body, excludeUid: uid })
});
```

**notifyHealthItem** — same pattern.

### 3. Timezone handling

- **All scheduled functions** use `timeZone: "Europe/Oslo"` (consistent)
- **Medication times** stored as local time (Norwegian)
- **Cloud Function** runs in Oslo time, compares directly
- **Phone OS** handles display in local time automatically

### 4. File structure after refactoring

```
functions/index.js:
  - sendNotification()          ← NEW centralized helper
  - checkReminders()            ← simplified, calls sendNotification
  - checkMedicationReminders()  ← simplified, calls sendNotification  
  - checkBirthdayReminders()    ← simplified, calls sendNotification
  - notifyNewEvent()            ← simplified, calls sendNotification
  - notifyHealthItem()          ← simplified, calls sendNotification
  ... other functions unchanged
```

### 5. Benefits

| Before | After |
|--------|-------|
| 5 functions with duplicated logic | 1 helper + 5 thin wrappers |
| Different timezones | Consistent Oslo timezone |
| Hard to add new notification types | Just add a new trigger function |
| Hard to debug | Centralized logging |
| Duplicated auth/family/FCM code | Single implementation |

### 6. Effort estimate

- Create `sendNotification` helper: 30 min
- Refactor 5 functions: 1-2 hours
- Test all notification types: 1 hour
- Total: ~2-3 hours

### 7. Migration safety

- Keep existing `sentNotifications` collection — deduplication still works
- No Firestore schema changes needed
- No client-side changes needed
- All existing notifications continue to work

---

## Implementation Order

1. Create `sendNotification` helper
2. Refactor `checkReminders` (simplest, most reliable)
3. Refactor `checkBirthdayReminders` (also reliable)
4. Refactor `checkMedicationReminders` (the one that's been problematic)
5. Refactor `notifyNewEvent` and `notifyHealthItem`
6. Test all notification types
7. Remove old unused code
