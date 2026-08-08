# Master Plan: Security, Privacy & Documentation

## Overview
This plan covers all security fixes, privacy compliance, and documentation for the Familiesenter app. Everything is organized into phases for incremental implementation.

---

## Phase 1: Critical Security Fixes (Do First)

### 1.1 Fix Firestore Rules for Subcollections
**Problem:** Trip and health subcollections allow any authenticated user to read/write.
**Fix:** Add `familyId` verification to all subcollection rules.

### 1.2 Fix Storage Rules
**Problem:** Wide-open storage rules allow any authenticated user to access any file.
**Fix:** Add path-based and family-scoped restrictions.

### 1.3 Fix `sentNotifications` Rules
**Problem:** Unauthenticated writes allowed.
**Fix:** Require authentication for writes.

### 1.4 Encrypt Spond Password
**Problem:** Third-party password stored in plaintext.
**Fix:** Use Cloud Functions to encrypt before storing.

### 1.5 Rotate OpenAI API Key
**Problem:** Key exposed in plaintext `.env` file.
**Fix:** Move to Firebase Secret Manager, rotate the key.

---

## Phase 2: Privacy & Compliance (Do Next)

### 2.1 Privacy Policy
**File:** `privacy-policy.md`
- What data we collect
- How we use it
- Storage and third-party services
- User rights (access, deletion, export)
- Contact information

### 2.2 Terms of Service
**File:** `terms-of-service.md`
- Acceptable use
- Account responsibilities
- Data ownership
- Service availability
- Limitation of liability

### 2.3 Add to Login Page
- Privacy Policy link
- Terms of Service link
- Acceptance checkbox on signup

### 2.4 Add to Profile Page
- Privacy Policy link
- Terms of Service link
- Security information

---

## Phase 3: Systems Documentation

### 3.1 Architecture Overview
**File:** `PLAN-systems-documentation.md`
- Firebase services used
- Data model (all collections)
- Cloud Functions endpoints
- Third-party integrations

### 3.2 API Documentation
- Cloud Functions request/response formats
- Authentication requirements
- Rate limits

---

## Phase 4: Operations Documentation

### 4.1 Deployment Procedures
**File:** `PLAN-operations-documentation.md`
- Web app deployment
- Cloud Functions deployment
- Firestore rules/indexes deployment

### 4.2 Monitoring & Incident Response
- Key metrics to watch
- Incident response procedures
- Backup and recovery (when implemented)

---

## Phase 5: Security Document

### 5.1 Security Measures
**File:** `security-document.md`
- Authentication measures
- Data access control
- Encryption status
- Vulnerability management
- Compliance status (ISO 27001, GDPR)

---

## Implementation Order

| Order | Task | File | Priority |
|-------|------|------|----------|
| 1 | Privacy Policy | privacy-policy.md | HIGH |
| 2 | Terms of Service | terms-of-service.md | HIGH |
| 3 | Security fixes (Phase 1) | firestore.rules, storage.rules | CRITICAL |
| 4 | Systems Documentation | PLAN-systems-documentation.md | MEDIUM |
| 5 | Operations Documentation | PLAN-operations-documentation.md | MEDIUM |
| 6 | Security Document | security-document.md | MEDIUM |

## Current Status
- ✅ Security assessment completed (3.5/10)
- ✅ All 6 documents created
- ✅ Security gaps documented
- ⬜ Security fixes not yet implemented
- ⬜ Documents not yet added to app
