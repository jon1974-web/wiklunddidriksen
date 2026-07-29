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
- **All new UI text must use i18n translation keys** via `t()` function — never hardcode user-visible strings
- **New translation keys must be added to all 5 language files** (`nb.json`, `en.json`, `sv.json`, `da.json`, `fi.json`)
- Follow the existing namespace pattern: `common.*`, `events.*`, `transport.*`, `profile.*`, etc.
- When adding new features, always add translation keys first, then use them in the code
- For components that need language reactivity (useMemo), use `langKey` state or `i18n.on('languageChanged')` listener
- **This applies to ALL user-facing text**: buttons, links, labels, text inputs, placeholder text, helper texts, error messages, alert titles/messages, section headers, empty states, tooltips, badge labels, and any other visible text

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

4. **Add translations** in all 5 languages (`nb.json`, `en.json`, `sv.json`, `da.json`, `fi.json`):
   - `helpTitle` — feature name
   - `helpWhat` / `helpWhatText` — what the feature does
   - `helpHow` / `helpHowText` — how to use it
   - `helpTip` — helpful tip
   - `helpSettings` / `helpSettingsText` — profile settings reference (if applicable)

5. **Icon design**: Always teal (#0097A7) — bullseye pattern (teal → white → teal → white "i"). Does NOT follow theme.

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

### React Component Performance
- Use `React.memo()` for components that receive stable props
- Use `useMemo()` for expensive computations (sorting, filtering, derived data)
- Use `useCallback()` for event handlers passed to child components
- Never create objects/arrays in JSX render body — memoize them
- Avoid inline function definitions in JSX for list items
- Use `FlatList` with `getItemLayout` for fixed-height lists
- Avoid re-creating functions on every render

### Rendering
- Memoize computed values (sorted lists, filtered data, stamp calculations)
- Avoid IIFEs in JSX — extract to `useMemo` or component functions
- Don't run expensive logic in the render path without memoization
- Minimize state variables — group related state into objects

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
