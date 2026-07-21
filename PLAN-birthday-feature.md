# Birthday Feature Plan

## Goal
Add family-wide birthday tracking with annual reminders and weekly summary integration.

## Data Model

**Collection:** `birthdays/{birthdayId}` (top-level, same pattern as events/trips/chat)

```typescript
export interface Birthday {
  id: string;           // auto-generated
  name: string;         // Person's full name (first + last)
  date: string;         // 'YYYY-MM-DD' (full birth date for age calculation)
  addedBy: string;      // UID of who added it
  familyId: string;     // Family ID
  createdAt: number;    // timestamp
}
```

**Recurring:** Yearly — month+day matched annually. "6. august 2014" triggers every August 6th, age calculated dynamically (11 in 2025, 12 in 2026, etc.).

## Features

### 1. ProfileScreen — "Bursdager" section
- Add/edit/delete birthdays
- Person's name (one field, first + last)
- Birth date (year, month, day picker)
- Shows name, date, and calculated age
- Maximum 50 birthdays per family

```
┌──────────────────────────────────────┐
│ 🎂 Bursdager                         │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 👤 Emma Wiklund              │   │
│  │    6. august 2014 (11 år)    │   │
│  │                         🗑️   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ 👤 Bestemor                  │   │
│  │    12. mars 1945 (81 år)     │   │
│  │                         🗑️   │   │
│  └──────────────────────────────┘   │
│                                      │
│  [+ Legg til bursdag]               │
└──────────────────────────────────────┘
```

### 2. Duplicate Detection
When adding a birthday, query `birthdays` where `familyId == X && name == Y` (case-insensitive). If found, show:
> "Denne personen er allerede lagt til av [addedBy displayName]. Hele familien vil få varsler."

### 3. WeeklySummary — Min uke
When a birthday falls in the current week, show:
```
┌──────────────────────────────────────┐
│ 🎂 Emma fyller 11 år (lørdag)       │
└──────────────────────────────────────┘
```
- Age calculated from birth year
- Day name shown (e.g., "lørdag")
- Placed in the correct day of the week view

### 4. Cloud Function — `checkBirthdayReminders`
- **Schedule:** Daily at 08:00 (`0 8 * * *`)
- **Logic:**
  1. Query all `birthdays` documents
  2. For each birthday, check if month+day falls within next 7 days
  3. Fetch family members from `families/{familyId}.members`
  4. Fetch `fcmToken` from each member's `users/{uid}` document
  5. Send FCM push: "🎂 [Name] har bursdag om [X] dager!" or "🎂 [Name] har bursdag i dag!"
  6. Record in `sentNotifications` with key `birthday_{birthdayId}_{year}` to prevent duplicates
- **Respects:** `notificationsEnabled !== false` check on each user

### 5. Firestore Rules
```
match /birthdays/{birthdayId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null;
}
```
Family scoping is done client-side via `where('familyId', '==', familyId)` query filter (same pattern as events/trips).

## Implementation Details

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add `Birthday` interface |
| `src/i18n/nb.json` | Modify | Add `birthdays.*` keys (Norwegian) |
| `src/i18n/en.json` | Modify | Add `birthdays.*` keys (English) |
| `src/i18n/sv.json` | Modify | Add `birthdays.*` keys (Swedish) |
| `src/i18n/da.json` | Modify | Add `birthdays.*` keys (Danish) |
| `src/i18n/fi.json` | Modify | Add `birthdays.*` keys (Finnish) |
| `src/constants/limits.ts` | Modify | Add `MAX_BIRTHDAYS`, `BIRTHDAY_REMINDER_DAYS` |
| `src/screens/ProfileScreen.tsx` | Modify | Add "Bursdager" section |
| `src/components/WeeklySummary.tsx` | Modify | Add `birthdays` prop, birthday display |
| `src/screens/EventsScreen.tsx` | Modify | Fetch family birthdays, pass to WeeklySummary |
| `functions/index.js` | Modify | Add `checkBirthdayReminders` scheduled function |
| `firestore.rules` | Modify | Add `birthdays` collection rules |

### i18n Keys (Norwegian examples)

```
birthdays.title = "Bursdager"
birthdays.add = "Legg til bursdag"
birthdays.name = "Navn"
birthdays.date = "Fødselsdato"
birthdays.noBirthdays = "Ingen bursdager lagt til"
birthdays.remove = "Fjern"
birthdays.duplicate = "Denne personen er allerede lagt til av"
birthdays.duplicateNote = "Hele familien vil få varsler."
birthdays.birthdayInWeek = "{name} fyller {age} år ({day})"
birthdays.reminderTitle = "🎂 {name} har bursdag!"
birthdays.reminderBody = "{name} har bursdag om {days} dager"
birthdays.reminderToday = "{name} har bursdag i dag!"
```

### Age Calculation
```typescript
function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
```

### Birthday Matching for WeeklySummary
```typescript
// Match birthdays to a specific date (month+day only)
function isBirthdayOnDate(birthDate: string, targetDate: string): boolean {
  return birthDate.slice(5) === targetDate.slice(5); // Compare MM-DD
}
```

## Testing Checklist
1. Add a birthday in ProfileScreen — verify it saves to Firestore
2. Add duplicate name — verify warning message appears
3. Open Min uke — verify birthday shows in correct day with age
4. Wait for Cloud Function (or test manually) — verify FCM notification sent 7 days before
5. Delete a birthday — verify it's removed from Firestore and no longer shows in Min uke
6. Test with different family members — verify all see the same birthdays
7. Test age calculation across year boundaries ( birthday in Dec vs Jan )
