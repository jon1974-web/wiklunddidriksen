# Currency Converter Plan

## Goal
Add a currency converter below the weather section in TripDetailScreen, pre-filled with the trip's destination currency (from) and the user's home currency (to).

## Decisions
- **Storage:** In code (constants file) — static reference data, no Firestore needed
- **Default currencies:** From = destination (trip country), To = home (user language)
- **Fallback:** Manual currency selector if country not found in mapping
- **API:** Frankfurter (free, no key, ECB data)

## Data Model

### Country-to-Currency Mapping (Multi-language, in code)
All 5 supported languages mapped for each country. Example for Croatia:
```typescript
'kroatia': { code: 'EUR', name: 'Euro', flag: '🇪🇺' },   // Norwegian
'kroatien': { code: 'EUR', name: 'Euro', flag: '🇪🇺' },  // Swedish/Danish
'croatia': { code: 'EUR', name: 'Euro', flag: '🇪🇺' },   // English
'hrvatska': { code: 'EUR', name: 'Euro', flag: '🇪🇺' },  // Croatian (local)
```

~50 common travel countries × ~3-5 language variants each = ~200 entries.

### Language-to-Currency (Home currency)
| Language | Currency | Symbol |
|---|---|---|
| `nb` | NOK | kr |
| `sv` | SEK | kr |
| `da` | DKK | kr |
| `en` | GBP | £ |
| `fi` | EUR | € |

## UI Design

```
┌──────────────────────────────────────┐
│ 💱 Valutakurs                        │
│                                      │
│  Beløp: [  100  ]                   │
│                                      │
│  Fra: [ EUR 🇪🇸 ▼ ]   ↕   Til: [ NOK 🇳🇴 ▼ ] │
│                                      │
│  100,00 EUR = 1 147,00 NOK          │
│  Kurs: 1 EUR = 11,47 NOK            │
│  Kilde: ECB (oppdatert 22.07.2026)  │
└──────────────────────────────────────┘
```

- **From:** Destination currency (auto-detected from trip country)
- **To:** Home currency (auto-detected from user language)
- **Swap button (⇄)** to flip currencies
- **Quick amounts:** 50, 100, 500, 1000

## API
- **Frankfurter** (`api.frankfurter.app/latest?from=EUR&to=NOK`)
- Free, no API key, ECB data, updated daily
- Cache: 30 minutes (same pattern as weatherService.ts)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/constants/currencies.ts` | **Create** | Multi-language country→currency mapping, language→currency mapping |
| `src/services/currencyService.ts` | **Create** | Fetch exchange rates with 30-min cache |
| `src/components/CurrencyConverter.tsx` | **Create** | UI component (amount input, dropdowns, swap, result) |
| `src/screens/TripDetailScreen.tsx` | Modify | Render CurrencyConverter after weather section (line 947) |
| `src/i18n/{nb,en,sv,da,fi}.json` | Modify | Add `currency.*` translation keys |

## Mockup
- `mockup-currency.html` — interactive preview (already exists)
