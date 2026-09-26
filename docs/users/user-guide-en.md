# fampad — User Guide

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Your family's all-in-one organization hub</strong></p>

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Navigation Overview](#navigation-overview)
3. [Events & Calendar](#events--calendar)
4. [Chat](#chat)
5. [Quick Create Button (+)](#quick-create-button)
6. [AI Assistant](#ai-assistant)
7. [My Week](#my-week)
8. [Our Places (Modules)](#our-places-modules)
   - [Trips](#trips)
   - [Health](#health)
   - [School](#school)
   - [Kindergarten](#kindergarten)
   - [Birthdays](#birthdays)
   - [Pets](#pets)
   - [Meal Center](#meal-center)
   - [Our Homes](#our-homes)
   - [Shopping Lists](#shopping-lists)
9. [Voice & Photo Creation](#voice--photo-creation)
10. [Date Picker & Reminders](#date-picker--reminders)
11. [Profile & Settings](#profile--settings)
12. [Calendar Sync](#calendar-sync)
13. [Themes](#themes)
14. [Language Support](#language-support)
15. [PWA & Install](#pwa--install)
16. [Tips & Tricks](#tips--tricks)

---

## Getting Started

### Creating Your Account

1. Open fampad in your browser (or as an installed PWA)
2. Register with email and password — or log in if you already have an account
3. Choose a language in step 2 of the welcome wizard (Norwegian, Swedish, Danish, English, Finnish)
4. Create or join a family in step 3 — or skip and do it later in Profile

### Setting Up Your Family

After signing in, you need to either create or join a family:

**Option A: Create a new family**
1. Go to the **Profile** tab
2. Tap "Opprett familie" (Create family)
3. Enter your family name
4. You become the family **owner**

**Option B: Join an existing family**
1. Ask a family admin to generate an invite code (Profile > Family > "Inviter medlem")
2. Open the shared invite link, or enter the 6-character code
3. You join as a **member**

### Understanding Family Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full control. Can manage all members. Cannot leave the family. |
| **Admin** | Can invite, remove members and change roles. |
| **Member** | Can create and edit content. Cannot manage other members. |

---

## Navigation Overview

fampad uses a bottom tab bar with four tabs around a central "+" button.

| # | Tab | Icon | Description |
|---|-----|------|-------------|
| 1 | **Events** (Avtaler) | Calendar | Unified calendar from all family sources (manual events, Spond, health, pets, school/kindergarten, home, birthdays) |
| 2 | **Chat** | Bubble | Family messaging with images and reactions |
| 3 | **Our Places** (Våre steder) | House | Entry point to all modules |
| 4 | **Profile** | Person | Settings, family management, integrations |

The central **+** button opens the **Quick Create** menu. The tab bar hides automatically when you type in chat.

---

## Events & Calendar

The Events tab shows a unified calendar of all family activities.

### Viewing

- **List View**: Events grouped per day with a week-number banner
- **Calendar View**: Month grid with event dots — tap a day to see it
- Show/hide past events
- Filter by module and source (including Spond groups with logos)
- The "**My Week**" (Din uke) button at the top opens the weekly summary (see its section)

### Sources of Events

Events come from many sources and are color-coded by module:

| Source | Color |
|--------|-------|
| Manual events | #3b5a75 |
| Trips | #7EC8E3 |
| Health (appointments/medications/vaccinations) | #C67B5C |
| School activities & holidays | #6B8F71 |
| Kindergarten activities | #E8836A |
| Pets (vet visits/vaccinations) | #9B7DB8 |
| Birthdays | #E6A817 |
| Home (service appointments) | #6B7B8D |
| Meal slots (Meal center) | #E8906C |
| Spond events | Shown with group logo |

### Creating an Event

1. Tap **+** → "Manuelt" (Manual) → "Avtale" (Event)
2. Fill in:
   - **Title** (required)
   - **Date** and optional end date
   - **Time** and optional end time
   - **Address** (Google Places search)
   - **Icon** (20 predefined, e.g. Dinner, Birthday, Sport, Cinema, Training, Hiking)
   - **Persons** (select family members)
   - **Description** (optional notes)
   - **Reminder** (None, 30 min, 1 hour, 2 hours, 1 day, 1 week)
   - **Repeat** (schedule days/weeks, odd and even weeks — e.g. "every other week")
   - **Documents** (upload attachments)
3. Tap "Lagre" (Save)

### Event Details

Tap any event to see:
- Full date, time and location
- Static map + "Open in Google Maps" (when address exists)
- Notes, documents, icon and persons linked to the event
- "Add to Google/Outlook calendar" buttons (web)
- Edit/delete via long-press (ActionModal)
- Spond events: respondent status stamps (accepted/declined/unanswered, incl. children) and the ability to change your own response

### Spond Events

If you have connected Spond in your Profile settings:
- Spond events from your selected groups appear automatically
- You can see RSVP status for family members
- Tap an event for details and to change your own response
- Group logos are uploaded in Profile (custom logo per group)
- Spond sync runs automatically every 30 minutes

---

## Chat

The Chat tab provides real-time family messaging.

### Sending Messages

1. Type your message (max 500 characters)
2. Tap the send button

### Sharing Images

1. Tap the image icon next to the text field
2. Choose from the library or take a new photo
3. Preview the image
4. Send — the image uploads to Firebase Storage

### Reactions

- Tap the "+" button next to a message to open the reaction picker
- Available reactions: Like 👍, Smile 😊, Heart ❤️
- Counts are shown per reaction; tap a reaction badge to like/unlike
- Your own reactions are highlighted

### Features

- Real-time updates via Firestore
- Day separators ("Today" / "Yesterday") between message groups
- Avatars next to messages
- Latest 100 messages loaded, max 500 characters per message
- Other family members get a push notification (Cloud Function `notifyNewChatMessage`)
- Tap images for full-screen view
- The tab bar hides while the chat keyboard is active

---

## Quick Create Button

The central "+" button opens the Quick Create menu with two steps:

**Step 1: Choose method**
- ✏️ **Manual** — regular form
- 🎤 **Voice** — record your voice; AI converts it to an item in the chosen module
- 📷 **Photo** — take/pick from library; AI extracts data from the image

**Step 2: Choose module**
1. **Event** (manual calendar events)
2. **Health appointment**
3. **Vet visit**
4. **School activity**
5. **Kindergarten activity**
6. **Service appointment** (home)
7. **Trip**

The AI assistant row sits at the top of the Quick Create menu — see the next section.

---

## AI Assistant

The AI assistant is a conversation-based helper in the app (top of the Quick Create menu). It can:
- Answer questions (e.g. "What's happening on Wednesday?")
- Navigate you to screens (health, pets, school, kindergarten, home, events, trips)
- Perform actions after your confirmation (e.g. "Create a health appointment Tuesday at 10" → confirm → created)
- Via the microphone icon: record speech that is transcribed and sent to the assistant
- Correct answers: you can type a correction if the assistant answers incorrectly

---

## My Week

"My week" (Din uke) shows everything happening this week in one view.

### Opening It

1. Go to the **Events** tab
2. Tap the "Din uke" button at the top

### What It Shows

- Summary header with week number and date range
- Day card with weather for your home address
- Stat chips (counts of events, trips, school/kindergarten activities)
- Chronological agenda per day combining all sources: events, Spond, trips (incl. transport/hotels/restaurants), health appointments, medications, vaccinations, pet vet visits and vaccinations, school/kindergarten (activities and holidays), birthdays, home services and meal-plan slots

### Customizing

Under Profile → "My week" (Min uke):
- **Weekly menu**: show/hide the meal section in My week
- **Meal center settings** (Breakfast 🥞 / Lunch 🥪 / Dinner 🍽️) control which meals are shown and counted

---

## Our Places (Modules)

All modules are accessed from the **Our Places** tab. Each card shows an icon, name and item count.

| Module | Color |
|--------|-------|
| Trips | #7EC8E3 |
| Health | #C67B5C |
| School | #6B8F71 |
| Kindergarten | #E8836A |
| Birthdays | #E6A817 |
| Pets | #9B7DB8 |
| Meal Center | #E8906C |
| Our Homes | #6B7B8D |

### Trips

Plan and organize family trips:

- **Trip overview**: trips with city, country, dates, times and family members (required); trip cards show a static map and a weather chip per city
- **Weather**: 10-day forecast + hourly (morning/lunch/afternoon/evening/night) per day with temperature, UV index, rain chance, wind; historical averages for future trips; pagination and refresh
- **Currency converter**: live rates (Frankfurter API), country→currency auto-select, swap direction
- **Transport**: flights, trains, rental car, boat, ferry and taxi with a form per type (airport/terminal, flight number, booking number, seat, wagon, driver, reg. number) and departure/return tabs with a "One way" toggle; transport details support maps and carrier links (Norwegian, SAS, Vy, Hertz, etc.)
- **Hotels, restaurants, activities**: forms for date/time, address (Google Maps) and notes
- **Packing lists**: checkable packing lists, rename, copy list, delete
- **Documents**: upload and store trip documents
- **Useful links**: save links with favicon previews
- **Destination tips (AI)**: AI-generated tips per city (things to do, restaurants, local phrases, warnings)

**Transport form**: each transport type (fly/tog/bil/boat/ferry/taxi) uses a dual form with **Departure/Return** tabs and a "One way" toggle that hides the return form.

### Health

Keep track of the family's health:

- **Appointments**: date, time, doctor name, address/map, notes
  - **Person**: select family member (more than one can be selected)
  - **Reminders**: friendly labels (30 min, 1 hour, 2 hours, 1 day, 1 week)
- **Medications**: name, strength/dosage, frequency (1–4× daily) with separate times per slot and own reminder times per slot
- **Vaccinations**: date and next-due date
- **Allergies**: with severity (mild/moderate/severe)
- **Growth**: log height and weight over time
- Person selector: all items can be assigned to family members
- Documents can be uploaded
- Appointments with a location show a map that opens Google Maps
- Badges: "Today", "In N days"
- All new items push to the family (Cloud Function `notifyHealthItem`)
- Voice/photo creation also works for health appointments

### School

Organize school information per child:

- **Children**: add children with school name, grade, contact info
- **Year tabs**: create/edit/delete school years
- **Tiles**: Contacts, Schedule, Activities, Holidays
- **Contacts**: teachers, health staff (principal etc.), classmates with phone/email/parent info — direct call/email buttons
- **Schedule**: per semester, day/time/subject/teacher
- **Activities**: trip/activity/meeting with date range, reminder, documents, images and Google Calendar sync
- **Holidays**: manual, AI import from photo, or import from URL (the school's website)
- **AI import**: photo of a contact list or holiday list → AI extracts → select/deselect all → save
- Activities with repeat support group copying

### Kindergarten

Same feature set as School, but for kindergarten (children, contacts, schedule, activities, holidays, AI import).

### Birthdays

Never forget a birthday:

- **Birthday list**: name + date, with countdown ("Today" / "In N days") and age
- **Gift ideas**: per birthday — add gifts, check off purchased ones, see previous years' gifts
- **Notifications**: push 7 days before and on the day (at 08:00 local time)
- Max 50 birthdays

### Pets

Manage pet care:

- **Pets**: name, type (cat, dog, fish, bird, rabbit, tortoise, hamster, horse, other), gender, breed, birthday, ID number, passport, chip ID + chip date, photo
- **Vet visits**: date, veterinarian, location (map), reminder, documents
- **Medications**: name, dosage, frequency
- **Food**: amount/type
- **Grooming**: last done / next due
- **Vaccinations**: date + next-due date
- **Insurance**: provider, policy number, expiry date, document
- Voice/photo creation also works here

### Meal Center

Plan the family's meals with three sub-tabs:

- **Weekly menu**: menu Mon–Sun with breakfast/lunch/dinner slots from your profile; assign recipes to slots; navigate weeks; "Copy from last week"; "Back to current week"; random suggestions ("This week…")
- **Recipes**: collect recipes (max 200) with categories (favorites ❤️, chicken, meat, fish, vegetarian, pasta, casserole, soup, breakfast, dessert); search; AI recipe search in 22 languages; import from URL; photo→recipe (OCR); time/portions/variation/cuisine with country flags; automatic calorie estimation (AI) if not provided
- **Shopping list**: real-time checkable shopping list; copy, rename, delete — items can be added directly from a recipe (ingredients)

### Shopping Lists

- Create and manage checkable shopping lists (max 100)
- Items can be checked on/off
- Rename, copy, delete lists
- Items can be added directly from recipes in the Meal Center

### Our Homes

Manage homes and cabins:

- **Homes**: type (house, summer cabin, winter cabin, apartment), address (Google Places), postal number/place, description, photo, static map
- **Instructions**: "Coming home" and "Leaving home" sections with photo scanning (OCR extracts instruction text and color labels)
- **Maintenance service agreements**: date/time/frequency (once/monthly/quarterly/yearly), repeat (days/weeks), calendar sync + family push
- **Paint colors**: photo of label/wall → AI extracts name/code/hex; brand, room
- **Projects**: status (active/on hold/completed), budget (budget/spent/remaining), paint colors with OCR, internal shopping lists (name, quantity, unit price, totals), offers (vendor, price, receipt OCR), tasks (to do/in progress/done), "Connect to shopping list", AI suggestions for project tasks and project analysis

---

## Voice & Photo Creation

### Voice → Item

Create items by speaking:

1. Tap **+** → "Voice" → choose module
2. Tap the microphone to start recording
3. Speak naturally, e.g. "Meeting with the kindergarten on Wednesday at 2 PM"
4. Tap stop
5. AI transcribes and extracts: title, date (understands "tomorrow", "on Monday"), time (understands "half past two", "quarter past two"), description
6. Review and edit
7. Save — events are also added to the phone calendar and pushed to the family

Works for: Event, Health appointment, Vet visit, School activity, Kindergarten activity, Service appointment (home), Trip.

### Photo → Item

1. Tap **+** → "Photo" → choose module
2. Take a photo or pick from the library
3. AI extracts all visible items with titles, dates and times
4. Review, edit, select the ones you want to keep
5. Save one by one or all at once

### Photo → Recipe

1. Meal Center → camera icon
2. Photo of a recipe from a cookbook or screen
3. AI extracts name, ingredients with amounts, instructions
4. Save to your recipe book

---

## Date Picker & Reminders

### DatePickerModal

All date/time fields use a custom picker:

- **Scrollable list**: date suggestions (760 days) or times (30-minute intervals)
- **Search field**: type a date (YYYY-MM-DD) or time (HH:MM) to jump directly
- **Manual entry**: type any date — useful for historical dates (birthdays, past vaccinations)
- **Auto-scroll**: the list scrolls to the selected/typed date

### dateFrom/dateTo Auto-Sync

For activities with date ranges (school, kindergarten, health, vet):
- Changing **dateFrom** automatically updates **dateTo**
- **dateTo** is never set before **dateFrom**
- You can set a different end date manually

### Reminder Options

| Label | Minutes |
|-------|---------|
| None | 0 |
| 30 min | 30 |
| 1 hour | 60 |
| 2 hours | 120 |
| 1 day | 1440 |
| 1 week | 10080 |

Reminders are sent as phone notifications with friendly labels. Default: **1 hour**. Default time for new items: **10:00–11:00**.

Medications support separate times per dose (1–4× daily), with own reminder times per time slot.

---

## Profile & Settings

The Profile tab contains all personal and family settings.

### Personal

- **Name**: edit your display name
- **Phone**: add your phone number
- **Avatar**: upload a profile photo (used in chat)
- **Email**: (read-only)

### Family

- **Family card**: see members and roles
- **Invite member**: generate an invite code (valid 1 hour, one-time use) / share link
- **Change role**: promote/demote between admin and member (owner/admin)
- **Remove member** (owner/admin)
- **Leave family** (non-owners)
- **Create family** if you don't have one

### Calendar

- **Calendar type**: choose **phone calendar** or **Google Calendar**
- **Google connect**: OAuth connection ("Connected ✓") and disconnect
- **Google Sync panel**: Run/Dry-run with summary (scanned, created, skippedExists, recreated, failed, notConnected) and issue list
- **Phone calendar**: iOS (via expo-calendar) inserts events into the phone's calendar
- Web: "Add to Google/Outlook calendar" buttons per item

### Notifications

- Toggle push notifications on/off (permission is requested)
- Medication reminders per time slot, birthday reminders (7 days before + on the day, at 08:00 local time), activity reminders
- Web: shows a banner for reminders missed in the last 7 days (dismissible)

### My Week

- Show/hide the "Weekly menu" (meals) section in My week
- Meal center toggles: Breakfast 🥞 / Lunch 🥪 / Dinner 🍽️

### Meal Center settings

- Slot toggles: Breakfast 🥞 / Lunch 🥪 / Dinner 🍽️
- Controls the weekly menu and "My week"

### Spond (owner/admin)

1. Enter your Spond email and password (encrypted at rest)
2. Choose which groups to sync
3. Upload/select a logo per group (library or camera)
4. Choose who can respond ("respondents")
5. Spond events appear automatically in the calendar (sync every 30 minutes)
6. Disconnect the Spond account

### Theme

See the [Themes](#themes) section for details.

### Language

See the [Language Support](#language-support) section.

### App (web only)

- "Reload" — unregister service workers and clear cache to force an update

---

## Calendar Sync

fampad supports two-way calendar synchronization:

**Google Calendar (via Cloud Functions):** Events, trips, transport, medications, health appointments, vet visits, school/kindergarten activities, home service appointments — creation, update and deletion are synced automatically for users who have connected Google Calendar.

**Phone Calendar**: The iOS app can insert events directly into the phone's calendar (choose phone calendar in Profile). Web users get per-item "Add to Google/Outlook" buttons.

**Backfill**: Run a manual sync of existing data via the Google Sync panel (Dry-run shows what would happen).

---

## Themes

fampad offers flexible theming via Profile settings:

**Row 1 — Module colors** (changes the app accent to the module's color):
- School (#6B8F71), Kindergarten (#E8836A), Trips (#7EC8E3), Birthdays (#E6A817), Pets (#9B7DB8), Meals (#E8906C), Health (#C67B5C)

**Row 2 — App colors**:
- Slategray (#3b5a75), Dustyrose (#A37B85)

**Row 3 — Dark mode**:
- Dark (#333) toggle

Light/Dark/System follows the device's light/dark setting when "system" is selected. Your theme preference is saved and persists between sessions.

---

## Language Support

fampad supports 5 interface languages:

1. **Norwegian (Bokmål)** — default
2. **Swedish**
3. **Danish**
4. **English**
5. **Finnish**

### Changing Language

1. Go to Profile
2. Scroll to "Språk" (Language)
3. Select your language with the flag buttons
4. The entire interface updates immediately

### Recipe Search & Translation

- AI recipe search supports 17+ AI search languages and 22 languages in total (incl. the 5 interface languages)
- Recipes can be translated to all 5 languages (name, description, ingredients, instructions)

---

## PWA & Install

### Installing fampad

fampad is a Progressive Web App (PWA):

**iOS (Safari):**
1. Open fampad in Safari
2. Tap the Share button
3. "Add to Home Screen"
4. Confirm

**Android (Chrome):**
1. Open fampad in Chrome
2. Tap the three-dot menu
3. "Add to Home Screen"
4. Confirm

**Desktop:**
1. Look for the install icon in the address bar
2. Click to install

### Update Banner

When a new version is available, a banner appears ("New version available") — tap to load it. Checked every 5 minutes. Web: "Reload" in Profile clears cache/service workers manually.

---

## Tips & Tricks

### Quick Navigation

- Use the **+** button to quickly create events, health appointments, vet visits, activities, service appointments or trips
- Long-press items for the edit/delete menu
- Tap calendar days to see that day's events
- Use the AI assistant from the + menu for natural questions and actions

### Spond

- Connect Spond to see club events alongside family events
- Respond to invitations directly in the app (accept/decline), incl. for children
- See who is attending per event (stamp status)
- Spond logos are shown on events and in the filter panel

### Meal Planning

- Use AI suggestions to discover new recipes
- Import from URL or photo
- Generate a shopping list directly from recipe ingredients
- Plan the weekly menu with breakfast/lunch/dinner; "Copy from last week"
- Calories are estimated automatically by AI if not provided

### Trip Planning

- Weather: 10-day + hourly + historical data per city
- AI destination tips: things to do, restaurants, phrases, warnings
- Currency converter with live rates
- Transport with Departure/Return tabs and "One way" toggle
- Packing lists with checkboxes
- Spond logos are shown on events and in the filter panel

### Data Safety

- All data is stored privately per family (Firestore, familyId scoping)
- Only family members can see your data
- Invite codes expire after 1 hour and can only be used once
- You can leave a family at any time (removes your access)

---

*fampad v1.0.0 — Your family, organized.*
