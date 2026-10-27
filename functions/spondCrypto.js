// Spond password encryption.
//
// Format v1 (current): "v1:<iv base64>:<tag base64>:<ciphertext base64>", AES-256-GCM,
// key from SPOND_ENCRYPTION_KEY (32 random bytes, base64). No default key.
//
// Legacy format (read-only): "<iv hex>:<ciphertext hex>", AES-256-CBC with a key derived
// from SPOND_ENCRYPTION_KEY, or from the old hardcoded default when the variable was not set.
// Legacy values are decrypted for compatibility and re-encrypted to v1 on the next save.

const crypto = require("crypto");

const V1 = "v1";
const LEGACY_DEFAULT_SECRET = "familiesenter-default-key-change-me";

function getKey() {
  const raw = process.env.SPOND_ENCRYPTION_KEY;
  if (!raw) throw new Error("SPOND_ENCRYPTION_KEY not configured");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("SPOND_ENCRYPTION_KEY must be 32 bytes (base64)");
  return key;
}

function encryptSpondPassword(plaintext) {
  if (!plaintext) throw new Error("No password to encrypt");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [V1, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

function decryptV1(value) {
  const [, ivB64, tagB64, dataB64] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

function decryptLegacy(value) {
  const secret = process.env.SPOND_ENCRYPTION_KEY || LEGACY_DEFAULT_SECRET;
  const key = crypto.createHash("sha256").update(secret).digest();
  const [ivHex, dataHex] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
  return decipher.update(dataHex, "hex", "utf8") + decipher.final("utf8");
}

// Returns { plaintext, needsReencrypt }. Accepts the "enc:" storage prefix too.
function decryptStoredPassword(stored) {
  if (!stored) return { plaintext: stored, needsReencrypt: false };
  const value = stored.startsWith("enc:") ? stored.slice(4) : stored;
  if (value.startsWith(`${V1}:`)) {
    return { plaintext: decryptV1(value), needsReencrypt: false };
  }
  if (/^[0-9a-f]{32}:[0-9a-f]+$/.test(value)) {
    return { plaintext: decryptLegacy(value), needsReencrypt: true };
  }
  throw new Error("Unknown Spond password format");
}

module.exports = { encryptSpondPassword, decryptStoredPassword };
