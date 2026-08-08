# Operations Documentation

## Deployment Procedures

### Web App Deployment
```bash
npx expo export --platform web --output-dir dist/web
npx firebase-tools deploy --only hosting --project familiesenter-837bb
```

### Cloud Functions Deployment
```bash
npx firebase-tools deploy --only functions --project familiesenter-837bb
```

### Firestore Rules Deployment
```bash
npx firebase-tools deploy --only firestore:rules --project familiesenter-837bb
```

### Firestore Indexes Deployment
```bash
npx firebase-tools deploy --only firestore:indexes --project familiesenter-837bb
```

## Monitoring

### Firebase Console
- Realtime Database: Monitor read/write operations
- Cloud Functions: Check logs for errors
- Hosting: View deployment history
- Authentication: Monitor user sign-ups and sign-ins

### Key Metrics to Watch
- Cloud Functions execution time
- Firestore read/write operations
- Storage usage
- Authentication events

## Incident Response

### If data breach suspected:
1. Immediately revoke all active sessions
2. Check Cloud Functions logs for unauthorized access
3. Review Firestore rules for gaps
4. Notify affected users within 72 hours (GDPR requirement)

### If service is down:
1. Check Firebase status page
2. Check Cloud Functions logs
3. Check Firestore rules for syntax errors
4. Verify deployment was successful

## Backup and Recovery

### Current State: NOT IMPLEMENTED
- No automated backups
- No disaster recovery plan

### Recommended:
1. Enable Firestore automated backups
2. Document recovery procedures
3. Test recovery process quarterly

## Cost Management

### Firebase Pricing
- Firestore: Pay per read/write operation
- Cloud Functions: Pay per invocation
- Hosting: Free tier (10GB storage, 10GB transfer/month)
- Storage: Pay per GB stored and transferred

### Monitoring Costs
- Check Firebase console billing dashboard
- Set up budget alerts
- Review usage monthly