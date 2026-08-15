# Event Detail Screen — Design Plan

## Agreed Design (v3 mockups)

### App Events
- **Left border**: Teal (#0097A7) — theme color
- **Calendar icon**: Date/day/month card (same as event cards)
- **Header**: Icon + title + badges (module color)
- **Detail card**: 📍 Location, 🔔 Reminder
- **Map card**: Clickable, opens Google Maps
- **Button box**: Rediger (primary) + Slett (danger) in white card with border

### Spond Events
- **Left border**: Red (#E53935)
- **Header**: Team logo + title + Spond badge + group badge
- **Detail card**: 📍 Location
- **Map card**: Red gradient, opens Google Maps
- **Spond card**: Response counts (Ja/Nei/Vent) with link to respondents
- **Button box**: Rediger + Slett

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
