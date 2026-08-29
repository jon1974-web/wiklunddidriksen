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
5. [Quick Create Button](#quick-create-button)
6. [Weekly Summary ("Min uke")](#weekly-summary-min-uke)
7. [Spaces (Modules)](#spaces-modules)
   - [Trips & Travel](#trips--travel)
   - [Health](#health)
   - [Pets](#pets)
   - [School](#school)
   - [Kindergarten](#kindergarten)
   - [Birthdays](#birthdays)
   - [Meal Plan](#meal-plan)
   - [Shopping Lists](#shopping-lists)
8. [Voice & Photo to Event/Activity](#voice--photo-to-eventactivity)
9. [DatePicker & Reminders](#datepicker--reminders)
10. [Profile & Settings](#profile--settings)
11. [Themes](#themes)
12. [Language Support](#language-support)
13. [PWA & Install](#pwa--install)
14. [Tips & Tricks](#tips--tricks)

---

## Getting Started

### Creating Your Account

1. Open fampad in your browser or install it as a PWA
2. Enter your email and password to sign up
3. You will be automatically placed in a new account

### Setting Up Your Family

After signing in, you need to either create or join a family:

**Option A: Create a new family**
1. Go to the **Profile** tab
2. Tap "Opprett familie" (Create family)
3. Enter your family name
4. You become the **Owner** of the family

**Option B: Join an existing family**
1. Ask a family admin to generate an invite code (Profile > Family section > "Inviter medlem")
2. Enter the 6-character code in the Profile screen
3. You join as a **Member**

### Understanding Family Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full control. Can manage all members, create/delete the family. Cannot leave. |
| **Admin** | Can invite members, remove members, change roles. |
| **Member** | Can create and edit content. Cannot manage other members. |

---

## Navigation Overview

fampad uses a bottom tab bar with tabs positioned symmetrically around a central "+" button. Chat and Our Places are positioned between the other tabs and the center plus button.

| Tab | Icon | Description |
|-----|------|-------------|
| **Calendar** | Calendar | Events from all sources (manual, Spond, health, pets) |
| **Chat** | Chat bubble | Family messaging with images and reactions |
| **Our Places** | Compass/House | Spaces hub — access all modules |
| **Profile** | Person | Settings, family management, integrations |

The **+ (plus)** button in the center of the tab bar opens the **Quick Create** modal for fast content creation.

---

## Events & Calendar

The Events tab shows a unified calendar of all family activities.

### Viewing Events

- **List View**: Events are grouped by date with a scrollable list
- **Calendar View**: Monthly calendar grid showing event dots on each day
- Tap the calendar icon to switch between list and calendar view

### Sources of Events

Events come from multiple sources and are color-coded:
- **Manual events** you create (green)
- **Spond events** from your sports club (red)
- **Health appointments** (#C67B5C)
- **Pet vet visits** (#9B7DB8)
- **School activities** (#6B8F71)
- **Kindergarten activities** (#E8836A)
- **Trips** with start/end dates (#7EC8E3)

### Creating an Event

1. Tap the **+** button in the tab bar
2. Select "Manuelt" (Manual) in the Events section
3. Fill in the details:
   - **Title** (required)
   - **Date** and optional end date
   - **Time** and optional end time
   - **Address** (Google Places search)
   - **Description** (optional notes)
   - **Reminder** (None, 30 min, 1 hour, 2 hours, 1 day, 1 week)
   - **Document upload** (optional)
4. Tap "Lagre" (Save)

### Spond Events

If you have connected Spond in your Profile settings:
- Spond events from your selected groups appear automatically
- You can see RSVP status (accepted/declined/unanswered) for family members
- Tap a Spond event to view details and change your response

### Event Details

Tap any event to see:
- Full date, time, and location
- A static map showing the location
- Description and notes
- RSVP status (for Spond events)
- Uploaded documents
- Edit and delete options (long-press for action menu)

---

## Chat

The Chat tab provides family messaging with rich features.

### Sending Messages

1. Type your message in the text input
2. Tap the send arrow to post

### Sharing Images

1. Tap the image icon next to the text input
2. Choose to pick from gallery or take a photo
3. Preview the image
4. Tap send — the image uploads to Firebase Storage

### Reactions

- Long-press a message to add a reaction
- Available reactions: Like, Smile, Heart
- Your reactions appear below the message

### Features

- Real-time updates via Firestore listeners
- Messages scroll automatically to the bottom
- User avatars are displayed next to messages
- Images are shown inline with tap-to-expand

---

## Quick Create Button

The **+** button in the center of the tab bar opens a modal with quick-create shortcuts organized by module. Each module offers three creation methods: **Manuelt** (manual form), **Tale** (voice recording), and **Foto** (photo recognition).

### Events Section
- **Manuelt** — Create a new manual event
- **Tale** — Voice-to-event: record speech, AI converts to event
- **Foto** — Photo-to-event: snap a photo of a schedule, AI extracts events

### Health Section
- **Manuelt** — Create a new health appointment
- **Tale** — Voice-to-activity: record speech, AI creates health appointment
- **Foto** — Photo-to-activity: snap a photo, AI creates health appointment

### Pets Section
- **Manuelt** — Schedule a vet visit
- **Tale** — Voice-to-activity: record speech, AI creates vet visit
- **Foto** — Photo-to-activity: snap a photo, AI creates vet visit

### School Section
- **Manuelt** — Create a new school activity (trip/activity/meeting)
- **Tale** — Voice-to-activity: record speech, AI creates school activity
- **Foto** — Photo-to-activity: snap a photo, AI creates school activity

### Kindergarten Section
- **Manuelt** — Create a new kindergarten activity
- **Tale** — Voice-to-activity: record speech, AI creates kindergarten activity
- **Foto** — Photo-to-activity: snap a photo, AI creates kindergarten activity

### Trips Section
- **Manuelt** — Create a new trip

---

## Weekly Summary ("Min uke")

The Weekly Summary shows everything happening this week in one view.

### Accessing It

1. Go to the **Events** (Calendar) tab
2. Tap the "Min uke" (My week) button at the top

### What's Included

The weekly summary shows the current week (Monday through Sunday) with:

- **Summary header**: Week number and date range
- **Daily timeline**: Each day shows all activities chronologically
- **Stat chips**: Quick counts of events, trips, and other items
- **Color-coded items**: Each source has its own color

### Sections

| Section | Content |
|---------|---------|
| **Events** | Manual events for the week |
| **Spond** | Sports club events with RSVP status |
| **Trips** | Active trips (transport, hotels, restaurants) |
| **Health** | Health appointments and medications |
| **Pets** | Pet vet visits and vaccinations |
| **School** | School activities (trip, activity, meeting) |
| **Kindergarten** | Kindergarten activities |
| **Birthdays** | Upcoming birthdays |
| **Dinners** | Weekly meal plan (breakfast, lunch, dinner) |

### Customizing Sections

You can show/hide sections in Profile > "Min uke" settings. Customize which information appears in your weekly view.

---

## Spaces (Modules)

Access all modules from the **Our Places** tab. Each space has its own card with an icon, name, and item count.

### Trips & Travel

**Icon**: Compass | **Color**: #7EC8E3 (Blue)

Plan and organize family trips with:

- **Trip overview**: Create trips with destination, dates, and coordinates
- **Transport**: Book flights, trains, buses, boats, taxis, ferries with departure/arrival times
- **Hotels**: Accommodation with check-in/out times and addresses
- **Restaurants**: Reservations with dates and notes
- **Activities**: Planned activities with schedules
- **Packing Lists**: Checkable packing lists
- **Documents**: Upload and store trip documents
- **Links**: Save useful URLs
- **Weather**: AI-fetched weather forecast for your destination
- **Destination Tips**: AI-generated travel advice (things to do, restaurants, local phrases, scam warnings)

**Adding transport**: Each transport type (fly, tog, bil, boat, taxi, ferry) uses a dual-form pattern with departure (utreise) and arrival (hjemreise) tabs. Check "En vei" (one way) to hide the return trip form.

### Health

**Icon**: Medical | **Color**: #C67B5C (Red/Brown)

Track family health information:

- **Medications**: Track prescriptions with dosage and frequency
- **Appointments**: Schedule doctor visits with date, time, location
  - **Person**: Multi-select — assign appointments to multiple family members
  - **Doctor**: Doctor name
  - **Date/Time**: dateFrom/dateTo with auto-sync
  - **Reminders**: Friendly labels (30 min, 1 hour, 2 hours, 1 day, 1 week)
- **Vaccinations**: Record vaccinations with next-due dates
- **Allergies**: Document allergies with severity levels
- **Growth**: Log height and weight measurements over time

Each section is collapsible with add/edit/delete functionality. Appointments with locations show a map that opens Google Maps on tap.

### Pets

**Icon**: Pet | **Color**: #9B7DB8 (Purple)

Manage pet care with dedicated sections:

- **Pets**: Add pets with name, type, breed, birthday, chip ID, passport number
- **Vet Visits**: Schedule and track veterinary appointments
  - **Doctor**: Veterinarian name
  - **Date/Time**: dateFrom/dateTo with auto-sync
  - **Reminders**: Friendly labels (30 min, 1 hour, 2 hours, 1 day, 1 week)
- **Medications**: Track pet medications and dosages
- **Food**: Record feeding schedules and amounts
- **Grooming**: Track grooming schedule with next-due dates
- **Vaccinations**: Record vaccination history
- **Insurance**: Store insurance policy details and expiry dates

### School

**Icon**: Documents | **Color**: #6B8F71 (Green)

Organize school information:

- **Children**: Add children with school name and contact info
- **Activities**: Create school activities (trip/activity/meeting) with:
  - **Type**: trip, activity, meeting
  - **Date range**: dateFrom/dateTo with auto-sync (dateTo matches dateFrom when changed, never before dateFrom)
  - **Time range**: Optional start/end times
  - **Reminders**: Friendly labels (None, 30 min, 1 hour, 2 hours, 1 day, 1 week)
  - **Documents**: Upload and store documents (permission slips, schedules, etc.)
  - **Calendar sync**: Google Calendar integration for all activity types
- **Contacts**: Teachers and classmates with phone/email/parent info
- **Schedules**: Upload semester schedule images

**AI Import**: Use the School AI feature to:
1. Take a photo of a class list
2. AI extracts all names and parent contact information
3. Review and confirm the extracted data
4. Contacts are automatically added

### Kindergarten

**Icon**: Kindergarten | **Color**: #E8836A (Orange)

Manage kindergarten information with the same features as School:

- **Children**: Add children with kindergarten name and contact info
- **Activities**: Create kindergarten activities (trip/activity/meeting) with date/time ranges, reminders, documents, and calendar sync
- **Contacts**: Teachers and staff with contact info
- **Schedules**: Upload schedule images

### Birthdays

**Icon**: Birthday | **Color**: Orange

Never forget a birthday:

- **Birthday list**: Add birthdays with name and date
- **Gift ideas**: For each birthday, add gift ideas and mark as purchased
- **Notifications**: Receive push notifications on the day and 7 days before

### Meal Plan

**Icon**: Utensils | **Color**: Teal

Plan family meals with:

- **Recipe book**: Browse, search, and filter recipes by category
- **AI recipe suggestions**: Describe what you want, get 3 recipe variations
- **Import from URL**: Paste a recipe URL and AI extracts the recipe
- **Photo to recipe**: Snap a photo of a recipe, AI extracts ingredients and instructions
- **Recipe translation**: Translate recipes to Norwegian, Swedish, Danish, English, or Finnish
- **Weekly meal plan**: Assign breakfast, lunch, and dinner for each day
- **Shopping lists**: Auto-generate shopping lists from meal plans

**Recipe Categories**: chicken, meat, fish, vegetarian, pasta, casserole, soup, breakfast, dessert

### Shopping Lists

Create and manage checkable shopping lists. Items can be added from the meal plan or manually.

---

## Voice & Photo to Event/Activity

### Voice-to-Event/Activity

Create events or activities by speaking:

1. Tap the **+** button > "Tale" in any module section
2. Tap the microphone to start recording
3. Speak naturally, e.g.: "Meeting with kindergarten on Wednesday at 2 PM"
4. Tap stop when done
5. AI transcribes your speech and extracts:
   - Event/activity title
   - Date (resolves "tomorrow", "on Monday", etc.)
   - Time (understands "half past two", "quarter past two", etc.)
   - Description
6. Review and edit if needed
7. Save

Voice-to-event works for all modules:
- **Events**: Creates a calendar event
- **Health**: Creates a health appointment
- **Pets**: Creates a vet visit
- **School**: Creates a school activity (trip/activity/meeting)
- **Kindergarten**: Creates a kindergarten activity

### Photo-to-Event/Activity

Create events or activities from photos:

1. Tap the **+** button > "Foto" in any module section
2. Take a photo or pick from gallery
3. AI extracts all visible events/activities with titles, dates, and times
4. Review the extracted events
5. Save individually or save all

### Photo-to-Recipe

Import recipes from photos:

1. Go to Meal Plan > tap camera icon
2. Snap a photo of a recipe from a cookbook or screen
3. AI extracts: name, ingredients with amounts, instructions
4. Review and save to your recipe book

---

## DatePicker & Reminders

### DatePickerModal

All date and time inputs use a custom DatePickerModal with these features:

- **Scrollable list**: Browse through dates (365 days) or times (30-minute intervals)
- **Search bar**: Type a date (YYYY-MM-DD) or time (HH:MM) to jump directly
- **Manual date entry**: At the bottom of the date picker, type any date manually — useful for historical dates (birthdays, past vaccinations, etc.)
- **Auto-scroll**: When a date is typed or selected, the list scrolls to show it

### dateFrom/dateTo Auto-Sync

For activities with date ranges (school, kindergarten, health, vet):
- Changing **dateFrom** automatically updates **dateTo** to match
- **dateTo** is never set before **dateFrom**
- You can set different end dates manually

### Reminder Options

All modules use the same reminder options:

| Label | Minutes |
|-------|---------|
| None | 0 |
| 30 min | 30 |
| 1 hour | 60 |
| 2 hours | 120 |
| 1 day | 1440 |
| 1 week | 10080 |

Reminders are sent as phone notifications with friendly labels (not "60 minutes" but "1 hour").

Default reminder: **1 hour** (60 minutes)
Default time for new items: **10:00–11:00**

---

## Profile & Settings

The Profile tab contains all your personal and family settings.

### Personal Settings

- **Name**: Edit your display name
- **Phone**: Add your phone number
- **Avatar**: Upload a profile photo (used in chat)
- **Language**: Choose between Norwegian, Swedish, Danish, English, and Finnish

### Family Management

- **Create family**: Start a new family group
- **Join family**: Enter a 6-character invite code
- **Invite member**: Generate a shareable invite code (Admin/Owner only)
- **Remove member**: Remove someone from the family (Admin/Owner only)
- **Change role**: Promote/demote between Admin and Member (Admin/Owner only)
- **Leave family**: Leave the current family (non-owners only)

### Calendar Integration

1. Connect your Google or Outlook calendar
2. Select which calendar to sync events to
3. When creating events with "Add to calendar" enabled, events are exported
4. Google Calendar sync works for all activity types: events, school activities, kindergarten activities, health appointments, vet visits

### Notifications

- Toggle push notifications on/off
- Configure which sections appear in "Min uke" weekly summary
- Birthday reminders are sent automatically at 08:00 Oslo time
- Activity reminders use friendly labels (not raw minute counts)

### Spond Integration

1. Enter your Spond email and password
2. Select which Spond groups to sync
3. Map Spond members to family members for RSVP tracking
4. Spond events appear automatically in your calendar

---

## Themes

fampad offers 9 visual themes accessible from Profile settings:

| Theme | Description |
|-------|-------------|
| **Light** | Clean white background |
| **Dark** | Easy on the eyes for evening use |
| **System** | Follows your device's light/dark setting |
| **Orange** | Warm orange accents |
| **Deep Blue** | Professional deep blue palette |
| **Silver** | Elegant silver tones |
| **Purple** | Creative purple theme |
| **Pink** | Vibrant pink accents |
| **Teal** | Calming teal color scheme |

Your theme preference is saved and persists between sessions.

---

## Language Support

fampad supports 5 languages:

1. **Norwegian (Bokmål)** — Default
2. **Swedish**
3. **Danish**
4. **English**
5. **Finnish**

### Changing Language

1. Go to Profile
2. Scroll to "Språk" (Language)
3. Select your preferred language
4. The entire interface updates immediately

### Recipe Translation

Recipes can be translated to all 5 languages:
1. Open a recipe
2. Tap the translate button
3. AI translates the recipe name, description, ingredients, and instructions
4. Tap a language tab to view in that language

---

## PWA & Install

### Installing fampad

fampad is a Progressive Web App (PWA) that can be installed on your device:

**On iOS (Safari):**
1. Open fampad in Safari
2. Tap the Share button (square with arrow)
3. Tap "Add to Home Screen"
4. Name it and tap "Add"

**On Android (Chrome):**
1. Open fampad in Chrome
2. Tap the three-dot menu
3. Tap "Add to Home Screen"
4. Confirm installation

**On Desktop:**
1. Look for the install icon in the address bar
2. Click to install fampad as a desktop app

### Update Banner

When a new version is available, fampad shows an update banner. Tap to refresh and get the latest version.

---

## Tips & Tricks

### Quick Navigation

- Use the **+** button to quickly create events, health items, pet visits, school/kindergarten activities, or trips
- Long-press items for edit/delete options
- Tap calendar dots in calendar view to see that day's events

### Spond Integration

- Connect Spond to see all club events alongside family events
- RSVP directly from the fampad app
- See which family members are attending

### Meal Planning

- Use AI suggestions to discover new recipes
- Import recipes from any website by pasting the URL
- Photo-scan recipes from cookbooks
- Generate shopping lists from your weekly meal plan

### Trip Planning

- Add weather forecasts for your destination
- Get AI-powered destination tips and local phrases
- Use transport tabs (departure/arrival) for round trips
- Track packing lists with checkboxes

### Data Safety

- All data is stored in your family's private Firestore database
- Only family members can see your data
- Invite codes expire after 1 hour for security
- You can leave a family at any time (removes your access)

---

*fampad v1.0.0 — Your family, organized.*
