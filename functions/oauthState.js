// Signed OAuth "state" for the Google Calendar connect flow.
//
// The start endpoint (authenticated) issues a state that binds the Firebase uid
// to a short expiry, signed with HMAC-SHA256. The callback accepts only states it
// can verify, so a caller cannot pick which user's account gets linked.

const crypto = require("crypto");

const STATE_TTL_MS = 10 * 60 * 1000;

function getSigningKey() {
  const raw = process.env.CALENDAR_TOKEN_KEY;
  if (!raw) throw new Error("CALENDAR_TOKEN_KEY not configured");
  // Derive a separate key for OAuth state so it is not the token encryption key itself
  return crypto.createHmac("sha256", Buffer.from(raw, "base64")).update("oauth-state").digest();
}

function sign(payload) {
  return crypto.createHmac("sha256", getSigningKey()).update(payload).digest("base64url");
}

function createState(uid, now = Date.now()) {
  if (!uid || typeof uid !== "string") throw new Error("uid required");
  const nonce = crypto.randomBytes(12).toString("base64url");
  const payload = `${uid}.${now + STATE_TTL_MS}.${nonce}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

// Returns the uid if the state is authentic and not expired, otherwise null.
function verifyState(state, now = Date.now()) {
  if (typeof state !== "string") return null;
  const dot = state.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = Buffer.from(state.slice(0, dot), "base64url").toString("utf8");
  const mac = state.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [uid, expiresAt] = payload.split(".");
  if (!uid || Number(expiresAt) < now) return null;
  return uid;
}

module.exports = { createState, verifyState, STATE_TTL_MS };
