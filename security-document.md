# Sikkerhetsdokumentasjon

## Sikkerhetstiltak

### Autentisering
- Firebase Auth med passordhashing (e-post/passord)
- ID-token verifisering på alle Cloud Functions (`verifyAuth()`)
- `secureTextEntry` på passordfelter
- appOwner-rolle kan kun gis/trekkes via server-side Cloud Functions

### Datatilgang
- Familiscoping på alle Firestore-samlinger (`familyId` på hvert dokument)
- `isFamilyMember()` regel-sjekk før lese/skrive
- Server-side autorisasjon i Cloud Functions ( familieoperasjoner: opprett, bli med, forlat, fjern, roller)
- Rate limiting per bruker (`checkRateLimit`) på alle AI-endepunkter

### Kryptering
- TLS under overføring (Google-håndtert)
- HTTPS påtvunget av Firebase Hosting
- AES-256-CBC kryptering av Spond-passord før lagring i Firestore (`encryptSpondPassword`/`decryptSpondPassword`)
- Google OAuth-tokens for kalendersynk lagret server-side i `googleCalendarTokens/{uid}`
- Google-håndtert kryptering for Firestore/Storage at rest

### CORS
- Cloud Functions aksepterer kun godkjente origoer (https://familiesenter-837bb.web.app, .firebaseapp.com, localhost)
- Sikkerhetsheadere i Firebase Hosting (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)

### Logging og overvåking
- Iron tracks: `trackUsage`/`getUsageStats` gir per-bruker API-bruk og kostnadsstatistikk (kun appOwner)
- Cloud Function logs i Firebase Console (error rate, timeouts)
- FCM-token cleanup på `registration-token-not-registered`

### Sårbarhetsstyring
- Ingen systematisk skanning implementert
- Anbefaler: Kjøre OWASP ZAP eller tilsvarende quarterly

### Hendelseslogging
- Delvis implementert: funksjonslogger + brukssporing
- Anbefaler: Logg alle auth-hendelser og admin-handlinger

### Gjenoppdrett
- Daglig automatisert Firestore-backup med 30 dagers lagring
- Anbefaler: Periodisk backup-test

---

# Security Documentation

## Security Measures

### Authentication
- Firebase Auth with password hashing (email/password)
- ID token verification on all Cloud Functions (`verifyAuth()`)
- `secureTextEntry` on password fields
- appOwner role can only be granted/revoked via server-side Cloud Functions

### Data Access Control
- Family scoping on all Firestore collections (`familyId` on every document)
- `isFamilyMember()` rule check before read/write
- Server-side authorization in Cloud Functions (family operations: create, join, leave, remove, role changes)
- Rate limiting per user (`checkRateLimit`) on all AI endpoints

### Encryption
- TLS in transit (Google-managed)
- HTTPS enforced by Firebase Hosting
- AES-256-CBC encryption of Spond passwords before Firestore storage (`encryptSpondPassword`/`decryptSpondPassword`)
- Google OAuth tokens for calendar sync stored server-side in `googleCalendarTokens/{uid}`
- Google-managed encryption for Firestore/Storage at rest

### CORS
- Cloud Functions accept approved origins only (https://familiesenter-837bb.web.app, .firebaseapp.com, localhost)
- Security headers in Firebase Hosting (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)

### Monitoring
- Usage tracking: `trackUsage`/`getUsageStats` gives per-user API usage and cost statistics (appOwner only)
- Cloud Function logs in Firebase Console (error rate, timeouts)
- FCM token cleanup on `registration-token-not-registered`

### Vulnerability Management
- No systematic scanning implemented
- Recommended: Run OWASP ZAP or equivalent quarterly

### Audit Logging
- Partially implemented: function logs + usage tracking
- Recommended: Log all auth events and admin actions

### Recovery
- Daily automated Firestore backups with 30-day retention
- Recommended: periodic backup restore tests

## Compliance Status

| Standard | Status | Notes |
|----------|--------|-------|
| ISO 27001 | ~60% | Strong auth, family isolation, encrypted secrets; audit logging lacks full coverage |
| GDPR | ~75% | Privacy policy + terms published (per language), data isolation, rate limiting; export/erasure flows are manual |
| OWASP Top 10 | ~70% | Good auth + CORS + input validation; systematic scanning recommended |
