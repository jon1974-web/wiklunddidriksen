# Meal Planner Feature Plan

## Goal
Replace the "Handleliste" tab with a full "Matplan" (Meal Planner) feature that includes weekly meal planning, recipe management, shopping list, and a "What should we eat tonight?" randomizer.

## Tab Change
- **Old:** 🛒 "Handleliste"
- **New:** 🍽️ "Matplan"

## Screen Structure
Main screen with 3 sub-tabs at top: **Ukemeny** | **Oppskrifter** | **Handleliste**

## Section 1: Ukemeny (Weekly Meal Planner)

### Features
- Shows current week (Mon–Sun) with day slots
- Each day has slots for Lunsj and Middag
- Tap a slot → pick from recipe book or add new
- "Hva skal vi ha til middag?" randomizer card at top
- Quick shopping list summary at bottom

### Randomizer
- "Hva skal vi ha til middag?" card
- Pulls from favorites and common Norwegian dishes
- Shows random dish with option to add to meal plan
- Could use AI for personalized suggestions

### UI Layout
```
┌──────────────────────────────────────┐
│ 🍽️ Matplan                          │
│                                      │
│ [Ukemeny] [Oppskrifter] [Handleliste]│
│ ──────────────────────────────────── │
│                                      │
│ 🎲 Hva skal vi ha til middag?       │
│ ┌──────────────────────────────┐    │
│ │ 🎲 Tilfeldig rett            │    │
│ │ └── 🍝 Spaghetti Bolognese  │    │
│ └──────────────────────────────┘    │
│                                      │
│ 📅 Uke 30 (21.–27. juli)           │
│ Man: 🥗 Salat · 🍝 Bolognese       │
│ Tir: ＋ Lunsj · 🐟 Laks            │
│ Ons: 🌮 Tacos · 🍛 Korma           │
│ Tor: ＋ Lunsj · ＋ Middag          │
│ Fre: 🍕 Pizza · 🍔 Hamburgere      │
│ Lør: ＋ Lunsj · 🍛 Indisk          │
│ Søn: 🥗 Salat · 🍕 Pizza           │
│                                      │
│ 🛒 Handleliste denne uken (12 varer)│
└──────────────────────────────────────┘
```

## Section 2: Oppskrifter (Recipe Book)

### Features
- Grid view of recipes with emoji placeholders (no images yet)
- Filters: Alle, Favoritter, Kjøtt, Fisk, Vegetar, Pasta, Søtt
- Search bar at top
- Search flow: Search book → If not found → "Søk med AI" button
- Favorites with ❤️
- Recipe detail: ingredients + step-by-step instructions
- Add recipe: Manual entry, URL import, or AI suggest

### Add Recipe Methods
1. **Manual entry** — name, ingredients, instructions, time, portions, category
2. **URL import** — paste link, extract recipe data
3. **AI suggest** — describe what you want, AI generates recipe

### UI Layout
```
┌──────────────────────────────────────┐
│ 📖 Oppskrifter                   +   │
│                                      │
│ 🔍 Søk oppskrifter...              │
│                                      │
│ [Alle] [❤️] [🥩] [🐟] [🥗] [🍝]  │
│                                      │
│ ┌─────────┐ ┌─────────┐            │
│ │ 🍝      │ │ 🐟      │            │
│ │ Spag.   │ │ Laks    │            │
│ │ 30min   │ │ 25min   │            │
│ └─────────┘ └─────────┘            │
│ ┌─────────┐ ┌─────────┐            │
│ │ 🥘      │ │ 🌮      │            │
│ │ Gryte   │ │ Taco    │            │
│ │ 45min   │ │ 20min   │            │
│ └─────────┘ └─────────┘            │
└──────────────────────────────────────┘
```

## Section 3: Handleliste (Shopping List)

### Features
- **Keep existing screen** — always available for manual shopping
- Auto-generated section: "Denne ukens handleliste" (from meal plan)
- Manual section: "Egen handleliste" (custom items)
- "Legg til handleliste" button on every recipe

### UI Layout
```
┌──────────────────────────────────────┐
│ 🛒 Handlelister                  +   │
│                                      │
│ 🛒 Denne ukens handleliste          │
│ (auto-generert fra matplanen)       │
│ ┌──────────────────────────────┐    │
│ │ ✓ Kyllingbryst (1kg)         │    │
│ │   Spaghetti (500g)           │    │
│ │   Laks (600g)                │    │
│ └──────────────────────────────┘    │
│                                      │
│ 🛒 Egen handleliste                 │
│ ┌──────────────────────────────┐    │
│ │ + Legg til vare...           │    │
│ │   Melk (1L)                  │    │
│ │   Brød                       │    │
│ └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

## Search → Recipe → Shopping List Flow

### Scenario 1: User knows what they want
```
Search "Taco" → Search book first → Found → View recipe → Add to plan/list
```

### Scenario 2: User doesn't know what to cook
```
Tap "Tilfeldig" → Random suggestion → View recipe → Add to plan/list
```

### Scenario 3: AI helps
```
Tap "AI-forslag" → Describe ingredients → AI suggests → Save to book → Add to plan/list
```

### Scenario 4: Import from web
```
Paste URL → Extract recipe → Save to book → Add to plan/list
```

### Search Flow
```
User types "Taco" → Search book first → Found? Show results
  → Not found? Show "Ingen treff" + "Søk med AI?" button
  → User taps AI → AI generates recipe → Save to book
```

## Data Model

### Firestore Collections

**recipes/{recipeId}**
```typescript
{
  name: string;
  description: string;
  ingredients: { name: string; amount: string; unit: string }[];
  instructions: string[];
  time: number;           // minutes
  portions: number;
  category: string;       // 'kjoett', 'fisk', 'vegetar', 'pasta', 'sott', etc.
  isFavorite: boolean;
  createdBy: string;      // user uid
  familyId: string;
  createdAt: number;
}
```

**mealPlans/{planId}**
```typescript
{
  weekStart: string;      // 'YYYY-MM-DD' (Monday of the week)
  meals: {
    mon: { lunsj?: string; middag?: string };  // recipe IDs
    tue: { lunsj?: string; middag?: string };
    wed: { lunsj?: string; middag?: string };
    thu: { lunsj?: string; middag?: string };
    fri: { lunsj?: string; middag?: string };
    sat: { lunsj?: string; middag?: string };
    sun: { lunsj?: string; middag?: string };
  };
  familyId: string;
  createdBy: string;
}
```

## Section 4: Min uke Integration

### Placement
Right after the Bursdager section, before events/trips/spond items.

### Display Format (Compact)
```
🍽️ Denne uken: 5/14 måltider planlagt
┌──────────────────────────────────────┐
│ Man  🥗 Salat · 🍝 Bolognese       │
│ Tir  🐟 Laks                        │
│ Ons  🌮 Tacos · 🍛 Korma           │
│ Tor  —                              │
│ Fre  🍕 Pizza · 🍔 Hamburgere       │
│ Lør  🍛 Indisk korma               │
│ Søn  🥗 Salat · 🍕 Pizza           │
└──────────────────────────────────────┘
```

### Interactions
- **Tap a day** → Opens Matplan Ukemeny for that day
- **Tap a meal** → Opens recipe detail
- **Empty days** show "—" with "+" to add
- **Progress indicator**: "5/14 måltider planlagt"

### Why This Works
- Stays scannable (compact emoji format)
- Interactive (tap for detail)
- Shows progress (planned vs total)
- Doesn't flood with recipe details

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/screens/MealPlanScreen.tsx` | **Create** | Main screen with sub-tabs |
| `src/screens/RecipeDetailScreen.tsx` | **Create** | Recipe view |
| `src/screens/RecipeFormScreen.tsx` | **Create** | Add/edit recipe |
| `src/components/WeeklySummary.tsx` | Modify | Add compact meal section after birthdays |
| `src/types/index.ts` | Modify | Add Recipe, MealPlan types |
| `src/constants/limits.ts` | Modify | Add MAX_RECIPES |
| `src/i18n/{nb,en,sv,da,fi}.json` | Modify | Add mealPlanner.* keys |
| `App.tsx` | Modify | Replace ShoppingStack, change tab |
| `firestore.rules` | Modify | Add recipes, mealPlans |
| `firestore.indexes.json` | Modify | Add indexes |

## Translations (all 5 languages)
All new text must be added to nb.json, en.json, sv.json, da.json, fi.json.

## Themes
Must use theme tokens (colors.surface, colors.accent, etc.) — works with all 8 themes.

## Mockups
1. `mockup-meal-planner.html` — Ukemeny, Oppskrifter, Handleliste, Recipe Detail

## Recipe Detail Enhancements (Planned)

### Add to Weekday from Recipe Detail
When viewing a recipe, add a "📅 Legg til i ukeplan" button that lets you assign the recipe to a specific day and meal directly.

**Flow:**
```
Open recipe → Tap "📅 Legg til i ukeplan"
→ Pick day (Man-Søn) + meal (Lunsj/Middag)
→ Recipe assigned to that slot
```

**UI:**
- Button on recipe detail modal: "📅 Legg til i ukeplan"
- Opens a picker with day + meal selection
- Saves directly to mealPlan document
- Shows confirmation after assignment

**Benefits:**
- Faster workflow — no need to go back to Ukemeny to assign
- Works from both recipe detail modal AND recipe book
- Complements existing flow (assigning from day slots)
