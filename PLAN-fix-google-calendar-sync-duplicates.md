# PLAN — Fix Google Calendar Sync Duplicates

> Created: 2026-09-25. Status: **planned, not implemented.**
> Backstory: after the family-wide calendar sync + first backfill run, a few events
> got duplicated in family members' Google Calendars (same calendar, same color).
> Examples: "Hilde møte Elin frisør i Fargernes" (28. september),
> "Jon på konsert" (15. november). The user confirmed the pair colors were the same
> → true double-creates inside one calendar.

## Context — how the system works today

- `familySyncCreate(familyId, payload)` creates a copy of each event in the primary
  Google Calendar of every connected family member. Used by all create triggers,
  the event-update self-heal, and `backfillCalendarSync` (Profile → Google
  Kalender-synk, owner-only, dry-run first).
- Each event doc stores `googleCalendarEventIds` (map uid→eventId) + legacy
  `googleCalendarEventId`.
- **Weakness:** `familySyncCreate` creates blindly — it never checks whether the
  target member's calendar already contains the same event.

## Root-cause vectors (why "a few" events duplicated)

| # | Vector | Note |
|---|---|---|
| 1 | End-time manual fixes → update trigger **self-heal** fired (creates for never-synced events) → first copy created | Intentional feature |
| 2 | Backfill ran shortly after; if self-heal's ID-writeback raced/failed, map was empty → backfill created a **second** copy | Race |
| 3 | Cloud Functions v2 **at-least-once redelivery** of `onDocumentCreated` after partial failure (calendar created, ID writeback failed) → retry → second copy | Sporadic — fits "a few duplicates, not everywhere" |
| 4 | Event doc exists **twice in Firestore** (two docs, same title/date) → each doc gets its own sync → looks like a duplicate | Possible for old events |

Also confirmed: same-color duplicates = same calendar (user's own) — not the benign
"one copy per member calendar shown together" case.

## Plan A (root cause hardening) — dedup inside `familySyncCreate`

Add ~15 lines to `familySyncCreate` in `functions/index.js`:

- Before creating for a member, run Google `events.list` against that member's
  calendar with:
  - `timeMin` = event start − 1 day
  - `timeMax` = event end + 1 day
  - `q` = event title
- If an event with **same title** and matching start (±1h) already exists →
  **adopt its ID** into the `googleCalendarEventIds` map instead of creating.

Benefits:
- Makes **all** paths idempotent (create triggers, self-heal, backfill, future
  auto-retries) — the duplicate bug can never recur.
- Zero caller changes: `familySyncCreate` signature/return unchanged.

Match rule care: identical titles are common for recurring items
("Trening Galaxy Mina" every week) — the ±1 day window + exact start-match keeps
them distinct. Do NOT merge by title alone.

## Plan B (one-time cleanup) — `cleanupCalendarDuplicates`

New Cloud Function, owner-only, dry-run first (same UI pattern as
`backfillCalendarSync` in Profile → Google Kalender-synk):

- For each event doc, per connected member: `events.list` matching events in that
  member's calendar (same title/date window).
- **Keep** the copy referenced by the stored `googleCalendarEventIds` entry
  (or the earliest if none stored). **Delete** surplus copies.
- Report shows kept/deleted per event. User approves via dry report before real run.
- User may instead delete the known duplicates manually in Google Calendar
  (user said a few duplicates are not critical).

## Plan C (optional) — Firebase duplicate docs

If two event docs share identical title+date, the backfill syncs both docs
→ looks like duplicates even after cleanup. Optional: cleanup mode also deletes
surplus Firestore docs (merge documents/notes), or handle manually in the app.

## Open questions (from planning session)

1. Cleanup automatically after dry report, or leave duplicates for manual deletion?
2. Include Firestore-doc merging in cleanup, or manual?
3. Sync-on-connect scope: include past events or only upcoming (timeMin = today suggested)?

## Plan D — Sync-on-connect (new member auto-backfill)

> Discovered 2026-09-25: a newly connected member only receives events via a
> manual backfill re-run by the owner. Connecting Google Calendar itself does
> nothing (verified: `googleCalendarCallback` at functions/index.js:3261 only
> stores tokens and redirects — no event sync, no trigger on the users
> collection).

**Goal:** when a family member connects their Google Calendar, all family events
are automatically written to their new calendar — self-service, no owner action.

**Implementation (small, in `googleCalendarCallback`):**

- After storing tokens and before redirecting, loop the 7 event collections
  (events, trips, petVetVisits, homeServices, health/{fid}/appointments,
  schoolActivities/{fid}/activities, kindergartenActivities/{fid}/activities)
  and create each event for **the new member only** — scoped, not whole-family.
- Reuse the same payload builders as `backfillCalendarSync` (factor them into
  shared functions since Plan A/B also need them).
- **Duplicate-safe:** requires Plan A's idempotency pre-check — before creating,
  `events.list` pre-check on the member's calendar (same title, matching start
  ±1h). If an event already exists there, adopt its ID instead of creating.
- **Scope decision:** use `timeMin = today` so new members only get upcoming
  events (better UX than flooding a calendar with years of history). Confirm
  with product owner before implementation.
- Large write burst risk: a family can have 100+ events → the HTTP callback
  could run long. Mitigation: respond to the OAuth redirect immediately and run
  the sync in a fire-and-forget async continuation (or process with
  `Promise.all` chunks), plus the same rate-limit/timeout settings as the
  backfill. Alternative: schedule the per-user sync as a Pub/Sub task instead
  of inline in the callback.

**UI:** optional toast/badge in Profile after redirect
(`profile?calendar=connected`) — "Synkroniserer hendelser til kalenderen din…"
with the sync running in the background.

**Verification:**
1. New member connects → all upcoming family events appear in their calendar
   automatically, exactly once per event.
2. Re-connect (disconnect + connect) → no duplicates (Plan A dedup proves it).
3. Owner does not need to re-run the manual backfill.

## Verification steps after implementation

1. Deploy functions.
2. Run cleanup dry report → confirm "Hilde møte Elin frisør" + "Jon på konsert"
   pairs are detected with surplus IDs.
3. Run cleanup for real → duplicates gone.
4. Re-run backfill dry run → everything should show as "Finnes fra før"
   (Skannet X, Opprettet 0), proving idempotency.
5. Create a brand-new event → confirm exactly one Google copy per member.

## Related context in code

- `functions/index.js`: `familySyncCreate` (~line 3692),
  `familySyncUpdate`, `familySyncDelete`, `createGoogleCalendarEvent`,
  `updateGoogleCalendarEvent`, `calendarEventExists`, `backfillCalendarSync`
  (line ~4116), self-heal in `onEventUpdatedForCalendar` (~line 3795).
- Profile UI: `src/screens/ProfileScreen.tsx` — Google Kalender-synk section
  (owner-only, dry-run first pattern to copy for cleanup UI).
- Known divergence: `homeServices` stores IDs as
  `calendarEventId`/`calendarEventIds` (not `googleCalendarEventId(s)`).
