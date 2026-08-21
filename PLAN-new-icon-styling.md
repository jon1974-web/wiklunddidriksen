# PLAN — New Icon & App Styling

## App Icon: "fp" Monogram

### Design Concept
- **Structure**: Lowercase "f" and "p" connected in a single continuous stroke
- **Symbolism**: The "p" loop forms a clean house silhouette; the intersection creates an organic leaf/heart loop
- **Background**: Rich premium teal gradient — dark oceanic teal (bottom-left) → vibrant mint teal (top-right)
- **Monogram**: Solid crisp white, soft rounded terminal edges, high contrast for tiny notification sizes

### Implementation
- Replace `assets/icon.png` with the new "fp" monogram design
- Update PWA manifest icon references
- Generate all required sizes (192x192, 512x512, apple-touch-icon, favicon)

## Color Palette Overhaul

### New Module Colors (`constants/moduleColors.ts`)

| Module | Current | New | Tone |
|--------|---------|-----|------|
| **Primary UI** | Teal `#0097A7` | Deep Premium Teal `#0D7377` | Main nav, headers, buttons |
| **Background** | Theme-based | Warm Soft Off-White `#FAF8F5` | App-wide canvas |
| School | Green `#43A047` | Sage Green `#6B8F71` | Clean, intellectual |
| Kindergarten | Coral `#FF7043` | Soft Coral `#E8836A` | Playful, warm |
| Trips | Blue `#42A5F5` | Light Sky Blue `#7EC8E3` | Open, refreshing |
| Birthdays | Orange `#FB8C00` | Mustard Yellow `#E6A817` | Sophisticated celebration |
| Health | Red `#E53935` | Rose Terracotta `#C67B5C` | Softer, less alarming |
| Pets | Purple `#8E24AA` | Muted Orchid `#9B7DB8` | Whimsical, distinct |
| Meals | Teal `#0097A7` | Warm Apricot/Salmon `#E8906C` | Appetizing, vibrant |
| Home | Indigo `#5C6BC0` | Slate Blue-Gray `#6B7B8D` | Structural, grounded |

### Light Background Variants (for `*Bg` keys)
Each module gets a matching light variant at ~10-15% opacity of the main color.

## Files to Change

### Core
- `constants/moduleColors.ts` — all color values
- `constants/theme.ts` (or ThemeContext) — primary UI color, button color, accent color
- `assets/icon.png` — new "fp" monogram
- `assets/splash.png` — new branding
- `scripts/inject-manifest.js` — icon paths if changed

### Screens (color references)
- All screens using hardcoded colors need to reference `MODULE_COLORS` consistently
- Event cards, trip cards, health cards, etc. — update border/accent colors
- Tab bar active/inactive colors
- Modal overlays and button colors

### Components
- `CustomTabBar.tsx` — active tab color
- `WeeklySummary.tsx` — module color references
- `EventCard.tsx` — card accent colors
- `ActionModal.tsx` — accent color props
- `HelpCenter` sections — icons and colors

## Implementation Order

1. **Create the "fp" icon** (design file → export PNG at all sizes)
2. **Update `moduleColors.ts`** with new palette
3. **Update theme/primary color** throughout the app
4. **Replace icon files** and update manifest
5. **Audit all screens** for hardcoded colors → update to new palette
6. **Test on all screens** — ensure contrast and readability
7. **Deploy**

## Open Questions
1. Do you have the "fp" icon design ready, or should we generate it?
2. Should the warm off-white background be applied globally, or keep theme-switchable (light/dark)?
3. Any specific hex values you want to adjust from the palette above?
