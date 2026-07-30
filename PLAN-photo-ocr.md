# Plan: Photo OCR — Events & Recipes

## Overview
Upload a photo (gallery or camera) → AI extracts structured data → Preview screen → Confirm → Save.

## Architecture

### 1. New Cloud Function: `photoToData`
- Accepts: base64 image + `type` ("event" or "recipe")
- Uses GPT-4o vision API to extract structured data
- Returns: structured JSON matching Event or Recipe schema
- Pattern follows `voiceToEvent` (image instead of audio)

### 2. Image Picking (reuse existing pattern)
- Both camera and gallery options
- `expo-image-picker` with `base64: true`
- Same pattern as ChatScreen (lines 78-110)

### 3. Preview Components

**Events preview:** Modal similar to VoiceEventScreen preview:
- Shows extracted: title, date, time, address, description
- Three actions: "Opprett arrangement" / "Rediger manuelt" / "Avbryt"

**Recipes preview:** Modal with recipe form pre-filled:
- Shows extracted: name, description, ingredients, instructions, time, portions
- Two actions: "Lagre oppskrift" / "Avbryt"

### 4. Entry Points
- **Events screen:** New button "📷 Fra bilde" next to the voice button
- **Oppskrifter tab:** New button "📷 Fra bilde" in the add recipe area

## Files to Change
| File | Change |
|------|--------|
| `functions/index.js` | New `photoToData` Cloud Function |
| `src/screens/EventsScreen.tsx` | Add "Fra bilde" button + preview modal |
| `src/screens/MealPlanScreen.tsx` | Add "Fra bilde" button + preview modal |
| `src/types/index.ts` | No changes (Event/Recipe types already exist) |
| `src/i18n/*.json` | Add translations for new UI elements |

## Estimated Work
- Cloud Function: ~100 lines
- Events preview: ~80 lines
- Recipe preview: ~80 lines
- Entry points + translations: ~40 lines
- **Total: ~300 lines**

## Status
Saved for later implementation.
