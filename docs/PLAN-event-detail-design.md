# Event Detail Screen — Design Plan

## Agreed Design (v5 mockups)

### App Events
- **Left border**: Teal (#0097A7) — theme color
- **Calendar icon**: Date/day/month card (same as event cards)
- **Header**: Icon + title + badges (module color)
- **Detail card**: 📍 Location, 🔔 Reminder
- **Map card**: Clickable, opens Google Maps
- **Button box**: Rediger (primary) + Slett (danger) in white card with border

### Spond Events (v5 - Final)
- **Left border**: Red (#E53935)
- **Top box**: Calendar icon (date/day/month) + title + **times in bold** + Spond badge
- **Detail card**: 📍 Location + 👥 Spond group + 📝 Notat with "Les mer" expansion
- **Map card**: Red gradient, opens Google Maps
- **Din status box** (red border): ✓ Aksepter (green) + ✕ Avslå (red)
- **Svar fra alle** (red border): 12 Ja (green) + 3 Nei (red) + 1 Vent (gray)
- **No Rediger/Slett** — managed in Spond

### Health Events
- **Left border**: Red (#E53935)
- **Calendar icon**: Date/day/month card
- **Header**: ❤️ Helse badge
- **Detail card**: 📍 Location, 👤 Person
- **Map card**: Pink gradient, opens Google Maps
- **Button box**: Rediger + Slett

### General Style
- All boxes (except button box) have borders
- White card background with rounded corners (14px)
- Consistent spacing (12px margins)
- Theme accent color for section headers

## Implementation Notes
- Reuse EventCard calendar icon component
- Map uses getStaticMapUrl / getGoogleMapsUrl utilities
- Spond response section needs toggle for respondents list
- Remove old "Add to calendar", "Kopier", "Avbryt" buttons
