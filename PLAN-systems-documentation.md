# Systems Documentation

## Architecture Overview

### Firebase Services
- **Authentication**: Firebase Auth (email/password)
- **Database**: Cloud Firestore (NoSQL)
- **Storage**: Firebase Storage (files, images)
- **Hosting**: Firebase Hosting (web app)
- **Functions**: Cloud Functions (serverless backend)
- **Messaging**: Firebase Cloud Messaging (push notifications)

### Data Model

**Top-level Collections:**
- `users/{uid}` — User profiles
- `families/{familyId}` — Family data with members map
- `events/{eventId}` — Family events
- `chat/{messageId}` — Chat messages
- `shoppingLists/{listId}` — Shopping lists
- `trips/{tripId}` — Trip data + 7 subcollections
- `birthdays/{birthdayId}` — Birthday records
- `gifts/{giftId}` — Gift ideas
- `pets/{petId}` — Pet profiles
- `petVetVisits/{visitId}` — Vet visit records
- `petMedications/{medId}` — Pet medications
- `petFood/{foodId}` — Pet feeding schedules
- `petGrooming/{groomId}` — Grooming records
- `petVaccinations/{vaccId}` — Pet vaccinations
- `petInsurance/{insId}` — Pet insurance
- `recipes/{recipeId}` — Family recipes
- `mealPlans/{planId}` — Weekly meal plans
- `spondResponses/{responseId}` — Spond RSVP responses
- `health/{familyId}/{subcollection}` — Health data (medications, appointments, etc.)
- `sentNotifications/{eventId}` — Notification deduplication

### Cloud Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `notifyNewEvent` | HTTP | Send push notifications for new events |
| `notifyHealthItem` | HTTP | Send push notifications for health items |
| `checkReminders` | Schedule | Check and send event reminders |
| `checkBirthdayReminders` | Schedule | Check and send birthday reminders |
| `createFamily` | HTTP | Create new family |
| `generateInviteCode` | HTTP | Generate invite codes |
| `joinFamilyByInviteCode` | HTTP | Join family via invite code |
| `leaveFamily` | HTTP | Leave a family |
| `removeFamilyMember` | HTTP | Remove member from family |
| `updateMemberRole` | HTTP | Change member role |
| `spondProxy` | HTTP | Proxy Spond API calls |
| `voiceToEvent` | HTTP | Transcribe voice to event |
| `photoToData` | HTTP | Extract data from photos |
| `destinationTips` | HTTP | AI-generated destination tips |
| `aiRecipeSuggestions` | HTTP | AI recipe suggestions |
| `importRecipeFromUrl` | HTTP | Import recipe from URL |
| `translateRecipe` | HTTP | Translate recipe to other languages |
| `migrateTransportData` | HTTP | Migrate old transport data |

### Third-Party Integrations
- **Spond**: Team management (via spondProxy Cloud Function)
- **OpenAI**: AI features (recipe suggestions, destination tips, voice transcription)
- **Google Maps**: Static maps, geocoding, places autocomplete
- **Firebase Cloud Messaging**: Push notifications

### Environment Variables
- `OPENAI_API_KEY` — OpenAI API key
- `GOOGLE_MAPS_API_KEY` — Google Maps API key (client-side)
- Firebase config (auto-configured)

### Deployment
- Web: `npx expo export --platform web --output-dir dist/web && npx firebase-tools deploy --only hosting`
- Functions: `npx firebase-tools deploy --only functions`
- Rules: `npx firebase-tools deploy --only firestore:rules`
- Indexes: `npx firebase-tools deploy --only firestore:indexes`
