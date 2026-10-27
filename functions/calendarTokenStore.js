// Google Calendar token storage.
//
// Refresh and access tokens are stored encrypted (AES-256-GCM) in the
// `calendarTokens/{uid}` collection. Firestore rules deny all client access to
// that collection, so only Cloud Functions (Admin SDK) can read tokens.
// The user document only holds non-secret fields (calendarType, calendarEmail).
//
// Legacy plaintext tokens on `users/{uid}` are migrated on first access and by
// the scheduled sweep (sweepLegacyCalendarTokens) and then deleted from the user doc.

const crypto = require("crypto");
const { FieldValue } = require("firebase-admin/firestore");

const COLLECTION = "calendarTokens";
const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function getKey() {
  const raw = process.env.CALENDAR_TOKEN_KEY;
  if (!raw) throw new Error("CALENDAR_TOKEN_KEY not configured");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("CALENDAR_TOKEN_KEY must be 32 bytes (base64)");
  return key;
}

function encrypt(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

function decrypt(value) {
  if (!value) return null;
  const [version, ivB64, tagB64, dataB64] = value.split(":");
  if (version !== VERSION) throw new Error("Unknown token format");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

// Writes tokens. Pass only the fields that changed; a missing refreshToken keeps the stored one
// (Google only returns refresh_token on first consent).
async function saveCalendarTokens(db, uid, { accessToken, refreshToken, expiresAt }) {
  const update = { updatedAt: Date.now() };
  if (accessToken) update.accessToken = encrypt(accessToken);
  if (refreshToken) update.refreshToken = encrypt(refreshToken);
  if (expiresAt) update.expiresAt = expiresAt;
  await db.collection(COLLECTION).doc(uid).set(update, { merge: true });
}

function readRecord(record) {
  return {
    accessToken: record.accessToken ? decrypt(record.accessToken) : null,
    refreshToken: record.refreshToken ? decrypt(record.refreshToken) : null,
    expiresAt: record.expiresAt || 0,
  };
}

// Returns { accessToken, refreshToken, expiresAt } or null if the user is not connected.
// Falls back to legacy plaintext fields on users/{uid} and migrates them.
async function getCalendarTokens(db, uid) {
  const snap = await db.collection(COLLECTION).doc(uid).get();
  if (snap.exists) return readRecord(snap.data());

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const user = userSnap.data();
  if (!user?.calendarRefreshToken) return null;

  const legacy = {
    accessToken: user.calendarAccessToken || null,
    refreshToken: user.calendarRefreshToken,
    expiresAt: user.calendarTokenExpiry || 0,
  };
  await saveCalendarTokens(db, uid, legacy);
  await userRef.update(legacyDeleteFields());
  return legacy;
}

function legacyDeleteFields() {
  return {
    calendarAccessToken: FieldValue.delete(),
    calendarRefreshToken: FieldValue.delete(),
    calendarTokenExpiry: FieldValue.delete(),
  };
}

async function deleteCalendarTokens(db, uid) {
  await db.collection(COLLECTION).doc(uid).delete();
  await db.collection("users").doc(uid).update({
    calendarType: FieldValue.delete(),
    calendarEmail: FieldValue.delete(),
    calendarConnected: FieldValue.delete(),
    ...legacyDeleteFields(),
  }).catch(() => {});
}

async function hasCalendarTokens(db, uid) {
  const snap = await db.collection(COLLECTION).doc(uid).get();
  if (snap.exists && snap.data().refreshToken) return true;
  const user = (await db.collection("users").doc(uid).get()).data();
  return !!user?.calendarRefreshToken;
}

// Moves every legacy plaintext token off user documents. Returns the number migrated.
async function sweepLegacyCalendarTokens(db) {
  const snap = await db.collection("users").where("calendarRefreshToken", "!=", null).limit(200).get();
  let migrated = 0;
  for (const doc of snap.docs) {
    try {
      const data = doc.data();
      await saveCalendarTokens(db, doc.id, {
        accessToken: data.calendarAccessToken || null,
        refreshToken: data.calendarRefreshToken,
        expiresAt: data.calendarTokenExpiry || 0,
      });
      await doc.ref.update(legacyDeleteFields());
      migrated++;
    } catch (error) {
      console.error(`sweepLegacyCalendarTokens: failed for ${doc.id}`, error);
    }
  }
  return migrated;
}

module.exports = {
  encrypt,
  decrypt,
  saveCalendarTokens,
  getCalendarTokens,
  deleteCalendarTokens,
  hasCalendarTokens,
  sweepLegacyCalendarTokens,
};
