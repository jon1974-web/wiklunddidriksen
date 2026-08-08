# Security & Privacy Plan

## Current Assessment: 3.5/10

### Strengths
- Firebase Auth with password hashing
- Family-scoped Firestore rules for top-level collections
- Server-side authorization in Cloud Functions
- Input sanitization on client side
- TLS encryption in transit (Google-managed)
- HTTPS enforced by Firebase Hosting

### Critical Gaps to Fix

| Gap | Severity | ISO 27001 | GDPR |
|-----|----------|-----------|------|
| Storage rules wide-open | CRITICAL | A.9.4.1 | Art. 25 |
| Trip subcollection rules allow any user | CRITICAL | A.9.4.1 | Art. 5(1)(f) |
| Health subcollection rules allow any user | CRITICAL | A.9.4.1 | Art. 9 |
| Spond password stored unencrypted | HIGH | A.9.2.4 | Art. 32 |
| OpenAI API key in plaintext .env | HIGH | A.9.2.4 | — |
| No MFA/2FA | HIGH | A.9.4.2 | Art. 32 |
| No rate limiting | HIGH | A.12.1.4 | Art. 32 |
| No backup/recovery | HIGH | A.12.3.1 | Art. 5(1)(e) |
| No GDPR features | HIGH | — | Art. 6, 7, 12-20 |
| No audit logging | MEDIUM | A.12.4.1 | — |
| No security headers | MEDIUM | — | — |
| No account deletion | MEDIUM | — | Art. 17 |

### Remediation Plan

**Phase 1 (Immediate):**
1. Fix storage rules
2. Fix subcollection rules
3. Encrypt Spond password
4. Rotate OpenAI API key
5. Add rate limiting

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

## ISO 27001 Readiness: ~30%
- Strong on authentication and top-level data isolation
- Weak on subcollection security, encryption, backups, audit logging
