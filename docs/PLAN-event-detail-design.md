# Event Detail Screen — Design Plan

## Agreed Design (v5 mockups)

### App Events
- **Left border**: Teal (#0097A7) — theme color
- **Calendar icon**: Date/day/month card (same as event cards)
- **Header**: Icon + title + badges (module color)
- **Detail card**: 📍 Location, 🔔 Reminder, 📝 Notat with "Les mer" expansion
- **Map card**: Actual map image, teal left border, opens Google Maps
- **Button box**: Rediger (primary) + Slett (danger) in white card with border

### Spond Events (v5 - Final)
- **Left border**: Red (#E53935)
- **Top box**: Calendar icon (date/day/month) + title + **times in bold** + Spond badge
- **Detail card**: 📍 Location + 👥 Spond group + 📝 Notat with "Les mer" expansion
- **Map card**: Actual map image, red left border, opens Google Maps
- **Din status box** (red border): ✓ Aksepter (green) + ✕ Avslå (red)
- **Svar fra alle** (red border): 12 Ja (green) + 3 Nei (red) + 1 Vent (gray)
- **No Rediger/Slett** — managed in Spond

### Health Events
- **Left border**: Red (#E53935)
- **Calendar icon**: Date/day/month card
- **Header**: ❤️ Helse badge
- **Detail card**: 📍 Location, 👤 Person
- **Map card**: Actual map image, red left border, opens Google Maps
- **Button box**: Rediger + Slett

### General Style
- All boxes (except button box) have borders
- White card background with rounded corners (14px)
- Consistent spacing (12px margins)
- Theme accent color for section headers

## Spond Detail — Current vs Target (Gap Analysis)

### Current implementation (SpondEventDetailScreen.tsx)
- Basic card: group logo + title
- Plain description text (no "Les mer")
- Detail rows: date, time, group, address
- Standard map (white background)
- Status section: names grouped by status
- Separate Aksepter/Avslå buttons

### Target (v5 plan)
1. **Top card** — Red left border (#E53935), calendar icon (day/month/weekday), title, **times in bold**, Spond badge
2. **Detail card** — Red left border, 📍 Location + 👥 Spond group + 📝 Notat with "Les mer" expansion
3. **Map card** — Red left border, red gradient background, opens Google Maps
4. **Din status box** — Red border, shows user's own response: ✓ Aksepter (green) / ✕ Avslå (red)
5. **Svar fra alle** — Red border, summary counters: X Ja (green) + X Nei (red) + X Vent (gray) with names
6. **No Rediger/Slett** — managed in Spond

### Changes needed
- Add `showFullNote` state (boolean) for Les mer toggle on notat
- Add calendar icon (reuse EventDetailScreen pattern with DAY_NAMES/MONTHS)
- Red left borders on all cards
- Move times into top card header (bold)
- Add Spond badge to top card
- Restructure detail card: Location + Group + Notat with Les mer
- Change map to red gradient
- Split status into "Din status" (own response) + "Svar fra alle" (counters + names)
- Move Aksepter/Avslå buttons into "Din status" box
- Remove old actionRow buttons below status

## Implementation Notes
- Reuse EventCard calendar icon component (DAY_NAMES/MONTHS pattern)
- Both screens use actual map images (getStaticMapUrl) with left borders (teal for app, red for Spond)
- Spond response: "Din status" shows current user's response, "Svar fra alle" shows all names
- No Rediger/Slett — managed in Spond
- Save all changes, commit, push before deployment
