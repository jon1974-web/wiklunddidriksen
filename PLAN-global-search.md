# Global Search — Plan

## Purpose
Search across all spaces and modules from one place. Users can find information instantly without switching between sections.

## Search Scope

| Space/Module | Searchable Fields |
|-------------|-------------------|
| Reiser | trip titles, cities, transport details, hotels, restaurants, activities, documents |
| Helse | medication names, doctor names, appointment notes, allergies, vaccination names |
| Skole | homework titles, teacher names, meeting notes, class contacts |
| Bursdager | names, gift ideas, purchase notes |
| Kjæledyr | pet names, vet names, medication names, food brands |
| Hjem | appliance names, room names, paint colors, warranty notes, measurements |
| Events | event titles, descriptions, locations |
| Mat | recipe names, ingredients, categories |
| Chat | message content, sender names |

## UI Design
- Search icon in the app header (magnifying glass)
- Full-screen search overlay when tapped
- Instant search as user types (debounced 300ms)
- Results grouped by space/module with section headers
- Each result shows: icon, title, subtitle, space badge
- Tap result → navigate to the specific item/screen
- Recent searches saved locally
- Empty state: "Søk i hele appen..." (Search the entire app...)

## Architecture

### Phase 1: Client-side Search (Initial)
- Load all items from Firestore for the family
- Filter client-side by matching search query against searchable fields
- Fine for families with < 1000 items total
- Simple to implement, no additional services needed

### Phase 2: Server-side Search (Future, if needed)
- Algolia or Typesense for full-text search
- Firestore triggers to sync data to search index
- Required only if data grows beyond client-side performance

## Data Model
Each space item should have consistent searchable fields:

```typescript
interface SearchableItem {
  id: string;
  space: 'trips' | 'health' | 'school' | 'birthdays' | 'pets' | 'home' | 'events' | 'recipes' | 'chat';
  title: string;          // Primary display text
  subtitle?: string;      // Secondary text
  searchText: string;     // Combined searchable content (lowercase)
  route: string;          // Navigation route to open this item
  params: object;         // Navigation params
  icon: string;           // Display icon
  timestamp: number;      // For sorting by recency
}
```

## Implementation Notes
- Search should work offline with cached data
- Results should be ranked by relevance (exact match > partial match > fuzzy)
- Recent searches stored in AsyncStorage (max 20)
- Search history can be cleared from settings
- No search indexing needed for Phase 1 — just client-side filtering

## Files to Create/Modify
- `src/components/GlobalSearch.tsx` — Search overlay component
- `src/services/searchService.ts` — Search logic and indexing
- `src/types/index.ts` — SearchableItem type
- `src/screens/SpacesScreen.tsx` — Add search icon to header
- All translation files — Search-related strings
