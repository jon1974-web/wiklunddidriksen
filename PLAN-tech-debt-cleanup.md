# PLAN — Tech-Debt Cleanup: Types, Security, Performance, Structure

> Created 2026-10-23. Full audit findings below. Work in phases (incremental per AGENTS.md), test after each phase, deploy between phases.
> Baseline confirmation before starting: `npx tsc --noEmit | wc -l` should report ~645 errors, 373 of which are "real" (grep `^src|^App|^functions`).

## Phase 1 — Fix tsconfig split (small, do first)

**Goal**: make `npx tsc --noEmit` a trustworthy quality gate.

1. Root `tsconfig.json` excludes `functions/` (it has its own tsconfig responsible for it) — kills 19 `TS2307` errors for `functions/src/*`.
2. Fix platform-alias resolution (~24 `TS2307` errors): `../platform/CalendarView`, `../components/TripDocumentUpload`, `../platform/NetworkStatus`, `../platform/CalendarSync`, `../platform/Notifications` exist as `*.native.tsx` / `*.web.tsx` pairs. Metro resolves them; TS does not. Add path aliases or wildcard stub mapping in tsconfig.
   Expected result: well done error rate down to ~330–350.

## Phase 2 — Real-bug fixes (medium)

Priority order:
1. Duplicate object keys (`TS1117`, ~22 occurrences) — `src/constants/currencies.ts` (lines ~64–108), `src/constants/carrierDomains.ts:53`. These silently overwrite data. Audit every duplicate: verify which entry survives and whether it's correct (note: duplicates appear to relate to the NOK/SKK currency-family block).
2. `PetVaccination.location` — `EventsScreen.tsx:532/606` and likely the type in `src/types/index.ts`.
3. `TripFlight` export missing — `App.tsx:157` (check `src/types/index.ts`, renamed `TripTransport` historically).
4. Contact/space typing debt — `SchoolContactsScreen`/`KindergartenContactsScreen` (`childName` missing on `SchoolContact`/`KindergartenContact` types, `classmate` role not in the union).
5. `App.tsx` navigation types — `VoiceActivity`/`PhotoActivity`/`SchoolDetail` etc. routes not in `RootStackParamList` (partly in the AGENTS.md debt list).

**Verify each verification step**: `tsc --noEmit` count drop + manual smoke test of affected screens.

## Phase 3 — Security (small but CRITICAL, do as second priority)

1. **`firestore.rules` trip subcollection wildcard** (lines ~60–69):
   `match /{subcollection=**} { allow read, write: if request.auth != null; }` → family-scope it: family member via `get(families/...)`/`exists()` pattern like other collections.
2. Also audit the rule around line 65 (same wildcard pattern on some other collection) and sweep ALL rules for `read, write: if request.auth != null` wildcards without family scoping.
3. Add/verify Firestore Emulator test suites per AGENTS.md ("Test rules with Firebase Emulator before deploying").
4. Deploy: `npx firebase-tools deploy --only firestore:rules --project familiesenter-837bb` + Emulator test first.

Checklist from AGENTS.md to re-run after every change: familyId field presence, comment-wise scoping, composite indexes, per-family empties.

## Phase 4 — Performance sweep (large, dedicated session)

1. **Missing `.limit()`**: 74 `getDocs` query sites, only 7 files use `limit()`. Add sensible limits to every unbounded query (see AGENTS.md performance rules).
2. **Composite indexes**: cross-check every `where` + `orderBy` combo against `firestore.indexes.json`; add missing entries; run critical against Emulator (instant) before production deploy.
3. **N+1 patterns** — batch with `Promise.all` / collection-group queries where discovered.
4. After deploy: verify against production data that nothing times out / requires new indexes (`npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb` as needed).

## Phase 5 — Structure / clean code (very large, ongoing refactor-as-you-touch)

Known debt (from AGENTS.md, still valid):
- `TripDetailScreen.tsx` ~1,900 lines / 67 `useState` — needs splitting (list, forms, modals).
- Date-picker modals duplicated ×11 — use shared `DatePickerModal`.
- `UserProfile`/`Family` types in `familyService.ts` → move to `src/types/index.ts`.
- Screen navigation props typed as `any` → proper `RootStackParamList`.
- Static map URL building duplicated ×7 — extract util to `src/utils/`.
- Consider `PROFILE`-style file-size limits (AGENTS.md "one component per file", "<300 lines ideal").
Strategy: refactor incrementally whenever touching a file for features; don't big-bang.

## Command cheat sheet

```bash
# Type check
npx tsc --noEmit

# Rules/indexes deploy
npx firebase-tools deploy --only firestore:rules --project familiesenter-837bb
npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb

# Web deploy (after any src changes)
npx expo export --platform web --output-dir dist/web && node scripts/inject-manifest.js && npx firebase-tools deploy --only hosting --project familiesenter-837bb
```

## Progress log

- [ ] Phase 1 — tsconfig split
- [ ] Phase 2 — real-bug fixes
- [ ] Phase 3 — security rules
- [ ] Phase 4 — performance sweep
- [ ] Phase 5 — structure refactor (ongoing)
