# Familiesenter — Monitoring & Incident Response

<p align="center">
  <img src="../../assets/icon.png" alt="Familiesenter Logo" width="120" height="120" />
</p>

<p align="center"><strong>Monitoring, error handling, and incident response procedures</strong></p>

---

## Table of Contents

1. [Monitoring Overview](#monitoring-overview)
2. [Key Metrics to Watch](#key-metrics-to-watch)
3. [Cloud Function Logs](#cloud-function-logs)
4. [Firestore Monitoring](#firestore-monitoring)
5. [Error Handling](#error-handling)
6. [Incident Response Procedures](#incident-response-procedures)
7. [Performance Monitoring](#performance-monitoring)
8. [Security Monitoring](#security-monitoring)
9. [Health Checks](#health-checks)
10. [Alerting Recommendations](#alerting-recommendations)

---

## Monitoring Overview

Familiesenter is a Firebase-based application. Monitoring relies on:

- **Firebase Console**: Central dashboard for all services
- **Cloud Function Logs**: Real-time and historical logs
- **Firebase Console > Functions**: Execution metrics and logs
- **Firebase Console > Firestore**: Database usage and performance
- **Firebase Console > Hosting**: Traffic and cache statistics
- **Browser Developer Tools**: Client-side error detection

### Key Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Firebase Console | `https://console.firebase.google.com/project/familiesenter-837bb` | All services |
| Functions Logs | Console > Functions > Logs | Cloud Function execution |
| Firestore Usage | Console > Firestore > Usage | Read/write counts |
| Hosting Analytics | Console > Hosting > Analytics | Traffic patterns |
| Authentication | Console > Authentication > Users | User growth |

---

## Key Metrics to Watch

### Cloud Functions

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| **Invocation count** | Varies by function | Sudden spikes (>10x normal) |
| **Error rate** | < 1% | > 5% |
| **Execution time** | < 2s (HTTP), < 30s (scheduled) | > 10s (HTTP), > 60s (scheduled) |
| **Memory usage** | < 128MB average | > 200MB (limit: 256MB) |
| **Cold start time** | < 3s | > 5s |

#### Functions to Monitor Most Closely

| Function | Risk Level | Why |
|----------|------------|-----|
| `checkReminders` | High | Runs every minute; affects all notifications |
| `spondProxy` | High | External API dependency; Spond downtime affects app |
| `voiceToEvent` | Medium | OpenAI API dependency; audio processing |
| `photoToData` | Medium | OpenAI API dependency; image processing |
| `notifyNewEvent` | Medium | Affects user experience when events are created |
| `checkBirthdayReminders` | Low | Runs daily; single failure acceptable |

### Firestore

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| **Reads/day** | < 100K | > 500K |
| **Writes/day** | < 20K | > 100K |
| **Document reads/sec** | < 50 | > 200 |
| **Document writes/sec** | < 20 | > 100 |
| **Storage size** | < 1GB | > 5GB |
| **Latency (p95)** | < 100ms | > 500ms |

### Hosting

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| **Bandwidth** | < 10GB/month | > 50GB/month |
| **Requests/day** | < 10K | > 50K |
| **Cache hit rate** | > 80% | < 50% |

### Authentication

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| **Sign-in success rate** | > 95% | < 85% |
| **Active users** | Track trend | Sudden drop |

---

## Cloud Function Logs

### Accessing Logs

#### Firebase Console

1. Go to Firebase Console > Functions > Logs
2. Filter by function name, severity, or time range
3. View real-time or historical logs

#### Firebase CLI

```bash
# View recent logs
firebase functions:log --project familiesenter-837bb

# View logs for specific function
firebase functions:log --only checkReminders --project familiesenter-837bb

# Follow logs in real-time
firebase functions:log --follow --project familiesenter-837bb
```

#### Google Cloud Console

1. Go to Google Cloud Console > Logging
2. Filter by resource type: `cloud_function`
3. Filter by function name

### Log Severity Levels

| Level | Color | When Used |
|-------|-------|-----------|
| `DEBUG` | Gray | Detailed debugging info |
| `INFO` | Blue | Normal operation (function invocation, success) |
| `WARNING` | Yellow | Non-critical issues (Spond group not found) |
| `ERROR` | Red | Failures (API errors, auth failures) |

### Important Log Patterns

#### checkReminders

```
INFO: checkReminders: {sent} sent, {failed} failed, {total} total
```

Monitor: `failed` count should be 0. Non-zero means FCM token issues.

#### spondProxy

```
INFO: spondProxy: group {groupId} returned {status}
WARN: spondProxy: group {groupId} failed: {error}
```

Monitor: Frequent failures indicate Spond API issues.

#### voiceToEvent

```
INFO: Received audio upload, content-type: {type}, isMultipart: {boolean}
INFO: Audio buffer: {size} bytes, filename: {filename}
INFO: Transcript: {transcript}
```

Monitor: Empty transcripts or OpenAI errors.

#### Errors

```
ERROR: Voice to event error: {message} {stack}
ERROR: Photo to data error: {message} {stack}
ERROR: Spond proxy error: {error}
```

Monitor: Any error log requires investigation.

---

## Firestore Monitoring

### Usage Dashboard

Firebase Console > Firestore > Usage shows:
- Document reads, writes, deletes per day
- Storage size
- Index size
- Network bandwidth

### Query Performance

Firebase Console > Firestore > Query Performance shows:
- Slow queries (>100ms)
- Missing index warnings
- Query patterns

### Common Performance Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Missing composite index | "Query requires index" error | Add index to `firestore.indexes.json` |
| Unbounded queries | Slow initial load | Add `.limit()` to all queries |
| N+1 query pattern | Many small reads | Batch with `Promise.all` or collection group queries |
| Large document reads | High read counts | Paginate with `.limit()` and cursor |

### Cost Optimization

Firestore pricing is based on reads, writes, and storage. Key optimizations:

1. **Always use `.limit()`** on queries (enforced in service files)
2. **Use `onSnapshot` sparingly** — only for real-time needs (chat, family updates)
3. **Batch reads** with `Promise.all` instead of sequential awaits
4. **Cache family member tokens** in Cloud Functions to avoid duplicate lookups

---

## Error Handling

### Client-Side Error Handling

#### Error Message Utility

All user-facing errors use `getErrorMessage()` from `src/utils/validation.ts`:

```typescript
// Consistent error messages for users
import { getErrorMessage } from '../utils/alert';
crossAlert(getErrorMessage(error));
```

#### Common Error Patterns

| Error Type | Handling |
|------------|----------|
| Network error | `OfflineBanner` component shows when offline |
| Auth error | Redirect to `AuthScreen` |
| Firestore error | `crossAlert` with user-friendly message |
| Cloud Function error | Error response displayed via `crossAlert` |
| Image upload error | Retry prompt or skip |

#### Alert Utility

`crossAlert` from `src/utils/alert.ts` provides platform-compatible alerts:
- Web: `window.alert()` or custom modal
- Native: React Native `Alert.alert()`

### Server-Side Error Handling

#### Cloud Function Pattern

Every Cloud Function follows this pattern:

```javascript
exports.functionName = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  try {
    // ... business logic
    return res.status(200).json({ result });
  } catch (error) {
    console.error("Function error:", error.message, error.stack);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});
```

#### Error Response Format

All errors return JSON with an `error` field:

```json
{ "error": "Human-readable error message" }
```

### FCM Token Cleanup

When a push notification fails with `messaging/registration-token-not-registered`:

```javascript
if (error.code === "messaging/registration-token-not-registered") {
  await db.collection("users").doc(n.uid).update({ fcmToken: null });
}
```

This automatically cleans up stale tokens.

---

## Incident Response Procedures

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 — Critical** | App completely down, data loss | Immediate | Firebase project down, auth broken |
| **P1 — High** | Major feature broken, many users affected | < 1 hour | Cloud Functions failing, Firestore unreachable |
| **P2 — Medium** | Feature degraded, workaround exists | < 4 hours | Spond integration down, slow queries |
| **P3 — Low** | Minor issue, minimal impact | < 24 hours | UI bug, translation error |

### Incident Response Steps

#### Step 1: Detect

**Monitoring sources:**
- Firebase Console > Functions > Logs (error spikes)
- Firebase Console > Firestore > Usage (abnormal patterns)
- User reports (check chat/email)
- Browser console errors (for client-side issues)

#### Step 2: Assess

**Quick diagnostic commands:**

```bash
# Check function status
firebase functions:list --project familiesenter-837bb

# Check recent logs
firebase functions:log --only checkReminders --project familiesenter-837bb

# Check Firestore rules
cat firestore.rules | head -20

# Verify hosting is live
curl -I https://familiesenter-837bb.web.app
```

#### Step 3: Mitigate

| Scenario | Mitigation |
|----------|------------|
| **Cloud Function errors** | Check `functions/.env` for missing keys; redeploy |
| **Firestore rule blocking access** | Temporarily relax rules; redeploy rules |
| **Spond API down** | Spond events won't load; other features unaffected |
| **OpenAI API key expired** | Voice/Photo/Recipe features fail; update key in `functions/.env` |
| **FCM push notifications failing** | Check FCM token validity; users can toggle notifications |
| **Web app blank screen** | Check browser console; likely import error; rollback hosting |

#### Step 4: Fix

1. Identify root cause from logs
2. Fix in source code
3. Test locally with Firebase Emulator
4. Deploy fix
5. Verify fix in production

#### Step 5: Communicate

For P0/P1 incidents:
- Notify affected users via chat (if accessible)
- Document the incident timeline
- Update this runbook if needed

### Specific Incident Playbooks

#### Cloud Functions Not Executing

1. Check Firebase Console > Functions for deployment status
2. Check if billing is enabled (Functions require billing)
3. Verify `functions/.env` exists with valid `OPENAI_API_KEY`
4. Redeploy: `npx firebase-tools deploy --only functions --project familiesenter-837bb`

#### Push Notifications Not Sending

1. Check `checkReminders` function logs
2. Verify FCM tokens in `users` collection
3. Check if `sentNotifications` collection has stale entries
4. Verify `notificationsEnabled` is true in user profiles
5. Check Firebase Cloud Messaging quota in Google Cloud Console

#### Spond Events Not Loading

1. Test Spond API directly: `curl https://api.spond.com/core/v1/auth2/login`
2. Check `spondProxy` function logs
3. Verify Spond credentials in `families/{familyId}/config/spond`
4. Check if Spond API has changed endpoints

#### High Firestore Costs

1. Check Firestore > Usage for unusual read/write spikes
2. Review queries for missing `.limit()` clauses
3. Check for N+1 query patterns in service files
4. Verify `onSnapshot` listeners are properly cleaned up
5. Review Cloud Function `checkReminders` — it queries all events every minute

#### Web App Performance Degradation

1. Check Lighthouse scores
2. Review bundle size: `npx expo export --platform web --output-dir dist/web`
3. Verify code splitting is working (lazy-loaded screens)
4. Check for large images being uploaded without compression
5. Review Firestore query performance in console

---

## Performance Monitoring

### Client-Side Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **First Contentful Paint** | < 2s | Lighthouse |
| **Largest Contentful Paint** | < 3s | Lighthouse |
| **Time to Interactive** | < 4s | Lighthouse |
| **Cumulative Layout Shift** | < 0.1 | Lighthouse |
| **Bundle size** | < 500KB | `expo export` output |

### Firestore Query Performance

All service files use `.limit()` on queries:

```typescript
// tripService.ts
const q = query(collection(db, 'trips'), where('familyId', '==', familyId), orderBy('startDate', 'desc'), limit(100));

// EventsScreen queries
const q = query(collection(db, 'events'), where('familyId', '==', familyId), orderBy('date', 'asc'), limit(200));
```

### Cloud Function Performance

Monitor execution times in Firebase Console > Functions:

| Function | Expected Time | Max Timeout |
|----------|---------------|-------------|
| `spondProxy` | 1-3s | 60s |
| `voiceToEvent` | 5-15s | 60s |
| `photoToData` | 3-10s | 60s |
| `destinationTips` | 3-8s | 60s |
| `checkReminders` | 5-30s | 540s (9 min) |
| `checkBirthdayReminders` | 10-60s | 540s (9 min) |

---

## Security Monitoring

### Access Pattern Monitoring

| Check | Frequency | Where |
|-------|-----------|-------|
| Firestore rules violations | Daily | Console > Firestore > Rules |
| Failed auth attempts | Weekly | Console > Authentication |
| Cloud Function 401/403 errors | Weekly | Function logs |
| Invite code usage patterns | Monthly | `families` collection |

### Security Best Practices

1. **Never commit secrets**: Verify `functions/.env` is in `.gitignore`
2. **Review Firestore rules**: Before deploying rule changes
3. **Audit family memberships**: Check for orphaned users
4. **Monitor Cloud Functions**: Watch for unauthorized access attempts
5. **Rotate OpenAI key**: If compromised, update in `functions/.env` and redeploy

### Data Isolation Verification

Every Firestore document must have `familyId`. To verify:

```bash
# Check for documents without familyId (should be 0)
firebase firestore:get /events --project familiesenter-837bb | grep -v familyId
```

---

## Health Checks

### Automated Health Checks

The `checkReminders` Cloud Function runs every minute, providing implicit health monitoring. If it fails, notifications stop.

### Manual Health Checks

#### Weekly Checklist

- [ ] Check Cloud Function logs for errors
- [ ] Verify Firestore usage is within expected ranges
- [ ] Check hosting bandwidth and cache hit rates
- [ ] Test push notification delivery
- [ ] Verify Spond integration is working
- [ ] Test OpenAI-dependent features (voice, photo, recipes)

#### Pre-Deployment Checklist

- [ ] Run `node -e "..."` to verify i18n key sync across all 5 language files
- [ ] Check browser console for blank screen errors
- [ ] Test on mobile PWA (iOS Safari, Android Chrome)
- [ ] Verify all Cloud Functions respond to POST requests
- [ ] Check Firestore rules deploy without errors
- [ ] Verify composite indexes match query patterns

---

## Alerting Recommendations

### Firebase Console Alerts

Set up alerts in Google Cloud Console > Monitoring:

| Alert | Condition | Action |
|-------|-----------|--------|
| Function error rate | > 5% for 5 minutes | Email notification |
| Function timeout rate | > 10% for 5 minutes | Email notification |
| Firestore reads | > 500K/day | Email notification |
| Firestore writes | > 100K/day | Email notification |
| Hosting 4xx rate | > 10% for 15 minutes | Email notification |

### Custom Monitoring

For advanced monitoring, consider:

1. **Sentry or similar**: Client-side error tracking
2. **Firebase Performance Monitoring**: Automatic performance tracking
3. **Google Cloud Monitoring**: Custom dashboards and alerting
4. **Uptime checks**: Periodic HTTP checks on key Cloud Functions

---

*Document generated for Familiesenter v1.0.0*
