require("dotenv").config();
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const OpenAI = require("openai");
const functions = require("firebase-functions");
const Busboy = require("busboy");
const crypto = require("crypto");

initializeApp();

function reminderMinutesLabel(minutes) {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} minutter`;
  if (minutes === 60) return '1 time';
  if (minutes === 120) return '2 timer';
  if (minutes === 1440) return '1 dag';
  if (minutes === 10080) return '1 uke';
  if (minutes < 1440) return `${minutes / 60} timer`;
  if (minutes < 10080) return `${minutes / 1440} dager`;
  return `${minutes / 10080} uker`;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SPOND_API_BASE = "https://api.spond.com/core/v1";

const ALLOWED_ORIGINS = [
  "https://familiesenter-837bb.web.app",
  "https://familiesenter-837bb.firebaseapp.com",
  "https://fampad.app",
  "http://localhost:8081",
  "http://localhost:19006",
];

function setCorsHeaders(res, req) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin) || (origin && /^http:\/\/localhost:\d+$/.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Filename, X-Type");
}

async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

// Spond password encryption/decryption
const SPOND_ENCRYPTION_KEY = process.env.SPOND_ENCRYPTION_KEY || "familiesenter-default-key-change-me";

function encryptSpondPassword(plaintext) {
  const key = crypto.createHash("sha256").update(SPOND_ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptSpondPassword(encrypted) {
  if (!encrypted || !encrypted.includes(":")) return encrypted;
  const key = crypto.createHash("sha256").update(SPOND_ENCRYPTION_KEY).digest();
  const [ivHex, encryptedData] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Rate limiting - per-user, per-function
const RATE_LIMITS = {
  spondProxy: { maxRequests: 30, windowMinutes: 1 },
  photoToData: { maxRequests: 5, windowMinutes: 1 },
  voiceToEvent: { maxRequests: 5, windowMinutes: 1 },
  destinationTips: { maxRequests: 10, windowMinutes: 1 },
  notifyNewEvent: { maxRequests: 10, windowMinutes: 1 },
  notifyHealthItem: { maxRequests: 10, windowMinutes: 1 },
  aiRecipeSuggestions: { maxRequests: 10, windowMinutes: 1 },
  importRecipeFromUrl: { maxRequests: 5, windowMinutes: 1 },
  translateRecipe: { maxRequests: 10, windowMinutes: 1 },
  backfillCalendarSync: { maxRequests: 3, windowMinutes: 10 },
};

let rateLimitsCache = null;
let rateLimitsCacheTime = 0;
const RATE_LIMITS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getRateLimitsConfig() {
  const now = Date.now();
  if (rateLimitsCache && (now - rateLimitsCacheTime) < RATE_LIMITS_CACHE_TTL) {
    return rateLimitsCache;
  }
  try {
    const db = getFirestore();
    const snap = await db.collection("systemConfig").doc("rateLimits").get();
    if (snap.exists && snap.data().limits) {
      rateLimitsCache = snap.data().limits;
      rateLimitsCacheTime = now;
      return rateLimitsCache;
    }
  } catch (error) {
    // Fall back to defaults
  }
  rateLimitsCache = RATE_LIMITS;
  rateLimitsCacheTime = now;
  return RATE_LIMITS;
}

async function checkRateLimit(uid, functionName) {
  const limits = await getRateLimitsConfig();
  const config = limits[functionName];
  if (!config) return true;

  const db = getFirestore();
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000);

  const rateLimitRef = db.collection("rateLimits").doc(`${uid}_${functionName}`);
  const snap = await rateLimitRef.get();

  if (snap.exists) {
    const data = snap.data();
    const requests = (data.requests || []).filter(ts => new Date(ts) > windowStart);
    if (requests.length >= config.maxRequests) {
      return false;
    }
    requests.push(now.toISOString());
    await rateLimitRef.set({ requests, lastUpdated: now.toISOString() });
  } else {
    await rateLimitRef.set({ requests: [now.toISOString()], lastUpdated: now.toISOString() });
  }
  return true;
}

async function verifyAppOwner(req) {
  const uid = await verifyAuth(req);
  if (!uid) return null;
  const db = getFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists || userSnap.data().appRole !== "appOwner") return null;
  return uid;
}

exports.grantAppOwner = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden: App owner access required" });

  const { targetUid } = req.body;
  if (!targetUid) return res.status(400).json({ error: "targetUid is required" });

  const db = getFirestore();
  await db.collection("users").doc(targetUid).update({ appRole: "appOwner" });

  await db.collection("auditLogs").add({
    action: "grantAppOwner",
    performedBy: uid,
    targetUid,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ success: true });
});

exports.revokeAppOwner = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden: App owner access required" });

  const { targetUid } = req.body;
  if (!targetUid) return res.status(400).json({ error: "targetUid is required" });
  if (targetUid === uid) return res.status(400).json({ error: "Cannot revoke your own app owner access" });

  const db = getFirestore();
  await db.collection("users").doc(targetUid).update({ appRole: null });

  await db.collection("auditLogs").add({
    action: "revokeAppOwner",
    performedBy: uid,
    targetUid,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ success: true });
});

// Audit logging - log critical actions
async function logAuditEvent(uid, action, details = {}) {
  try {
    const db = getFirestore();
    await db.collection("auditLogs").add({
      uid,
      action,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || "unknown",
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
}

async function trackUsageLog(uid, functionName, familyId) {
  try {
    const db = getFirestore();
    await db.collection("usageLogs").add({
      uid,
      familyId: familyId || null,
      functionName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Silent fail - don't block main function
  }
}

// Admin Stats - get cached dashboard data
exports.getAdminStats = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden: App owner access required" });

  const db = getFirestore();
  const statsSnap = await db.collection("systemConfig").doc("adminStats").get();

  if (!statsSnap.exists) {
    return res.status(200).json({
      totalFamilies: 0,
      totalUsers: 0,
      newThisWeek: 0,
      apiCallsToday: 0,
      storageUsed: "0 MB",
      lastUpdated: null,
    });
  }

  return res.status(200).json(statsSnap.data());
});

// Update admin stats - scheduled hourly
exports.updateAdminStats = onSchedule({ schedule: "every 1 hours", timeZone: "Europe/Oslo", region: "us-central1" }, async (event) => {
  const db = getFirestore();

  try {
    // Count families
    const familiesSnap = await db.collection("families").count().get();
    const totalFamilies = familiesSnap.data().count;

    // Count users
    const usersSnap = await db.collection("users").count().get();
    const totalUsers = usersSnap.data().count;

    // New users this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsersSnap = await db.collection("users")
      .where("createdAt", ">=", oneWeekAgo.getTime())
      .count().get();
    const newThisWeek = newUsersSnap.data().count;

    // API calls today (from usageLogs)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const apiCallsSnap = await db.collection("usageLogs")
      .where("timestamp", ">=", todayStart.toISOString())
      .count().get();
    const apiCallsToday = apiCallsSnap.data().count;

    // Count events
    const eventsSnap = await db.collection("events").count().get();

    // Count health appointments
    const healthSnap = await db.collectionGroup("health").doc("appointments").get().catch(() => null);

    // Update stats
    await db.collection("systemConfig").doc("adminStats").set({
      totalFamilies,
      totalUsers,
      newThisWeek,
      apiCallsToday,
      totalEvents: eventsSnap.data().count,
      storageUsed: "0 MB",
      lastUpdated: new Date().toISOString(),
    });

    console.log(`Admin stats updated: ${totalFamilies} families, ${totalUsers} users, ${apiCallsToday} API calls`);
  } catch (error) {
    console.error("Failed to update admin stats:", error.message);
  }
});

// Manual trigger for admin stats (temporary - for initial data population)
exports.triggerAdminStats = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden" });

  const db = getFirestore();
  try {
    const familiesSnap = await db.collection("families").count().get();
    const totalFamilies = familiesSnap.data().count;

    const usersSnap = await db.collection("users").count().get();
    const totalUsers = usersSnap.data().count;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsersSnap = await db.collection("users")
      .where("createdAt", ">=", oneWeekAgo.getTime())
      .count().get();
    const newThisWeek = newUsersSnap.data().count;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const apiCallsSnap = await db.collection("usageLogs")
      .where("timestamp", ">=", todayStart.toISOString())
      .count().get();
    const apiCallsToday = apiCallsSnap.data().count;

    const eventsSnap = await db.collection("events").count().get();

    await db.collection("systemConfig").doc("adminStats").set({
      totalFamilies,
      totalUsers,
      newThisWeek,
      apiCallsToday,
      totalEvents: eventsSnap.data().count,
      storageUsed: "0 MB",
      lastUpdated: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, totalFamilies, totalUsers, newThisWeek, apiCallsToday });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Track usage - log API calls for cost tracking
exports.trackUsage = onRequest({ region: "us-central1", memory: "128MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { functionName, familyId, costEstimate } = req.body;
  if (!functionName) return res.status(400).json({ error: "functionName is required" });

  const db = getFirestore();
  await db.collection("usageLogs").add({
    uid,
    familyId: familyId || null,
    functionName,
    costEstimate: costEstimate || 0,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ success: true });
});

// Admin: Get usage stats for cost dashboard
exports.getUsageStats = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden: App owner access required" });

  const db = getFirestore();
  const days = parseInt(req.query.days) || 7;

  // Cost estimates per function (USD)
  const COST_PER_CALL = {
    voiceToEvent: 0.01,
    photoToData: 0.005,
    spondProxy: 0.001,
    destinationTips: 0.002,
    aiRecipeSuggestions: 0.003,
    reminderNotification: 0.001,
    birthdayNotification: 0.001,
  };

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logsSnap = await db.collection("usageLogs")
      .where("timestamp", ">=", startDate.toISOString())
      .orderBy("timestamp", "desc")
      .limit(10000)
      .get();

    // Aggregate by function
    const byFunction = {};
    const byDay = {};
    let totalCost = 0;

    logsSnap.docs.forEach(doc => {
      const data = doc.data();
      const fn = data.functionName || "unknown";
      const date = (data.timestamp || "").substring(0, 10);
      const cost = COST_PER_CALL[fn] || 0.001;

      if (!byFunction[fn]) byFunction[fn] = { count: 0, cost: 0 };
      byFunction[fn].count++;
      byFunction[fn].cost += cost;

      if (!byDay[date]) byDay[date] = { count: 0, cost: 0 };
      byDay[date].count++;
      byDay[date].cost += cost;

      totalCost += cost;
    });

    // Convert daily costs to array sorted by date
    const dailyStats = Object.entries(byDay)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      totalCalls: logsSnap.docs.length,
      totalCost: Math.round(totalCost * 100) / 100,
      byFunction: Object.entries(byFunction).map(([name, stats]) => ({
        name,
        count: stats.count,
        cost: Math.round(stats.cost * 100) / 100,
      })).sort((a, b) => b.count - a.count),
      dailyStats,
      days,
    });
  } catch (error) {
    console.error("Failed to get usage stats:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Admin: Get list of all families with member counts
exports.getFamilyList = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden: App owner access required" });

  const db = getFirestore();
  const familiesSnap = await db.collection("families").limit(500).get();

  const families = [];
  for (const doc of familiesSnap.docs) {
    const data = doc.data();
    const members = data.members || {};
    const memberCount = Object.keys(members).length;
    const ownerUid = Object.entries(members).find(([_, v]) => v.role === "owner")?.[0] || null;

    let ownerName = "";
    if (ownerUid) {
      const ownerSnap = await db.collection("users").doc(ownerUid).get();
      if (ownerSnap.exists) {
        ownerName = ownerSnap.data().displayName || ownerSnap.data().email || "";
      }
    }

    const eventsSnap = await db.collection("events")
      .where("familyId", "==", doc.id)
      .count().get();

    families.push({
      id: doc.id,
      name: data.name || "Unknown",
      memberCount,
      ownerName,
      ownerUid,
      eventCount: eventsSnap.data().count,
      createdAt: data.createdAt || null,
    });
  }

  return res.status(200).json({ families });
});

// Admin: Get detail for a specific family
exports.getFamilyDetail = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden: App owner access required" });

  const familyId = req.query.familyId;
  if (!familyId) return res.status(400).json({ error: "familyId is required" });

  const db = getFirestore();
  const familySnap = await db.collection("families").doc(familyId).get();
  if (!familySnap.exists) return res.status(404).json({ error: "Family not found" });

  const familyData = familySnap.data();
  const members = familyData.members || {};

  const memberUids = Object.keys(members);
  const memberDetails = [];
  for (const mUid of memberUids) {
    const userSnap = await db.collection("users").doc(mUid).get();
    if (userSnap.exists) {
      const userData = userSnap.data();
      memberDetails.push({
        uid: mUid,
        displayName: userData.displayName || "",
        email: userData.email || "",
        role: members[mUid].role,
        createdAt: userData.createdAt || null,
      });
    }
  }

  const counts = {};
  const collections = ["events", "birthdays", "trips", "recipes"];
  for (const col of collections) {
    const snap = await db.collection(col).where("familyId", "==", familyId).count().get();
    counts[col] = snap.data().count;
  }

  const subcollections = ["petVetVisits", "petVaccinations", "petMedications", "schoolHolidays", "kindergartenHolidays"];
  for (const col of subcollections) {
    const snap = await db.collectionGroup(col).where("familyId", "==", familyId).count().get();
    counts[col] = snap.data().count;
  }

  const schoolActSnap = await db.collection("schoolActivities").doc(familyId).collection("activities").count().get();
  counts.schoolActivities = schoolActSnap.data().count;

  const kgActSnap = await db.collection("kindergartenActivities").doc(familyId).collection("activities").count().get();
  counts.kindergartenActivities = kgActSnap.data().count;

  const healthSnap = await db.collection("health").doc(familyId).collection("appointments").count().get();
  counts.healthAppointments = healthSnap.data().count;

  const healthMedSnap = await db.collection("health").doc(familyId).collection("medications").count().get();
  counts.healthMedications = healthMedSnap.data().count;

  return res.status(200).json({
    family: {
      id: familyId,
      name: familyData.name,
      createdAt: familyData.createdAt,
    },
    members: memberDetails,
    counts,
  });
});

// Admin: Get current rate limits
exports.getRateLimits = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden: App owner access required" });

  const db = getFirestore();
  const configSnap = await db.collection("systemConfig").doc("rateLimits").get();

  if (configSnap.exists) {
    return res.status(200).json(configSnap.data());
  }

  // Return default hardcoded limits
  return res.status(200).json({
    limits: {
      spondProxy: { maxRequests: 30, windowMinutes: 1 },
      photoToData: { maxRequests: 5, windowMinutes: 1 },
      voiceToEvent: { maxRequests: 5, windowMinutes: 1 },
      destinationTips: { maxRequests: 10, windowMinutes: 1 },
      notifyNewEvent: { maxRequests: 10, windowMinutes: 1 },
      notifyHealthItem: { maxRequests: 10, windowMinutes: 1 },
      aiRecipeSuggestions: { maxRequests: 10, windowMinutes: 1 },
      importRecipeFromUrl: { maxRequests: 5, windowMinutes: 1 },
      translateRecipe: { maxRequests: 10, windowMinutes: 1 },
    },
    source: "default",
  });
});

// Admin: Update rate limits
exports.updateRateLimits = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAppOwner(req);
  if (!uid) return res.status(403).json({ error: "Forbidden: App owner access required" });

  const { limits } = req.body;
  if (!limits || typeof limits !== "object") {
    return res.status(400).json({ error: "limits object is required" });
  }

  // Validate limits
  for (const [fn, config] of Object.entries(limits)) {
    if (typeof config !== "object" || !config.maxRequests || !config.windowMinutes) {
      return res.status(400).json({ error: `Invalid config for ${fn}` });
    }
  }

  const db = getFirestore();
  await db.collection("systemConfig").doc("rateLimits").set({
    limits,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  });

  await db.collection("auditLogs").add({
    action: "updateRateLimits",
    performedBy: uid,
    details: { limits },
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ success: true });
});

// Centralized notification helper - used by all notification functions
async function sendNotification({ familyId, title, body, notifKey, excludeUid }) {
  const db = getFirestore();

  // Get family members with FCM tokens
  const familySnap = await db.collection("families").doc(familyId).get();
  if (!familySnap.exists) return 0;
  const membersMap = familySnap.data().members || {};
  const memberUids = Object.keys(membersMap).filter(uid => uid !== excludeUid);
  console.log(`sendNotification: family ${familyId} has ${memberUids.length} members (excluded: ${excludeUid || 'none'})`);

  const tokens = [];
  for (let i = 0; i < memberUids.length; i += 10) {
    const batch = memberUids.slice(i, i + 10);
    const usersSnap = await db.collection("users").where("__name__", "in", batch).get();
    usersSnap.forEach((uDoc) => {
      const uData = uDoc.data();
      if (uData.fcmToken && uData.notificationsEnabled !== false) {
        tokens.push({ uid: uDoc.id, fcmToken: uData.fcmToken });
      } else {
        console.log(`sendNotification: skipping ${uDoc.id} - fcmToken: ${!!uData.fcmToken}, notificationsEnabled: ${uData.notificationsEnabled}`);
      }
    });
  }

  if (tokens.length === 0) {
    console.log(`sendNotification: no valid tokens found for family ${familyId}`);
    return 0;
  }

  // Deduplication check
  if (notifKey) {
    const notifSnap = await db.collection("sentNotifications").doc(notifKey).get();
    if (notifSnap.exists) {
      console.log(`sendNotification: dedup blocked for ${notifKey}`);
      return 0;
    }
  }

  // Send to all family members
  const results = await Promise.allSettled(
    tokens.map(async (t) => {
      try {
        await getMessaging().send({
          token: t.fcmToken,
          notification: { title, body },
          webpush: {
            notification: { icon: "/icon.png", badge: "/icon.png", tag: notifKey || title },
            fcmOptions: { link: "/" },
          },
          data: { url: "/", type: "notification" },
        });
        console.log(`sendNotification: sent to ${t.uid}`);
      } catch (err) {
        console.log(`sendNotification: FAILED for ${t.uid} - ${err.message}`);
      }
      if (notifKey) {
        await db.collection("sentNotifications").doc(notifKey).set({
          sentAt: new Date().toISOString(),
          uid: t.uid,
        });
      }
    })
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  return sent;
}

exports.spondProxy = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Rate limit check
  if (!(await checkRateLimit(uid, "spondProxy"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { action, email, password, token, groupId, groupIds, max, eventId, memberId, accepted } = req.body || {};

  // Decrypt password if it's encrypted
  const decryptedPassword = password ? decryptSpondPassword(password) : password;

  try {
    if (action === "login") {
      const response = await fetch(`${SPOND_API_BASE}/auth2/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: decryptedPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(result);
      }
      trackUsageLog(uid, "spondProxy", req.body.familyId || null);
      return res.status(200).json(result);
    }

    if (!token) {
      return res.status(400).json({ error: "Missing token" });
    }

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    if (action === "groups") {
      const response = await fetch(`${SPOND_API_BASE}/groups/`, {
        headers: authHeaders,
      });
      const result = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(result);
      }
      trackUsageLog(uid, "spondProxy", req.body.familyId || null);
      return res.status(200).json(result);
    }

    if (action === "members") {
      if (!groupId) {
        return res.status(400).json({ error: "Missing groupId" });
      }
      const response = await fetch(`${SPOND_API_BASE}/groups/`, {
        headers: authHeaders,
      });
      const result = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(result);
      }
      const group = (result || []).find((g) => g.id === groupId);
      if (!group) {
        return res.status(200).json([]);
      }
      const members = [];
      for (const m of group.members || []) {
        members.push({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          profileId: m.profile?.id || m.id,
        });
        if (m.guardians) {
          for (const g of m.guardians) {
            members.push({
              id: g.id,
              firstName: g.firstName,
              lastName: g.lastName,
              profileId: g.profile?.id || g.id,
              childId: m.id,
            });
          }
        }
      }
      trackUsageLog(uid, "spondProxy", req.body.familyId || null);
      return res.status(200).json(members);
    }

    if (action === "events") {
      const ids = groupIds || (groupId ? [groupId] : []);
      const allEvents = [];
      for (const gid of ids) {
        try {
          const response = await fetch(
            `${SPOND_API_BASE}/sponds/?groupId=${gid}&max=${max || 100}`,
            { headers: authHeaders }
          );
          if (response.ok) {
            const events = await response.json();
            (events || []).forEach((e) => {
              allEvents.push({ ...e, _groupId: gid });
            });
    } else if (type === "recipe") {
            console.warn(`spondProxy: group ${gid} returned ${response.status}`);
          }
        } catch (e) {
          console.warn(`spondProxy: group ${gid} failed:`, e.message);
        }
      }
      trackUsageLog(uid, "spondProxy", req.body.familyId || null);
      return res.status(200).json(allEvents);
    }

    if (action === "changeResponse") {
      if (!eventId || !memberId) {
        return res.status(400).json({ error: "Missing eventId or memberId" });
      }
      const response = await fetch(
        `${SPOND_API_BASE}/sponds/${eventId}/responses/${memberId}`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ accepted: accepted ? "true" : "false" }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(result);
      }
      trackUsageLog(uid, "spondProxy", req.body.familyId || null);
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error("Spond proxy error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

exports.voiceToEvent = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Rate limit check
  if (!(await checkRateLimit(uid, "voiceToEvent"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const contentType = req.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');
    console.log(`Received audio upload, content-type: ${contentType}, isMultipart: ${isMultipart}`);

    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody || []);
    console.log(`Raw body size: ${rawBody.length} bytes`);

    let audioBuffer;
    let filename = 'recording.webm';

    if (rawBody.length === 0) {
      return res.status(400).json({ error: "No audio data received" });
    }

    if (isMultipart) {
      console.log('Parsing multipart form data with busboy...');
      const { Readable } = require('stream');
      audioBuffer = await new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: { 'content-type': contentType } });
        let fileBuffer = null;

        busboy.on('file', (fieldname, file, info) => {
          filename = info.filename || 'recording.webm';
          console.log(`Busboy found file: ${filename}`);
          const chunks = [];
          file.on('data', (chunk) => chunks.push(chunk));
          file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
            console.log(`Busboy file parsed: ${fileBuffer.length} bytes`);
          });
        });

        busboy.on('finish', () => resolve(fileBuffer));
        busboy.on('error', (err) => {
          console.error('Busboy error:', err);
          reject(err);
        });

        const readable = new Readable();
        readable.push(rawBody);
        readable.push(null);
        readable.pipe(busboy);
      });
    } else {
      console.log('Reading raw binary body...');
      filename = req.headers['x-filename'] || 'recording.webm';
      audioBuffer = rawBody;
    }

    console.log(`Audio buffer: ${audioBuffer ? audioBuffer.length : 0} bytes, filename: ${filename}`);

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: "No audio data received" });
    }

    const ext = filename.split('.').pop() || 'webm';
    const filetype = ext === 'm4a' ? 'audio/mp4' : `audio/${ext}`;
    const audioFile = new File([audioBuffer], filename, { type: filetype });

    console.log(`Sending to Whisper API: ${filename} (${filetype}, ${audioBuffer.length} bytes)`);
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      language: "no",
    });

    const transcript = transcription.text;
    console.log(`Transcript: ${transcript}`);

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: "Could not transcribe audio" });
    }

    const today = new Date().toISOString().split("T")[0];

    // Determine type from request header
    const activityType = req.headers['x-type'] || 'event';

    const typePrompts = {
      event: `Return ONLY valid JSON with this exact structure:
{
  "title": "event title",
  "description": "description or empty string",
  "date": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD or null",
  "time": "HH:MM",
  "endTime": "HH:MM or null",
  "reminderMinutes": 30
}

If no end time is mentioned, set endTime to null.
If no end date is mentioned, set endDate to null.
If no specific time is mentioned, default to "09:00".
If no specific reminder is mentioned, default to 30 minutes.
Always extract a meaningful title from the speech.`,
      healthAppointment: `Return ONLY valid JSON with this exact structure:
{
  "title": "appointment title (e.g. 'Legetime', 'Tannlege')",
  "person": "patient/person name or empty string",
  "doctor": "doctor name or empty string",
  "date": "YYYY-MM-DD",
  "dateTo": "YYYY-MM-DD or same as date",
  "startTime": "HH:MM",
  "endTime": "HH:MM or empty string",
  "location": "location or empty string",
  "reminderMinutes": 60
}

If no time is mentioned, default to "10:00".
If no reminder is mentioned, default to 60 minutes (1 hour).
Extract doctor name if mentioned.`,
      vetVisit: `Return ONLY valid JSON with this exact structure:
{
  "title": "visit title (e.g. 'Veterinærbesøk', 'Vaksine')",
  "doctor": "vet name or empty string",
  "date": "YYYY-MM-DD",
  "dateTo": "YYYY-MM-DD or same as date",
  "startTime": "HH:MM",
  "endTime": "HH:MM or empty string",
  "location": "location or empty string",
  "reminderMinutes": 60
}

If no time is mentioned, default to "10:00".
If no reminder is mentioned, default to 60 minutes.`,
      schoolActivity: `Return ONLY valid JSON with this exact structure:
{
  "title": "activity title (e.g. 'Tur til marka', 'Foreldremøte')",
  "activityType": "tur" or "aktivitet" or "møte",
  "date": "YYYY-MM-DD",
  "dateTo": "YYYY-MM-DD or same as date",
  "startTime": "HH:MM",
  "endTime": "HH:MM or empty string",
  "location": "location or empty string",
  "reminderMinutes": 60
}

Use "tur" for hikes/walks, "aktivitet" for activities, "møte" for meetings.
If no time is mentioned, default to "10:00".
If no reminder is mentioned, default to 60 minutes.`,
      kindergartenActivity: `Return ONLY valid JSON with this exact structure:
{
  "title": "activity title (e.g. 'Tur til parken', 'Foreldremøte')",
  "activityType": "tur" or "aktivitet" or "møte",
  "date": "YYYY-MM-DD",
  "dateTo": "YYYY-MM-DD or same as date",
  "startTime": "HH:MM",
  "endTime": "HH:MM or empty string",
  "location": "location or empty string",
  "reminderMinutes": 60
}

Use "tur" for hikes/walks, "aktivitet" for activities, "møte" for meetings.
If no time is mentioned, default to "10:00".
If no reminder is mentioned, default to 60 minutes.`,
    };

    const systemPrompt = `You are an activity parser. Convert Norwegian speech into structured data.

Today's date is ${today}.

When the user says "i dag" (today), use today's date.
When the user says "i morgen" (tomorrow), use tomorrow's date.
When the user says "på mandag" (on Monday), "på tirsdag" (on Tuesday), etc., use the next occurrence of that weekday.
When the user says "neste uke" (next week), use dates from next week.

Norwegian days: mandag=Monday, tirsdag=Tuesday, onsdag=Wednesday, torsdag=Thursday, fredag=Friday, lørdag=Saturday, søndag=Sunday.

Norwegian months: januar=January, februar=February, mars=March, april=April, mai=May, juni=June, juli=July, august=August, september=September, oktober=October, november=November, desember=December.

Time expressions: "klokka 14" = 14:00, "halv tre" = 14:30, "kvart over to" = 14:15, "kvart på tre" = 14:45, "formiddag" = morning/10:00, "ettermiddag" = afternoon/15:00, "kveld" = evening/18:00.

${typePrompts[activityType] || typePrompts.event}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    trackUsageLog(uid, "voiceToEvent", req.body.familyId || null);

    // Backward compatible response for event type, full data for activity types
    if (activityType === 'event') {
      return res.status(200).json({
        transcript,
        event: {
          title: result.title || "",
          description: result.description || "",
          date: result.date || today,
          endDate: result.endDate || null,
          time: result.time || "09:00",
          endTime: result.endTime || null,
          reminderMinutes: result.reminderMinutes || 30,
        },
      });
    }

    return res.status(200).json({
      transcript,
      type: activityType,
      data: {
        title: result.title || "",
        date: result.date || today,
        dateTo: result.dateTo || result.date || today,
        startTime: result.startTime || "10:00",
        endTime: result.endTime || "",
        location: result.location || "",
        reminderMinutes: result.reminderMinutes || 60,
        ...(activityType === 'healthAppointment' ? { person: result.person || '', doctor: result.doctor || '' } : {}),
        ...(activityType === 'vetVisit' ? { doctor: result.doctor || '' } : {}),
        ...(activityType === 'schoolActivity' || activityType === 'kindergartenActivity' ? { activityType: result.activityType || 'aktivitet' } : {}),
      },
    });
  } catch (error) {
    console.error("Voice to event error:", error.message, error.stack);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

exports.photoToData = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Rate limit check
  if (!(await checkRateLimit(uid, "photoToData"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { imageBase64, type } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data received" });
    }

    if (type !== "event" && type !== "recipe" && type !== "classlist" && type !== "holidays" && type !== "healthAppointment" && type !== "vetVisit" && type !== "schoolActivity" && type !== "kindergartenActivity" && type !== "homeService" && type !== "trip" && type !== "timetable") {
      return res.status(400).json({ error: "Invalid type." });
    }

    const today = new Date().toISOString().split("T")[0];

    let systemPrompt;
    let userText;

    if (type === "event") {
      systemPrompt = `You are an event parser. Extract ALL events visible in this image and return structured data.

Today's date is ${today}.

For each event found, extract:
- title: A meaningful event title
- description: Description or empty string if not visible
- date: Start date as YYYY-MM-DD (resolve relative dates like "i dag", "i morgen", "neste mandag" relative to today)
- endDate: End date as YYYY-MM-DD or null if single-day
- time: Start time as HH:MM (default "09:00" if not visible)
- endTime: End time as HH:MM or null
- reminderMinutes: Default 30

Norwegian days: mandag=Monday, tirsdag=Tuesday, onsdag=Wednesday, torsdag=Thursday, fredag=Friday, lørdag=Saturday, søndag=Sunday.
Norwegian months: januar=January, februar=February, mars=March, april=April, mai=May, juni=June, juli=July, august=August, september=September, oktober=October, november=November, desember=December.

If only one event is found, return an array with one element.
If multiple events are found (e.g. a weekly schedule), return ALL of them.
If no events can be identified, return an empty array.

Return ONLY valid JSON with this exact structure:
{
  "events": [
    {
      "title": "event title",
      "description": "description or empty string",
      "date": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null",
      "time": "HH:MM",
      "endTime": "HH:MM or null",
      "reminderMinutes": 30
    }
  ]
}`;
      userText = "Extract all events visible in this image.";
    } else if (type === "classlist") {
      systemPrompt = `You are a class list parser. Extract ALL people (classmates and their parents) visible in this image and return structured data.

For each person found, extract:
- name: The child/student's name
- childPhone: Child's phone number if visible, or empty string
- childEmail: Child's email if visible, or empty string
- parentName: First parent's name if visible, or empty string
- parentPhone: First parent's phone if visible, or empty string
- parentEmail: First parent's email if visible, or empty string
- parentName2: Second parent's name if visible, or empty string
- parentPhone2: Second parent's phone if visible, or empty string
- parentEmail2: Second parent's email if visible, or empty string
- address: Home address if visible, or empty string

Norwegian names: Common Norwegian first names include Emma, Noah, Olivia, Liam, Mia, Lucas, Sophie, Ola, Kari, etc.
Norwegian phone numbers: Typically 8 digits, often written as "XXX XX XXX" or "XXXX XXXX".

If only one person is found, return an array with one element.
If multiple people are found, return ALL of them.
If no people can be identified, return an empty array.

Return ONLY valid JSON with this exact structure:
{
  "contacts": [
    {
      "name": "child name",
      "childPhone": "phone or empty string",
      "childEmail": "email or empty string",
      "parentName": "parent name or empty string",
      "parentPhone": "parent phone or empty string",
      "parentEmail": "parent email or empty string",
      "parentName2": "second parent name or empty string",
      "parentPhone2": "second parent phone or empty string",
      "parentEmail2": "second parent email or empty string",
      "address": "address or empty string"
    }
  ]
}`;
      userText = "Extract all classmates and their parent contact information visible in this image.";
    } else if (type === "holidays") {
      systemPrompt = `You are a school calendar extraction assistant. Extract holidays and days off (fridager) from this image. The content may be a calendar, table, or plain text.

Look for ANY dates or date ranges that represent:
- School holidays (høstferie, juleferie, vinterferie, påskeferie, sommerferie, etc.)
- Planning days (planleggingsdager)
- Study free days, exam days off
- Dates marked as "Stengt" (closed), "Fri" (free), "Ledig" (available)
- Any date range that is NOT a regular school day
- Week numbers with holiday names (e.g. "Uke 40: Høstferie")
- Dates in tables or lists that represent non-school days

For each holiday found, extract:
- title: Name/description (e.g. "Høstferie", "Juleferie", "Planleggingsdag", "Stengt")
- dateFrom: Start date in YYYY-MM-DD format
- dateTo: End date in YYYY-MM-DD format
- timeFrom: Start time in HH:MM format if available (empty string if not)
- timeTo: End time in HH:MM format if available (empty string if not)

If dates are given as week numbers (e.g. "Uke 40"), calculate the actual dates from the week number.
If only a start date is given with no end date, set dateTo equal to dateFrom.

Return ONLY valid JSON:
{"holidays": [{"title": "...", "dateFrom": "YYYY-MM-DD", "dateTo": "YYYY-MM-DD", "timeFrom": "", "timeTo": ""}]}

If no holidays found, return {"holidays": []}.`;
      userText = "Extract all holidays and days off visible in this image.";
    } else if (type === "recipe") {
      systemPrompt = `You are a recipe parser. Extract ALL recipes visible in this image and return structured data.

For each recipe found, extract:
- name: Recipe title/name
- description: Short description or empty string if not visible
- ingredients: Array of { name, amount, unit } objects. amount is always a string. unit can be "g", "kg", "ml", "dl", "l", "ts", "ss", "stk", "bunt", "pk", "pellets", "fedd", "skiver", "ss", "dl", "klype", "etter behag", or empty string
- instructions: Array of step-by-step instruction strings
- time: Cooking/prep time in minutes as a number (default 30)
- portions: Number of servings as a number (default 4)
- category: One of "kylling", "kjoett", "fisk", "vegetar", "pasta", "gryte", "suppe", "frokost", "sott" (guess from the recipe content)
- variation: "Klassisk", "Raskere", "Med en vri", or empty string
- cuisine: Country/cuisine name or empty string
- caloriesPerServing: Estimated calories per serving as a number (based on ingredients and portions). If unsure, estimate as best you can.

If only one recipe is found, return an array with one element.
If multiple recipes are found (e.g. a cookbook page), return ALL of them.
If no recipes can be identified, return an empty array.

Return ONLY valid JSON with this exact structure:
{
  "recipes": [
    {
      "name": "recipe name",
      "description": "description or empty string",
      "ingredients": [
        { "name": "ingredient name", "amount": "quantity", "unit": "unit" }
      ],
      "instructions": ["step 1", "step 2"],
      "time": 30,
      "portions": 4,
      "category": "category key",
      "variation": "",
      "cuisine": "",
      "caloriesPerServing": 350
    }
  ]
}`;
      userText = "Extract all recipes visible in this image.";
    } else if (type === "healthAppointment") {
      systemPrompt = `You are a health appointment parser. Extract appointment details from this image (could be an invitation, letter, SMS screenshot, or calendar entry).

Today's date is ${today}.

For each appointment found, extract:
- title: Appointment title (e.g. "Legetime", "Tannlege", "Spesialist")
- person: Patient/person name if visible, or empty string
- doctor: Doctor/specialist name if visible, or empty string
- date: Date as YYYY-MM-DD
- dateTo: End date as YYYY-MM-DD or same as date
- startTime: Start time as HH:MM (default "10:00")
- endTime: End time as HH:MM or empty string
- location: Location/clinic if visible, or empty string
- reminderMinutes: 60

Return ONLY valid JSON: { "events": [ { "title", "person", "doctor", "date", "dateTo", "startTime", "endTime", "location", "reminderMinutes" } ] }`;
      userText = "Extract all health appointments visible in this image.";
    } else if (type === "vetVisit") {
      systemPrompt = `You are a vet visit parser. Extract visit details from this image (could be an invitation, letter, SMS screenshot, or calendar entry).

Today's date is ${today}.

For each visit found, extract:
- title: Visit title (e.g. "Veterinærbesøk", "Vaksine", "Kastra")
- doctor: Vet name if visible, or empty string
- date: Date as YYYY-MM-DD
- dateTo: End date as YYYY-MM-DD or same as date
- startTime: Start time as HH:MM (default "10:00")
- endTime: End time as HH:MM or empty string
- location: Location/clinic if visible, or empty string
- reminderMinutes: 60

Return ONLY valid JSON: { "events": [ { "title", "doctor", "date", "dateTo", "startTime", "endTime", "location", "reminderMinutes" } ] }`;
      userText = "Extract all vet visits visible in this image.";
    } else if (type === "schoolActivity") {
      systemPrompt = `You are a school activity parser. Extract activity details from this image (could be a letter, notice, or schedule).

Today's date is ${today}.

For each activity found, extract:
- title: Activity title (e.g. "Tur til marka", "Foreldremøte", "Svømming")
- activityType: "tur" for hikes/walks, "aktivitet" for activities, "møte" for meetings
- date: Date as YYYY-MM-DD
- dateTo: End date as YYYY-MM-DD or same as date
- startTime: Start time as HH:MM (default "10:00")
- endTime: End time as HH:MM or empty string
- location: Location if visible, or empty string
- reminderMinutes: 60

Return ONLY valid JSON: { "events": [ { "title", "activityType", "date", "dateTo", "startTime", "endTime", "location", "reminderMinutes" } ] }`;
      userText = "Extract all school activities visible in this image.";
    } else if (type === "kindergartenActivity") {
      systemPrompt = `You are a kindergarten activity parser. Extract activity details from this image (could be a letter, notice, or schedule).

Today's date is ${today}.

For each activity found, extract:
- title: Activity title (e.g. "Tur til parken", "Foreldremøte")
- activityType: "tur" for hikes/walks, "aktivitet" for activities, "møte" for meetings
- date: Date as YYYY-MM-DD
- dateTo: End date as YYYY-MM-DD or same as date
- startTime: Start time as HH:MM (default "10:00")
- endTime: End time as HH:MM or empty string
- location: Location if visible, or empty string
- reminderMinutes: 60

Return ONLY valid JSON: { "events": [ { "title", "activityType", "date", "dateTo", "startTime", "endTime", "location", "reminderMinutes" } ] }`;
      userText = "Extract all kindergarten activities visible in this image.";
    } else if (type === "homeService") {
      systemPrompt = `You are a service appointment parser. Extract appointment details from this image (could be a letter, invoice, or calendar entry).

Today's date is ${today}.

For each appointment found, extract:
- title: Service title (e.g. "Varmepumpe service", "Renhold", "Elektriker")
- description: Description if visible, or empty string
- date: Date as YYYY-MM-DD
- startTime: Start time as HH:MM (default "09:00")
- frequency: "once" for one-time, "monthly", "quarterly", or "yearly"

Return ONLY valid JSON: { "events": [ { "title", "description", "date", "startTime", "frequency" } ] }`;
      userText = "Extract all service appointments visible in this image.";
    } else if (type === "trip") {
      systemPrompt = `You are a trip parser. Extract trip details from this image (could be a booking confirmation, itinerary, or travel plan).

Today's date is ${today}.

For each trip found, extract:
- title: Trip title (e.g. "Ferie i Spania", "Jobbtur til Oslo")
- destination: Destination/city if visible, or empty string
- startDate: Start date as YYYY-MM-DD
- endDate: End date as YYYY-MM-DD or same as startDate
- startTime: Start time as HH:MM or empty string
- endTime: End time as HH:MM or empty string

Return ONLY valid JSON: { "events": [ { "title", "destination", "startDate", "endDate", "startTime", "endTime" } ] }`;
      userText = "Extract all trips visible in this image.";
    } else if (type === "timetable") {
      systemPrompt = `You are a school timetable parser. Extract the schedule from this image (could be a photo of a printed timetable, whiteboard, or digital schedule).

The timetable is usually in a table format with days as columns or rows.

For each class/lesson found, extract:
- day: Day of the week in Norwegian (Mandag, Tirsdag, Onsdag, Torsdag, Fredag)
- time: Time slot (e.g. "08:00-09:00" or "08:00")
- subject: Subject name (e.g. "Matematikk", "Norsk", "Engelsk")
- teacher: Teacher name if visible (e.g. "Hansen", "Lærer Olsen")

Return ONLY valid JSON: { "schedule": [ { "day", "time", "subject", "teacher" } ] }
Important: day must be exactly one of: Mandag, Tirsdag, Onsdag, Torsdag, Fredag`;
      userText = "Extract the weekly timetable from this image. The timetable is likely in a table format.";
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: userText,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const result = JSON.parse(completion.choices[0].message.content);

    trackUsageLog(uid, "photoToData", req.body.familyId || null);

    if (type === "event") {
      const events = Array.isArray(result.events) ? result.events : [];
      const normalized = events.map((e) => ({
        title: e.title || "",
        description: e.description || "",
        date: e.date || today,
        endDate: e.endDate || null,
        time: e.time || "09:00",
        endTime: e.endTime || null,
        reminderMinutes: e.reminderMinutes || 30,
      }));
      return res.status(200).json({ events: normalized });
    } else if (type === "recipe") {
      const recipes = Array.isArray(result.recipes) ? result.recipes : [];
      const validCategories = ["kylling", "kjoett", "fisk", "vegetar", "pasta", "gryte", "suppe", "frokost", "sott"];
      const normalized = recipes.map((r) => ({
        name: r.name || "",
        description: r.description || "",
        ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((i) => ({
          name: i.name || "",
          amount: String(i.amount || ""),
          unit: i.unit || "",
        })) : [],
        instructions: Array.isArray(r.instructions) ? r.instructions.filter((s) => s && s.trim()) : [],
        time: typeof r.time === "number" ? r.time : 30,
        portions: typeof r.portions === "number" ? r.portions : 4,
        category: validCategories.includes(r.category) ? r.category : "kjoett",
        variation: r.variation || "",
        cuisine: r.cuisine || "",
      }));
      return res.status(200).json({ recipes: normalized });
    } else if (type === "classlist") {
      const contacts = Array.isArray(result.contacts) ? result.contacts : [];
      const normalized = contacts.map((c) => ({
        name: c.name || "",
        childPhone: c.childPhone || "",
        childEmail: c.childEmail || "",
        parentName: c.parentName || "",
        parentPhone: c.parentPhone || "",
        parentEmail: c.parentEmail || "",
        parentName2: c.parentName2 || "",
        parentPhone2: c.parentPhone2 || "",
        parentEmail2: c.parentEmail2 || "",
        address: c.address || "",
      }));
      return res.status(200).json({ contacts: normalized });
    } else if (type === "holidays") {
      const holidays = Array.isArray(result.holidays) ? result.holidays : [];
      const normalized = holidays.map((h) => ({
        title: h.title || "",
        dateFrom: h.dateFrom || "",
        dateTo: h.dateTo || h.dateFrom || "",
        timeFrom: h.timeFrom || "",
        timeTo: h.timeTo || "",
      }));
      return res.status(200).json({ holidays: normalized });
    } else if (type === "healthAppointment") {
      const items = Array.isArray(result.events) ? result.events : [];
      const normalized = items.map((e) => ({
        title: e.title || "",
        person: e.person || "",
        doctor: e.doctor || "",
        dateFrom: e.dateFrom || today,
        dateTo: e.dateTo || null,
        startTime: e.startTime || "09:00",
        endTime: e.endTime || null,
        location: e.location || "",
        note: e.note || "",
      }));
      return res.status(200).json({ events: normalized });
    } else if (type === "vetVisit") {
      const items = Array.isArray(result.events) ? result.events : [];
      const normalized = items.map((e) => ({
        title: e.title || "",
        doctor: e.doctor || "",
        dateFrom: e.dateFrom || today,
        dateTo: e.dateTo || null,
        startTime: e.startTime || "09:00",
        endTime: e.endTime || null,
        location: e.location || "",
        reason: e.reason || "",
      }));
      return res.status(200).json({ events: normalized });
    } else if (type === "schoolActivity") {
      const items = Array.isArray(result.events) ? result.events : [];
      const normalized = items.map((e) => ({
        title: e.title || "",
        activityType: e.activityType || "aktivitet",
        dateFrom: e.dateFrom || today,
        dateTo: e.dateTo || null,
        startTime: e.startTime || "10:00",
        endTime: e.endTime || null,
        location: e.location || "",
      }));
      return res.status(200).json({ events: normalized });
    } else if (type === "kindergartenActivity") {
      const items = Array.isArray(result.events) ? result.events : [];
      const normalized = items.map((e) => ({
        title: e.title || "",
        activityType: e.activityType || "aktivitet",
        dateFrom: e.dateFrom || today,
        dateTo: e.dateTo || null,
        startTime: e.startTime || "10:00",
        endTime: e.endTime || null,
        location: e.location || "",
      }));
      return res.status(200).json({ events: normalized });
    } else if (type === "homeService") {
      const items = Array.isArray(result.events) ? result.events : [];
      const normalized = items.map((e) => ({
        title: e.title || "",
        description: e.description || "",
        dateFrom: e.dateFrom || today,
        startTime: e.startTime || "09:00",
        frequency: e.frequency || "once",
      }));
      return res.status(200).json({ events: normalized });
    } else if (type === "trip") {
      const items = Array.isArray(result.events) ? result.events : [];
      const normalized = items.map((e) => ({
        title: e.title || "",
        destination: e.destination || "",
        startDate: e.startDate || today,
        endDate: e.endDate || e.startDate || today,
        startTime: e.startTime || "",
        endTime: e.endTime || "",
      }));
      return res.status(200).json({ events: normalized });
    } else if (type === "timetable") {
      const items = Array.isArray(result.schedule) ? result.schedule : [];
      const normalized = items.map((s) => ({
        day: s.day || "",
        time: s.time || "",
        subject: s.subject || "",
        teacher: s.teacher || "",
      }));
      return res.status(200).json({ schedule: normalized });
    }
  } catch (error) {
    console.error("Photo to data error:", error.message, error.stack);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Scheduled function: check reminders every minute and send FCM push notifications
// Notifies ALL family members, not just the event creator
exports.checkReminders = onSchedule({ schedule: "every 1 minutes", timeZone: "UTC", region: "us-central1" }, async (event) => {
  const db = getFirestore();
  const now = new Date();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const eventsSnap = await db.collection("events").limit(500).get();
  console.log(`checkReminders: found ${eventsSnap.docs.length} total events`);

  // Cache timezones per family to avoid repeated lookups
  const familyTimezones = {};

  let totalSent = 0;

  for (const doc of eventsSnap.docs) {
    const eventData = doc.data();
    if (!eventData.date || !eventData.time) continue;
    if (!eventData.reminderMinutes || eventData.reminderMinutes <= 0) continue;

    const familyId = eventData.familyId;
    if (!familyId) continue;

    // Get family timezone (cached)
    if (!familyTimezones[familyId]) {
      familyTimezones[familyId] = "Europe/Oslo"; // default
      try {
        const familyDoc = await db.collection("families").doc(familyId).get();
        const familyData = familyDoc.data();
        const ownerUid = familyData?.members ? Object.keys(familyData.members)[0] : null;
        if (ownerUid) {
          const userDoc = await db.collection("users").doc(ownerUid).get();
          const userData = userDoc.data();
          if (userData?.timezone) familyTimezones[familyId] = userData.timezone;
        }
      } catch {}
    }

    let reminderTime;
    if (eventData.reminderAt) {
      reminderTime = new Date(eventData.reminderAt);
    } else {
      const eventDate = createDateInTimezone(eventData.date, eventData.time, familyTimezones[familyId]);
      reminderTime = new Date(eventDate.getTime() - (eventData.reminderMinutes || 0) * 60 * 1000);
    }

    if (reminderTime >= thirtyMinAgo && reminderTime <= fiveMinFromNow) {
      const sent = await sendNotification({
        familyId,
        title: `📅 ${eventData.title}`,
        body: `Påminnelse: ${eventData.title} om ${reminderMinutesLabel(eventData.reminderMinutes)}`,
        notifKey: doc.id,
      });
      totalSent += sent;
    }
  }

  // Process pet vet visit reminders
  const petVetVisitsSnap = await db.collectionGroup("petVetVisits").limit(200).get();
  for (const doc of petVetVisitsSnap.docs) {
    const vetData = doc.data();
    if (!vetData.reminderAt || !vetData.familyId) continue;

    const reminderTime = new Date(vetData.reminderAt);
    if (reminderTime >= thirtyMinAgo && reminderTime <= fiveMinFromNow) {
      const sent = await sendNotification({
        familyId: vetData.familyId,
        title: `🐾 ${vetData.title}`,
        body: `Påminnelse om veterinærbesøk`,
        notifKey: `vetvisit_${doc.id}`,
      });
      totalSent += sent;
    }
  }

  // Process pet vaccination reminders
  const petVaccinationsSnap = await db.collectionGroup("petVaccinations").limit(200).get();
  for (const doc of petVaccinationsSnap.docs) {
    const vaccData = doc.data();
    if (!vaccData.reminderAt || !vaccData.familyId) continue;

    const reminderTime = new Date(vaccData.reminderAt);
    if (reminderTime >= thirtyMinAgo && reminderTime <= fiveMinFromNow) {
      const sent = await sendNotification({
        familyId: vaccData.familyId,
        title: `💉 ${vaccData.name}`,
        body: `Påminnelse om vaksine`,
        notifKey: `petvacc_${doc.id}`,
      });
      totalSent += sent;
    }
  }

  // Process school activity reminders
  const schoolActivitiesSnap = await db.collectionGroup("activities").where("familyId", "!=", null).limit(200).get();
  for (const doc of schoolActivitiesSnap.docs) {
    const actData = doc.data();
    if (!actData.reminderAt || !actData.familyId) continue;

    const reminderTime = new Date(actData.reminderAt);
    if (reminderTime >= thirtyMinAgo && reminderTime <= fiveMinFromNow) {
      const typeLabel = actData.activityType === "tur" ? "Tur" : actData.activityType === "aktivitet" ? "Aktivitet" : "Møte";
      const icon = doc.ref.parent.parent?.parent?.id === "schoolActivities" ? "📚" : "🎨";
      const sent = await sendNotification({
        familyId: actData.familyId,
        title: `${icon} ${typeLabel}: ${actData.title}`,
        body: `Påminnelse om ${actData.date}`,
        notifKey: `activity_${doc.id}`,
      });
      totalSent += sent;
    }
  }

  console.log(`checkReminders: ${totalSent} sent`);
  if (totalSent > 0) {
    trackUsageLog("system", "reminderNotification", null);
  }
  return { sent: totalSent };
});

exports.destinationTips = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Rate limit check
  if (!(await checkRateLimit(uid, "destinationTips"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const { city, country, startDate, endDate, weather } = req.body || {};

  if (!city) {
    return res.status(400).json({ error: "city is required" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    let weatherContext = "";
    if (weather && weather.length > 0) {
      weatherContext = `\n\nWeather forecast for the stay:\n${weather.slice(0, 7).map((d) => `${d.date}: ${d.weatherDescription || "unknown"}, ${d.tempMin}°C to ${d.tempMax}°C`).join("\n")}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a travel advisor for Norwegian families. Generate practical, local tips for a trip to ${city}${country ? ", " + country : ""}.
The trip is from ${startDate || "unknown"} to ${endDate || "unknown"}.
${weatherContext}

IMPORTANT: Focus on things happening DURING the specific dates of the stay. If there are festivals, events, seasonal activities, or time-specific experiences, put them FIRST in the thingsToDo list.

Respond in Norwegian. Return ONLY valid JSON with this exact structure:
{
  "overview": "A 2-3 sentence overview of the destination and what makes it great for this time of year",
  "thingsToDo": ["Specific event/activity happening during their dates...", "General must-see...", "..."],
  "restaurants": ["Local restaurant tip 1...", "..."],
  "localPhrases": [{"no": "Norwegian phrase", "local": "Local translation", "pronunciation": "How to say it"}],
  "transportTips": ["Practical transport advice...", "..."],
  "scamWarnings": ["Common tourist traps to avoid...", "..."]
}

Include 5-7 items in thingsToDo and restaurants. Include 3-5 local phrases. Include 3-4 transport tips and 2-3 scam warnings. Be specific and practical, not generic.`,
        },
        {
          role: "user",
          content: `Give me destination tips for ${city}${country ? ", " + country : ""} from ${startDate} to ${endDate}.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    const tips = {
      overview: result.overview || "",
      thingsToDo: result.thingsToDo || [],
      restaurants: result.restaurants || [],
      localPhrases: result.localPhrases || [],
      transportTips: result.transportTips || [],
      scamWarnings: result.scamWarnings || [],
      generatedAt: new Date().toISOString(),
    };

    trackUsageLog(uid, "destinationTips", req.body.familyId || null);

    return res.status(200).json({ tips });
  } catch (error) {
    console.error("Destination tips error:", error.message);
    return res.status(500).json({ error: "Failed to generate tips" });
  }
});

// --- Family Management Cloud Functions ---

exports.createFamily = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { name } = req.body || {};
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Familienavn er påkrevd" });
  }

  const db = getFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return res.status(404).json({ error: "Bruker ikke funnet" });
  const userData = userSnap.data();
  if (userData.familyId) return res.status(400).json({ error: "Du er allerede i en familie" });

  const familyRef = db.collection("families").doc();
  await familyRef.set({
    name: name.trim(),
    createdBy: uid,
    members: {
      [uid]: { role: "owner", displayName: userData.displayName || "User" },
    },
    createdAt: Date.now(),
  });

  await db.collection("users").doc(uid).update({
    familyId: familyRef.id,
    familyName: name.trim(),
    familyRole: "owner",
  });

  await logAuditEvent(uid, "family_created", { familyId: familyRef.id, familyName: name.trim() });

  return res.status(200).json({ familyId: familyRef.id });
});

exports.generateInviteCode = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { familyId } = req.body || {};
  if (!familyId) return res.status(400).json({ error: "familyId er påkrevd" });

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const familySnap = await familyRef.get();
  if (!familySnap.exists) return res.status(404).json({ error: "Familie ikke funnet" });

  const familyData = familySnap.data();
  const callerMember = familyData.members && familyData.members[uid];
  if (!callerMember || (callerMember.role !== "owner" && callerMember.role !== "admin")) {
    return res.status(403).json({ error: "Mangler tillatelse" });
  }

  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const now = Date.now();
  const expiresAt = now + 60 * 60 * 1000; // 1 hour

  await familyRef.update({
    inviteCode: code,
    inviteCreatedAt: now,
    inviteExpiresAt: expiresAt,
  });

  return res.status(200).json({ code, expiresAt, familyName: familyData.name });
});

exports.joinFamilyByInviteCode = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { code } = req.body || {};
  if (!code || typeof code !== "string") return res.status(400).json({ error: "Kode er påkrevd" });

  const db = getFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return res.status(404).json({ error: "Bruker ikke funnet" });
  const userData = userSnap.data();
  if (userData.familyId) return res.status(400).json({ error: "Du er allerede i en familie" });

  const normalizedCode = code.trim().toUpperCase();
  const familiesRef = db.collection("families");
  const q = familiesRef.where("inviteCode", "==", normalizedCode).limit(1);
  const querySnap = await q.get();
  if (querySnap.empty) return res.status(404).json({ error: "Ugyldig kode" });

  const familyDoc = querySnap.docs[0];
  const familyData = familyDoc.data();

  if (!familyData.inviteExpiresAt || Date.now() > familyData.inviteExpiresAt) {
    return res.status(400).json({ error: "Koden har utløpt" });
  }

  if (familyData.members && familyData.members[uid]) {
    return res.status(400).json({ error: "Du er allerede i denne familien" });
  }

  await familyDoc.ref.update({
    [`members.${uid}`]: { role: "member", displayName: userData.displayName || "User" },
    inviteCode: FieldValue.delete(),
    inviteCreatedAt: FieldValue.delete(),
    inviteExpiresAt: FieldValue.delete(),
  });

  await db.collection("users").doc(uid).update({
    familyId: familyDoc.id,
    familyName: familyData.name,
    familyRole: "member",
  });

  await logAuditEvent(uid, "family_joined", { familyId: familyDoc.id, familyName: familyData.name });

  return res.status(200).json({ familyId: familyDoc.id, familyName: familyData.name });
});

exports.leaveFamily = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const db = getFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return res.status(404).json({ error: "Bruker ikke funnet" });
  const userData = userSnap.data();
  if (!userData.familyId) return res.status(400).json({ error: "Du er ikke i noen familie" });

  const familyRef = db.collection("families").doc(userData.familyId);
  const familySnap = await familyRef.get();
  if (!familySnap.exists) return res.status(404).json({ error: "Familie ikke funnet" });

  const familyData = familySnap.data();
  const memberInfo = familyData.members && familyData.members[uid];
  if (!memberInfo) return res.status(400).json({ error: "Du er ikke medlem av denne familien" });
  if (memberInfo.role === "owner") return res.status(400).json({ error: "Eieren kan ikke forlate familien" });

  await familyRef.update({
    [`members.${uid}`]: FieldValue.delete(),
  });

  await db.collection("users").doc(uid).update({
    familyId: null,
    familyName: null,
    familyRole: FieldValue.delete(),
  });

  await logAuditEvent(uid, "family_left", { familyId: userData.familyId, familyName: familyData.name });

  return res.status(200).json({ success: true });
});

exports.removeFamilyMember = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { familyId, targetUid } = req.body || {};
  if (!familyId || !targetUid) return res.status(400).json({ error: "familyId og targetUid er påkrevd" });

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const familySnap = await familyRef.get();
  if (!familySnap.exists) return res.status(404).json({ error: "Familie ikke funnet" });

  const familyData = familySnap.data();
  const callerMember = familyData.members && familyData.members[uid];
  const targetMember = familyData.members && familyData.members[targetUid];

  if (!callerMember || (callerMember.role !== "owner" && callerMember.role !== "admin")) {
    return res.status(403).json({ error: "Mangler tillatelse" });
  }
  if (!targetMember) return res.status(404).json({ error: "Medlem ikke funnet" });
  if (targetMember.role === "owner") return res.status(400).json({ error: "Kan ikke fjerne eieren" });
  if (uid === targetUid) return res.status(400).json({ error: "Bruk 'Forlat familie' for å fjerne deg selv" });

  await familyRef.update({
    [`members.${targetUid}`]: FieldValue.delete(),
  });

  await db.collection("users").doc(targetUid).update({
    familyId: null,
    familyName: null,
    familyRole: FieldValue.delete(),
  });

  await logAuditEvent(uid, "family_member_removed", { familyId, targetUid, familyName: familyData.name });

  return res.status(200).json({ success: true });
});

// Temporary: Migrate family members from array to map with roles
// DELETE after running once
exports.migrateFamilyMembers = onRequest({ region: "us-central1" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Ikke autentisert" });

  const ADMIN_EMAILS = ["jon@wiklunddidriksen.com"];
  const userEmail = (await getAuth().getUser(uid)).email;
  if (!ADMIN_EMAILS.includes(userEmail)) {
    return res.status(403).json({ error: "Kun admin kan kjøre migrering" });
  }

  const db = getFirestore();
  const familyId = "AVCUsb8X6GdRM3f0EBf0";
  const familyRef = db.collection("families").doc(familyId);
  const familySnap = await familyRef.get();

  if (!familySnap.exists) return res.status(404).json({ error: "Familie ikke funnet" });

  const familyData = familySnap.data();
  const oldMembers = familyData.members;

  if (oldMembers && typeof oldMembers === "object" && !Array.isArray(oldMembers)) {
    const firstKey = Object.keys(oldMembers)[0];
    if (firstKey && typeof oldMembers[firstKey] === "object" && oldMembers[firstKey].role) {
      return res.status(200).json({ message: "Already migrated", members: oldMembers });
    }
  }

  const membersArray = Array.isArray(oldMembers) ? oldMembers : Object.keys(oldMembers || {});
  const newMembers = {};

  for (const memberUid of membersArray) {
    let displayName = "Medlem";
    try {
      const userProfile = await db.collection("users").doc(memberUid).get();
      if (userProfile.exists) {
        displayName = userProfile.data().displayName || "Medlem";
      }
    } catch {}

    if (memberUid === uid) {
      newMembers[memberUid] = { role: "owner", displayName };
    } else {
      newMembers[memberUid] = { role: "member", displayName };
    }
  }

  await familyRef.update({ members: newMembers });

  for (const [memberUid, memberData] of Object.entries(newMembers)) {
    await db.collection("users").doc(memberUid).update({
      familyRole: memberData.role,
    });
  }

  return res.status(200).json({
    message: "Migration complete",
    oldMembers: membersArray,
    newMembers,
  });
});

exports.updateMemberRole = onRequest({ region: "us-central1" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Ikke autentisert" });

  const { familyId, targetUid, newRole } = req.body || {};
  if (!familyId || !targetUid || !newRole) {
    return res.status(400).json({ error: "familyId, targetUid og newRole er påkrevd" });
  }
  if (!["admin", "member"].includes(newRole)) {
    return res.status(400).json({ error: "newRole må være 'admin' eller 'member'" });
  }

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const familySnap = await familyRef.get();
  if (!familySnap.exists) return res.status(404).json({ error: "Familie ikke funnet" });

  const familyData = familySnap.data();
  const callerMember = familyData.members && familyData.members[uid];
  const targetMember = familyData.members && familyData.members[targetUid];

  if (!callerMember || (callerMember.role !== "owner" && callerMember.role !== "admin")) {
    return res.status(403).json({ error: "Mangler tillatelse" });
  }
  if (!targetMember) return res.status(404).json({ error: "Medlem ikke funnet" });
  if (targetMember.role === "owner") return res.status(400).json({ error: "Kan ikke endre eierens rolle" });
  if (uid === targetUid) return res.status(400).json({ error: "Kan ikke endre din egen rolle" });

  await familyRef.update({
    [`members.${targetUid}.role`]: newRole,
  });

  await db.collection("users").doc(targetUid).update({
    familyRole: newRole,
  });

  return res.status(200).json({ success: true, targetUid, newRole });
});

exports.notifyNewEvent = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  // Rate limit check
  if (!(await checkRateLimit(uid, "notifyNewEvent"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { familyId, eventTitle, eventDate, eventTime, creatorName } = req.body || {};
  if (!familyId || !eventTitle) return res.status(400).json({ error: "familyId og eventTitle er påkrevd" });

  const dateLabel = eventDate && eventTime ? `${eventDate} ${eventTime}` : eventDate || "";

  const sent = await sendNotification({
    familyId,
    title: `📅 ${creatorName || 'En i familien'} la til et arrangement`,
    body: `${eventTitle}${dateLabel ? ` — ${dateLabel}` : ""}`,
    excludeUid: uid,
  });

  console.log(`notifyNewEvent: sent ${sent} notifications for ${eventTitle}`);
  trackUsageLog(uid, "notifyNewEvent", familyId);
  return res.status(200).json({ sent });
});

// Health notification — sends push notification to all family members
exports.notifyHealthItem = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  // Rate limit check
  if (!(await checkRateLimit(uid, "notifyHealthItem"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { familyId, title, date, time, location, itemType, creatorName, personName } = req.body || {};
  if (!familyId || !title) return res.status(400).json({ error: "familyId and title are required" });

  const icon = itemType === "vaccination" ? "💉" : "🏥";
  const typeLabel = itemType === "vaccination" ? "Vaksine" : "Time";
  const dateLabel = date && time ? `${date} ${time}` : date || "";

  const sent = await sendNotification({
    familyId,
    title: `${icon} ${creatorName || "En i familien"} la til en ${typeLabel} for ${personName || "familien"}`,
    body: `${title}${dateLabel ? ` — ${dateLabel}` : ""}${location ? ` (${location})` : ""}`,
    excludeUid: uid,
  });

  trackUsageLog(uid, "reminderNotification", familyId);
  return res.status(200).json({ sent });
});

// Birthday reminders — runs every 5 minutes at 08:00 UTC
// For each family, check if it's 08:00 in their timezone
exports.checkBirthdayReminders = onSchedule({ schedule: "every 5 minutes", timeZone: "UTC" }, async (event) => {
  const db = getFirestore();
  const now = new Date();

  // Calculate dates for next 7 days (in UTC)
  const upcomingDates = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    upcomingDates.push(`${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const birthdaysSnap = await db.collection("birthdays").get();
  const sentNotifsSnap = await db.collection("sentNotifications").where("type", "==", "birthday").get();
  const sentNotifs = new Set(sentNotifsSnap.docs.map((d) => d.id));

  let totalSent = 0;
  const debugLog = [];

  for (const doc of birthdaysSnap.docs) {
    const b = doc.data();
    const bDate = new Date(b.date);
    const bMonthDay = `${String(bDate.getMonth() + 1).padStart(2, "0")}-${String(bDate.getDate()).padStart(2, "0")}`;

    // Find matching date in next 7 days
    let daysUntil = -1;
    for (let i = 0; i < upcomingDates.length; i++) {
      if (upcomingDates[i] === bMonthDay) {
        daysUntil = i;
        break;
      }
    }
    if (daysUntil === -1) continue;

    if (!b.familyId) continue;

    // Check if it's 08:00 in the family owner's timezone
    let familyTimezone = "Europe/Oslo";
    try {
      const familyDoc = await db.collection("families").doc(b.familyId).get();
      const familyData = familyDoc.data();
      const ownerUid = familyData?.members ? Object.keys(familyData.members)[0] : null;
      if (ownerUid) {
        const userDoc = await db.collection("users").doc(ownerUid).get();
        const userData = userDoc.data();
        if (userData?.timezone) familyTimezone = userData.timezone;
      }
    } catch {}

    const localTimeStr = now.toLocaleString("en-US", { timeZone: familyTimezone, hour: "numeric", minute: "numeric", hour12: false });
    const [localHour] = localTimeStr.split(":").map(Number);
    debugLog.push({ name: b.name, bMonthDay, familyTimezone, localTimeStr, localHour, daysUntil });

    // Only send between 08:00 and 08:04 in user's timezone
    if (localHour !== 8) continue;

    const year = now.getFullYear();
    const notifKey = `birthday_${doc.id}_${year}`;
    if (sentNotifs.has(notifKey)) continue;

    if (!b.familyId) continue;

    const age = now.getFullYear() - bDate.getFullYear();
    const title = `🎂 ${b.name} har bursdag!`;
    const body = daysUntil === 0
      ? `${b.name} har bursdag i dag! Fyller ${age} år.`
      : `${b.name} har bursdag om ${daysUntil} dager. Fyller ${age} år.`;

    const sent = await sendNotification({
      familyId: b.familyId,
      title,
      body,
      notifKey,
    });
    totalSent += sent;
  }

  console.log(`checkBirthdayReminders: ${totalSent} sent`);
  console.log(`checkBirthdayReminders debug:`, JSON.stringify(debugLog));
  if (totalSent > 0) {
    trackUsageLog("system", "birthdayNotification", null);
  }
  return { sent: totalSent };
});

// AI Recipe Suggestions
exports.aiRecipeSuggestions = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  if (!(await checkRateLimit(uid, "aiRecipeSuggestions"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { prompt, existingRecipes = [], searchLanguage = "norsk", responseLanguage = "norsk" } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // Map language codes to display names
  const languageNames = {
    norsk: "Norwegian", svensk: "Swedish", engelsk: "English",
    dansk: "Danish", finsk: "Finnish", italiensk: "Italian",
    spansk: "Spanish", fransk: "French", tysk: "German",
    gresk: "Greek", tyrkisk: "Turkish", indisk: "Indian",
    japansk: "Japanese", thailandsk: "Thai", mexicansk: "Mexican",
    kinesisk: "Chinese", koreansk: "Korean", kroatisk: "Croatian",
    portugisisk: "Portuguese", amerikansk: "American",
    argentinsk: "Argentinian", brasiliansk: "Brazilian",
  };
  const variationLabels = {
    norsk: { classic: "Klassisk", faster: "Raskere", twist: "Med en vri" },
    svensk: { classic: "Klassiskt", faster: "Snabbare", twist: "Med en vri" },
    engelsk: { classic: "Classic", faster: "Faster", twist: "With a twist" },
    dansk: { classic: "Klassisk", faster: "Hurtigere", twist: "Med et twist" },
    finsk: { classic: "Klassinen", faster: "Nopeammin", twist: "Vähän erilainen" },
    italiensk: { classic: "Classico", faster: "Veloce", twist: "Con un tocco" },
    spansk: { classic: "Clásico", faster: "Rápido", twist: "Con un toque" },
    fransk: { classic: "Classique", faster: "Rapide", twist: "Avec une touche" },
    tysk: { classic: "Klassisch", faster: "Schnell", twist: "Mit einer Twist" },
    gresk: { classic: "Κλασικό", faster: "Γρήγορο", twist: "Με στραβωμό" },
    tyrkisk: { classic: "Klasik", faster: "Hızlı", twist: "Farklı bir dokunuşla" },
    indisk: { classic: "Classic", faster: "Quick", twist: "With a twist" },
    japansk: { classic: "クラシック", faster: "簡単", twist: "アレンジ" },
    thailandsk: { classic: "ดั้งเดิม", faster: "ง่าย", twist: "สไตล์ใหม่" },
    mexicansk: { classic: "Clásico", faster: "Rápido", twist: "Con un toque" },
    kinesisk: { classic: "经典", faster: "快手", twist: "创意版" },
    koreansk: { classic: "클래식", faster: "간편", twist: "활용" },
    kroatisk: { classic: "Klasično", faster: "Brzo", twist: "Sa začinom" },
    portugisisk: { classic: "Clássico", faster: "Rápido", twist: "Com um toque" },
    amerikansk: { classic: "Classic", faster: "Quick", twist: "With a twist" },
    argentinsk: { classic: "Clásico", faster: "Rápido", twist: "Con un toque" },
    brasiliansk: { classic: "Clássico", faster: "Rápido", twist: "Com um toque" },
  };
  const searchLangName = languageNames[searchLanguage] || "Norwegian";
  const responseLangName = languageNames[responseLanguage] || "Norwegian";
  const vars = variationLabels[responseLanguage] || variationLabels.norsk;

  try {
    const existingNames = existingRecipes.map((r) => r.name).join(", ");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful family meal planner.
The user will describe a specific dish or recipe they want.
Search for ${searchLangName} recipes that match the user's description and generate exactly 3 DIFFERENT dishes — each with its own unique name and recipe.

${existingNames ? `These recipes already exist in their book: ${existingNames}. Avoid suggesting duplicates.` : ""}

IMPORTANT: Generate 3 DIFFERENT dishes, not 3 variations of the same dish. Each dish should have its own unique name that matches the search description. For example, searching for "spicy pasta with tomato sauce" should produce "Pasta Arrabbiata", "Penne all'Arrabbiata", and "Spaghetti al Pomodoro Piccante" — three different dishes.

Assign one of these variation tags to each dish:
- "${vars.classic}" — the traditional/authentic version
- "${vars.faster}" — a quicker/easier version (less time, fewer steps)
- "${vars.twist}" — a creative twist or variation

CRITICAL: You MUST respond entirely in ${responseLangName}. The dish name stays in ${searchLangName} but EVERYTHING else (description, ingredient names, instruction steps) MUST be in ${responseLangName}. Return ONLY valid JSON array with this exact structure:
[
  {
    "name": "Unique dish name in ${searchLangName} (each dish must have a DIFFERENT name)",
    "variation": "${vars.classic}|${vars.faster}|${vars.twist}",
    "cuisine": "${searchLangName}",
    "description": "Short description in ${responseLangName}",
    "ingredients": [{"name": "Ingredient name MUST be in ${responseLangName}", "amount": "Amount", "unit": "Unit"}],
    "instructions": ["Step MUST be in ${responseLangName}", "Step MUST be in ${responseLangName}"],
    "time": 30,
    "portions": 4,
    "category": "kylling|kjoett|fisk|vegetar|pasta|gryte|suppe|frokost|sott",
    "caloriesPerServing": 350
  }
]

Make each dish practical for everyday family cooking. Each dish must have a unique, authentic name from ${searchLangName} cuisine.
Focus on making the 3 dishes meaningfully different from each other — different ingredients, techniques, or complexity levels.
Estimate caloriesPerServing based on ingredients and portions.`,
        },
        {
          role: "user",
          content: `Search for ${searchLangName} recipes for: "${prompt}"\n\nIMPORTANT: Respond in ${responseLangName}. The dish name can stay in ${searchLangName}, but all descriptions, ingredient names, and instructions MUST be in ${responseLangName}.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    const recipes = JSON.parse(jsonMatch[0]);
    const validCategories = ["kylling", "kjoett", "fisk", "vegetar", "pasta", "gryte", "suppe", "frokost", "sott"];
    const validatedRecipes = recipes.map(r => ({
      ...r,
      category: validCategories.includes(r.category) ? r.category : "kjoett",
    }));
    trackUsageLog(uid, "aiRecipeSuggestions", req.body.familyId || null);
    return res.status(200).json({ recipes: validatedRecipes });
  } catch (error) {
    console.error("AI recipe suggestion error:", error);
    return res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// Import holidays (fridager) from URL
exports.importHolidaysFromUrl = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  if (!(await checkRateLimit(uid, "importHolidaysFromUrl"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { url, language } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }

  const languageNames = {
    norsk: "Norwegian", svensk: "Swedish", engelsk: "English",
    dansk: "Danish", finsk: "Finnish",
  };
  const responseLangName = languageNames[language] || "Norwegian";

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Fampad/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    if (!response.ok) {
      return res.status(400).json({ error: `Kunne ikke hente siden: ${response.status}` });
    }
    const html = await response.text();
    console.log(`importHolidaysFromUrl: fetched ${html.length} chars from ${url}`);

    // Strip HTML tags and collapse whitespace for cleaner AI input
    const plainText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`importHolidaysFromUrl: stripped to ${plainText.length} chars of plain text`);

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a school calendar extraction assistant. Extract holidays and days off (fridager) from the provided content. The page likely ONLY contains holidays/free days — no regular school days.

Look for:
- Month names in text (januar, februar, mars, april, mai, juni, juli, august, september, oktober, november, desember)
- Year numbers
- Day names or dates
- Times (HH:MM format)
- Titles describing the type of free day (e.g. "Høstferie", "Planleggingsdag", "Juleferie", "Vinterferie")
- Week numbers
- Any date ranges that represent days off

For each holiday found, extract:
- title: Name/description (e.g. "Høstferie", "Juleferie", "Planleggingsdag")
- dateFrom: Start date in YYYY-MM-DD format
- dateTo: End date in YYYY-MM-DD format
- timeFrom: Start time in HH:MM format if available (empty string if not)
- timeTo: End time in HH:MM format if available (empty string if not)

If dates are given as week numbers, calculate the actual dates from the week number.
If only a start date is given with no end date, set dateTo equal to dateFrom.

Return ONLY valid JSON:
{"holidays": [{"title": "...", "dateFrom": "YYYY-MM-DD", "dateTo": "YYYY-MM-DD", "timeFrom": "", "timeTo": ""}]}

If no holidays found, return {"holidays": []}.`,
        },
        {
          role: "user",
          content: `Extract all holidays and days off from this school/kindergarten calendar page:\n\n${plainText.substring(0, 100000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`importHolidaysFromUrl: no JSON found in AI response: ${content.substring(0, 200)}`);
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log(`importHolidaysFromUrl: AI result keys: ${Object.keys(result)}, holidays count: ${(result.holidays || []).length}`);
    return res.status(200).json({ holidays: result.holidays || [] });
  } catch (error) {
    console.error("Import holidays from URL error:", error);
    return res.status(500).json({ error: "Failed to import holidays from URL" });
  }
});

// Import recipe from URL
exports.importRecipeFromUrl = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  if (!(await checkRateLimit(uid, "importRecipeFromUrl"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { url, language } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }

  const languageNames = {
    norsk: "Norwegian", svensk: "Swedish", engelsk: "English",
    dansk: "Danish", finsk: "Finnish",
  };
  const responseLangName = languageNames[language] || "Norwegian";

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Fampad/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    if (!response.ok) {
      return res.status(400).json({ error: `Kunne ikke hente siden: ${response.status}` });
    }
    const html = await response.text();

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a recipe extraction assistant. Extract recipe data from the provided HTML content of a recipe webpage.

IMPORTANT RULES:
1. The content is raw HTML. Ignore all HTML tags, scripts, CSS, navigation, ads, and non-recipe content. Focus ONLY on the actual recipe data.
2. Extract instructions EXACTLY as written on the page - do NOT shorten, summarize, or rephrase them. Copy the full text of each step.
3. Extract ingredients EXACTLY as written - include all amounts, units, and ingredient names exactly as they appear.
4. If the recipe is already in ${responseLangName}, keep the text as-is. Only translate if it's in a different language.

Return ONLY valid JSON with this exact structure:
{
  "name": "Recipe name in ${responseLangName}",
  "description": "Short 1-2 sentence description in ${responseLangName}",
  "ingredients": [{"name": "Ingredient name in ${responseLangName}", "amount": "Amount", "unit": "Unit"}],
  "instructions": ["Full step 1 exactly as written", "Full step 2 exactly as written"],
  "time": 30,
  "portions": 4,
  "category": "kylling|kjoett|fisk|vegetar|pasta|gryte|suppe|frokost|sott",
  "variation": "",
  "cuisine": "",
  "caloriesPerServing": 350
}

Extract the recipe name, ingredients with amounts and units, step-by-step instructions (EXACTLY as written, no shortening), estimated cooking time in minutes, number of servings, and categorize the dish.
Estimate caloriesPerServing based on ingredients and portions.
If you cannot extract a recipe from the content, return {"error": "Could not extract recipe from URL"}.`,
        },
        {
          role: "user",
          content: `Extract the recipe from this webpage content. IMPORTANT: Copy instructions EXACTLY as written - do not shorten or summarize them. Ignore all HTML tags, scripts, ads, navigation menus, and focus only on the recipe ingredients, instructions, and metadata:\n\n${html.substring(0, 12000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    const recipe = JSON.parse(jsonMatch[0]);
    if (recipe.error) {
      return res.status(400).json({ error: recipe.error });
    }

    return res.status(200).json({ recipe });
  } catch (error) {
    console.error("Import recipe error:", error);
    return res.status(500).json({ error: "Failed to import recipe" });
  }
});

// Estimate calories for a recipe
exports.estimateRecipeCalories = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  if (!(await checkRateLimit(uid, "estimateRecipeCalories"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { ingredients, portions, name } = req.body;
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: "Missing ingredients array" });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a nutrition estimator. Given a list of ingredients and portions, estimate the calories per serving.

Return ONLY valid JSON with this exact structure:
{
  "caloriesPerServing": 350
}

Estimate based on typical nutritional values for the ingredients listed. Be realistic - a main course is typically 400-800 kcal per serving, a side dish 150-300 kcal, a dessert 200-400 kcal.`,
        },
        {
          role: "user",
          content: `Estimate calories per serving for "${name || 'this recipe'}" with ${portions || 4} servings.\n\nIngredients:\n${ingredients.map((i) => `- ${i.amount || ''} ${i.unit || ''} ${i.name}`).join('\n')}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Invalid AI response" });
    }

    const result = JSON.parse(jsonMatch[0]);
    const caloriesPerServing = Math.round(result.caloriesPerServing || 0);

    return res.status(200).json({ caloriesPerServing, totalCalories: caloriesPerServing * (portions || 4) });
  } catch (error) {
    console.error("Estimate calories error:", error);
    return res.status(500).json({ error: "Failed to estimate calories" });
  }
});

// Translate recipe to all supported languages
exports.translateRecipe = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  if (!(await checkRateLimit(uid, "translateRecipe"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { recipeId, name, description, ingredients, instructions } = req.body || {};
  if (!recipeId || !name) {
    return res.status(400).json({ error: "recipeId and name are required" });
  }

  const langMap = { nb: "Norwegian", sv: "Swedish", da: "Danish", en: "English", fi: "Finnish" };
  const allCodes = ["nb", "sv", "da", "en", "fi"];

  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const ingredientText = (ingredients || []).map(i => `${i.amount} ${i.unit} ${i.name}`).join('\n');
    const instructionText = (instructions || []).map((s, i) => `${i + 1}. ${s}`).join('\n');

    const langList = allCodes.map(c => `${c}=${langMap[c]}`).join(', ');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional recipe translator. Translate the recipe below into ALL 5 languages: ${langList}.

CRITICAL RULES:
- Every field (name, description, ingredients, instructions) MUST be fully in the target language
- The recipe name MUST be translated — it is NOT a proper noun
- "Amerikanske pannekaker" in Norwegian = "American pancakes" in English = "Amerikanska pannkakor" in Swedish
- NEVER leave text in the wrong language
- NEVER mix languages in a field
- Keep amounts and units unchanged`,
        },
        {
          role: "user",
          content: `Translate this recipe to ALL 5 languages (${langList}):

name: ${name}
description: ${description || "(none)"}
ingredients: ${ingredientText || "(none)"}
instructions: ${instructionText || "(none)"}

Return ONLY a JSON object with this exact structure:
{"nb":{"name":"...","description":"...","ingredients":[{"name":"...","amount":"...","unit":"..."}],"instructions":["..."]},"sv":{"name":"...","description":"...","ingredients":[{"name":"...","amount":"...","unit":"..."}],"instructions":["..."]},"da":{"name":"...","description":"...","ingredients":[{"name":"...","amount":"...","unit":"..."}],"instructions":["..."]},"en":{"name":"...","description":"...","ingredients":[{"name":"...","amount":"...","unit":"..."}],"instructions":["..."]},"fi":{"name":"...","description":"...","ingredients":[{"name":"...","amount":"...","unit":"..."}],"instructions":["..."]}}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return res.status(500).json({ error: "No response from AI" });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Invalid AI response" });

    const translations = JSON.parse(jsonMatch[0]);

    // Validate all 5 languages are present
    const missing = allCodes.filter(c => !translations[c]);
    if (missing.length > 0) {
      console.log(`translateRecipe: missing languages: ${missing.join(',')}`);
    }

    // Ensure every translation has all fields
    for (const code of allCodes) {
      if (!translations[code]) {
        translations[code] = { name, description: description || "", ingredients: ingredients || [], instructions: instructions || [] };
      } else {
        translations[code].name = translations[code].name || name;
        translations[code].description = translations[code].description || description || "";
        translations[code].ingredients = translations[code].ingredients || ingredients || [];
        translations[code].instructions = translations[code].instructions || instructions || [];
      }
    }

    await getFirestore().collection("recipes").doc(recipeId).update({ translations });
    console.log(`translateRecipe: ${recipeId} saved 5 translations. nb="${translations.nb?.name}", en="${translations.en?.name}", sv="${translations.sv?.name}"`);

    return res.status(200).json({ translations });
  } catch (error) {
    console.error("Translate recipe error:", error);
    return res.status(500).json({ error: "Failed to translate recipe" });
  }
});

// One-time migration: translate all existing recipes that don't have translations
exports.migrateRecipeTranslations = onRequest({ region: "us-central1", memory: "512MB", timeoutSeconds: 540 }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const db = getFirestore();
  const languageConfig = {
    norsk: { code: "nb", english: "Norwegian" },
    svensk: { code: "sv", english: "Swedish" },
    dansk: { code: "da", english: "Danish" },
    engelsk: { code: "en", english: "English" },
    finsk: { code: "fi", english: "Finnish" },
  };

  try {
    const recipesSnap = await db.collection("recipes").limit(500).get();
    const targetLangCodes = Object.values(languageConfig).map(c => c.code).filter(c => c !== "nb");
    const toTranslate = recipesSnap.docs.filter(d => {
      const data = d.data();
      if (!data.translations) return true;
      return targetLangCodes.some(code => !data.translations[code]);
    });

    if (toTranslate.length === 0) {
      return res.status(200).json({ message: "All recipes already translated", translated: 0 });
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    let translated = 0;
    let failed = 0;

    for (const recipeDoc of toTranslate) {
      const recipe = recipeDoc.data();
      const existingTranslations = recipe.translations || {};
      const sourceLanguage = "norsk";
      const ingredientText = (recipe.ingredients || []).map(i => `${i.amount} ${i.unit} ${i.name}`).join('\n');
      const instructionText = (recipe.instructions || []).map((s, i) => `${i + 1}. ${s}`).join('\n');

      const newTranslations = { ...existingTranslations };

      for (const [aiName, config] of Object.entries(languageConfig).filter(([k]) => k !== sourceLanguage)) {
        if (newTranslations[config.code]) continue;
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a professional translator for a family meal planner app. Translate the following recipe from Norwegian to ${config.english}.

Translate ALL text fields accurately. Ingredient names and instruction steps must be properly translated. Keep amounts and units as-is if they are numeric.

Return ONLY valid JSON with this exact structure:
{
  "name": "Translated recipe name",
  "description": "Translated description",
  "ingredients": [{"name": "Translated ingredient name", "amount": "Amount", "unit": "Unit"}],
  "instructions": ["Translated step 1", "Translated step 2"]
}`,
              },
              {
                role: "user",
                content: `Translate this recipe to ${config.english}:

Name: ${recipe.name}
Description: ${recipe.description || ""}

Ingredients:
${ingredientText || "None"}

Instructions:
${instructionText || "None"}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          });

          const content = completion.choices[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                newTranslations[config.code] = JSON.parse(jsonMatch[0]);
              } catch {}
            }
          }
        } catch {}
      }

      if (Object.keys(newTranslations).length > 0) {
        await db.collection("recipes").doc(recipeDoc.id).update({ translations: newTranslations });
        translated++;
      } else {
        failed++;
      }
    }

    return res.status(200).json({ translated, failed, total: toTranslate.length });
  } catch (error) {
    console.error("Migration error:", error);
    return res.status(500).json({ error: "Migration failed" });
  }
});

exports.migrateTransportData = onRequest({ region: "us-central1" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const ADMIN_EMAILS = ["jon@wiklunddidriksen.com"];
  const userEmail = (await getAuth().getUser(uid)).email;
  if (!ADMIN_EMAILS.includes(userEmail)) {
    return res.status(403).json({ error: "Only admin can run migration" });
  }

  const db = getFirestore();
  const familyId = "AVCUsb8X6GdRM3f0EBf0";

  try {
    const tripsSnap = await db.collection("trips").where("familyId", "==", familyId).get();
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const tripDoc of tripsSnap.docs) {
      const tripId = tripDoc.id;

      // Migrate from flights subcollection
      try {
        const flightsSnap = await db.collection("trips").doc(tripId).collection("flights").get();
        for (const doc of flightsSnap.docs) {
          const data = doc.data();
          if (!data.transportType) {
            data.transportType = "fly";
          }
          await db.collection("trips").doc(tripId).collection("transport").doc(doc.id).set(data);
          await doc.ref.delete();
          migrated++;
        }
      } catch (e) { errors++; }

      // Migrate from boats subcollection
      try {
        const boatsSnap = await db.collection("trips").doc(tripId).collection("boats").get();
        for (const doc of boatsSnap.docs) {
          const data = doc.data();
          const mapped = {
            transportType: "boat",
            airline: data.name || "",
            routeName: data.routeName || "",
            reference: data.reference || "",
            cabin: data.cabin || "",
            isOneWay: data.isOneWay || false,
            type: data.type || "utreise",
            departureDate: data.departureDate || "",
            departureTime: data.departureTime || "",
            arrivalDate: data.arrivalDate || "",
            arrivalTime: data.arrivalTime || "",
            departureAddress: data.departureAddress || "",
            arrivalAddress: data.arrivalAddress || "",
            phone: data.phone || "",
            hasCar: data.hasCar || false,
            carRegistration: data.carRegistration || "",
            driver: data.driver || "",
            passengers: data.passengers || "",
            note: data.note || "",
            createdAt: data.createdAt || Date.now(),
          };
          await db.collection("trips").doc(tripId).collection("transport").doc(doc.id).set(mapped);
          await doc.ref.delete();
          migrated++;
        }
      } catch (e) { errors++; }

      // Migrate from taxis subcollection
      try {
        const taxisSnap = await db.collection("trips").doc(tripId).collection("taxis").get();
        for (const doc of taxisSnap.docs) {
          const data = doc.data();
          const mapped = {
            transportType: "taxi",
            airline: data.name || "",
            reference: data.reference || "",
            isOneWay: data.isOneWay || false,
            type: data.type || "utreise",
            departureDate: data.departureDate || "",
            departureTime: data.departureTime || "",
            arrivalDate: data.arrivalDate || "",
            arrivalTime: data.arrivalTime || "",
            departureAddress: data.departureAddress || "",
            arrivalAddress: data.arrivalAddress || "",
            phone: data.phone || "",
            driver: data.driver || "",
            passengers: data.passengers || "",
            note: data.note || "",
            createdAt: data.createdAt || Date.now(),
          };
          await db.collection("trips").doc(tripId).collection("transport").doc(doc.id).set(mapped);
          await doc.ref.delete();
          migrated++;
        }
      } catch (e) { errors++; }

      // Migrate from ferries subcollection
      try {
        const ferriesSnap = await db.collection("trips").doc(tripId).collection("ferries").get();
        for (const doc of ferriesSnap.docs) {
          const data = doc.data();
          const mapped = {
            transportType: "ferry",
            airline: data.name || "",
            routeName: data.routeName || "",
            reference: data.reference || "",
            cabin: data.cabin || "",
            isOneWay: data.isOneWay || false,
            type: data.type || "utreise",
            departureDate: data.departureDate || "",
            departureTime: data.departureTime || "",
            arrivalDate: data.arrivalDate || "",
            arrivalTime: data.arrivalTime || "",
            departureAddress: data.departureAddress || "",
            arrivalAddress: data.arrivalAddress || "",
            phone: data.phone || "",
            hasCar: data.hasCar || false,
            carRegistration: data.carRegistration || "",
            driver: data.driver || "",
            passengers: data.passengers || "",
            note: data.note || "",
            createdAt: data.createdAt || Date.now(),
          };
          await db.collection("trips").doc(tripId).collection("transport").doc(doc.id).set(mapped);
          await doc.ref.delete();
          migrated++;
        }
      } catch (e) { errors++; }
    }

    return res.status(200).json({
      message: "Migration complete",
      tripsProcessed: tripsSnap.docs.length,
      documentsMigrated: migrated,
      errors,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return res.status(500).json({ error: "Migration failed" });
  }
});

// Encrypt a Spond password before storing in Firestore
exports.encryptSpondPassword = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "password is required" });

  try {
    const encrypted = encryptSpondPassword(password);
    return res.status(200).json({ encrypted });
  } catch (error) {
    console.error("Encryption error:", error);
    return res.status(500).json({ error: "Encryption failed" });
  }
});

// Decrypt a Spond password (for use in Cloud Functions only)
exports.decryptSpondPassword = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { encrypted } = req.body || {};
  if (!encrypted) return res.status(400).json({ error: "encrypted is required" });

  try {
    const decrypted = decryptSpondPassword(encrypted);
    return res.status(200).json({ decrypted });
  } catch (error) {
    console.error("Decryption error:", error);
    return res.status(500).json({ error: "Decryption failed" });
  }
});

// Helper: Create a Date object from a time string (HH:MM) in a specific timezone
function createDateInTimezone(dateStr, timeStr, timezone) {
  const [h, m] = timeStr.split(":").map(Number);
  // Create a date string and parse it in the target timezone
  const dateParts = dateStr.split("-");
  const dtStr = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  // Use toLocaleString to get the UTC offset for the timezone
  const tempDate = new Date(dtStr);
  const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = tempDate.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offsetMs = utcDate.getTime() - tzDate.getTime();
  return new Date(tempDate.getTime() + offsetMs);
}

// Scheduled function: check medication reminders every 5 minutes
// Sends push notifications for medications with time slots and reminders
exports.checkMedicationReminders = onSchedule({ schedule: "every 5 minutes", timeZone: "UTC", region: "us-central1" }, async (event) => {
  const db = getFirestore();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Get all families
  const familiesSnap = await db.collection("families").limit(100).get();
  let totalSent = 0;

  for (const familyDoc of familiesSnap.docs) {
    const familyId = familyDoc.id;

    // Get timezone from the family owner's profile
    let familyTimezone = "Europe/Oslo"; // default
    try {
      const familyData = familyDoc.data();
      const ownerUid = familyData.members ? Object.keys(familyData.members)[0] : null;
      if (ownerUid) {
        const userDoc = await db.collection("users").doc(ownerUid).get();
        const userData = userDoc.data();
        if (userData?.timezone) familyTimezone = userData.timezone;
      }
    } catch {}

    // Query health medications for this family
    const healthMedsSnap = await db.collection("health").doc(familyId).collection("medications")
      .where("frequency", ">", 0)
      .limit(50)
      .get();

    // Query pet medications for this family
    const petMedsSnap = await db.collection("pets").doc(familyId).collection("medications")
      .where("frequency", ">", 0)
      .limit(50)
      .get();

    // Process health medications
    for (const doc of healthMedsSnap.docs) {
      const medData = doc.data();
      if (!medData.timeSlots || !Array.isArray(medData.timeSlots)) continue;
      if (medData.dateTo && medData.dateTo < todayStr) continue;
      if (medData.dateFrom && medData.dateFrom > todayStr) continue;

      for (const slot of medData.timeSlots) {
        if (!slot.time || !slot.reminderMinutes) continue;

        const slotTime = createDateInTimezone(todayStr, slot.time, familyTimezone);
        const reminderTime = new Date(slotTime.getTime() - slot.reminderMinutes * 60 * 1000);

        if (reminderTime >= todayStart && reminderTime <= thirtyMinFromNow) {
          const sent = await sendNotification({
            familyId,
            title: `💊 ${medData.name}`,
            body: `${medData.person}: ${slot.time} — ${medData.dosage || ''}`,
            notifKey: `med_${doc.id}_${slot.time}_${todayStr}`,
          });
          totalSent += sent;
        }
      }
    }

    // Process pet medications
    for (const doc of petMedsSnap.docs) {
      const medData = doc.data();
      if (!medData.timeSlots || !Array.isArray(medData.timeSlots)) continue;
      if (medData.dateTo && medData.dateTo < todayStr) continue;
      if (medData.dateFrom && medData.dateFrom > todayStr) continue;

      for (const slot of medData.timeSlots) {
        if (!slot.time || !slot.reminderMinutes) continue;

        const slotTime = createDateInTimezone(todayStr, slot.time, familyTimezone);
        const reminderTime = new Date(slotTime.getTime() - slot.reminderMinutes * 60 * 1000);

        if (reminderTime >= todayStart && reminderTime <= thirtyMinFromNow) {
          const sent = await sendNotification({
            familyId,
            title: `🐾 ${medData.name}`,
            body: `${slot.time} — ${medData.dosage || ''}`,
            notifKey: `petmed_${doc.id}_${slot.time}_${todayStr}`,
          });
          totalSent += sent;
        }
      }
    }
  }

  console.log(`checkMedicationReminders: ${totalSent} sent`);
  return { sent: totalSent };
});

// Chat message notification
exports.notifyNewChatMessage = onDocumentCreated({ region: "us-central1", document: "chat/{chatId}" }, async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  const { senderId, senderName, text, familyId } = data;

  if (!familyId || !senderId) return;

  const preview = text ? (text.length > 50 ? text.substring(0, 50) + "..." : text) : "📷 bilde";

  const sent = await sendNotification({
    familyId,
    title: senderName || "Noen",
    body: preview,
    notifKey: `chat_${snap.id}`,
    excludeUid: senderId,
  });

  console.log(`onChatMessage: ${sent} sent`);
  return { sent };
});

// ==================== GOOGLE CALENDAR ====================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = "https://us-central1-familiesenter-837bb.cloudfunctions.net/googleCalendarCallback";

// Step 1: Redirect to Google OAuth
exports.googleCalendarAuth = onRequest({ region: "us-central1" }, async (req, res) => {
  const uid = req.query.uid;
  if (!uid) {
    res.status(400).send("Missing uid parameter");
    return;
  }

  const scopes = ["https://www.googleapis.com/auth/calendar.events"];
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes.join(" "))}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${uid}`;

  res.redirect(authUrl);
});

// Step 2: Handle OAuth callback
exports.googleCalendarCallback = onRequest({ region: "us-central1" }, async (req, res) => {
  const code = req.query.code;
  const uid = req.query.state;

  if (!code || !uid) {
    res.status(400).send("Missing code or state parameter");
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      res.status(400).send("Failed to exchange code for tokens");
      return;
    }

    // Get user email
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    // Save tokens to Firestore
    const db = getFirestore();
    const calendarData = {
      calendarType: "google",
      calendarAccessToken: tokenData.access_token,
      calendarRefreshToken: tokenData.refresh_token,
      calendarTokenExpiry: Date.now() + (tokenData.expires_in * 1000),
    };
    if (userInfo.email) {
      calendarData.calendarEmail = userInfo.email;
    }
    await db.collection("users").doc(uid).set(calendarData, { merge: true });

    // Redirect back to profile
    res.redirect("https://fampad.app/profile?calendar=connected");
  } catch (error) {
    console.error("Google Calendar callback error:", error);
    res.status(500).send("Failed to connect Google Calendar");
  }
});

// Helper: Refresh Google access token
async function refreshGoogleToken(uid) {
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();

  if (!userData?.calendarRefreshToken) {
    throw new Error("No refresh token found");
  }

  // Check if token is still valid
  if (userData.calendarTokenExpiry && userData.calendarTokenExpiry > Date.now() + 60000) {
    return userData.calendarAccessToken;
  }

  // Refresh the token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: userData.calendarRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    throw new Error("Failed to refresh token: " + tokenData.error);
  }

  // Update tokens in Firestore
  await db.collection("users").doc(uid).update({
    calendarAccessToken: tokenData.access_token,
    calendarTokenExpiry: Date.now() + (tokenData.expires_in * 1000),
  });

  return tokenData.access_token;
}

// Helper: Verify a calendar event actually exists in a user's Google Calendar
// Returns: true (exists), false (404 - deleted/never created), null (unknown error)
async function calendarEventExists(uid, eventId) {
  try {
    const accessToken = await refreshGoogleToken(uid);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (response.status === 200) return true;
    if (response.status === 404) return false;
    console.error(`calendarEventExists: unexpected status ${response.status} for uid ${uid}`);
    return null;
  } catch (error) {
    console.error(`calendarEventExists error for uid ${uid}:`, error.message);
    return null;
  }
}

// Helper: Create Google Calendar event
async function createGoogleCalendarEvent(uid, event) {
  const accessToken = await refreshGoogleToken(uid);

  // Get user timezone
  let userTimezone = "Europe/Oslo";
  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (userData?.timezone) userTimezone = userData.timezone;
  } catch {}

  const calendarEvent = {
    summary: event.title,
    description: event.description || "",
    start: event.allDay
      ? { date: event.startDate }
      : { dateTime: event.startDateTime, timeZone: userTimezone },
    end: event.allDay
      ? { date: event.endDate }
      : { dateTime: event.endDateTime, timeZone: userTimezone },
  };

  if (event.location) {
    calendarEvent.location = event.location;
  }

  if (event.reminderMinutes && event.reminderMinutes > 0) {
    calendarEvent.reminders = {
      useDefault: false,
      overrides: [{ method: "popup", minutes: event.reminderMinutes }],
    };
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(calendarEvent),
    }
  );

  const result = await response.json();

  if (result.error) {
    console.error("Create calendar event error:", result.error);
    throw new Error("Failed to create calendar event: " + result.error.message);
  }

  return result.id;
}

// Cloud Function: Auto-sync events to Google Calendar
// Syncs to ALL family members' calendars (any member with Google Calendar connected)
exports.onEventCreatedForCalendar = onDocumentCreated({ region: "us-central1", document: "events/{eventId}" }, async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  if (!data) return;
  if (!data.familyId) return;

  try {
    const db = getFirestore();
    const startDateTime = `${data.date}T${data.time || "09:00"}:00`;
    const endDateTime = data.endTime
      ? `${data.endDate || data.date}T${data.endTime}:00`
      : data.endDate
        ? `${data.endDate}T${data.time ? incrementTime(data.time) : "10:00"}:00`
        : `${data.date}T${data.time ? incrementTime(data.time) : "10:00"}:00`;

    const payload = {
      title: data.title,
      description: buildCalendarDescription(data, data.description || ""),
      startDateTime,
      endDateTime,
      location: data.address || "",
      reminderMinutes: data.reminderMinutes || 0,
    };

    const { calendarEventIds, firstEventId } = await familySyncCreate(data.familyId, payload);

    if (Object.keys(calendarEventIds).length > 0) {
      await db.collection("events").doc(event.params.eventId).update({
        googleCalendarEventIds: calendarEventIds,
        googleCalendarEventId: calendarEventIds[data.createdBy] || firstEventId,
      });
      console.log(`onEventCreatedForCalendar: synced event ${event.params.eventId} to ${Object.keys(calendarEventIds).length} family calendars`);
    }
  } catch (error) {
    console.error(`onEventCreatedForCalendar error:`, error);
  }
});

// Helper: increment time by 1 hour
function incrementTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const newHours = (hours + 1) % 24;
  return `${String(newHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Helper: Build calendar description including person names ("For: Jon, Mina — note")
function buildCalendarDescription(record, fallback = "") {
  const person = record.selectedPersons || record.persons || record.person;
  const personsStr = Array.isArray(person) ? person.join(", ") : (person || "");
  const parts = [];
  if (personsStr) parts.push(`For: ${personsStr}`);
  if (fallback) parts.push(fallback);
  return parts.join(" — ");
}

// Cloud Function: Auto-sync trips to Google Calendar
exports.onTripCreatedForCalendar = onDocumentCreated({ region: "us-central1", document: "trips/{tripId}" }, async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  if (!data) return;
  if (!data.familyId) return;

  try {
    const db = getFirestore();
    const startDate = data.startDate;
    const endDate = data.endDate || data.startDate;
    const startTime = data.startTime;

    const payload = {
      title: `✈️ ${data.title || data.city || "Reise"}`,
      description: buildCalendarDescription(data, `${data.city || ""}${data.country ? ", " + data.country : ""}`),
      allDay: !startTime,
      startDate,
      endDate,
      ...(startTime ? { startDateTime: `${startDate}T${startTime}:00` } : {}),
      ...(data.endTime ? { endDateTime: `${endDate}T${data.endTime}:00` } : {}),
    };

    const { calendarEventIds, firstEventId } = await familySyncCreate(data.familyId, payload);

    if (Object.keys(calendarEventIds).length > 0) {
      await db.collection("trips").doc(event.params.tripId).update({
        googleCalendarEventIds: calendarEventIds,
        googleCalendarEventId: calendarEventIds[data.createdBy] || firstEventId,
      });
      console.log(`onTripCreatedForCalendar: synced trip ${event.params.tripId} to ${Object.keys(calendarEventIds).length} family calendars`);
    }
  } catch (error) {
    console.error(`onTripCreatedForCalendar error:`, error);
  }
});

// Cloud Function: Auto-sync health appointments to Google Calendar
exports.onHealthAppointmentCreatedForCalendar = onDocumentCreated({ region: "us-central1", document: "health/{familyId}/appointments/{docId}" }, async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  const familyId = event.params.familyId;
  if (!data) return;

  try {
    const db = getFirestore();
    const startDateTime = `${data.dateFrom}T${data.startTime || "09:00"}:00`;
    const endDateTime = data.endTime
      ? `${data.dateTo || data.dateFrom}T${data.endTime}:00`
      : `${data.dateFrom}T${incrementTime(data.startTime || "09:00")}:00`;

    const payload = {
      title: `❤️ ${data.title}`,
      description: Array.isArray(data.person) ? data.person.join(", ") : (data.person || ""),
      startDateTime,
      endDateTime,
      location: data.location || "",
      reminderMinutes: data.reminder || 0,
    };

    const { calendarEventIds, firstEventId } = await familySyncCreate(familyId, payload);

    if (Object.keys(calendarEventIds).length > 0) {
      await db.collection("health").doc(familyId).collection("appointments").doc(event.params.docId).update({
        googleCalendarEventIds: calendarEventIds,
        googleCalendarEventId: calendarEventIds[data.createdBy] || firstEventId,
      });
      console.log(`onHealthAppointmentCreatedForCalendar: synced ${event.params.docId} to ${Object.keys(calendarEventIds).length} family calendars`);
    }
  } catch (error) {
    console.error(`onHealthAppointmentCreatedForCalendar error:`, error);
  }
});

// Cloud Function: Auto-sync pet vet visits to Google Calendar
exports.onPetVetVisitCreatedForCalendar = onDocumentCreated({ region: "us-central1", document: "petVetVisits/{docId}" }, async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  if (!data) return;
  if (!data.familyId) return;

  try {
    const db = getFirestore();
    const startDateTime = `${data.dateFrom}T${data.startTime || "09:00"}:00`;
    const endDateTime = data.endTime
      ? `${data.dateTo || data.dateFrom}T${data.endTime}:00`
      : `${data.dateFrom}T${incrementTime(data.startTime || "09:00")}:00`;

    const payload = {
      title: `🐾 ${data.title}`,
      description: Array.isArray(data.person) ? data.person.join(", ") : (data.person || ""),
      startDateTime,
      endDateTime,
      location: data.location || "",
      reminderMinutes: data.reminder || 0,
    };

    const { calendarEventIds, firstEventId } = await familySyncCreate(data.familyId, payload);

    if (Object.keys(calendarEventIds).length > 0) {
      await db.collection("petVetVisits").doc(event.params.docId).update({
        googleCalendarEventIds: calendarEventIds,
        googleCalendarEventId: calendarEventIds[data.createdBy] || firstEventId,
      });
      console.log(`onPetVetVisitCreatedForCalendar: synced ${event.params.docId} to ${Object.keys(calendarEventIds).length} family calendars`);
    }
  } catch (error) {
    console.error(`onPetVetVisitCreatedForCalendar error:`, error);
  }
});

// Helper: Update Google Calendar event
async function updateGoogleCalendarEvent(uid, calendarEventId, event) {
  const accessToken = await refreshGoogleToken(uid);

  // Get user timezone
  let userTimezone = "Europe/Oslo";
  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (userData?.timezone) userTimezone = userData.timezone;
  } catch {}

  const calendarEvent = {
    summary: event.title,
    description: event.description || "",
  };

  if (event.allDay) {
    calendarEvent.start = { date: event.startDate };
    calendarEvent.end = { date: event.endDate };
  } else {
    calendarEvent.start = { dateTime: event.startDateTime, timeZone: userTimezone };
    calendarEvent.end = { dateTime: event.endDateTime, timeZone: userTimezone };
  }

  if (event.location !== undefined) {
    calendarEvent.location = event.location;
  }

  if (event.reminderMinutes && event.reminderMinutes > 0) {
    calendarEvent.reminders = {
      useDefault: false,
      overrides: [{ method: "popup", minutes: event.reminderMinutes }],
    };
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(calendarEvent),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    console.error("Update calendar event error:", err);
    throw new Error("Failed to update calendar event");
  }
}

// Helper: Delete Google Calendar event
async function deleteGoogleCalendarEvent(uid, calendarEventId) {
  const accessToken = await refreshGoogleToken(uid);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    const err = await response.json();
    console.error("Delete calendar event error:", err);
  }
}

// ==================== FAMILY-WIDE SYNC HELPERS ====================
// Sync calendar events to ALL family members who have Google Calendar connected

// Helper: Create calendar event for all family members
// Returns { calendarEventIds: {uid: eventId}, firstEventId }
async function familySyncCreate(familyId, payload) {
  const db = getFirestore();
  const familySnap = await db.collection("families").doc(familyId).get();
  const members = familySnap.data()?.members || {};
  const memberUids = Object.keys(members);
  const calendarEventIds = {};
  let firstEventId = null;

  for (const uid of memberUids) {
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.data();
      if (!userData || userData.calendarType !== "google" || !userData.calendarRefreshToken) continue;
      const eventId = await createGoogleCalendarEvent(uid, payload);
      calendarEventIds[uid] = eventId;
      if (!firstEventId) firstEventId = eventId;
    } catch (e) {
      console.error(`familySyncCreate: failed for uid ${uid}:`, e.message);
    }
  }
  return { calendarEventIds, firstEventId };
}

// Helper: Update calendar event for all family members it was synced to
// Supports legacy single-ID format (creator) and new multi-member map
async function familySyncUpdate(record, payload) {
  const db = getFirestore();
  const calendarEventIds = record.googleCalendarEventIds || {};
  const legacyId = record.googleCalendarEventId;
  let uids = Object.keys(calendarEventIds);
  if (uids.length === 0 && record.createdBy && legacyId) uids = [record.createdBy];
  if (uids.length === 0) return 0;

  let count = 0;
  for (const uid of uids) {
    try {
      const eventIdToUpdate = calendarEventIds[uid] || legacyId;
      if (!eventIdToUpdate) continue;
      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.data();
      if (!userData || userData.calendarType !== "google" || !userData.calendarRefreshToken) continue;
      await updateGoogleCalendarEvent(uid, eventIdToUpdate, payload);
      count++;
    } catch (e) {
      console.error(`familySyncUpdate: failed for uid ${uid}:`, e.message);
    }
  }
  return count;
}

// Helper: Delete calendar event from all family members' calendars
// Supports legacy single-ID format (creator) and new multi-member map
async function familySyncDelete(record) {
  const calendarEventIds = record.googleCalendarEventIds || {};
  const legacyId = record.googleCalendarEventId;
  let uids = Object.keys(calendarEventIds);
  if (uids.length === 0 && record.createdBy && legacyId) uids = [record.createdBy];
  if (uids.length === 0) return 0;

  let count = 0;
  for (const uid of uids) {
    try {
      const eventIdToDelete = calendarEventIds[uid] || legacyId;
      if (!eventIdToDelete) continue;
      await deleteGoogleCalendarEvent(uid, eventIdToDelete);
      count++;
    } catch (e) {
      console.error(`familySyncDelete: failed for uid ${uid}:`, e.message);
    }
  }
  return count;
}

// ==================== UPDATE TRIGGERS ====================

exports.onEventUpdatedForCalendar = onDocumentUpdated({ region: "us-central1", document: "events/{eventId}" }, async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;

  try {
    const startDateTime = `${after.date}T${after.time || "09:00"}:00`;
    const endDateTime = after.endTime
      ? `${after.endDate || after.date}T${after.endTime}:00`
      : after.endDate
        ? `${after.endDate}T${after.time ? incrementTime(after.time) : "10:00"}:00`
        : `${after.date}T${after.time ? incrementTime(after.time) : "10:00"}:00`;

    const payload = {
      title: after.title,
      description: buildCalendarDescription(after, after.description || ""),
      allDay: !after.startTime,
      startDate: after.startDate,
      endDate: after.endDate || after.startDate,
      startDateTime,
      endDateTime,
      location: after.address || "",
      reminderMinutes: after.reminderMinutes || 0,
    };

    const count = await familySyncUpdate(after, payload);

    console.log(`onEventUpdatedForCalendar: updated event ${event.params.eventId} on ${count} calendars`);

    // Self-healing: if the event has never been synced (creation failed on a
    // buggy multi-day event, old pre-sync event), create it now on update.
    const hasCalendarId = after.googleCalendarEventId ||
      (after.googleCalendarEventIds && Object.keys(after.googleCalendarEventIds).length > 0);
    if (count === 0 && !hasCalendarId && after.familyId) {
      const db = getFirestore();
      const { calendarEventIds: newIds, firstEventId } = await familySyncCreate(after.familyId, payload);
      if (Object.keys(newIds).length > 0) {
        await db.collection("events").doc(event.params.eventId).update({
          googleCalendarEventIds: newIds,
          googleCalendarEventId: newIds[after.createdBy] || firstEventId,
        });
        console.log(`onEventUpdatedForCalendar: self-healed event ${event.params.eventId} (was never synced)`);
      }
    }
  } catch (error) {
    console.error(`onEventUpdatedForCalendar error:`, error);
  }
});

exports.onTripUpdatedForCalendar = onDocumentUpdated({ region: "us-central1", document: "trips/{tripId}" }, async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;

  try {
    const count = await familySyncUpdate(after, {
      title: `✈️ ${after.title || after.city || "Reise"}`,
      description: buildCalendarDescription(after, `${after.city || ""}${after.country ? ", " + after.country : ""}`),
      allDay: !after.startTime,
      startDate: after.startDate,
      endDate: after.endDate || after.startDate,
      ...(after.startTime ? { startDateTime: `${after.startDate}T${after.startTime}:00` } : {}),
      ...(after.endTime ? { endDateTime: `${after.endDate || after.startDate}T${after.endTime}:00` } : {}),
    });

    console.log(`onTripUpdatedForCalendar: updated trip ${event.params.tripId} on ${count} calendars`);
  } catch (error) {
    console.error(`onTripUpdatedForCalendar error:`, error);
  }
});

exports.onHealthAppointmentUpdatedForCalendar = onDocumentUpdated({ region: "us-central1", document: "health/{familyId}/appointments/{docId}" }, async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;

  try {
    const startDateTime = `${after.dateFrom}T${after.startTime || "09:00"}:00`;
    const endDateTime = after.endTime
      ? `${after.dateTo || after.dateFrom}T${after.endTime}:00`
      : `${after.dateFrom}T${incrementTime(after.startTime || "09:00")}:00`;

    const count = await familySyncUpdate(after, {
      title: `❤️ ${after.title}`,
      description: Array.isArray(after.person) ? after.person.join(", ") : (after.person || ""),
      allDay: !after.startTime,
      startDate: after.dateFrom,
      endDate: after.dateTo || after.dateFrom,
      startDateTime,
      endDateTime,
      location: after.location || "",
      reminderMinutes: after.reminder || 0,
    });

    console.log(`onHealthAppointmentUpdatedForCalendar: updated ${event.params.docId} on ${count} calendars`);
  } catch (error) {
    console.error(`onHealthAppointmentUpdatedForCalendar error:`, error);
  }
});

exports.onPetVetVisitUpdatedForCalendar = onDocumentUpdated({ region: "us-central1", document: "petVetVisits/{docId}" }, async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;

  try {
    const startDateTime = `${after.dateFrom}T${after.startTime || "09:00"}:00`;
    const endDateTime = after.endTime
      ? `${after.dateTo || after.dateFrom}T${after.endTime}:00`
      : `${after.dateFrom}T${incrementTime(after.startTime || "09:00")}:00`;

    const count = await familySyncUpdate(after, {
      title: `🐾 ${after.title}`,
      description: Array.isArray(after.person) ? after.person.join(", ") : (after.person || ""),
      allDay: !after.startTime,
      startDate: after.dateFrom,
      endDate: after.dateTo || after.dateFrom,
      startDateTime,
      endDateTime,
      location: after.location || "",
      reminderMinutes: after.reminder || 0,
    });

    console.log(`onPetVetVisitUpdatedForCalendar: updated ${event.params.docId} on ${count} calendars`);
  } catch (error) {
    console.error(`onPetVetVisitUpdatedForCalendar error:`, error);
  }
});

// ==================== DELETE TRIGGERS ====================

exports.onEventDeletedForCalendar = onDocumentDeleted({ region: "us-central1", document: "events/{eventId}" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  try {
    const count = await familySyncDelete(data);
    console.log(`onEventDeletedForCalendar: deleted event ${event.params.eventId} from ${count} calendars`);
  } catch (error) {
    console.error(`onEventDeletedForCalendar error:`, error);
  }
});

exports.onTripDeletedForCalendar = onDocumentDeleted({ region: "us-central1", document: "trips/{tripId}" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  try {
    const count = await familySyncDelete(data);
    console.log(`onTripDeletedForCalendar: deleted trip ${event.params.tripId} from ${count} calendars`);
  } catch (error) {
    console.error(`onTripDeletedForCalendar error:`, error);
  }
});

exports.onHealthAppointmentDeletedForCalendar = onDocumentDeleted({ region: "us-central1", document: "health/{familyId}/appointments/{docId}" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  try {
    const count = await familySyncDelete(data);
    console.log(`onHealthAppointmentDeletedForCalendar: deleted ${event.params.docId} from ${count} calendars`);
  } catch (error) {
    console.error(`onHealthAppointmentDeletedForCalendar error:`, error);
  }
});

exports.onPetVetVisitDeletedForCalendar = onDocumentDeleted({ region: "us-central1", document: "petVetVisits/{docId}" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  try {
    const count = await familySyncDelete(data);
    console.log(`onPetVetVisitDeletedForCalendar: deleted ${event.params.docId} from ${count} calendars`);
  } catch (error) {
    console.error(`onPetVetVisitDeletedForCalendar error:`, error);
  }
});

// ==================== SCHOOL ACTIVITY CALENDAR SYNC ====================

exports.onSchoolActivityCreatedForCalendar = onDocumentCreated({ region: "us-central1", document: "schoolActivities/{familyId}/activities/{docId}" }, async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  const familyId = event.params.familyId;
  if (!data) return;

  try {
    const db = getFirestore();
    const startDateTime = `${data.dateFrom}T${data.startTime || "09:00"}:00`;
    const endDateTime = data.endTime
      ? `${data.dateTo || data.dateFrom}T${data.endTime}:00`
      : `${data.dateFrom}T${incrementTime(data.startTime || "09:00")}:00`;

    const typeLabel = data.activityType === "tur" ? "Tur" : data.activityType === "aktivitet" ? "Aktivitet" : "Møte";

    const payload = {
      title: `📚 ${typeLabel}: ${data.title}`,
      description: Array.isArray(data.selectedPersons) ? data.selectedPersons.join(", ") : (data.note || ""),
      startDateTime,
      endDateTime,
      location: data.location || "",
      reminderMinutes: data.reminder || 0,
    };

    const { calendarEventIds, firstEventId } = await familySyncCreate(familyId, payload);

    if (Object.keys(calendarEventIds).length > 0) {
      await db.collection("schoolActivities").doc(familyId).collection("activities").doc(event.params.docId).update({
        googleCalendarEventIds: calendarEventIds,
        googleCalendarEventId: calendarEventIds[data.createdBy] || firstEventId,
      });
      console.log(`onSchoolActivityCreatedForCalendar: synced ${event.params.docId} to ${Object.keys(calendarEventIds).length} family calendars`);
    }
  } catch (error) {
    console.error(`onSchoolActivityCreatedForCalendar error:`, error);
  }
});

exports.onSchoolActivityUpdatedForCalendar = onDocumentUpdated({ region: "us-central1", document: "schoolActivities/{familyId}/activities/{docId}" }, async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;

  try {
    const startDateTime = `${after.dateFrom}T${after.startTime || "09:00"}:00`;
    const endDateTime = after.endTime
      ? `${after.dateTo || after.dateFrom}T${after.endTime}:00`
      : `${after.dateFrom}T${incrementTime(after.startTime || "09:00")}:00`;

    const typeLabel = after.activityType === "tur" ? "Tur" : after.activityType === "aktivitet" ? "Aktivitet" : "Møte";

    const count = await familySyncUpdate(after, {
      title: `📚 ${typeLabel}: ${after.title}`,
      description: Array.isArray(after.selectedPersons) ? after.selectedPersons.join(", ") : (after.note || ""),
      allDay: !after.startTime,
      startDate: after.dateFrom,
      endDate: after.dateTo || after.dateFrom,
      startDateTime,
      endDateTime,
      location: after.location || "",
      reminderMinutes: after.reminder || 0,
    });

    console.log(`onSchoolActivityUpdatedForCalendar: updated ${event.params.docId} on ${count} calendars`);
  } catch (error) {
    console.error(`onSchoolActivityUpdatedForCalendar error:`, error);
  }
});

exports.onSchoolActivityDeletedForCalendar = onDocumentDeleted({ region: "us-central1", document: "schoolActivities/{familyId}/activities/{docId}" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  try {
    const count = await familySyncDelete(data);
    console.log(`onSchoolActivityDeletedForCalendar: deleted ${event.params.docId} from ${count} calendars`);
  } catch (error) {
    console.error(`onSchoolActivityDeletedForCalendar error:`, error);
  }
});

// ==================== KINDERGARTEN ACTIVITY CALENDAR SYNC ====================

exports.onKindergartenActivityCreatedForCalendar = onDocumentCreated({ region: "us-central1", document: "kindergartenActivities/{familyId}/activities/{docId}" }, async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  const familyId = event.params.familyId;
  if (!data) return;

  try {
    const db = getFirestore();
    const startDateTime = `${data.dateFrom}T${data.startTime || "09:00"}:00`;
    const endDateTime = data.endTime
      ? `${data.dateTo || data.dateFrom}T${data.endTime}:00`
      : `${data.dateFrom}T${incrementTime(data.startTime || "09:00")}:00`;

    const typeLabel = data.activityType === "tur" ? "Tur" : data.activityType === "aktivitet" ? "Aktivitet" : "Møte";

    const payload = {
      title: `🎨 ${typeLabel}: ${data.title}`,
      description: Array.isArray(data.selectedPersons) ? data.selectedPersons.join(", ") : (data.note || ""),
      startDateTime,
      endDateTime,
      location: data.location || "",
      reminderMinutes: data.reminder || 0,
    };

    const { calendarEventIds, firstEventId } = await familySyncCreate(familyId, payload);

    if (Object.keys(calendarEventIds).length > 0) {
      await db.collection("kindergartenActivities").doc(familyId).collection("activities").doc(event.params.docId).update({
        googleCalendarEventIds: calendarEventIds,
        googleCalendarEventId: calendarEventIds[data.createdBy] || firstEventId,
      });
      console.log(`onKindergartenActivityCreatedForCalendar: synced ${event.params.docId} to ${Object.keys(calendarEventIds).length} family calendars`);
    }
  } catch (error) {
    console.error(`onKindergartenActivityCreatedForCalendar error:`, error);
  }
});

exports.onKindergartenActivityUpdatedForCalendar = onDocumentUpdated({ region: "us-central1", document: "kindergartenActivities/{familyId}/activities/{docId}" }, async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;

  try {
    const startDateTime = `${after.dateFrom}T${after.startTime || "09:00"}:00`;
    const endDateTime = after.endTime
      ? `${after.dateTo || after.dateFrom}T${after.endTime}:00`
      : `${after.dateFrom}T${incrementTime(after.startTime || "09:00")}:00`;

    const typeLabel = after.activityType === "tur" ? "Tur" : after.activityType === "aktivitet" ? "Aktivitet" : "Møte";

    const count = await familySyncUpdate(after, {
      title: `🎨 ${typeLabel}: ${after.title}`,
      description: Array.isArray(after.selectedPersons) ? after.selectedPersons.join(", ") : (after.note || ""),
      allDay: !after.startTime,
      startDate: after.dateFrom,
      endDate: after.dateTo || after.dateFrom,
      startDateTime,
      endDateTime,
      location: after.location || "",
      reminderMinutes: after.reminder || 0,
    });

    console.log(`onKindergartenActivityUpdatedForCalendar: updated ${event.params.docId} on ${count} calendars`);
  } catch (error) {
    console.error(`onKindergartenActivityUpdatedForCalendar error:`, error);
  }
});

exports.onKindergartenActivityDeletedForCalendar = onDocumentDeleted({ region: "us-central1", document: "kindergartenActivities/{familyId}/activities/{docId}" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  try {
    const count = await familySyncDelete(data);
    console.log(`onKindergartenActivityDeletedForCalendar: deleted ${event.params.docId} from ${count} calendars`);
  } catch (error) {
    console.error(`onKindergartenActivityDeletedForCalendar error:`, error);
  }
});


// DEBUG: Check user calendar data
// CLOUD FUNCTION: Backfill family-wide Google Calendar sync (owner only, dry-run supported)
// Loops all 7 event type collections for a family and ensures every Google-connected
// family member has each event in their calendar. Duplicate-safe: existing IDs are
// verified against Google before anything is created.
exports.backfillCalendarSync = onRequest({ region: "us-central1", memory: "512MB", timeoutSeconds: 540 }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  if (!(await checkRateLimit(uid, "backfillCalendarSync"))) return res.status(429).json({ error: "Too many requests" });

  const { familyId, dryRun } = req.body || {};
  if (!familyId) return res.status(400).json({ error: "Missing familyId" });

  const db = getFirestore();

  try {
    // Owner-only (verified server-side)
    const familySnap = await db.collection("families").doc(familyId).get();
    const familyData = familySnap.data();
    const members = familyData?.members || {};
    if (familySnap.data()?.members?.[uid]?.role !== "owner") {
      return res.status(403).json({ error: "Only the family owner can run this" });
    }
    const memberUids = Object.keys(members);

    // Find which members are connected to Google Calendar
    const googleConnectedUids = new Set();
    for (const mUid of memberUids) {
      const uDoc = await db.collection("users").doc(mUid).get();
      const uData = uDoc.data();
      if (uData?.calendarType === "google" && uData?.calendarRefreshToken) {
        googleConnectedUids.add(mUid);
      }
    }

    // Per-type spec: query + payload builder (copied 1:1 from the live triggers)
    const TYPES = [
      {
        type: "event",
        query: db.collection("events").where("familyId", "==", familyId).limit(500),
        idField: "googleCalendarEventId",
        idsField: "googleCalendarEventIds",
        build: (d) => ({
          title: d.title,
          description: buildCalendarDescription(d, d.description || ""),
          startDateTime: `${d.date}T${d.time || "09:00"}:00`,
          endDateTime: d.endTime
            ? `${d.endDate || d.date}T${d.endTime}:00`
            : d.endDate
              ? `${d.endDate}T${d.time ? incrementTime(d.time) : "10:00"}:00`
              : `${d.date}T${d.time ? incrementTime(d.time) : "10:00"}:00`,
          location: d.address || "",
          reminderMinutes: d.reminderMinutes || 0,
        }),
      },
      {
        type: "trip",
        query: db.collection("trips").where("familyId", "==", familyId).limit(500),
        idField: "googleCalendarEventId",
        idsField: "googleCalendarEventIds",
        build: (d) => ({
          title: `✈️ ${d.title || d.city || "Reise"}`,
          description: buildCalendarDescription(d, `${d.city || ""}${d.country ? ", " + d.country : ""}`),
          allDay: !d.startTime,
          startDate: d.startDate,
          endDate: d.endDate || d.startDate,
          ...(d.startTime ? { startDateTime: `${d.startDate}T${d.startTime}:00` } : {}),
          ...(d.endTime ? { endDateTime: `${d.endDate || d.startDate}T${d.endTime}:00` } : {}),
        }),
      },
      {
        type: "petVetVisit",
        query: db.collection("petVetVisits").where("familyId", "==", familyId).limit(500),
        idField: "googleCalendarEventId",
        idsField: "googleCalendarEventIds",
        build: (d) => ({
          title: `🐾 ${d.title}`,
          description: Array.isArray(d.person) ? d.person.join(", ") : (d.person || ""),
          startDateTime: `${d.dateFrom}T${d.startTime || "09:00"}:00`,
          endDateTime: d.endTime
            ? `${d.dateTo || d.dateFrom}T${d.endTime}:00`
            : `${d.dateFrom}T${incrementTime(d.startTime || "09:00")}:00`,
          location: d.location || "",
          reminderMinutes: d.reminder || 0,
        }),
      },
      {
        type: "homeService",
        query: db.collection("homeServices").where("familyId", "==", familyId).limit(500),
        idField: "calendarEventId",
        idsField: "calendarEventIds",
        build: (d) => ({
          title: `🔧 ${d.title}`,
          description: Array.isArray(d.persons) ? d.persons.join(", ") : (d.description || ""),
          startDateTime: `${d.dateFrom}T${d.startTime || "09:00"}:00`,
          endDateTime: d.endTime
            ? `${d.dateTo || d.dateFrom}T${d.endTime}:00`
            : `${d.dateTo || d.dateFrom}T${incrementTime(d.startTime || "09:00")}:00`,
          location: "",
          reminderMinutes: d.reminder || 0,
        }),
      },
      {
        type: "healthAppointment",
        query: db.collection("health").doc(familyId).collection("appointments").limit(500),
        idField: "googleCalendarEventId",
        idsField: "googleCalendarEventIds",
        build: (d) => ({
          title: `❤️ ${d.title}`,
          description: Array.isArray(d.person) ? d.person.join(", ") : (d.person || ""),
          startDateTime: `${d.dateFrom}T${d.startTime || "09:00"}:00`,
          endDateTime: d.endTime
            ? `${d.dateTo || d.dateFrom}T${d.endTime}:00`
            : `${d.dateFrom}T${incrementTime(d.startTime || "09:00")}:00`,
          location: d.location || "",
          reminderMinutes: d.reminder || 0,
        }),
      },
      {
        type: "schoolActivity",
        query: db.collection("schoolActivities").doc(familyId).collection("activities").limit(500),
        idField: "googleCalendarEventId",
        idsField: "googleCalendarEventIds",
        build: (d) => ({
          title: `📚 ${d.activityType === "tur" ? "Tur" : d.activityType === "aktivitet" ? "Aktivitet" : "Møte"}: ${d.title}`,
          description: Array.isArray(d.selectedPersons) ? d.selectedPersons.join(", ") : (d.note || ""),
          startDateTime: `${d.dateFrom}T${d.startTime || "09:00"}:00`,
          endDateTime: d.endTime
            ? `${d.dateTo || d.dateFrom}T${d.endTime}:00`
            : `${d.dateFrom}T${incrementTime(d.startTime || "09:00")}:00`,
          location: d.location || "",
          reminderMinutes: d.reminder || 0,
        }),
      },
      {
        type: "kindergartenActivity",
        query: db.collection("kindergartenActivities").doc(familyId).collection("activities").limit(500),
        idField: "googleCalendarEventId",
        idsField: "googleCalendarEventIds",
        build: (d) => ({
          title: `🎨 ${d.activityType === "tur" ? "Tur" : d.activityType === "aktivitet" ? "Aktivitet" : "Møte"}: ${d.title}`,
          description: Array.isArray(d.selectedPersons) ? d.selectedPersons.join(", ") : (d.note || ""),
          startDateTime: `${d.dateFrom}T${d.startTime || "09:00"}:00`,
          endDateTime: d.endTime
            ? `${d.dateTo || d.dateFrom}T${d.endTime}:00`
            : `${d.dateFrom}T${incrementTime(d.startTime || "09:00")}:00`,
          location: d.location || "",
          reminderMinutes: d.reminder || 0,
        }),
      },
    ];

    const summary = { scanned: 0, created: 0, skippedExists: 0, recreated: 0, failed: 0, verifyFailed: 0, notConnected: 0 };
    const items = [];

    for (const spec of TYPES) {
      const snap = await spec.query.get();
      for (const docSnap of snap.docs) {
        const d = docSnap.data();
        if (!d) continue;
        const payload = spec.build(d);
        if (!payload) continue;
        summary.scanned++;
        const perMember = {};

        // Seed the map from legacy single-ID format so the creator isn't duplicated
        let map = { ...(d[spec.idsField] || {}) };
        const createdBy = d.createdBy || "";
        if (createdBy && !map[createdBy] && d[spec.idField]) {
          map = { ...map, [createdBy]: d[spec.idField] };
        }

        let mapChanged = false;

        for (const mUid of memberUids) {
          if (!googleConnectedUids.has(mUid)) {
            perMember[mUid] = "notConnected";
            continue;
          }
          const existingId = map[mUid];
          if (existingId) {
            const exists = await calendarEventExists(mUid, existingId);
            if (exists === true) {
              perMember[mUid] = "skippedExists";
              summary.skippedExists++;
              continue;
            }
            if (exists === null) {
              perMember[mUid] = "verifyFailed";
              summary.verifyFailed++;
              continue;
            }
            // 404 -> the event was deleted from their calendar, recreate
            try {
              const newId = await createGoogleCalendarEvent(mUid, payload);
              map = { ...map, [mUid]: newId };
              mapChanged = true;
              perMember[mUid] = "recreated";
              summary.recreated++;
            } catch (e) {
              perMember[mUid] = "failed: " + (e.message || e);
              summary.failed++;
            }
          } else {
            try {
              const newId = await createGoogleCalendarEvent(mUid, payload);
              map = { ...map, [mUid]: newId };
              mapChanged = true;
              perMember[mUid] = "created";
              summary.created++;
            } catch (e) {
              perMember[mUid] = "failed: " + (e.message || "");
              summary.failed++;
            }
          }
        }

        // Persist the updated map (real run only, only when something was created/recreated)
        if (!dryRun && mapChanged) {
          const updateObj = { [spec.idsField]: map };
          if (createdBy && map[createdBy]) updateObj[spec.idField] = map[createdBy];
          try {
            await docSnap.ref.update(updateObj);
          } catch (e) {
            summary.failed++;
          }
        }

        items.push({ type: spec.type, id: docSnap.id, title: payload.title, perMember });
      }
    }

    const report = { dryRun: !!dryRun, summary, items, memberUids: memberUids, googleConnectedUids: Array.from(googleConnectedUids) };
    return res.json(report);
  } catch (error) {
    console.error("backfillCalendarSync error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

exports.debugCheckUser = onRequest({ region: "us-central1" }, async (req, res) => {
  const uid = req.query.uid || "jon@wiklunddidriksen.com";
  const db = getFirestore();
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) {
    res.json({ error: "User not found" });
    return;
  }
  const data = doc.data();
  res.json({
    calendarType: data.calendarType || "NOT SET",
    calendarEmail: data.calendarEmail || "NOT SET",
    calendarProvider: data.calendarProvider || "NOT SET",
    hasAccessToken: !!data.calendarAccessToken,
    hasRefreshToken: !!data.calendarRefreshToken,
  });
});

// DEBUG: Check event calendar data
exports.debugCheckEvent = onRequest({ region: "us-central1" }, async (req, res) => {
  const eventId = req.query.eventId;
  if (!eventId) {
    res.json({ error: "Missing eventId" });
    return;
  }
  const db = getFirestore();
  const doc = await db.collection("events").doc(eventId).get();
  if (!doc.exists) {
    res.json({ error: "Event not found" });
    return;
  }
  const data = doc.data();
  res.json({
    title: data.title,
    date: data.date,
    time: data.time,
    googleCalendarEventId: data.googleCalendarEventId || "NOT SET",
    createdBy: data.createdBy,
  });
});

// DEBUG: Check health appointments
exports.debugCheckHealth = onRequest({ region: "us-central1" }, async (req, res) => {
  const db = getFirestore();
  const snapshot = await db.collection("healthAppointments").orderBy("createdAt", "desc").limit(3).get();
  const results = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    results.push({
      id: doc.id,
      title: data.title,
      createdBy: data.createdBy,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    });
  });
  res.json(results);
});

// DEBUG: Check collections
exports.debugCheckCollections = onRequest({ region: "us-central1" }, async (req, res) => {
  const db = getFirestore();
  const collections = ["healthAppointments", "health", "healthVaccinations", "petVetVisits", "petVaccinations"];
  const results = {};
  for (const col of collections) {
    const snapshot = await db.collection(col).limit(1).get();
    results[col] = snapshot.size > 0 ? "has data" : "empty";
  }
  res.json(results);
});

// DEBUG: Check trips
exports.debugCheckTrips = onRequest({ region: "us-central1" }, async (req, res) => {
  const db = getFirestore();
  const snapshot = await db.collection("trips").orderBy("createdAt", "desc").limit(3).get();
  const results = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    results.push({
      id: doc.id,
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      createdBy: data.createdBy,
    });
  });
  res.json(results);
});

// DEBUG: Check pet vet visits
exports.debugCheckPetVet = onRequest({ region: "us-central1" }, async (req, res) => {
  const db = getFirestore();
  const snapshot = await db.collection("petVetVisits").orderBy("createdAt", "desc").limit(3).get();
  const results = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    results.push({
      id: doc.id,
      title: data.title,
      createdBy: data.createdBy,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      googleCalendarEventId: data.googleCalendarEventId || "NOT SET",
    });
  });
  res.json(results);
});

exports.homeExtractColor = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!(await checkRateLimit(uid, "homeExtractColor"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { imageBase64, colorCode } = req.body;

    if (!imageBase64 && !colorCode) {
      return res.status(400).json({ error: "No image data or color code received" });
    }

    // Text-based code lookup
    if (colorCode && !imageBase64) {
      const systemPrompt = `You are a paint color expert. Given a paint color code, return the color name, brand, and approximate hex color.

Known paint systems: Jotun, NCS, RAL, Dyrup, Beckers, Histor, Sigma, Alcro,纂

Return your response as JSON:
{
  "name": "Color name (e.g. 'Klassisk Hvit')",
  "code": "The code provided",
  "brand": "Brand if identifiable",
  "hexColor": "Approximate hex color code (e.g. '#F5F0EB')"
}

Be as accurate as possible with the hex color. If uncertain, give your best approximation.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Look up this paint color code and return the hex color: ${colorCode}` },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || "";
      let colorData;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        colorData = jsonMatch ? JSON.parse(jsonMatch[0]) : { name: "", code: colorCode, brand: "", hexColor: "" };
      } catch (e) {
        colorData = { name: "", code: colorCode, brand: "", hexColor: "" };
      }

      return res.json({
        name: colorData.name || "",
        code: colorData.code || colorCode,
        brand: colorData.brand || "",
        hexColor: colorData.hexColor || "",
      });
    }

    // Image-based extraction
    const systemPrompt = `You are a color analysis expert. Analyze this image and extract paint color information.

Look for:
1. If this is a paint can/bucket label: Extract the color name, color code (like Jotun 1234, NCS S 0502-Y, or similar), brand name, and try to determine the approximate hex color.
2. If this is a wall/surface color: Identify the dominant paint color, suggest a color name if possible, and determine the closest hex color code.

Return your response as JSON with these fields:
{
  "name": "Color name if visible or can be inferred (e.g. 'Hvit Prakt', 'Klassisk Hvit')",
  "code": "Color code if visible (e.g. 'Jotun 1234', 'NCS S 0502-Y', 'RAL 9010')",
  "brand": "Brand name if visible (e.g. 'Jotun', 'Dyrup', 'Beckers')",
  "hexColor": "Approximate hex color code (e.g. '#F5F0EB')"
}

If you cannot determine something, leave that field as an empty string. Always try to determine the hexColor based on what you see.
Return ONLY the JSON, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" },
            },
            {
              type: "text",
              text: "Analyze this image and extract color information. Return only JSON.",
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "";

    let colorData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        colorData = JSON.parse(jsonMatch[0]);
      } else {
        colorData = { name: "", code: "", brand: "", hexColor: "" };
      }
    } catch (parseError) {
      colorData = { name: "", code: "", brand: "", hexColor: "" };
    }

    res.json({
      name: colorData.name || "",
      code: colorData.code || "",
      brand: colorData.brand || "",
      hexColor: colorData.hexColor || "",
    });
  } catch (error) {
    console.error("homeExtractColor error:", error);
    res.status(500).json({ error: "Failed to extract color. Please try again." });
  }
});

exports.homeExtractInstruction = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!(await checkRateLimit(uid, "homeExtractInstruction"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data received" });
    }

    const systemPrompt = `You are an instruction reader. Analyze this image and extract instructions from it.

This could be:
- A handwritten note with instructions
- A printed document with instructions
- A checklist or procedure
- Any text-based instruction

Determine if the instructions are about:
- "coming": What to do when coming to a home (arriving)
- "leaving": What to do when leaving a home (departing)

Extract ALL the text you can read, even if it's handwritten. Preserve the structure and order.

Return your response as JSON:
{
  "title": "A short descriptive title for these instructions (e.g. 'Ankomst', 'Avreise', 'Nøkkel og alarm')",
  "content": "The full text of the instructions, preserving line breaks and structure",
  "section": "coming or leaving"
}

If you cannot determine if it's coming or leaving, default to "coming".
Return ONLY the JSON, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" },
            },
            {
              type: "text",
              text: "Read and extract the instructions from this image. Return only JSON.",
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";

    let instructionData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      instructionData = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: "", content: "", section: "coming" };
    } catch (parseError) {
      instructionData = { title: "", content: content, section: "coming" };
    }

    res.json({
      title: instructionData.title || "",
      content: instructionData.content || "",
      section: instructionData.section || "coming",
    });
  } catch (error) {
    console.error("homeExtractInstruction error:", error);
    res.status(500).json({ error: "Failed to extract instructions. Please try again." });
  }
});

exports.homeExtractReceipt = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!(await checkRateLimit(uid, "homeExtractReceipt"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data received" });
    }

    const systemPrompt = `You are a receipt reader. Analyze this receipt image and extract ALL items with their prices.

For each item found, extract:
- name: The item name (as written on the receipt, or a clear description)
- quantity: How many of this item (default 1 if not specified)
- unitPrice: The price per unit in Norwegian kroner (use the total price if quantity is 1)

Important:
- Read all items, even partially visible ones
- Use Norwegian kroner (kr) as the currency
- If quantity is not visible, assume 1
- If a price looks like it includes multiple items, try to calculate the unit price
- Skip summary lines, taxes, and payment info — only extract actual product items
- Be thorough — get every item you can read

Return your response as JSON:
{
  "items": [
    { "name": "Item name", "quantity": 1, "unitPrice": 49.90 },
    { "name": "Another item", "quantity": 2, "unitPrice": 29.50 }
  ]
}

Return ONLY the JSON, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" },
            },
            {
              type: "text",
              text: "Read this receipt and extract all items with prices. Return only JSON.",
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "";

    let receiptData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      receiptData = jsonMatch ? JSON.parse(jsonMatch[0]) : { items: [] };
    } catch (parseError) {
      receiptData = { items: [] };
    }

    // Ensure items array and each item has required fields
    const items = (receiptData.items || []).map((item) => ({
      name: item.name || "",
      quantity: Math.max(1, parseInt(item.quantity) || 1),
      unitPrice: Math.max(0, parseFloat(item.unitPrice) || 0),
    })).filter((item) => item.name);

    res.json({ items });
  } catch (error) {
    console.error("homeExtractReceipt error:", error);
    res.status(500).json({ error: "Failed to extract receipt. Please try again." });
  }
});

exports.homeExtractOffer = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!(await checkRateLimit(uid, "homeExtractOffer"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data received" });
    }

    const systemPrompt = `You are a contractor offer/invoice reader. Analyze this document and extract offer information.

Look for:
- Vendor/company name
- Phone number (if visible)
- Total price (the final amount to pay, including VAT/moms)
- Individual items/services described in the offer

Return your response as JSON:
{
  "vendorName": "Company or contractor name",
  "vendorPhone": "Phone number if visible, empty string if not",
  "price": 12345,
  "items": "Brief summary of what the offer covers",
  "itemsList": ["Individual item 1", "Individual item 2", "Individual item 3"]
}

- price should be a number (no currency symbol)
- itemsList should be an array of individual work items/services
- If you cannot find something, use an empty string or 0
- Be thorough but concise

Return ONLY the JSON, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" },
            },
            {
              type: "text",
              text: "Read this contractor offer/invoice and extract the information. Return only JSON.",
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "";

    let offerData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      offerData = jsonMatch ? JSON.parse(jsonMatch[0]) : { vendorName: "", vendorPhone: "", price: 0, items: "" };
    } catch (parseError) {
      offerData = { vendorName: "", vendorPhone: "", price: 0, items: content };
    }

    res.json({
      vendorName: offerData.vendorName || "",
      vendorPhone: offerData.vendorPhone || "",
      price: Math.max(0, parseFloat(offerData.price) || 0),
      items: offerData.items || "",
      itemsList: Array.isArray(offerData.itemsList) ? offerData.itemsList.filter(i => i) : [],
    });
  } catch (error) {
    console.error("homeExtractOffer error:", error);
    res.status(500).json({ error: "Failed to extract offer. Please try again." });
  }
});

exports.homeSuggestTasks = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await verifyAuth(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!(await checkRateLimit(uid, "homeSuggestTasks"))) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "No project title provided" });
    }

    const systemPrompt = `You are a home improvement project planner. Given a project title, suggest relevant tasks and shopping list items.

The project title is: "${title}"

For this type of project, suggest:
1. Tasks that need to be done (in Norwegian)
2. Shopping list items with quantities where possible (in Norwegian)
3. Link tasks to the shopping items they need

Return your response as JSON:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Brief description of the task",
      "shoppingItems": ["Item 1", "Item 2"]
    }
  ],
  "shoppingList": [
    {
      "name": "Item name",
      "quantity": 1,
      "unitPrice": 0
    }
  ]
}

Guidelines:
- Tasks should be practical, actionable steps for this specific project
- Shopping items should be real materials/tools needed
- Quantities should be reasonable estimates (you can use 0 if uncertain)
- Keep descriptions brief but useful
- Suggest 4-8 tasks and 5-10 shopping items
- Use Norwegian language
- Be specific to the project type (e.g., bathroom renovation vs fence building)

Return ONLY the JSON, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Suggest tasks and shopping items for this project: ${title}` },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "";

    let data;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : { tasks: [], shoppingList: [] };
    } catch (parseError) {
      data = { tasks: [], shoppingList: [] };
    }

    // Ensure proper structure
    const tasks = (data.tasks || []).map((t) => ({
      title: t.title || "",
      description: t.description || "",
      shoppingItems: Array.isArray(t.shoppingItems) ? t.shoppingItems : [],
    })).filter((t) => t.title);

    const shoppingList = (data.shoppingList || []).map((item) => ({
      name: item.name || "",
      quantity: Math.max(1, parseInt(item.quantity) || 1),
      unitPrice: Math.max(0, parseFloat(item.unitPrice) || 0),
    })).filter((item) => item.name);

    res.json({ tasks, shoppingList });
  } catch (error) {
    console.error("homeSuggestTasks error:", error);
    res.status(500).json({ error: "Failed to generate suggestions. Please try again." });
  }
});

// Cloud Function: Auto-sync home service appointments to Google Calendar
exports.onHomeServiceCreatedForCalendar = onDocumentCreated({ region: "us-central1", document: "homeServices/{serviceId}" }, async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  if (!data) return;
  if (!data.familyId) return;

  try {
    const db = getFirestore();
    const startDateTime = `${data.dateFrom}T${data.startTime || "09:00"}:00`;
    const endDateTime = data.endTime
      ? `${data.dateTo || data.dateFrom}T${data.endTime}:00`
      : `${data.dateTo || data.dateFrom}T${incrementTime(data.startTime || "09:00")}:00`;

    const payload = {
      title: `🔧 ${data.title}`,
      description: Array.isArray(data.persons) ? data.persons.join(", ") : (data.description || ""),
      startDateTime,
      endDateTime,
      location: "",
      reminderMinutes: data.reminder || 0,
    };

    const { calendarEventIds, firstEventId } = await familySyncCreate(data.familyId, payload);

    if (Object.keys(calendarEventIds).length > 0) {
      await db.collection("homeServices").doc(event.params.serviceId).update({
        calendarEventIds: calendarEventIds,
        calendarEventId: calendarEventIds[data.createdBy] || firstEventId,
      });
      console.log(`onHomeServiceCreatedForCalendar: synced ${event.params.serviceId} to ${Object.keys(calendarEventIds).length} family calendars`);
    }
  } catch (error) {
    console.error(`onHomeServiceCreatedForCalendar error:`, error);
  }
});

exports.onHomeServiceUpdatedForCalendar = onDocumentUpdated({ region: "us-central1", document: "homeServices/{serviceId}" }, async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;

  try {
    const startDateTime = `${after.dateFrom}T${after.startTime || "09:00"}:00`;
    const endDateTime = after.endTime
      ? `${after.dateTo || after.dateFrom}T${after.endTime}:00`
      : `${after.dateTo || after.dateFrom}T${incrementTime(after.startTime || "09:00")}:00`;

    const count = await familySyncUpdate({ ...after, googleCalendarEventIds: after.calendarEventIds }, {
      title: `🔧 ${after.title}`,
      description: Array.isArray(after.persons) ? after.persons.join(", ") : (after.description || ""),
      allDay: !after.startTime,
      startDate: after.dateFrom,
      endDate: after.dateTo || after.dateFrom,
      startDateTime,
      endDateTime,
      location: "",
      reminderMinutes: after.reminder || 0,
    });

    console.log(`onHomeServiceUpdatedForCalendar: updated ${event.params.serviceId} on ${count} calendars`);
  } catch (error) {
    console.error(`onHomeServiceUpdatedForCalendar error:`, error);
  }
});

exports.onHomeServiceDeletedForCalendar = onDocumentDeleted({ region: "us-central1", document: "homeServices/{serviceId}" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  try {
    const count = await familySyncDelete({ ...data, googleCalendarEventIds: data.calendarEventIds });
    console.log(`onHomeServiceDeletedForCalendar: deleted ${event.params.serviceId} from ${count} calendars`);
  } catch (error) {
    console.error(`onHomeServiceDeletedForCalendar error:`, error);
  }
});

async function searchFamilyData(db, familyId, userMessage) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const next30 = new Date(today);
  next30.setDate(next30.getDate() + 30);
  const next30Str = next30.toISOString().split('T')[0];
  const past90 = new Date(today);
  past90.setDate(past90.getDate() - 90);
  const past90Str = past90.toISOString().split('T')[0];
  const results = {};

  async function safeGet(q) {
    try { const s = await q.get(); return s.docs.map(d => ({ id: d.id, ...d.data() })); } catch(e) { return []; }
  }

  // FLAT COLLECTIONS
  results.events = await safeGet(
    db.collection('events').where('familyId', '==', familyId).where('date', '>=', past90Str).where('date', '<=', next30Str).orderBy('date', 'asc').limit(50)
  );
  results.trips = await safeGet(
    db.collection('trips').where('familyId', '==', familyId).limit(30)
  );
  results.trips.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  results.birthdays = await safeGet(
    db.collection('birthdays').where('familyId', '==', familyId).orderBy('date', 'asc').limit(50)
  );
  results.gifts = await safeGet(
    db.collection('gifts').where('familyId', '==', familyId).limit(50)
  );
  results.pets = await safeGet(
    db.collection('pets').where('familyId', '==', familyId).limit(20)
  );
  results.petVetVisits = await safeGet(
    db.collection('petVetVisits').where('familyId', '==', familyId).where('dateFrom', '>=', past90Str).where('dateFrom', '<=', next30Str).limit(20)
  );
  results.petVetVisits.sort((a, b) => (b.dateFrom || '').localeCompare(a.dateFrom || ''));
  results.petMedications = await safeGet(
    db.collection('petMedications').where('familyId', '==', familyId).limit(20)
  );
  results.petFood = await safeGet(
    db.collection('petFood').where('familyId', '==', familyId).limit(20)
  );
  results.petGrooming = await safeGet(
    db.collection('petGrooming').where('familyId', '==', familyId).limit(20)
  );
  results.petVaccinations = await safeGet(
    db.collection('petVaccinations').where('familyId', '==', familyId).limit(20)
  );
  results.petInsurance = await safeGet(
    db.collection('petInsurance').where('familyId', '==', familyId).limit(20)
  );
  results.serviceAppointments = await safeGet(
    db.collection('homeServices').where('familyId', '==', familyId).where('dateFrom', '>=', past90Str).where('dateFrom', '<=', next30Str).limit(20)
  );
  results.serviceAppointments.sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || ''));
  results.shoppingLists = await safeGet(
    db.collection('shoppingLists').where('familyId', '==', familyId).limit(10)
  );
  results.homes = await safeGet(
    db.collection('homes').where('familyId', '==', familyId).limit(10)
  );
  results.homeProjects = await safeGet(
    db.collection('homeProjects').where('familyId', '==', familyId).limit(20)
  );
  results.homeProjects.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  results.homeInstructions = await safeGet(
    db.collection('homeInstructions').where('familyId', '==', familyId).limit(30)
  );
  results.homePaintColors = await safeGet(
    db.collection('homePaintColors').where('familyId', '==', familyId).limit(30)
  );
  results.homeTasks = await safeGet(
    db.collection('homeTasks').where('familyId', '==', familyId).limit(30)
  );
  results.homeShoppingItems = await safeGet(
    db.collection('homeShoppingItems').where('familyId', '==', familyId).limit(30)
  );
  results.homeOffers = await safeGet(
    db.collection('homeOffers').where('familyId', '==', familyId).limit(20)
  );
  results.schoolChildren = await safeGet(
    db.collection('schoolChildren').where('familyId', '==', familyId).limit(20)
  );
  results.schoolContacts = await safeGet(
    db.collection('schoolContacts').where('familyId', '==', familyId).limit(30)
  );
  results.schoolSchedules = await safeGet(
    db.collection('schoolSchedules').where('familyId', '==', familyId).limit(50)
  );
  results.schoolHolidays = await safeGet(
    db.collection('schoolHolidays').where('familyId', '==', familyId).limit(50)
  );
  results.kindergartenChildren = await safeGet(
    db.collection('kindergartenChildren').where('familyId', '==', familyId).limit(20)
  );
  results.kindergartenContacts = await safeGet(
    db.collection('kindergartenContacts').where('familyId', '==', familyId).limit(30)
  );
  results.kindergartenSchedules = await safeGet(
    db.collection('kindergartenSchedules').where('familyId', '==', familyId).limit(50)
  );
  results.kindergartenHolidays = await safeGet(
    db.collection('kindergartenHolidays').where('familyId', '==', familyId).limit(50)
  );
  results.recipes = await safeGet(
    db.collection('recipes').where('familyId', '==', familyId).limit(50)
  );
  results.mealPlans = await safeGet(
    db.collection('mealPlans').where('familyId', '==', familyId).limit(10)
  );

  // SUBCOLLECTIONS
  results.healthAppointments = await safeGet(
    db.collection('health').doc(familyId).collection('appointments').where('dateFrom', '>=', past90Str).where('dateFrom', '<=', next30Str).limit(30)
  );
  results.healthAppointments.sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || ''));
  results.healthMedications = await safeGet(
    db.collection('health').doc(familyId).collection('medications').limit(20)
  );
  results.healthVaccinations = await safeGet(
    db.collection('health').doc(familyId).collection('vaccinations').limit(20)
  );
  results.healthVaccinations.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  results.healthAllergies = await safeGet(
    db.collection('health').doc(familyId).collection('allergies').limit(20)
  );
  results.healthGrowth = await safeGet(
    db.collection('health').doc(familyId).collection('growth').limit(20)
  );
  results.schoolActivities = await safeGet(
    db.collection('schoolActivities').doc(familyId).collection('activities').where('dateFrom', '>=', past90Str).where('dateFrom', '<=', next30Str).limit(20)
  );
  results.schoolActivities.sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || ''));
  results.kindergartenActivities = await safeGet(
    db.collection('kindergartenActivities').doc(familyId).collection('activities').where('dateFrom', '>=', past90Str).where('dateFrom', '<=', next30Str).limit(20)
  );
  results.kindergartenActivities.sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || ''));

  // TRIP SUB-COLLECTIONS (for each trip)
  results.tripDetails = {};
  for (const trip of results.trips) {
    const details = {};
    details.hotels = await safeGet(db.collection('trips').doc(trip.id).collection('hotels').limit(10));
    details.activities = await safeGet(db.collection('trips').doc(trip.id).collection('activities').limit(20));
    details.transport = await safeGet(db.collection('trips').doc(trip.id).collection('transport').limit(10));
    details.restaurants = await safeGet(db.collection('trips').doc(trip.id).collection('restaurants').limit(10));
    details.packingLists = await safeGet(db.collection('trips').doc(trip.id).collection('packingLists').limit(10));
    results.tripDetails[trip.id] = details;
  }

  return results;
}

// Helper: ISO week number (Monday-start, matching Norwegian calendar weeks)
function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper: week tag for AI data context lines, e.g. " (uke 42)"
// dateStr: "YYYY-MM-DD" or null → returns "" for missing/invalid dates
function weekTag(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const d = new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])));
  return ` (uke ${isoWeekNumber(d)})`;
}

function formatDataForGPT(data) {
  const lines = [];
  const today = new Date().toISOString().split('T')[0];

  if (data.trips && data.trips.length > 0) {
    lines.push('--- REISER ---');
    data.trips.forEach(t => {
      const status = t.startDate > today ? 'Planlagt' : t.endDate < today ? 'Fullført' : 'Pågående';
      lines.push(`• ${t.title || t.destination || 'Uten navn'} | ${t.startDate || '?'} → ${t.endDate || '?'} | Status: ${status}${weekTag(t.startDate)}`);
      const details = data.tripDetails && data.tripDetails[t.id];
      if (details) {
        if (details.hotels && details.hotels.length > 0) {
          details.hotels.forEach(h => lines.push(`  🏨 Hotell: ${h.name || '?'} | Inn: ${h.checkIn || '?'} → Ut: ${h.checkOut || '?'} | ${h.address || ''}`));
        }
        if (details.transport && details.transport.length > 0) {
          details.transport.forEach(tr => lines.push(`  ✈️ Transport: ${tr.type || '?'} | ${tr.depDate || '?'} ${tr.depTime || ''} → ${tr.arrDate || ''} ${tr.arrTime || ''} | ${tr.carrier || ''} ${tr.flightNumber || tr.trainNumber || ''}`));
        }
        if (details.activities && details.activities.length > 0) {
          details.activities.forEach(a => lines.push(`  🎯 Aktivitet: ${a.name || '?'} | ${a.date || '?'} ${a.time || ''} | ${a.address || ''}`));
        }
        if (details.restaurants && details.restaurants.length > 0) {
          details.restaurants.forEach(r => lines.push(`  🍽️ Restaurant: ${r.name || '?'} | ${r.address || ''}`));
        }
        if (details.packingLists && details.packingLists.length > 0) {
          details.packingLists.forEach(pl => {
            const items = pl.items || [];
            const unchecked = items.filter(i => !i.checked).length;
            lines.push(`  🧳 Pakkeliste: ${pl.title || '?'} | ${unchecked}/${items.length} gjenstående`);
          });
        }
      }
    });
  }

  if (data.events && data.events.length > 0) {
    lines.push('--- HENDELSER ---');
    data.events.forEach(e => {
      const person = e.person || e.selectedPersons || '';
      const personStr = Array.isArray(person) ? person.join(', ') : person;
      lines.push(`• ${e.title || 'Uten navn'} | ${e.date || '?'} ${e.time || ''} → ${e.endDate || ''} ${e.endTime || ''} | ${e.address || ''}${personStr ? ' | For: ' + personStr : ''}${weekTag(e.date)}`);
    });
  }

  if (data.healthAppointments && data.healthAppointments.length > 0) {
    lines.push('--- HELSEAVTALER ---');
    data.healthAppointments.forEach(a => {
      const timeRange = a.endTime ? `${a.startTime || ''}-${a.endTime}` : (a.startTime || '');
      lines.push(`• ${a.title || 'Uten navn'} | Person: ${a.person || '?'} | ${a.dateFrom || '?'} ${timeRange} | Lege: ${a.doctor || ''} | Sted: ${a.location || ''} | ID: ${a.id}${weekTag(a.dateFrom)}`);
    });
  }

  if (data.healthMedications && data.healthMedications.length > 0) {
    lines.push('--- MEDISINER ---');
    data.healthMedications.forEach(m => {
      lines.push(`• ${m.name || '?'} | Person: ${m.person || '?'} | Dosering: ${m.dosage || ''} | Frekvens: ${m.frequency || ''}`);
    });
  }

  if (data.healthVaccinations && data.healthVaccinations.length > 0) {
    lines.push('--- VAKSINER ---');
    data.healthVaccinations.forEach(v => {
      lines.push(`• ${v.name || '?'} | Person: ${v.person || '?'} | Dato: ${v.date || ''} | Neste: ${v.nextDue || ''}`);
    });
  }

  if (data.healthAllergies && data.healthAllergies.length > 0) {
    lines.push('--- ALLERGIER ---');
    data.healthAllergies.forEach(a => {
      lines.push(`• ${a.name || '?'} | Person: ${a.person || '?'} | Alvorlighet: ${a.severity || ''}`);
    });
  }

  if (data.healthGrowth && data.healthGrowth.length > 0) {
    lines.push('--- VEKSTDATA ---');
    data.healthGrowth.forEach(g => {
      lines.push(`• Person: ${g.person || '?'} | Dato: ${g.date || '?'} | Vekt: ${g.weight || ''} kg | Høyde: ${g.height || ''} cm`);
    });
  }

  if (data.pets && data.pets.length > 0) {
    lines.push('--- KJÆLEDYR ---');
    data.pets.forEach(p => {
      lines.push(`• ${p.name || '?'} | ${p.species || ''} ${p.breed || ''} | Født: ${p.birthday || ''}`);
    });
  }

  if (data.petVetVisits && data.petVetVisits.length > 0) {
    lines.push('--- VETERINÆRBESØK ---');
    data.petVetVisits.forEach(v => {
      const person = v.person || '';
      const personStr = Array.isArray(person) ? person.join(', ') : person;
      lines.push(`• ${v.name || 'Uten navn'} | ${v.dateFrom || '?'} ${v.startTime || ''} | Lege: ${v.doctor || ''}${personStr ? ' | For: ' + personStr : ''}${weekTag(v.dateFrom)}`);
    });
  }

  if (data.petMedications && data.petMedications.length > 0) {
    lines.push('--- KJÆLEDYRMEDISINER ---');
    data.petMedications.forEach(m => {
      lines.push(`• ${m.name || '?'} | Dosering: ${m.dosage || ''} | Frekvens: ${m.frequency || ''}`);
    });
  }

  if (data.petFood && data.petFood.length > 0) {
    lines.push('--- KJÆLEDYRFOR ---');
    data.petFood.forEach(f => {
      lines.push(`• ${f.brand || '?'} | Type: ${f.type || ''} | Mengde: ${f.amount || ''}`);
    });
  }

  if (data.petGrooming && data.petGrooming.length > 0) {
    lines.push('--- PLEIE ---');
    data.petGrooming.forEach(g => {
      lines.push(`• ${g.type || '?'} | Frekvens: ${g.frequency || ''} | Sist: ${g.lastDate || ''} | Neste: ${g.nextDate || ''}`);
    });
  }

  if (data.petVaccinations && data.petVaccinations.length > 0) {
    lines.push('--- KJÆLEDYRVAKSINER ---');
    data.petVaccinations.forEach(v => {
      lines.push(`• ${v.name || '?'} | Dato: ${v.date || ''} | Neste: ${v.nextDue || ''}`);
    });
  }

  if (data.petInsurance && data.petInsurance.length > 0) {
    lines.push('--- KJÆLEDYRFORSIKRING ---');
    data.petInsurance.forEach(i => {
      lines.push(`• ${i.provider || '?'} | Polise: ${i.policyNumber || ''} | Utløp: ${i.expiryDate || ''}`);
    });
  }

  if (data.serviceAppointments && data.serviceAppointments.length > 0) {
    lines.push('--- SERVICEAVTALER ---');
    data.serviceAppointments.forEach(s => {
      const person = s.persons || s.person || '';
      const personStr = Array.isArray(person) ? person.join(', ') : person;
      lines.push(`• ${s.title || s.name || 'Uten navn'} | ${s.dateFrom || '?'} ${s.startTime || ''} | Frekvens: ${s.frequency || ''}${personStr ? ' | For: ' + personStr : ''}${weekTag(s.dateFrom)}`);
    });
  }

  if (data.schoolChildren && data.schoolChildren.length > 0) {
    lines.push('--- SKOLEBARN ---');
    data.schoolChildren.forEach(c => {
      lines.push(`• ${c.name || '?'} | Skole: ${c.schoolName || ''} | Trinn: ${c.grade || ''}`);
    });
  }

  if (data.schoolActivities && data.schoolActivities.length > 0) {
    lines.push('--- SKOLEAKTIVITETER ---');
    data.schoolActivities.forEach(a => {
      const person = a.selectedPersons || a.person || '';
      const personStr = Array.isArray(person) ? person.join(', ') : person;
      lines.push(`• ${a.name || a.title || 'Uten navn'} | ${a.dateFrom || '?'} → ${a.dateTo || ''} ${a.startTime || ''}${personStr ? ' | For: ' + personStr : ''}${weekTag(a.dateFrom)}`);
    });
  }

  if (data.schoolContacts && data.schoolContacts.length > 0) {
    lines.push('--- SKOLEKONTAKTER ---');
    data.schoolContacts.forEach(c => {
      lines.push(`• ${c.name || '?'} | Type: ${c.type || ''} | Tlf: ${c.phone || ''} | E-post: ${c.email || ''}`);
    });
  }

  if (data.schoolSchedules && data.schoolSchedules.length > 0) {
    lines.push('--- SKOLEDAGER ---');
    data.schoolSchedules.forEach(s => {
      lines.push(`• ${s.day || '?'} | ${s.startTime || ''} → ${s.endTime || ''} | ${s.subject || ''}`);
    });
  }

  if (data.schoolHolidays && data.schoolHolidays.length > 0) {
    lines.push('--- SKOLEFRIE ---');
    data.schoolHolidays.forEach(h => {
      lines.push(`• ${h.title || '?'} | ${h.dateFrom || '?'} → ${h.dateTo || ''}`);
    });
  }

  if (data.kindergartenChildren && data.kindergartenChildren.length > 0) {
    lines.push('--- BARNEHAGEBARN ---');
    data.kindergartenChildren.forEach(c => {
      lines.push(`• ${c.name || '?'} | Barnehage: ${c.kindergartenName || ''}`);
    });
  }

  if (data.kindergartenActivities && data.kindergartenActivities.length > 0) {
    lines.push('--- BARNEHAGEAKTIVITETER ---');
    data.kindergartenActivities.forEach(a => {
      const person = a.selectedPersons || a.person || '';
      const personStr = Array.isArray(person) ? person.join(', ') : person;
      lines.push(`• ${a.name || a.title || 'Uten navn'} | ${a.dateFrom || '?'} → ${a.dateTo || ''} ${a.startTime || ''}${personStr ? ' | For: ' + personStr : ''}${weekTag(a.dateFrom)}`);
    });
  }

  if (data.kindergartenContacts && data.kindergartenContacts.length > 0) {
    lines.push('--- BARNEHAGEKONTAKTER ---');
    data.kindergartenContacts.forEach(c => {
      lines.push(`• ${c.name || '?'} | Type: ${c.type || ''} | Tlf: ${c.phone || ''} | E-post: ${c.email || ''}`);
    });
  }

  if (data.kindergartenSchedules && data.kindergartenSchedules.length > 0) {
    lines.push('--- BARNEHAGEDAGER ---');
    data.kindergartenSchedules.forEach(s => {
      lines.push(`• ${s.day || '?'} | ${s.startTime || ''} → ${s.endTime || ''} | ${s.activity || ''}`);
    });
  }

  if (data.kindergartenHolidays && data.kindergartenHolidays.length > 0) {
    lines.push('--- BARNEHAGEFRIE ---');
    data.kindergartenHolidays.forEach(h => {
      lines.push(`• ${h.title || '?'} | ${h.dateFrom || '?'} → ${h.dateTo || ''}`);
    });
  }

  if (data.birthdays && data.birthdays.length > 0) {
    lines.push('--- BURSDAGER ---');
    const now = new Date();
    const thisYear = now.getFullYear();
    const todayStr2 = now.toISOString().split('T')[0];
    const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
    data.birthdays.forEach(b => {
      if (!b.date) { lines.push(`• ${b.name || '?'} | Dato ukjent`); return; }
      const monthDay = b.date.substring(5); // "09-03"
      let nextDate = `${thisYear}${monthDay}`;
      let age = thisYear - parseInt(b.date.substring(0, 4));
      if (nextDate < todayStr2) {
        nextDate = `${thisYear + 1}${monthDay}`;
        age += 1;
      }
      const month = parseInt(monthDay.substring(0, 2)) - 1;
      const day = parseInt(monthDay.substring(3, 5));
      const nextDateObj = new Date(nextDate);
      const dayOfWeek = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'][nextDateObj.getDay()];
      lines.push(`• ${b.name || '?'} | ${dayOfWeek} ${day}. ${monthNames[month]} ${nextDateObj.getFullYear()} | Fyller ${age} år${weekTag(nextDate)}`);
    });
  }

  if (data.gifts && data.gifts.length > 0) {
    lines.push('--- GAVEØNSKER ---');
    data.gifts.forEach(g => {
      lines.push(`• ${g.title || '?'} | Pris: ${g.price || '?'} kr | Kjøpt: ${g.purchased ? 'Ja' : 'Nei'}`);
    });
  }

  if (data.shoppingLists && data.shoppingLists.length > 0) {
    lines.push('--- HANDLELISTER ---');
    data.shoppingLists.forEach(s => {
      const count = s.items ? s.items.length : 0;
      const unchecked = s.items ? s.items.filter(i => !i.checked).length : 0;
      lines.push(`• ${s.title || 'Uten navn'} | ${unchecked}/${count} gjenstående`);
    });
  }

  if (data.homes && data.homes.length > 0) {
    lines.push('--- HJEM ---');
    data.homes.forEach(h => {
      lines.push(`• ${h.name || '?'} | ${h.address || ''} | Type: ${h.type || ''}`);
    });
  }

  if (data.homeProjects && data.homeProjects.length > 0) {
    lines.push('--- PROSJEKTER ---');
    const items = data.homeShoppingItems || [];
    const offers = data.homeOffers || [];
    data.homeProjects.forEach(p => {
      const projectItems = items.filter(i => i.projectId === p.id);
      const projectOffers = offers.filter(o => o.projectId === p.id);
      const itemCost = projectItems.reduce((sum, i) => sum + ((i.unitPrice || i.price || 0) * (i.quantity || 1)), 0);
      const offerCost = projectOffers.reduce((sum, o) => sum + (o.price || 0), 0);
      const totalCost = itemCost + offerCost;
      const budget = p.budget || 0;
      const remaining = budget > 0 ? budget - totalCost : null;
      let line = `• ${p.name || '?'} | Status: ${p.status || ''}`;
      if (budget > 0) line += ` | Budget: ${budget} kr`;
      if (totalCost > 0) line += ` | Forbruk: ${totalCost} kr`;
      if (remaining !== null) line += ` | Gjenstående: ${remaining} kr`;
      line += ` | ${p.startDate || ''} → ${p.endDate || ''}`;
      lines.push(line);
    });
  }

  if (data.homeInstructions && data.homeInstructions.length > 0) {
    lines.push('--- INSTRUKSJONER ---');
    data.homeInstructions.forEach(i => {
      lines.push(`• ${i.title || '?'} | Kategori: ${i.category || ''}`);
    });
  }

  if (data.homePaintColors && data.homePaintColors.length > 0) {
    lines.push('--- FARGER ---');
    data.homePaintColors.forEach(c => {
      lines.push(`• ${c.colorName || '?'} | Merke: ${c.brand || ''} | Kode: ${c.code || ''} | Rom: ${c.room || ''}`);
    });
  }

  if (data.homeTasks && data.homeTasks.length > 0) {
    const undone = data.homeTasks.filter(t => !t.done);
    const done = data.homeTasks.filter(t => t.done);
    lines.push(`--- HJEMOPPGAVER (${undone.length} ugjort, ${done.length} gjort) ---`);
    undone.forEach(t => {
      lines.push(`• ${t.title || '?'} | Tildelt: ${t.assignedTo || ''}`);
    });
  }

  if (data.homeShoppingItems && data.homeShoppingItems.length > 0) {
    const unpurchased = data.homeShoppingItems.filter(i => !i.purchased);
    lines.push(`--- HJEMHANDLELISTE (${unpurchased.length} igjen) ---`);
    unpurchased.forEach(i => {
      const cost = (i.unitPrice || i.price || 0) * (i.quantity || 1);
      lines.push(`• ${i.name || '?'} | Antall: ${i.quantity || 1} | Pris: ${i.unitPrice || i.price || '?'} kr | Totalt: ${cost} kr | Prosjekt: ${i.projectId || 'ingen'}`);
    });
  }

  if (data.homeOffers && data.homeOffers.length > 0) {
    lines.push('--- TILBUD ---');
    data.homeOffers.forEach(o => {
      lines.push(`• ${o.provider || o.vendorName || '?'} | ${o.description || o.items || ''} | Pris: ${o.price || '?'} kr | Prosjekt: ${o.projectId || 'ingen'}`);
    });
  }

  if (data.recipes && data.recipes.length > 0) {
    lines.push('--- OPPSKRIFTER ---');
    data.recipes.forEach(r => {
      lines.push(`• ${r.name || '?'} | Tid: ${(r.prepTime || 0) + (r.cookTime || 0)} min | Porsjoner: ${r.servings || '?'} | ${r.isFavorite ? '★' : ''}`);
    });
  }

  if (data.mealPlans && data.mealPlans.length > 0) {
    lines.push('--- UKEMATPLANER ---');
    data.mealPlans.forEach(mp => {
      lines.push(`• Uke: ${mp.weekStart || '?'} | Måltider: ${mp.meals ? Object.keys(mp.meals).length : 0}`);
    });
  }

  if (lines.length === 0) return 'Ingen data funnet i systemet.';
  return lines.join('\n');
}

// AI Assistant: Search + Actions
exports.aiAssistant = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  if (!(await checkRateLimit(uid, "aiAssistant"))) return res.status(429).json({ error: "Too many requests" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { message, familyId, history, actions } = req.body;

    // Handle confirmation
    if (message === '__CONFIRM__' && actions && actions.length > 0) {
      const results = [];
      for (const action of actions) {
        try {
          await executeAction(uid, familyId, action);
          results.push(`✓ ${action.description || 'Handling utført'}`);
        } catch (error) {
          results.push(`✗ Feil: ${error.message}`);
        }
      }
      return res.json({ reply: results.join('\n'), actions: [] });
    }

    const db = getFirestore();

    // Handle correction — store learning
    if (message === '__CORRECTION__' && req.body.originalQuery && req.body.correctAnswer) {
      await db.collection('aiLearnedCorrections').add({
        familyId,
        query: req.body.originalQuery,
        correctAnswer: req.body.correctAnswer,
        createdBy: uid,
        createdAt: Date.now(),
      });
      return res.json({ reply: 'Takk! Jeg har lært dette for fremtiden.', actions: [] });
    }

    // STEP 1: Search all family data
    const familyData = await searchFamilyData(db, familyId, message);
    const dataContext = formatDataForGPT(familyData);

    // STEP 1.5: Weather lookup for trip-related weather queries
    let weatherContext = '';
    const weatherKeywords = ['vær', 'weather', 'temperatur', 'regn', 'sol', 'snø', ' vind', 'skyet', 'overskyet', 'grad'];
    const isWeatherQuery = weatherKeywords.some(kw => message.toLowerCase().includes(kw));
    if (isWeatherQuery && familyData.trips && familyData.trips.length > 0) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const upcomingTrips = familyData.trips
          .filter(t => t.endDate >= today)
          .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
          .slice(0, 3);

        for (const trip of upcomingTrips) {
          const destination = trip.destination || trip.title;
          if (!destination) continue;

          // Geocode destination with Google
          const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
          const geoData = await geoRes.json();
          if (geoData.status !== 'OK' || !geoData.results || geoData.results.length === 0) continue;
          const { lat: latitude, lng: longitude } = geoData.results[0].geometry.location;

          // Fetch Google Weather forecast
          const weatherRes = await fetch(`https://weather.googleapis.com/v1/forecast/days:lookup?key=${process.env.GOOGLE_MAPS_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}&days=10&languageCode=no`);
          if (!weatherRes.ok) continue;
          const weatherData = await weatherRes.json();

          const tripStart = trip.startDate;
          const tripEnd = trip.endDate;
          const forecastDays = weatherData.forecastDays || [];
          const relevantDays = forecastDays.filter(day => {
            const d = `${day.displayDate.year}-${String(day.displayDate.month).padStart(2, '0')}-${String(day.displayDate.day).padStart(2, '0')}`;
            return d >= tripStart && d <= tripEnd;
          });

          if (relevantDays.length > 0) {
            weatherContext += `\n--- VÆR for "${trip.title || destination}" (${tripStart} → ${tripEnd}) ---\n`;
            for (const day of relevantDays) {
              const d = `${day.displayDate.year}-${String(day.displayDate.month).padStart(2, '0')}-${String(day.displayDate.day).padStart(2, '0')}`;
              const desc = day.daytimeForecast?.weatherCondition?.description?.text || '';
              const maxT = day.maxTemperature?.degrees || '?';
              const minT = day.minTemperature?.degrees || '?';
              const rain = day.daytimeForecast?.precipitation?.probability?.percent || 0;
              const uv = day.daytimeForecast?.uvIndex || 0;
              const wind = day.daytimeForecast?.wind?.speed?.value || 0;
              const humidity = day.daytimeForecast?.relativeHumidity || 0;
              weatherContext += `${d}: ${desc}, ${minT}°C → ${maxT}°C, UV: ${uv}, regn: ${rain}%, vind: ${wind} km/t, luftfuktighet: ${humidity}%\n`;
            }
          } else {
            weatherContext += `\n--- VÆR for "${trip.title || destination}" ---\nIngen værdata tilgjengelig for disse datoene ennå (Google Weather gir opptil 10 dagers prognose).\n`;
          }
        }
      } catch (e) {
        console.log('Weather lookup error (non-fatal):', e.message);
      }
    }

    // STEP 1.6: Load relevant corrections (top 5)
    let correctionContext = '';
    try {
      const correctionsSnap = await db.collection('aiLearnedCorrections')
        .where('familyId', '==', familyId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      const corrections = correctionsSnap.docs.map(d => d.data());
      const msgWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const relevant = corrections.filter(c => {
        const cq = (c.query || '').toLowerCase();
        return msgWords.some(w => cq.includes(w));
      }).slice(0, 5);
      if (relevant.length > 0) {
        correctionContext = '\n\nTIDLIGERE KORRIGERINGER fra brukeren (BRUK DISSE når de er relevante):\n' +
          relevant.map(c => `- Sporsmal: "${c.query}" -> Riktig svar: "${c.correctAnswer}"`).join('\n');
      }
    } catch (e) {
      console.log('Corrections load error (non-fatal):', e.message);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    const systemPrompt = `Du er en AI-assistent for familien. Dagens dato er ${todayStr} (${['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'][today.getDay()]}). Du har tilgang til all familiens data nedenfor.

KRITISKE REGLER:
1. SVAR KUN med data som faktisk finnes i listen under. ALDRI finn på, anta eller hallusinere data som ikke er der.
2. Når du refererer til en hendelse, kan du sitere nøyaktig dato, tid og person fra dataen. Hvis du ikke finner nøyaktig treff, si det ærlig.
3. Aldri legg til informasjon som ikke står i dataen.
4. Hvis spørringen er uklar, spør om avklaring.
5. For create-handlinger: foreslå FORHÅNDSVISNING med alle felt. Brukeren må bekrefte FØR handling utføres.
6. For delete-handlinger: bekreft med brukeren først.
7. Svar alltid på norsk.
8. Sorter svar etter dato (nærmeste først).

OPPRETT-REGEL (viktig for å unngå hallusinasjon):
Når brukeren ber om å opprette noe nytt (f.eks. "Ny helsetime", "Legg til", "Opprett"):
- Hvis brukeren sier "ny" eller "leg til ny": Vis FORHÅNDSVISNING og spør "Skal jeg opprette denne?" uten å nevne duplikater.
- Hvis brukeren IKKE sier "ny" og du finner en EKSAKT match i dataen (samme person + samme dato + samme tid + samme lege): Vis info om den eksisterende og spør om brukeren vil opprette en ny likevel.
- EN EKSAKT MATCH betyr: Alle feltene (person, dato, tid, lege) stemmer overens med dataen. "Lignende" teller ikke.
- Hvis du IKKE finner en eksakt match: Anta at det ikke finnes og opprett uten å nevne duplikater.

DATO-INTELLIGENS:
- "i morgen" = ${tomorrowStr}
- "denne uken" = denne mandag til søndag
- "neste uke" = ${nextMonday.toISOString().split('T')[0]} til ${nextSunday.toISOString().split('T')[0]}
- "denne måneden" = ${todayStr} til siste dag i denne måneden
- "om X dager" = ${todayStr} + X dager
- "i høstferien" / "i juleferien" / "i påsken" / "i sommerferien": finn ferien i schoolHolidays/kindergartenHolidays som matcher søkeordet
- Datoformat til brukeren: "mandag 22. september 2026", "kl. 14:00", "om 3 dager"

UKE-ETIKETTER (kritisk for ukes-filter):
- Alle dato-bærende linjer i dataen er merket med "(uke N)" — dette er ISO-ukenummeret.
- Gjeldende uke (denne uken) = uke ${isoWeekNumber(today)}.
- "neste uke" = uke ${isoWeekNumber(nextMonday)}. ALDRI inkluder hendelser utenfor denne uke-etiketten.
- "denne uken" = uke ${isoWeekNumber(today)}.
- "om to uker" = uke ${isoWeekNumber(nextSunday) + 1}. "om tre uker" = uke ${isoWeekNumber(nextSunday) + 2}. Osv. ("om X uker" = uke ${isoWeekNumber(nextSunday)} + X - 1).
- Når brukeren spør "i neste uke" / "neste uke": inkluder KUN oppføringer merket "(uke ${isoWeekNumber(nextMonday)})". oppføringer merket med en annen uke er IKKE i neste uke, selv om datoen kan virke nær.
- Regn aldri ut uker selv fra datoer — stol KUN på uke-etiketten i dataen.

PERSON-KONTEKT:
Når brukeren spør om hendelser/avtaler/aktiviteter for en bestemt person, bruk "For:" feltet i dataen til å filtrere. Eksempler:
- "Hva har Jon av avtaler?" → Filtrer hendelser og helseavtaler der person inkluderer "Jon"
- "Vis meg alle aktiviteter for Mina" → Filtrer skole/barnehageaktiviteter der selectedPersons inkluderer "Mina"
- "Hva skal Luna gjøre denne uken?" → Filtrer alle hendelser der person inkluderer "Luna"
- "Hvilke serviceavtaler har Jon?" → Filtrer serviceavtaler der persons inkluderer "Jon"
- "Hva er det på planen for hele familien?" → Vis alle hendelser uten personfilter

Svar alltid med personens navn, ikke bare "barnet" eller "kjæledyret".

SAMMENHENG (inkluder relaterte data når du svarer):
- Reise → inkluder transport, hotell, aktiviteter for den reisen
- Barn → inkluder neste skoledag/aktivitet, neste helseavtale, bursdag
- Kjæledyr → inkluder neste veterinærtime, medisiner, vaksiner
- Hjem → inkluder pågående prosjekter, ufullførte oppgaver, kommende service
- Hendelse → inkluder adresse, tid, påminnelse

PROAKTIVE FORSLAG:
Etter å ha vist data, gi 1-2 relevante forslag når det er naturlig:
- kommende hendelser nær datoen → "Skal jeg sette på påminnelse?"
- manglende data → "Vil du opprette noe?"
- utløpte frister → "Dette er forsinket, trenger du hjelp?"
- sammenhenger → "Du har reise til Barcelona, skal jeg legge til transport?"
Ikke overdriv — maks 2 forslag, bare når relevante.

HANDLEUTLISTER:
Når brukeren spør om mat/middag/handle:
1. Sjekk mealPlans for denne uken
2. Sjekk recipes for forslag
3. Sjekk handlelister for hva som mangler
4. Foreslå å opprette handleliste med manglende varer

BUDSJETT:
Når du snakker om hjem-prosjekter, inkluder budget, forbruk (fra handleliste med priser), gjenstående, og tilbud fra leverandører.

MODULVALG (hvordan velge riktig modul):
Når brukeren ber om å opprette noe, velg riktig modul basert på nøkkelord:
- "avtale", "møte", "trening", "fest", "middag", "konsert", "kino", "sport", "feiring", generelle hendelser → EVENTS
- "helsetime", "legetime", "time hos legen", "snekker", "tannlege", "fysioterapeut" → HEALTH.APPOINTMENTS
- "veterinær", "dyrlege", "vaksine for kjæledyr" → PETS.VETVISITS
- "skoletur", "foreldremøte", "skoleavtale" → SCHOOL.ACTIVITIES
- "barnehagetur", "barnehagemøte" → KINDERGARTEN.ACTIVITIES
- "service", "serviceavtale", "vedlikehold" → SERVICE.APPOINTMENTS
- "reise", "tur til" → TRIPS
- "handleliste" → SHOPPING
- "bursdag" → BIRTHDAYS
Hvis usikker: Default til EVENTS for generelle avtaler. Spør kun om avklaring hvis nøkkelordene er veldig tvetydige.

Tilgjengelige moduler og felter for OPRETTelse:
EVENTS: title, date (YYYY-MM-DD), time (HH:MM), endDate, endTime, address, description, icon
TRIPS: title, destination, startDate, endDate
TRIPS.HOTELS: name, address, checkIn, checkOut, notes
TRIPS.ACTIVITIES: name, date, time, address
TRIPS.TRANSPORT: type (fly/tog/bil/boat/taxi/ferry), depDate, depTime, arrDate, arrTime, carrier, flightNumber
TRIPS.RESTAURANTS: name, address, notes
BIRTHDAYS: name, date (YYYY-MM-DD)
HEALTH.APPOINTMENTS: title, person, dateFrom, dateTo, startTime, endTime, doctor, location
HEALTH.MEDICATIONS: name, person, dosage, frequency, timeSlots
HEALTH.VACCINATIONS: name, person, date, nextDue
HEALTH.ALLERGIES: name, person, severity, description
SCHOOL.ACTIVITIES: name, dateFrom, dateTo, startTime, endTime, location
KINDERGARTEN.ACTIVITIES: name, dateFrom, dateTo, startTime, endTime, location
PETS: name, species, breed, birthday
PETS.VETVISITS: name, dateFrom, dateTo, doctor, reason, location
PETS.MEDICATIONS: name, dosage, frequency
SERVICE.APPOINTMENTS (homeServices): title, dateFrom, dateTo, startTime, endTime, frequency
SHOPPING: title, items (array)
RECIPES: name, description, ingredients, instructions, servings, prepTime, cookTime
HOMES: name, address, type
HOME.PROJECTS: name, description, status, budget, startDate, endDate
HOME.INSTRUCTIONS: title, content, category
HOME.PAINTCOLORS: colorName, brand, code, room
HOME.TASKS: title, description, assignedTo, done
HOME.SHOPPINGITEMS: name, quantity, price, purchased
HOME.OFFERS: provider, description, price

SKOLE/KINDERGARTEN DOKUMENTER: Skoletimeplaner og barnehageplaner er opplastede bilder/dokumenter. Du kan ikke vise dem direkte, men du kan navigere brukeren til riktig sted der de kan se dem.

VÆR: Hvis brukeren spør om vær for en reise, er værdata allerede hentet og inkludert i konteksten under "VÆR for ...". Dataen inkluderer temperatur, UV-indeks, regnsjanse, vind og luftfuktighet. Bruk denne dataen til å svare. Hvis reisen er lenger frem i tid enn 10 dager, forklar at Google Weather gir opptil 10 dagers prognose og at du kan vise data når reisen nærmer seg.

NAVIGASJON (action type: "navigate") - brukeren kan be om å navigere til skjermer.
Når brukeren ber om å navigere, returner en navigate-action.

Tilgjengelige skjermer og riktig bruk:
- school.children → { screen: 'SchoolSpace', childId: 'ID' } (navigerer til et barns skoleside)
- kindergarten.children → { screen: 'KindergartenSpace', childId: 'ID' } (navigerer til et barns barnehageside)
- pets → { screen: 'PetSpace', petId: 'ID' } (navigerer til et kjæledyrs side)
- homes → { screen: 'HomeSpace', homeId: 'ID' } (navigerer til et hjem)
- health → { screen: 'HealthSpace' } (navigerer til helseoversikten)
- events → { screen: 'Events', subScreen: 'EventsList' } (navigerer til hendelseslisten - du kan IKKE navigere direkte til EventDetail uten objektet)
- trips → { screen: 'Trips', subScreen: 'TripsList' } (navigerer til reiselisten - du kan IKKE navigere direkte til TripDetail uten objektet)
- service → { screen: 'HomeMaintenance', home: {OBJEKT} } (navigerer til serviceoversikten)

VIKTIG: For events og trips, naviger ALLTID til listen (EventsList/TripsList), aldri direkte til detaljene. Brukeren finner elementet i listen.

Når du oppretter noe (create), kan du også returnere en navigate-action i tillegg.

Returner JSON med denne strukturen:
{
  "reply": "Svaret ditt",
  "actions": [
    { "type": "navigate|create|delete", "module": "...", "data": {}, "description": "...",
      "screen": { "screen": "ScreenName", "childId": "ID", "petId": "ID", ... } }
  ]
}
Hvis ingen handlinger: actions: []`;

    const dataMessage = `Familiens data i systemet:\n${dataContext}${correctionContext}${weatherContext}\n\nBrukerens sporsmal: ${message}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: dataMessage },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "";

    let result;
    try {
      result = JSON.parse(content);
      if (!result.reply) result.reply = content;
      if (!result.actions) result.actions = [];
    } catch (e) {
      result = { reply: content, actions: [] };
    }

    res.json(result);
  } catch (error) {
    console.error("aiAssistant error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

async function validateAction(action, familyData) {
  if (action.type === 'navigate' && action.screen) {
    const s = action.screen;
    if (s.childId) {
      const exists = (familyData.schoolChildren || []).some(c => c.id === s.childId) ||
                     (familyData.kindergartenChildren || []).some(c => c.id === s.childId);
      if (!exists) return { valid: false, error: 'Barnet ble ikke funnet i systemet.' };
    }
    if (s.petId) {
      const exists = (familyData.pets || []).some(p => p.id === s.petId);
      if (!exists) return { valid: false, error: 'Kjæledyret ble ikke funnet i systemet.' };
    }
    if (s.homeId) {
      const home = (familyData.homes || []).find(h => h.id === s.homeId);
      if (!home) return { valid: false, error: 'Hjemmet ble ikke funnet i systemet.' };
      s.home = home;
    }
  }
  return { valid: true };
}

async function executeAction(uid, familyId, action) {
  const db = getFirestore();
  const mod = (action.module || action.data?.module || '').toLowerCase().replace(/[\s_]+/g, '.');
  const type = action.type;
  const data = action.data || {};

  const MODULE_MAP = {
    'health.appointments': { col: () => db.collection("health").doc(familyId).collection("appointments"), field: 'createdBy' },
    'health.medications': { col: () => db.collection("health").doc(familyId).collection("medications"), field: 'createdBy' },
    'health.vaccinations': { col: () => db.collection("health").doc(familyId).collection("vaccinations"), field: 'createdBy' },
    'events': { col: () => db.collection("events"), field: 'createdBy' },
    'school.activities': { col: () => db.collection("schoolActivities").doc(familyId).collection("activities"), field: 'createdBy' },
    'kindergarten.activities': { col: () => db.collection("kindergartenActivities").doc(familyId).collection("activities"), field: 'createdBy' },
    'pets.vetvisits': { col: () => db.collection("petVetVisits"), field: 'createdBy' },
    'service.appointments': { col: () => db.collection("homeServices"), field: 'createdBy' },
    'birthdays': { col: () => db.collection("birthdays"), field: 'addedBy' },
    'trips': { col: () => db.collection("trips"), field: 'createdBy' },
    'shopping': { col: () => db.collection("shoppingLists"), field: 'createdBy' },
  };

  const config = MODULE_MAP[mod];
  if (!config) throw new Error(`Unknown module: ${action.module}`);

  if (type === 'create') {
    const ref = await config.col().add({
      ...data,
      [config.field]: uid,
      familyId,
      createdAt: Date.now(),
    });
    return { id: ref.id };
  }

  if (type === 'delete') {
    await config.col().doc(data.id).delete();
    return { id: data.id };
  }

  throw new Error(`Unknown action type: ${type}`);
}
