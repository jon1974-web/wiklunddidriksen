# Min vecka — Future Plan

## Overview
"Min vecka" (My Week) is a summary view that shows the user what's happening this week across all app features. Accessible from the "Din uke" button on the Arrangementer screen.

## Sections

### 1. Dagens plan (Today's plan)
- Events grouped by day (Mon–Sun)
- Colored dots matching theme accent color
- Spond events included
- Shows "Ingen arrangementer" for empty days

### 2. Uavgjort på lister (Unchecked items on lists)
- Shopping lists with unchecked items
- Shows item count (e.g. "3 igjen")
- Only shows lists with items relevant to this week

### 3. Transport denne uken (Transport this week)
- Flights, trains, cars, ferje, boat, taxi
- Shows departure dates and times
- Includes all transport types: Fly, Tog, Leiebil, Ferje, Båt/Cruise, Taxi

### 4. Restauranter (Restaurants)
- Booked restaurants for the week
- Shows dates and times

### 5. Hotell og aktiviteter (Hotels and activities)
- Hotel check-ins with dates
- Activities with dates and times

## Future additions (when more functionality is added)
- Chat messages from this week
- Reminders/notifications
- Weather summary for the week

## Technical notes
- Data comes from Firestore: events, trips (subcollections), shopping lists
- Current week calculation: Monday to Sunday
- Week number displayed in header (e.g. "Uke 28")
- Language support: all text uses i18n translation keys
