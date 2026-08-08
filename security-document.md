# Sikkerhetsdokumentasjon

## Sikkerhetstiltak

### Autentisering
- Firebase Auth med passordhashing
- ID-token verifisering på alle Cloud Functions
- `secureTextEntry` på passordfelter

### Datatilgang
- Familiscoping på alle Firestore-samlinger
- `isFamilyMember()` regel-sjekk før lese/skrive
- Server-side autorisasjon i Cloud Functions

### Kryptering
- TLS under overføring (Google-håndtert)
- HTTPS påtvunget av Firebase Hosting
- **Mangler**: Ingen kryptering på lagring (anbefalt for helsedata)

### Sårbarhetsstyring
- Ingen systematisk skanning implementert
- Anbefaler: KjøreOWASP ZAP eller tilsvarende quarterly

### Hendelseslogging
- **Mangler**: Ingen audit logging implementert
- Anbefaler: Logg alle auth-hendelser, data-tilgang, admin-handlinger

### Gjenoppretting
- **Mangler**: Ingen backup-strategi
- Anbefaler: Aktiver Firestore automatiserte backups

---

# Security Documentation

## Security Measures

### Authentication
- Firebase Auth with password hashing
- ID token verification on all Cloud Functions
- `secureTextEntry` on password fields

### Data Access Control
- Family scoping on all Firestore collections
- `isFamilyMember()` rule check before read/write
- Server-side authorization in Cloud Functions

### Encryption
- TLS in transit (Google-managed)
- HTTPS enforced by Firebase Hosting
- **Gap**: No encryption at rest (recommended for health data)

### Vulnerability Management
- No systematic scanning implemented
- Recommended: Run OWASP ZAP or equivalent quarterly

### Audit Logging
- **Gap**: No audit logging implemented
- Recommended: Log all auth events, data access, admin actions

### Recovery
- **Gap**: No backup strategy
- Recommended: Enable Firestore automated backups

## Compliance Status

| Standard | Status | Notes |
|----------|--------|-------|
| ISO 27001 | ~30% | Strong auth, weak subcollection security |
| GDPR | ~15% | Missing consent, privacy policy, data export |
| OWASP Top 10 | ~40% | Good auth, weak input validation |