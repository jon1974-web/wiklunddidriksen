# Desktop Web Browser Layout Plan

## Goal
Make the Familiesenter app look good in a desktop browser (Mac/PC), while keeping the mobile PWA experience unchanged.

## Current State
- Phone PWA: Full width, mobile layout ✓ (looks good)
- Desktop browser: Spans full page width, looks bad ✗
- Native iOS app: Already fine ✓

## Design Decision
**Centered phone-width column with side panel navigation**

- **Side panel (left):** Logo + branding + navigation links + user profile
- **App column (center):** 480-640px wide, white background, subtle shadow
- **Background:** Light teal-gray (#e8f0f1)

## Desktop Layout

```
┌──────────────┬────────────────────────────────────┐
│              │  Status bar (9:41)                  │
│  [🏠❤️]     │────────────────────────────────────│
│  Familiesenter│  [Liste] [Kalender] [Min uke]  [VQ] [BSK] [●] │
│  Familie     │────────────────────────────────────│
│  arrang.     │                                    │
│  admin.      │  📅 Arrangementer            +    │
│              │────────────────────────────────────│
│  📅 Arrang.  │  🎉 Jons 40-årsdag                │
│  🛒 Lister   │     Lørdag 15. juli — 15:00       │
│  💬 Chat     │     📍 Jons hus, Oslo              │
│  ✈️ Turer   │                                    │
│  👤 Profil   │  ⚽ G14 kamp — Ready vs VIF        │
│              │     Søndag 16. juli — 14:00        │
│              │     📍 Marienlyst                  │
│              │     [Spond]                        │
│              │                                    │
│  ┌────────┐  │  🍕 Fredagskveld med pizza         │
│  │ J      │  │     Fredag 14. juli — 18:00       │
│  │ Jon    │  │     📍 Hjemme hos oss              │
│  └────────┘  │                                    │
└──────────────┴────────────────────────────────────┘
```

## Header Bar (matches current mobile layout)
- **Left:** View toggles — "Liste" | "Kalender" | "Min uke" (green)
- **Right:** Spond group filter icons (VQ, BSK) + green circle (app events)

## Left Panel
- Logo (icon.svg) — 64px
- "Familiesenter" title
- "Familie arrangement administrasjon" tagline
- Navigation links:
  - 📅 Arrangementer (active)
  - 🛒 Handlelister
  - 💬 Chat
  - ✈️ Turer
  - 👤 Profil
- User profile card (avatar + name + email) at bottom

## Implementation Approach

### Method: `public/index.html` CSS template

1. Create `public/index.html` with CSS media queries:
   - `< 768px` (mobile): Full width, no side panel (current behavior)
   - `≥ 768px` (desktop): Centered column, side panel visible

2. CSS structure:
   ```css
   /* Mobile: default, full width */
   .desktop-wrapper { display: block; }
   .side-panel { display: none; }
   
   /* Desktop: ≥ 768px */
   @media (min-width: 768px) {
     .desktop-wrapper { display: flex; justify-content: center; }
     .side-panel { display: flex; width: 280px; }
     #root { max-width: 640px; }
   }
   ```

3. Side panel content:
   - SVG logo from `icon.svg`
   - App name + tagline
   - Navigation links (mirror the bottom tab bar)
   - Profile card

4. No React component changes needed — pure CSS at the root level

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `public/index.html` | **Create** | Custom HTML template with desktop layout CSS |
| `mockup-login.html` | Exists | Reference mockup — login page |
| `mockup-events.html` | Exists | Reference mockup — events page |

## Dark Mode
Side panels respect `@media (prefers-color-scheme: dark)`:
- Background: #1a1a1a
- Text: #e0e0e0
- Active link: #4dd0e1

## Testing Checklist
1. Desktop browser (Chrome/Safari/Firefox): centered column + side panel
2. Mobile browser (< 768px): full width, side panel hidden
3. PWA install on phone: full width, no side panel
4. `npx expo export`: verify `dist/web/index.html` contains the CSS
5. Firebase deploy: verify live site
