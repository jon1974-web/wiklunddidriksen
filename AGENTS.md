# Familiesenter — Agent Guidelines

## Expo

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Security (CRITICAL)

Security is non-negotiable. Every feature must be built with security in mind.

### Firestore Rules
- **NEVER** use wide-open rules (`allow read, write: if request.auth != null`)
- Every collection must have per-user or per-family scoping
- Users can only read/write their own profile (`request.auth.uid == uid`)
- Family data must be scoped to `resource.data.members[request.auth.uid] != null` (map-based members)
- Subcollections inherit parent scoping
- Test rules with Firebase Emulator before deploying

### Family Data Isolation (CRITICAL)
**Every document must have a `familyId` field.** This ensures:
- A new family starts with completely empty data
- No cross-family data leakage
- Firestore rules can verify family membership

**Pattern for flat collections:**
```typescript
// Add function MUST include familyId
export async function addItem(data: Omit<Item, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'items'), { ...data, familyId, createdAt: Date.now() });
  return docRef.id;
}

// Query MUST filter by familyId
export async function getItems(familyId: string): Promise<Item[]> {
  const q = query(collection(db, 'items'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
}
```

**Firestore rules pattern:**
```
match /items/{itemId} {
  allow read, write: if request.auth != null && 
    get(/databases/$(database)/documents/families/$(resource.data.familyId)).data.members[request.auth.uid] != null;
}
```

**Checklist for new collections:**
- [ ] Document includes `familyId` field
- [ ] Add function includes `familyId` parameter
- [ ] Get function filters by `familyId`
- [ ] Firestore rules verify family membership
- [ ] Composite index supports the query
- [ ] New family starts with empty data

### Cloud Functions
- **ALWAYS** verify `request.auth` before processing
- **NEVER** use `Access-Control-Allow-Origin: *` — restrict to your domain
- Store secrets (API keys, passwords) in `functions/.env`, never in code
- Encrypt sensitive data (e.g., Spond passwords) before storing in Firestore
- Validate and sanitize all inputs from `req.body`

### Data Isolation
- Every document must have a `familyId` field for multi-family support
- Queries must always filter by `familyId`
- Never expose data from other families

### Authentication
- Never store passwords in plaintext in Firestore
- Use Firebase Auth for all user identity
- Admin roles must be verified server-side, not just client-side

### Language Support (i18n)
- **All UI text must use i18n translation keys** via `t()` function — never hardcode user-visible strings (including labels, placeholders, error messages, button text, alert titles/messages, fallback values)
- **New translation keys must be added to all 5 language files** (`nb.json`, `en.json`, `sv.json`, `da.json`, `fi.json`)
- Follow the existing namespace pattern: `common.*`, `events.*`, `transport.*`, `profile.*`, etc.
- When adding new features, always add translation keys first, then use them in the code
- For components that need language reactivity (useMemo), use `langKey` state or `i18n.on('languageChanged')` listener
- **This applies to ALL user-facing text**: buttons, links, labels, text inputs, placeholder text, helper texts, error messages, alert titles/messages, section headers, empty states, tooltips, badge labels, and any other visible text
- **Translation sync rule**: After adding or modifying translation keys, always verify all 5 language files have identical key structures. Run this check before committing:
  ```bash
  node -e "const fs=require('fs');const langs=['nb','en','sv','da','fi'];const files={};for(const l of langs)files[l]=JSON.parse(fs.readFileSync('src/i18n/'+l+'.json','utf8'));const all={};for(const l of langs)for(const[ns,ks]of Object.entries(files[l])){if(!all[ns])all[ns]=new Set();for(const k of Object.keys(ks))all[ns].add(k)}for(const l of langs){const m=[];for(const[ns,ks]of Object.entries(all))for(const k of ks)if(!files[l][ns]||!files[l][ns][k])m.push(ns+'.'+k);if(m.length)console.log(l+' MISSING: '+m.join(', '))}else console.log(l+': OK')}"
  ```
  If keys are missing, add them to the affected files with appropriate translations before committing.

### Documentation Updates (CRITICAL)
When adding new features, making security changes, or any work that affects user-facing functionality, **ALWAYS update the relevant documentation in ALL languages**:

**User-facing documents (must be in all 5 languages):**
- `docs/users/user-guide.md` — End-user guide
- `public/docs/privacy-{lang}.html` — Privacy policy (nb, en, sv, da, fi)
- `public/docs/terms-{lang}.html` — Terms of service (nb, en, sv, da, fi)
- Help center content in the app (via i18n translation keys)

**Technical documents (English only is fine):**
- `docs/systems/architecture.md` — System architecture
- `docs/operations/deployment.md` — Deployment procedures
- `docs/operations/monitoring.md` — Monitoring guide
- `docs/PLAN-admin-ui.md` — Admin UI plan
- `PLAN-security-privacy.md` — Security assessment

**Rule of thumb:** If a document is read by end users, it must be in all 5 languages. If it's read by developers/admins, English is sufficient.

**IMPORTANT:** When updating privacy/terms documents, always update BOTH:
- The markdown source files (`docs/privacy/privacy-policy.md`, `docs/privacy/terms-of-service.md`)
- The HTML files in `public/docs/` for ALL 5 languages (nb, en, sv, da, fi)

### Help Center (Info Modal)
When adding help to a feature, follow this pattern:

1. **Add the Info icon** to the right of the section header text:
```tsx
import { HelpCenter } from '../components/HelpCenter';

const [showHelp, setShowHelp] = useState(false);

// In JSX:
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>📅 Section Title</Text>
  <TouchableOpacity
    style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}
    onPress={() => setShowHelp(true)}
  >
    <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>i</Text>
      </View>
    </View>
  </TouchableOpacity>
</View>
```

2. **Add the HelpCenter modal** with sections in this order:
```tsx
<HelpCenter
  visible={showHelp}
  onClose={() => setShowHelp(false)}
  title={t('mealPlanner.helpTitle')}
  sections={[
    { icon: '📋', title: t('mealPlanner.helpWhat'), text: t('mealPlanner.helpWhatText') },
    { icon: '👉', title: t('mealPlanner.helpHow'), text: t('mealPlanner.helpHowText'), tip: t('mealPlanner.helpTip') },
    { icon: '⚙️', title: t('mealPlanner.helpSettings'), text: t('mealPlanner.helpSettingsText') },
  ]}
/>
```

3. **Section order**: What is it → How to use it (with tip) → Settings (if applicable)

4. **Update help text when features change**: Whenever new functionality is added to a feature that has a Help Center modal, the help text MUST be updated to reflect the changes. This includes new buttons, new settings, changed workflows, etc. The help modal should always accurately describe the current state of the feature.

5. **Thoroughly check feature behavior before writing articles**: Before creating or updating a help center article, you MUST:
   - Open the feature and test every interaction (tap, long press, expand/collapse, etc.)
   - Verify the exact workflow step-by-step
   - Check what data is shown and how it's organized
   - Test edge cases (empty states, single item, many items)
   - The help text must accurately describe what the user will actually see and do — never assume or guess

4. **Add translations** in all 5 languages (`nb.json`, `en.json`, `sv.json`, `da.json`, `fi.json`):
   - `helpTitle` — feature name
   - `helpWhat` / `helpWhatText` — what the feature does
   - `helpHow` / `helpHowText` — how to use it
   - `helpTip` — helpful tip
   - `helpSettings` / `helpSettingsText` — profile settings reference (if applicable)

5. **Icon design**: Use the SVG from `assets/help-icon.svg`. Always teal (#0097A7) — bullseye pattern. Does NOT follow theme.

### Family Role System
- `Family.members` is a map: `{ [uid]: { role: 'owner'|'admin'|'member', displayName: string } }`
- `UserProfile.familyRole` stores the user's role
- Only admins/owners can generate invite codes
- Invite codes: 6-char hex, 1-hour expiry, one-time use
- All write operations (create family, join, remove, leave) go through Cloud Functions
- Cloud Functions verify auth + role server-side before any mutation
- Client reads direct Firestore; client writes call Cloud Functions via `callFunction()` helper

## PWA / iOS (CRITICAL)

- **All `TextInput` components MUST use `fontSize: 16` or higher** — iOS Safari auto-zooms on inputs with font-size below 16px when focused. This breaks the PWA experience.
- Never use `fontSize: 13` or `fontSize: 14` on text inputs.

## Performance (HIGH PRIORITY)

Performance directly impacts user experience. Treat it as a feature, not an afterthought.

### Firestore Queries
- **ALWAYS** add `.limit()` to queries — never load unlimited data
- **ALWAYS** filter by `familyId` and/or `createdBy` where applicable
- Use `orderBy` with `.where` to leverage composite indexes
- Avoid N+1 queries — batch reads with `Promise.all` or collection group queries
- Add composite indexes in `firestore.indexes.json` for multi-field queries

### Firestore Indexing (CRITICAL)
- **EVERY** Firestore query with multiple `where` + `orderBy` fields requires a composite index in `firestore.indexes.json`
- Index field order matters: `where` fields first, then `orderBy` field
- If you change `orderBy` direction (asc ↔ desc), update the index accordingly
- If you add a new `where` clause to an existing query, add/update the index
- After changing `firestore.indexes.json`, deploy with: `npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb`
- **New collection = new index** — check `firestore.indexes.json` before adding any new Firestore collection
- Indexes take a few minutes to build in production — test with the Firebase Emulator first for instant feedback
- **Common error**: "The query requires an index" means a composite index is missing or has wrong field order/direction

### React Component Performance
- Use `React.memo()` for components that receive stable props
- Use `useMemo()` for expensive computations (sorting, filtering, derived data)
- Use `useCallback()` for event handlers passed to child components
- Never create objects/arrays in JSX render body — memoize them
- Avoid inline function definitions in JSX for list items
- Use `FlatList` with `getItemLayout` for fixed-height lists
- Avoid re-creating functions on every render

### Preventing Undefined Errors (CRITICAL)
We've had recurring issues with `undefined` values causing blank screens. Follow these rules:

**Rule 1: Always provide defaults when reading from Firestore**
```typescript
// ❌ BAD - crashes if timeSlots is undefined
medForm.timeSlots.map(...)

// ✅ GOOD - safe with fallback
(medForm.timeSlots || []).map(...)
```

**Rule 2: Always default optional form fields in useState**
```typescript
// ❌ BAD - timeSlots could be undefined after editing old data
const [medForm, setMedForm] = useState({ name: '', frequency: '', timeSlots: undefined });

// ✅ GOOD - always provide safe defaults
const [medForm, setMedForm] = useState({ name: '', frequency: 1, timeSlots: [{ time: '08:00', reminderMinutes: 15 }] });
```

**Rule 3: Always default in edit pre-fill useEffects**
```typescript
// ❌ BAD - crashes if item.timeSlots is undefined (old data)
setMedForm({ ...item, timeSlots: item.timeSlots });

// ✅ GOOD - safe fallback
setMedForm({ ...item, timeSlots: item.timeSlots || [{ time: '08:00', reminderMinutes: 15 }] });
```

**Rule 4: Use optional chaining for nested access**
```typescript
// ❌ BAD
medForm.timeSlots[0].time

// ✅ GOOD
medForm.timeSlots?.[0]?.time
```

**Rule 5: Guard array operations**
```typescript
// ❌ BAD
medForm.timeSlots.map(...)

// ✅ GOOD
(medForm.timeSlots || []).map(...)
```

**Common culprits:**
- Firestore data added before a schema change (missing new fields)
- Edit forms that pre-fill from existing data
- Array fields that might not exist on older documents

### Navigation Focus Listeners
- **ALWAYS** add `navigation.addListener('focus', ...)` when a screen loads data on mount that can be modified on child screens
- When navigating back from a detail/edit screen, the parent screen must refresh its data to reflect changes
- Pattern: `useEffect(() => { const unsubscribe = navigation.addListener('focus', () => { loadData(); }); return unsubscribe; }, [navigation, loadData]);`
- Without this, counters, lists, and summaries will show stale data until the app is fully refreshed
- Example: TripDetailScreen needs focus listener because PackingListDetailScreen modifies packing list items

### Transport Form Pattern (Trip Module)
- All transport types (fly, tog, bil, boat, taxi, ferry) use the **dual form state** pattern:
  - Two separate form states: `formUtreise` + `formHjemreise`
  - A direction state: `direction: 'utreise' | 'hjemreise'`
  - A change handler: `handleFormChange` that updates the correct state based on direction
- **Avreise/Hjemreise tabs** in the modal let users switch between departure and arrival
- **isOneWay** checkbox hides the Hjemreise tab
- **Save logic**: Creates two Firestore documents (utreise + hjemreise) when not one-way
- **Edit logic**: Loads data into the correct direction state based on `item.type`
- **Picker fields**: Use `xxxDepDate`, `xxxDepTime`, `xxxArrDate`, `xxxArrTime` naming convention
- **Pattern applies to**: fly, tog, bil (via TransportFormModal), boat, taxi, ferry (inline modals)
- Reference: `TripDetailScreen.tsx` lines 130-172 for state setup, 740-777 for save handlers

### Rendering
- Memoize computed values (sorted lists, filtered data, stamp calculations)
- Avoid IIFEs in JSX — extract to `useMemo` or component functions
- Don't run expensive logic in the render path without memoization
- Minimize state variables — group related state into objects

### Incremental Implementation (CRITICAL for new features)
When implementing new features, especially large ones, **always work in small, testable parts**:

1. **Plan the feature** into logical steps (types → service → UI → translations → testing)
2. **Implement one step at a time** — complete one step fully before moving to the next
3. **After each step, verify it works** — deploy and have the user test
4. **Check against the plan** — make sure what you built matches what was planned
5. **Only then move to the next step** — don't batch multiple changes together

**Why this matters:**
- Catches missing details early (forgotten translations, broken navigation, etc.)
- Prevents cascading errors from accumulating
- User can test incrementally and give feedback
- Easier to debug when something breaks

**Example for Health Space:**
1. ✅ Create types + service → deploy → test Firestore access
2. ✅ Create basic screen with header → deploy → test navigation
3. ✅ Add Medications section → deploy → test CRUD
4. ✅ Add Vet Visits section → deploy → test CRUD
5. ✅ Add remaining sections → deploy → test all
6. ✅ Add translations → deploy → verify all languages
7. ✅ Add to WeeklySummary → deploy → verify integration

### Code Splitting
- Use `React.lazy()` for screens not immediately visible
- Use dynamic imports for heavy dependencies

## Code Quality (ESSENTIAL)

Good code is maintainable code. Quality is everyone's responsibility.

### File Organization
- One component per file (or closely related small components)
- Shared types go in `src/types/index.ts`, not scattered across service files
- Constants go in `src/constants/` — never hardcode magic numbers or strings
- Platform-specific code uses `*.native.tsx` / `*.web.tsx` convention

### Component Design
- Extract reusable components instead of copy-pasting JSX
- Components should be small and focused (< 300 lines ideal)
- Use TypeScript interfaces for all props
- Prefer composition over configuration props

### Back Button Pattern (CRITICAL)
All screens with a back button must use the **circular back button** — an arrow inside a circular border. This provides a consistent, tappable experience across the app.

**Pattern:**
```tsx
<TouchableOpacity
  onPress={() => navigation.goBack()}
  style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}
>
  <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
</TouchableOpacity>
```

**Rules:**
- Use `navigation.goBack()` for the `onPress` handler
- Circle: 36×36, borderRadius 18, borderWidth 1.5, borderColor `colors.accent`
- Arrow: fontSize 18, color `colors.accent`
- Follows the user's theme color automatically
- Never use a plain `<Text>←</Text>` without the circular container
- Check browser console for navigation errors if the button doesn't work

### Item Interaction Pattern (Health, Trips, and similar modules)
All modules with lists of items (Health, Trips, etc.) must follow a consistent interaction pattern:

**1. Tap (short press) → Detail view**
- Tapping an item opens a detail modal showing all fields
- Detail modal has "Close" and "Edit" buttons
- For items with location (Timer, Vaksiner): show a static map that opens Google Maps on tap

**2. Long press → Edit and Delete options**
- Long-pressing shows the custom `ActionModal` (not system alert)
- ActionModal shows "Rediger" (Edit) and "Slett" (Delete) buttons
- "Rediger" opens the add/edit form pre-filled with the item's data
- "Slett" shows a confirmation dialog before deleting

**3. Edit form**
- Uses the same form modal as adding new items
- Form is pre-filled with existing data when editing
- All fields must be saved — never drop data during edit
- Use `DatePickerModal` for date/time fields (same as events)
- Use `GooglePlacesInput` for address/location fields

**4. Delete**
- Uses `ActionModal` with delete confirmation (branded, not system alert)
- After deletion, data reloads from Firestore
- If item has a `notificationId`, cancel the scheduled notification

**Pattern reference:** `HealthSpaceScreen.tsx` — follow this pattern for all similar modules.

### Edit Save Rule (CRITICAL)
When saving an edited item, **all fields must be included in the update** — never drop data during edit. This applies to all modules (Health, Trips, etc.).

**Common mistake:** Only saving the fields that changed, losing other data. Always spread the existing data with updates:
```tsx
await updateDoc(doc(db, collection, id), { ...existingData, ...changedFields });
```

**Checklist before saving:**
- All form fields are included in the save payload
- Existing data that wasn't changed is preserved
- The item reappears correctly in the list after save
- Extract repeated patterns into shared components

### State Management
- Use Zustand for global state (user, theme, family)
- Use local state for UI-only concerns (modals, form inputs)
- Group related form state into objects, not individual `useState` calls
- Avoid deeply nested state — flatten when possible

### Error Handling
- Always use `getErrorMessage()` for user-facing errors
- Always wrap async operations in try/catch
- Never silently swallow errors — at minimum, log them
- Use `crossAlert` utility for alerts (web-compatible)

### Naming Conventions for Readability
- **Use descriptive names that reflect purpose, not implementation**: `handleSaveTransport` not `handleSaveFlight`
- **Avoid legacy names**: When refactoring, rename old types/functions to match the new architecture (e.g. `TripFlight` → `TripTransport`)
- **Type names should be self-documenting**: `TripTransport` tells you it's a transport item; `TripFlight` only tells you about flights
- **Function names should describe the action**: `getTripTransport`, `addTripTransport`, `updateTripTransport`, `deleteTripTransport`
- **Form state names should match their purpose**: `transportFormUtreise` not `flightFormUtreise`
- **Interface names should match their content**: `TransportForm` not `FlightForm`
- This applies to all new features — readability is a priority for future development

### Delete Confirmations
- **ALWAYS** use the `ActionModal` component for delete confirmations (not `window.confirm` or `crossAlert`)
- Shows the Familiesenter logo, person/entity name, "Er du sikker?" subtitle
- Import: `import { ActionModal } from '../components/ActionModal';`
- Pattern: `onLongPress` opens ActionModal with `onDelete` callback
- This provides a consistent, branded experience across the app

### Import Pitfalls (CRITICAL — causes blank screens)
These import mistakes have caused blank screens multiple times. **Always verify before committing:**

- **`i18n`**: Import from `'../i18n'` (local module), NOT from `'react-i18next'`
  - ✅ `import i18n from '../i18n';`
  - ❌ `import { i18n } from 'react-i18next';` — this is `undefined` and crashes the app
- **React hooks**: Always import hooks you use — `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`
  - Missing any of these causes a blank screen with no error message
- **Named vs default exports**: Check the source file to confirm export type before importing
  - `export default i18n` → `import i18n from '../i18n'`
  - `export const foo` → `import { foo } from '...'`

### Naming Conventions
- Components: PascalCase (`EventCard`, `TripDetailScreen`)
- Functions/hooks: camelCase (`getUserProfile`, `useTheme`)
- Constants: UPPER_SNAKE_CASE (`GOOGLE_MAPS_API_KEY`, `TRIP_ICONS`)
- Files: PascalCase for components, camelCase for services/utils
- Norwegian UI strings — keep user-facing text in Norwegian

### DRY (Don't Repeat Yourself)
- If you write the same JSX pattern 3+ times, extract a component
- If you write the same logic 3+ times, extract a function
- Shared constants live in `src/constants/` — not duplicated across files
- Utility functions go in `src/utils/` — not inline in components

## Refactoring

Refactoring is not optional — it's part of building features.

### When to Refactor
- When a file exceeds 500 lines — break it into smaller files
- When a component has more than 10 `useState` calls — group into objects
- When the same pattern appears 3+ times — extract a component or utility
- When adding a feature reveals structural issues — fix them first

### How to Refactor Safely
1. Understand the existing code before changing it
2. Make one change at a time
3. Test after each change
4. Preserve existing behavior — no silent regressions
5. Use TypeScript to catch type errors

### Known Technical Debt
- `TripDetailScreen.tsx` (~1918 lines, 67 useState) — needs splitting
- Date picker modals duplicated 11 times — use shared `DatePickerModal`
- `UserProfile`/`Family` types in `familyService.ts` — move to `types/index.ts`
- Screen navigation props typed as `any` — add `RootStackParamList`
- Static map URLs duplicated 7 times — extract utility function

## Build & Deploy Commands

```bash
# Native dev
npx expo start --localhost

# Web dev
npx expo start --web

# iOS build
npx expo run:ios --device B851A586-1F58-4DFA-B38C-A547885777F1

# Web build + deploy
npx expo export --platform web --output-dir dist/web && npx firebase-tools deploy --only hosting --project familiesenter-837bb

# Cloud Functions deploy
npx firebase-tools deploy --only functions --project familiesenter-837bb

# Firestore rules deploy
npx firebase-tools deploy --only firestore:rules --project familiesenter-837bb

# Firestore indexes deploy
npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb

# Storage rules deploy
npx firebase-tools deploy --only storage --project familiesenter-837bb
```

## Architecture Reference

- **Firebase project**: `familiesenter-837bb`
- **Family ID**: `AVCUsb8X6GdRM3f0EBf0` (Familien Wiklund Didriksen)
- **Admin/Owner**: `jon@wiklunddidriksen.com`
- **GitHub repo**: `jon1974-web/wiklunddidriksen`
- **Spond proxy**: Cloud Function `spondProxy` (avoids CORS)
- **Voice transcription**: Cloud Function `voiceToEvent` (Whisper + GPT-4o-mini)
- **Destination tips**: Cloud Function `destinationTips` (GPT-4o-mini)
- **Invite codes**: Cloud Function `generateInviteCode` (6-char, 1-hour expiry)
- **Family operations**: Cloud Function `createFamily`, `joinFamilyByInviteCode`, `leaveFamily`, `removeFamilyMember`
