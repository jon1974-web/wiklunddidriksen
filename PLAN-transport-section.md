# Transport Section Plan (Completed)

## Goal
Unified transport system with one-way support, pairing, and type-specific labels for all transport types.

## Transport Types
| Type | Icon | Form Fields | Pairing |
|------|------|-------------|---------|
| Fly | ✈️ | Departure/arrival airport, airline, flight number | utreise + hjemreise |
| Tog | 🚆 | Departure/arrival address, wagon | utreise + hjemreise |
| Bil | 🚗 | Address, driver | utreise + hjemreise |
| Ferje | ⛴️ | Departure/arrival terminal, cabin, car | utreise + hjemreise |
| Taxi | 🚕 | Departure/arrival address, driver | utreise + hjemreise |
| Båt/Cruise | 🚢 | Departure/arrival terminal, cabin, car | utreise + hjemreise |

## Features
- **One-way checkbox** on all transport types — hides return fields and return tile
- **Pairing** — utreise + hjemreise tiles sit side-by-side
- **Avreise/Hjemreise labels** on each tile with airport/terminal codes
- **Red border** on hjemreise tiles, blue on utreise
- **Blank record filtering** — empty records from old saves are filtered out
- **Orphan return flight removal** — unpaired hjemreise silently dropped

## Save Logic
Each transport type saves TWO documents (utreise + hjemreise) unless one-way is checked.
- `type: 'utreise'` or `type: 'hjemreise'`
- `isOneWay: true` — only utreise document created

## Files Modified
- `TripDetailScreen.tsx` — save handlers, pairing logic, rendering
- `TransportFormModal.tsx` — one-way checkbox, direction toggle
- `TransportTile.tsx` — type labels, airport codes, red/blue borders
- `TransportItemTile.tsx` — type labels, red/blue borders for ferje/taxi/båt
- All 5 i18n files — translation keys for `departureAirport`, `arrivalAirport`, `oneWay`, `returnTrip`
