# Currency Converter Plan

## Goal
Add a currency converter below the weather section in TripDetailScreen, pre-filled with user's home currency (from language) and trip's country currency.

## Data Model

### Country-to-Currency Mapping
Since `trip.country` is free-text (often in Norwegian), use a lookup table:

| Country (no) | Country (en) | Currency | Symbol |
|---|---|---|---|
| Norge | Norway | NOK | kr |
| Sverige | Sweden | SEK | kr |
| Danmark | Denmark | DKK | kr |
| Finland | Finland | EUR | € |
| Spania | Spain | EUR | € |
| Kroatia | Croatia | EUR | € |
| Frankrike | France | EUR | € |
| Tyskland | Germany | EUR | € |
| Storbritannia | UK | GBP | £ |
| USA | USA | USD | $ |
| Thailand | Thailand | THB | ฿ |
| Island | Iceland | ISK | kr |
| Sveits | Switzerland | CHF | CHF |
| Japan | Japan | JPY | ¥ |
| Australia | Australia | AUD | A$ |
| Canada | Canada | CAD | C$ |
| New Zealand | New Zealand | NZD | NZ$ |
| Polen | Poland | PLN | zł |
| Tsjekkia | Czech Republic | CZK | Kč |
| Ungarn | Hungary | HUF | Ft |
| Tyrkia | Turkey | TRY | ₺ |
| Brasil | Brazil | BRL | R$ |
| India | India | INR | ₹ |
| Kina | China | CNY | ¥ |
| Sør-Korea | South Korea | KRW | ₩ |
| Indonesia | Indonesia | IDR | Rp |
| Mexico | Mexico | MXN | MX$ |
| Singapore | Singapore | SGD | S$ |
| Hong Kong | Hong Kong | HKD | HK$ |
| Taiwan | Taiwan | TWD | NT$ |
| Malaysia | Malaysia | MYR | RM |
| Filippinene | Philippines | PHP | ₱ |
| Vietnam | Vietnam | VND | ₫ |
| Egypt | Egypt | EGP | E£ |
| Sør-Afrika | South Africa | ZAR | R |
| Russland | Russia | RUB | ₽ |
| UAE | UAE | AED | د.إ |
| Israel | Israel | ILS | ₪ |
| Saudi-Arabia | Saudi Arabia | SAR | SAR |
| Chile | Chile | CLP | CL$ |
| Colombia | Colombia | COP | COL$ |
| Peru | Peru | PEN | S/ |
| Argentina | Argentina | ARS | AR$ |
| Marokko | Morocco | MAD | MAD |
| Kenya | Kenya | KES | KSh |

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
│  Fra: [ NOK 🇳🇴 ▼ ]   ↕   Til: [ EUR 🇪🇸 ▼ ] │
│                                      │
│  100,00 NOK = 8,72 EUR              │
│  Kurs: 1 NOK = 0.0872 EUR           │
│  Kilde: ECB (oppdatert 22.07.2026)  │
└──────────────────────────────────────┘
```

## API
- **Frankfurter** (`api.frankfurter.app/latest?from=NOK&to=EUR`)
- Free, no API key, ECB data, updated daily
- Cache: 30 minutes (same pattern as weatherService)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/constants/currencies.ts` | **Create** | Country→currency mapping, language→currency mapping |
| `src/services/currencyService.ts` | **Create** | Fetch exchange rates with caching |
| `src/components/CurrencyConverter.tsx` | **Create** | UI component |
| `src/screens/TripDetailScreen.tsx` | Modify | Render after weather section (line 947) |
| `src/i18n/{nb,en,sv,da,fi}.json` | Modify | Add `currency.*` keys |
| `mockup-currency.html` | **Create** | Preview mockup |
