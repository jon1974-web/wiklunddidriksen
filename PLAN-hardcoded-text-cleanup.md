# PLAN — Hardcoded Text Cleanup (i18n sweep)

> Created: 2026-09-25. Status: **planned, not implemented.**
> Goal: remove remaining hardcoded user-visible strings so ALL text uses the
> i18n `t()` function with keys in all 5 language files
> (`src/i18n/{nb,en,sv,da,fi}.json`).

## Tools already prepared

- **Scanner script:** `scripts/find-hardcoded-text.js`
  - Heuristic scan of `src/screens/*` and `src/components/*` for:
    literal `<Text>` bodies, `placeholder="…"` literals, `crossAlert`/`Alert.alert`
    literals, and `title/label/subtitle` object literals.
  - Run: `node scripts/find-hardcoded-text.js --out docs/hardcoded-text-report.txt`
  - The report is a *candidate list* — false positives exist (data-only
    strings like dates/format codes are filtered heuristically; verify in
    context before changing).

- **Baseline report:** committed output in
  `docs/hardcoded-text-report.txt` (see date inside — regenerate to refresh:
  `node scripts/find-hardcoded-text.js --out docs/hardcoded-text-report.txt`).

## How to work the sweep (recommended flow)

1. Run the scanner, pick ONE file (or a group of related screens) at a time.
2. For each candidate: look at the actual usage in context:
   - If user-visible → create a translation key (choose the existing
     namespace, f.ex. `events.*`, `school.*`, `health.*`) and add it to
     **all 5** language files.
   - If it's data/format-only (dates, numbers, symbols) → leave as-is.
3. After each screen/batch: run the i18n sync checker
   (script is in AGENTS.md; confirms all 5 files have identical key structure).
4. Re-run the scanner to see the file's count drop to 0.
5. Deploy (`npx expo export --platform web … && node scripts/inject-manifest.js
   && npx firebase-tools deploy --only hosting …`) and spot-check screens in
   each of the 5 languages in the browser before committing.

## Known exceptions (legit "hardcoded" strings — keep these)

- Reminder labels like "Vi minner deg om calendar-oppføringen" stored in user
  data? Verify usage.
- Pure data strings: dates (`"2026-09-29"`), times ("14:00"), percent, static
  map URLs.
- `console.log` and developer-only strings.
- Norwegian *content* a user themselves typed (e.g. preset labels that are data).

## Suggested pass order (largest UI impact first)

1. `ChatScreen`, `EventsScreen`, `EventDetailScreen` (core screens)
2. `ProfileScreen` + settings-ish screens
3. Space screens (Health, Pet, School, Kindergarten, Home*) — many already done
4. Trip screens (TripDetail is 2,500+ lines — biggest source of literals)
5. Modals + components (DatePickerModal, ActionModal, TransportTile etc.)
6. Voice/Photo AI screens (many literals — several were left intentionally
   Norwegian for speed)
7. Meals/recipes/shopping screens

## Definition of done

- Scanner report = 0 candidates across `src/screens` + `src/components`
  (excluding explicitly whitelisted exceptions listed at the bottom of this plan).
- i18n sync checker passes for all 5 languages.
- App deployed and spot-checked in nb/en/sv/da/fi.
