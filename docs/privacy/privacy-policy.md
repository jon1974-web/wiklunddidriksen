<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<h1 align="center">fampad</h1>
<h2 align="center">Personvernpolicy / Privacy Policy</h2>

<p align="center">
  <em>Sist oppdatert / Last updated: August 15, 2026</em>
</p>

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data Controller](#2-data-controller)
3. [Data We Collect](#3-data-we-collect)
4. [How We Use Your Data](#4-how-we-use-your-data)
5. [Third-Party Services](#5-third-party-services)
6. [Data Storage and Security](#6-data-storage-and-security)
7. [Family Data Isolation](#7-family-data-isolation)
8. [Your Rights](#8-your-rights)
9. [Children's Data Protection](#9-childrens-data-protection)
10. [Data Retention](#10-data-retention)
11. [Changes to This Policy](#11-changes-to-this-policy)
12. [Contact Information](#12-contact-information)

---

## 1. Introduction

fampad ("we," "us," or "our") is a family coordination application designed to help families organize their daily lives. This privacy policy explains what personal data we collect, how we use it, and what rights you have under the General Data Protection Regulation (GDPR) and other applicable data protection laws.

By using fampad, you agree to the collection and use of information as described in this policy. We are committed to protecting your privacy and the privacy of your family members.

---

## 2. Data Controller

The data controller responsible for your personal data is:

**fampad**
Email: [jon@wiklunddidriksen.com](mailto:jon@wiklunddidriksen.com)

---

## 3. Data We Collect

### 3.1 Account and Profile Information

When you create an account, we collect:

| Data Field | Purpose |
|------------|---------|
| Email address | Account authentication and identification |
| Display name | Identifying you within your family |
| Phone number (optional) | Contact information |
| Profile avatar (optional) | Visual identification |

### 3.2 Family Information

| Data Field | Purpose |
|------------|---------|
| Family name | Family identification |
| Family member roles (owner, admin, member) | Access control and permissions |
| Invite codes | Family joining mechanism |

### 3.3 Events and Calendar

| Data Field | Purpose |
|------------|---------|
| Event titles, descriptions, dates, times | Family schedule coordination |
| Event locations and addresses | Navigation and planning |
| Reminder settings | Notification scheduling |
| Calendar integration settings | External calendar sync |
| Voice recordings (for event creation) | Transcription via AI services |
| Google Calendar OAuth tokens (if enabled) | Automatic calendar synchronization |

### 3.4 Health Information (Health Space)

| Data Field | Purpose |
|------------|---------|
| Medications (names, dosages, frequencies) | Health tracking |
| Medical appointments | Health schedule management |
| Vaccination records | Health record keeping |
| Allergy information (allergen, severity) | Safety and awareness |
| Growth measurements (height, weight) | Health monitoring |

### 3.5 Pet Information (Pet Space)

| Data Field | Purpose |
|------------|---------|
| Pet profiles (name, type, breed, gender, birthday) | Pet identification |
| Pet identification (passport number, chip ID) | Legal identification |
| Vet visits and medical history | Pet health management |
| Pet medications and vaccinations | Pet health tracking |
| Pet food schedules | Feeding management |
| Pet grooming schedules | Grooming management |
| Pet insurance details | Insurance management |

### 3.6 School and Kindergarten Information

| Data Field | Purpose |
|------------|---------|
| Child profiles (name, school/kindergarten, contact info) | School/kindergarten coordination |
| Child photos | Visual identification |
| School years, grades, and groups | Academic tracking |
| Teacher and staff contacts | Communication |
| Parent contact information | Parent communication |
| School/kindergarten schedules (images) | Schedule reference |

### 3.7 Travel Information (Trips)

| Data Field | Purpose |
|------------|---------|
| Trip details (title, city, country, dates) | Travel planning |
| Accommodation information | Booking management |
| Transport bookings (flights, trains, ferries, taxis) | Travel coordination |
| Restaurant and activity plans | Itinerary management |
| Packing lists | Travel preparation |
| Trip documents and links | Document storage |
| Destination tips (AI-generated) | Travel advice |

### 3.8 Shopping and Meal Planning

| Data Field | Purpose |
|------------|---------|
| Shopping lists and items | Grocery coordination |
| Recipes (ingredients, instructions) | Meal planning |
| Meal plans (weekly schedules) | Family meal organization |

### 3.9 Chat Messages

| Data Field | Purpose |
|------------|---------|
| Message text | Family communication |
| Message reactions | Social interaction |
| Shared images | Media sharing |

### 3.10 Birthday and Gift Tracking

| Data Field | Purpose |
|------------|---------|
| Birthday dates and names | Reminder notifications |
| Gift ideas and purchase status | Gift planning |

### 3.11 Spond Integration (Optional)

If you choose to integrate with Spond (a sports team management platform):

| Data Field | Purpose |
|------------|---------|
| Spond account email | Authentication with Spond API |
| Spond account password (encrypted) | Authentication with Spond API |
| Spond group information | Sports event synchronization |
| Spond event responses | Attendance tracking |

### 3.12 Technical Data

| Data Field | Purpose |
|------------|---------|
| FCM push notification token | Delivering push notifications |
| Notification preferences | Controlling notification delivery |
| Device information | Service optimization |

---

## 4. How We Use Your Data

We use your personal data for the following purposes:

1. **Family Coordination**: Enabling family members to share schedules, tasks, and information.
2. **Account Management**: Creating and managing your account, authenticating users.
3. **Notifications**: Sending push notifications for event reminders, birthday reminders, and family updates.
4. **AI-Powered Features**: Using AI services to:
   - Transcribe voice recordings into events (via OpenAI Whisper)
   - Generate destination tips for trips (via OpenAI GPT)
   - Parse photos into events, recipes, and class lists (via OpenAI GPT)
   - Suggest recipes based on your preferences (via OpenAI GPT)
5. **Calendar Integration**: Syncing events with your Google Calendar or Outlook calendar.
6. **Spond Integration**: Fetching sports events and member information from Spond (if enabled).
7. **Service Improvement**: Monitoring service performance and reliability.

---

## 5. Third-Party Services

We use the following third-party services to provide fampad:

### 5.1 Google Firebase

- **Services used**: Authentication, Firestore (database), Cloud Storage, Cloud Functions, Cloud Messaging (FCM)
- **Data stored**: All user data, family data, and application data
- **Privacy policy**: [https://firebase.google.com/support/privacy](https://firebase.google.com/support/privacy)

### 5.2 OpenAI

- **Services used**: Whisper (speech-to-text), GPT-4o/GPT-4o-mini (text generation)
- **Data sent**: Voice recordings (temporarily), text prompts for AI features, images for parsing
- **Purpose**: Voice-to-event conversion, destination tips, recipe suggestions, photo parsing
- **Privacy policy**: [https://openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy)

### 5.3 Spond

- **Services used**: Spond API (optional integration)
- **Data sent**: Authentication credentials (encrypted), group IDs for event fetching
- **Purpose**: Sports team event synchronization
- **Privacy policy**: [https://spond.com/privacy](https://spond.com/privacy)

### 5.4 Google Calendar (Optional)

- **Services used**: Google Calendar API (via OAuth 2.0)
- **Data sent**: OAuth access and refresh tokens, calendar event data
- **Purpose**: Automatic synchronization of events, health appointments, and trips to Google Calendar
- **Data stored**: OAuth tokens stored encrypted in Firestore, can be revoked via disconnect
- **Privacy policy**: [https://policies.google.com/privacy](https://policies.google.com/privacy)

### 5.5 Google Maps / Google Places

- **Services used**: Static Maps API, Places Autocomplete API
- **Data sent**: Address strings for geocoding and map display
- **Purpose**: Displaying locations on maps, address autocomplete
- **Privacy policy**: [https://policies.google.com/privacy](https://policies.google.com/privacy)

### 5.5 Open-Meteo

- **Services used**: Weather Forecast API, Marine API, Geocoding API, Historical Weather API
- **Data sent**: Geographic coordinates (latitude/longitude)
- **Purpose**: Weather forecasts for trips, historical weather data, water temperature
- **Privacy policy**: [https://open-meteo.com/en/terms](https://open-meteo.com/en/terms)

### 5.6 Frankfurter API

- **Services used**: Currency exchange rates
- **Data sent**: Currency codes (e.g., NOK, EUR)
- **Purpose**: Currency conversion for travel planning
- **Privacy policy**: [https://frankfurter.dev](https://frankfurter.dev)

---

## 6. Data Storage and Security

### 6.1 Storage Location

All data is stored in Google Firebase Cloud (Firestore) in the `familiesenter-837bb` project, hosted in Google's cloud infrastructure.

### 6.2 Encryption

- **Spond passwords**: Encrypted using AES-256-CBC encryption before storage in Firestore. The encryption key is stored server-side in Cloud Functions environment variables and is never exposed to clients.
- **Data at rest**: Google-managed encryption for all Firestore data.
- **Data in transit**: TLS encryption for all communications.
- **Firebase Storage**: Used for storing profile avatars, trip documents, pet photos, and school schedules with Google-managed encryption.

### 6.3 Access Control

- All Firestore operations require Firebase Authentication.
- Family data is isolated using `familyId` fields — users can only access data belonging to their family.
- Cloud Functions verify authentication and family membership before processing requests.
- User profiles are read-only for other authenticated users (to display family member lists).
- Users can only modify their own profiles.
- Family operations (create, join, leave, remove) are handled server-side with role verification.

### 6.4 CORS Protection

Cloud Functions only accept requests from approved origins:
- `https://familiesenter-837bb.web.app`
- `https://familiesenter-837bb.firebaseapp.com`
- Local development servers (`http://localhost:*`)

---

## 7. Family Data Isolation

fampad implements strict data isolation between families:

- Every document in Firestore includes a `familyId` field.
- Firestore rules verify family membership before allowing any read or write operation.
- New families start with completely empty data — no cross-family data leakage.
- Users can only see and modify data belonging to their own family.

---

## 8. Your Rights

Under GDPR and applicable data protection laws, you have the following rights:

### 8.1 Right of Access

You have the right to request a copy of all personal data we hold about you. This includes:
- Your profile information
- All data associated with your family
- Activity logs and usage data

### 8.2 Right to Rectification

You can update your profile information at any time through the app settings. For other corrections, please contact us.

### 8.3 Right to Erasure (Right to Be Forgotten)

You have the right to request deletion of your personal data. To exercise this right:
1. Leave your family through the app settings.
2. Contact us to request deletion of your account and all associated data.
3. We will process your request within 30 days.

### 8.4 Right to Data Portability

You can export your data in a machine-readable format (JSON). Contact us to request a data export.

### 8.5 Right to Withdraw Consent

You can withdraw consent for data processing at any time by:
- Disabling specific features in the app settings.
- Opting out of push notifications.
- Disconnecting third-party integrations (Spond, Google Calendar).
- Deleting your account.

### 8.6 Right to Object

You have the right to object to processing of your personal data for specific purposes. Contact us to discuss your concerns.

---

## 9. Children's Data Protection

fampad may contain data about children (e.g., school information, health records, pet information). We take special measures to protect children's data:

- **Parental consent**: Only parents or legal guardians should create accounts and enter data about children.
- **Access control**: Children's data is only accessible to family members.
- **Minimal data collection**: We only collect data necessary for family coordination.
- **No marketing to children**: We do not use children's data for marketing or profiling.
- **School contact data**: Contact information for classmates and teachers is stored locally within the family's data and is not shared with any third parties.

Parents and guardians are responsible for ensuring they have the right to enter and share information about children.

---

## 10. Data Retention

- **Account data**: Retained as long as your account is active.
- **Family data**: Retained as long as you are a member of the family.
- **Spond tokens**: Cached locally and cleared on logout or token expiry.
- **AI-generated content**: Destination tips and recipe suggestions are stored with your family data.
- **Notification records**: Stored to prevent duplicate notifications, can be cleaned up periodically.
- **Cloud Function logs**: Retained according to Google Cloud's default retention policies.

When you delete your account or leave a family, your personal data is removed from active systems. Some data may remain in backups for a limited period as per Google's standard retention policies.

---

## 11. Changes to This Policy

We may update this privacy policy from time to time. We will notify you of any material changes through the app or by email. The "Last updated" date at the top of this policy indicates when it was last revised.

We encourage you to review this policy periodically to stay informed about how we protect your data.

---

## 12. Contact Information

If you have any questions, concerns, or requests regarding this privacy policy or your personal data, please contact us:

**Email**: [jon@wiklunddidriksen.com](mailto:jon@wiklunddidriksen.com)

We will respond to your inquiry within 30 days.

---

<p align="center">
  <em>This privacy policy is effective as of August 12, 2026.</em>
</p>
