# Language Architecture + Recipe Translation

## Goal
Centralize all language configuration into a single source of truth, and add recipe translation at save time.

## Part 1: Language Constants

### New file: `src/constants/languages.ts`
- `LANGUAGES` array with all config (code, aiName, englishName, flag, label, locale, defaultCurrency, devicePrefix)
- Helper functions: `getLanguageByCode()`, `getLocale()`, `getDefaultCurrency()`, `getLanguageCode()`

### Refactor targets
| File | Change |
|---|---|
| `src/i18n/index.ts` | Derive imports, validation, device detection from LANGUAGES |
| `ProfileScreen.tsx` | Replace hardcoded array with LANGUAGES.map() |
| `MealPlanScreen.tsx` | Replace 3 arrays + 2 ternary chains with LANGUAGES lookups |
| `constants/currencies.ts` | Use `getDefaultCurrency()` from languages |
| `constants/limits.ts` | Make `LOCALE` dynamic via `getLocale(i18n.language)` |
| 11+ files with `'nb-NO'` | Replace with `getLocale(i18n.language)` |

### Adding a new language after this
1. Add 1 entry to `LANGUAGES` array
2. Create `src/i18n/xx.json` (copy + translate)

## Part 2: Recipe Translation

### New Cloud Function: `translateRecipe`
- Input: recipe fields + source language
- Translates to all other languages via OpenAI gpt-4o-mini
- Stores in `translations` field on recipe document
- Fire-and-forget (non-blocking)

### Recipe type update
```typescript
translations?: {
  [lang: string]: {
    name: string;
    description: string;
    ingredients: RecipeIngredient[];
    instructions: string[];
  };
};
```

### UI update
- Helper: `getTranslated(recipe, field, lang)` with fallback to original
- Apply to MealPlanScreen recipe cards and RecipeDetailScreen

## Estimated work
- Language constants: ~80 lines
- Refactors: ~200 lines across ~15 files
- Recipe translation: ~130 lines (Cloud Function + UI)
- **Total: ~410 lines**
