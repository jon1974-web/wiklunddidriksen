# Security & Privacy Plan

## Current Assessment: 6.4/10

### Strengths
- Firebase Auth with password hashing
- Family-scoped Firestore rules for all collections (including subcollections)
- Server-side authorization in Cloud Functions
- Input sanitization on client side
- TLS encryption in transit (Google-managed)
- HTTPS enforced by Firebase Hosting
- AES-256-CBC encryption for Spond passwords
- Per-user rate limiting on all 9 user-facing Cloud Functions
- Security headers (X-Frame-Options, CSP, etc.)
- Audit logging for family management operations
- Path-based storage rules with size limits
- Comprehensive documentation (8 documents)

### Remaining Gaps

| Gap | Severity | ISO 27001 | GDPR |
|-----|----------|-----------|------|
| Spond password key rotation needed | HIGH | A.9.2.4 | — |
| ~~No MFA/2FA~~ | ~~HIGH~~ | ~~A.9.4.2~~ | ~~Art. 32~~ |
| ~~No backup/recovery~~ | ~~HIGH~~ | ~~A.12.3.1~~ | ~~Art. 5(1)(e)~~ |
| No GDPR features (export, deletion) | HIGH | — | Art. 15, 17, 20 |
| No health data encryption | MEDIUM | A.9.4.1 | Art. 9 |
| No DPIA for health data | MEDIUM | — | Art. 35 |

### Remediation Plan

**Phase 1 (COMPLETED):**
1. ✅ Fix storage rules
2. ✅ Fix subcollection rules
3. ✅ Encrypt Spond password
4. ✅ Add rate limiting
5. ✅ Add security headers
6. ✅ Add audit logging
7. ✅ Documentation created

**Phase 2 (This Sprint):**
1. Add MFA support
2. Add backup strategy
3. Implement data export (GDPR)
4. Implement account deletion (GDPR)

**Phase 3 (This Month):**
1. Add audit logging
2. Add security headers
3. Run DPIA for health data
4. Implement consent management

## GDPR Compliance Status

| Requirement | Status |
|-------------|--------|
| Art. 6 - Lawful basis | NOT MET |
| Art. 7 - Consent conditions | NOT MET |
| Art. 12-14 - Transparent information | NOT MET |
| Art. 15 - Right of access | NOT MET |
| Art. 17 - Right to erasure | NOT MET |
| Art. 20 - Data portability | NOT MET |
| Art. 25 - Data protection by design | PARTIAL |
| Art. 32 - Security of processing | PARTIAL |
| Art. 35 - DPIA | NOT MET |

## ISO 27001 Readiness: ~70%
- Strong on authentication, data isolation, and rate limiting
- Good progress on encryption and audit logging
- ✅ MFA with phone number and Google sign-in enabled
- ✅ Scheduled backups configured in GCP
- ❌ Health/children data encryption at rest — not yet implemented
