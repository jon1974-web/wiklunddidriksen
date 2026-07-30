require("dotenv").config();
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const OpenAI = require("openai");
const functions = require("firebase-functions");
const Busboy = require("busboy");
const crypto = require("crypto");

initializeApp();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SPOND_API_BASE = "https://api.spond.com/core/v1";

const ALLOWED_ORIGINS = [
  "https://familiesenter-837bb.web.app",
  "https://familiesenter-837bb.firebaseapp.com",
  "http://localhost:8081",
  "http://localhost:19006",
];

function setCorsHeaders(res, req) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin) || (origin && /^http:\/\/localhost:\d+$/.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Filename");
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

  const { action, email, password, token, groupId, groupIds, max, eventId, memberId, accepted } = req.body || {};

  try {
    if (action === "login") {
      const response = await fetch(`${SPOND_API_BASE}/auth2/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(result);
      }
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
          } else {
            console.warn(`spondProxy: group ${gid} returned ${response.status}`);
          }
        } catch (e) {
          console.warn(`spondProxy: group ${gid} failed:`, e.message);
        }
      }
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an event parser. Convert Norwegian speech into structured event data.

Today's date is ${today}.

When the user says "i dag" (today), use today's date.
When the user says "i morgen" (tomorrow), use tomorrow's date.
When the user says "på mandag" (on Monday), "på tirsdag" (on Tuesday), etc., use the next occurrence of that weekday.
When the user says "neste uke" (next week), use dates from next week.

Norwegian days: mandag=Monday, tirsdag=Tuesday, onsdag=Wednesday, torsdag=Thursday, fredag=Friday, lørdag=Saturday, søndag=Sunday.

Norwegian months: januar=January, februar=February, mars=March, april=April, mai=May, juni=June, juli=July, august=August, september=September, oktober=October, november=November, desember=December.

Time expressions: "klokka 14" = 14:00, "halv tre" = 14:30, "kvart over to" = 14:15, "kvart på tre" = 14:45, "formiddag" = morning/10:00, "ettermiddag" = afternoon/15:00, "kveld" = evening/18:00.

Return ONLY valid JSON with this exact structure:
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
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);

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

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { imageBase64, type } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data received" });
    }

    if (type !== "event") {
      return res.status(400).json({ error: "Invalid type. Only 'event' is supported." });
    }

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `You are an event parser. Extract ALL events visible in this image and return structured data.

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
              text: "Extract all events visible in this image.",
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const result = JSON.parse(completion.choices[0].message.content);

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
  } catch (error) {
    console.error("Photo to data error:", error.message, error.stack);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Scheduled function: check reminders every minute and send FCM push notifications
// Notifies ALL family members, not just the event creator
exports.checkReminders = onSchedule({ schedule: "every 1 minutes", region: "us-central1" }, async (event) => {
  const db = getFirestore();
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const eventsSnap = await db.collection("events").where("reminderMinutes", ">", 0).limit(500).get();

  // Cache family members per familyId to avoid duplicate lookups
  const familyMembersCache = {};
  const notifications = [];

  for (const doc of eventsSnap.docs) {
    const eventData = doc.data();
    if (!eventData.date || !eventData.time) continue;

    let reminderTime;
    if (eventData.reminderAt) {
      reminderTime = new Date(eventData.reminderAt);
    } else {
      const [h, m] = eventData.time.split(":").map(Number);
      const [year, month, day] = eventData.date.split("-").map(Number);
      const eventDate = new Date(year, month - 1, day, h, m, 0, 0);
      reminderTime = new Date(eventDate.getTime() - (eventData.reminderMinutes || 0) * 60 * 1000);
    }

    if (reminderTime >= fiveMinAgo && reminderTime <= fiveMinFromNow) {
      const familyId = eventData.familyId;
      if (!familyId) continue;

      // Look up family members (with cache)
      if (!familyMembersCache[familyId]) {
        const familySnap = await db.collection("families").doc(familyId).get();
        if (!familySnap.exists) {
          familyMembersCache[familyId] = [];
          continue;
        }
        const familyData = familySnap.data();
        const membersMap = familyData.members || {};
        const memberUids = Object.keys(membersMap);
        if (memberUids.length === 0) {
          familyMembersCache[familyId] = [];
          continue;
        }

        // Fetch user profiles in parallel (batch of up to 10 with 'in' query)
        const members = [];
        for (let i = 0; i < memberUids.length; i += 10) {
          const batch = memberUids.slice(i, i + 10);
          const usersSnap = await db.collection("users").where("__name__", "in", batch).get();
          usersSnap.forEach((uDoc) => {
            const uData = uDoc.data();
            if (uData.fcmToken && uData.notificationsEnabled !== false) {
              members.push({ uid: uDoc.id, fcmToken: uData.fcmToken });
            }
          });
        }
        familyMembersCache[familyId] = members;
      }

      const members = familyMembersCache[familyId];
      for (const member of members) {
        const notifId = `${doc.id}_${member.uid}`;
        const notifSnap = await db.collection("sentNotifications").doc(notifId).get();
        if (notifSnap.exists) continue;

        notifications.push({
          notifId,
          token: member.fcmToken,
          title: `📅 ${eventData.title}`,
          body: `Påminnelse om ${eventData.reminderMinutes} minutter`,
          eventId: doc.id,
          uid: member.uid,
        });
      }
    }
  }

  const results = await Promise.allSettled(
    notifications.map(async (n) => {
      try {
        await getMessaging().send({
          token: n.token,
          notification: {
            title: n.title,
            body: n.body,
          },
          webpush: {
            notification: {
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: n.eventId,
            },
            fcmOptions: {
              link: "/",
            },
          },
          data: {
            eventId: n.eventId,
            url: "/",
          },
        });

        await db.collection("sentNotifications").doc(n.notifId).set({
          sentAt: new Date().toISOString(),
          uid: n.uid,
          eventId: n.eventId,
        });

        return { status: "sent", notifId: n.notifId };
      } catch (error) {
        if (error.code === "messaging/registration-token-not-registered") {
          await db.collection("users").doc(n.uid).update({ fcmToken: null });
        }
        return { status: "error", notifId: n.notifId, error: error.message };
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value?.status === "sent").length;
  const failed = results.filter((r) => r.status === "fulfilled" && r.value?.status === "error").length;

  console.log(`checkReminders: ${sent} sent, ${failed} failed, ${notifications.length} total`);
  return { sent, failed, total: notifications.length };
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

  const { familyId, eventTitle, eventDate, eventTime, creatorName } = req.body || {};
  if (!familyId || !eventTitle) return res.status(400).json({ error: "familyId og eventTitle er påkrevd" });

  const db = getFirestore();
  const familySnap = await db.collection("families").doc(familyId).get();
  if (!familySnap.exists) return res.status(404).json({ error: "Familie ikke funnet" });

  const membersMap = familySnap.data().members || {};
  const memberUids = Object.keys(membersMap).filter((u) => u !== uid);

  const tokens = [];
  for (let i = 0; i < memberUids.length; i += 10) {
    const batch = memberUids.slice(i, i + 10);
    const usersSnap = await db.collection("users").where("__name__", "in", batch).get();
    usersSnap.forEach((uDoc) => {
      const uData = uDoc.data();
      if (uData.fcmToken && uData.notificationsEnabled !== false) {
        tokens.push({ uid: uDoc.id, fcmToken: uData.fcmToken });
      }
    });
  }

  if (tokens.length === 0) return res.status(200).json({ sent: 0 });

  const dateLabel = eventDate && eventTime
    ? `${eventDate} ${eventTime}`
    : eventDate || "";

  const results = await Promise.allSettled(
    tokens.map(async (t) => {
      await getMessaging().send({
        token: t.fcmToken,
        notification: {
          title: `📅 ${creatorName || 'En i familien'} la til et arrangement`,
          body: `${eventTitle}${dateLabel ? ` — ${dateLabel}` : ""}`,
        },
        webpush: {
          notification: {
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: "new-event",
          },
          fcmOptions: { link: "/" },
        },
        data: { url: "/", type: "new-event" },
      });
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return res.status(200).json({ sent });
});

// Birthday reminders — runs daily at 08:00
exports.checkBirthdayReminders = onSchedule({ schedule: "every day 08:00", timeZone: "Europe/Oslo" }, async (event) => {
  const db = getFirestore();
  const now = new Date();
  const todayMonthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Calculate dates for next 7 days
  const upcomingDates = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    upcomingDates.push(`${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const birthdaysSnap = await db.collection("birthdays").get();
  const sentNotifsSnap = await db.collection("sentNotifications").where("type", "==", "birthday").get();
  const sentNotifs = new Set(sentNotifsSnap.docs.map((d) => d.id));

  const notificationsToSend = [];

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

    const year = now.getFullYear();
    const notifKey = `birthday_${doc.id}_${year}`;
    if (sentNotifs.has(notifKey)) continue;

    // Get family members
    if (!b.familyId) continue;
    const familyDoc = await db.collection("families").doc(b.familyId).get();
    if (!familyDoc.exists) continue;
    const members = familyDoc.data().members || {};

    const memberTokens = [];
    for (const uid of Object.keys(members)) {
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) continue;
      const userData = userDoc.data();
      if (userData.notificationsEnabled === false) continue;
      if (userData.fcmToken) {
        memberTokens.push(userData.fcmToken);
      }
    }

    if (memberTokens.length > 0) {
      const age = now.getFullYear() - bDate.getFullYear();
      const title = `🎂 ${b.name} har bursdag!`;
      const body = daysUntil === 0
        ? `${b.name} har bursdag i dag! Fyller ${age} år.`
        : `${b.name} har bursdag om ${daysUntil} dager. Fyller ${age} år.`;

      notificationsToSend.push({ tokens: memberTokens, title, body, notifKey });
    }
  }

  // Send notifications
  for (const notif of notificationsToSend) {
    await Promise.allSettled(
      notif.tokens.map(async (token) => {
        await getMessaging().send({
          token,
          notification: { title: notif.title, body: notif.body },
          webpush: {
            notification: { icon: "/favicon.ico", badge: "/favicon.ico", tag: notif.notifKey },
            fcmOptions: { link: "/" },
          },
          data: { url: "/", type: "birthday" },
        });
      })
    );

    // Record to prevent duplicates
    await db.collection("sentNotifications").doc(notif.notifKey).set({
      type: "birthday",
      sentAt: FieldValue.serverTimestamp(),
    });
  }
  return { sent: notificationsToSend.length };
});

// AI Recipe Suggestions
exports.aiRecipeSuggestions = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { prompt, existingRecipes = [], searchLanguage = "norsk", responseLanguage = "norsk" } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // Map language codes to display names
  const languageNames = {
    norsk: "Norwegian", svensk: "Swedish", engelsk: "English",
    dansk: "Danish", finsk: "Finnish",
  };
  const variationLabels = {
    norsk: { classic: "Klassisk", faster: "Raskere", twist: "Med en vri" },
    svensk: { classic: "Klassiskt", faster: "Snabbare", twist: "Med en vri" },
    engelsk: { classic: "Classic", faster: "Faster", twist: "With a twist" },
    dansk: { classic: "Klassisk", faster: "Hurtigere", twist: "Med et twist" },
    finsk: { classic: "Klassinen", faster: "Nopeammin", twist: "Vähän erilainen" },
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
    "category": "kylling|kjoett|fisk|vegetar|pasta|gryte|suppe|frokost|sott"
  }
]

Make each dish practical for everyday family cooking. Each dish must have a unique, authentic name from ${searchLangName} cuisine.
Focus on making the 3 dishes meaningfully different from each other — different ingredients, techniques, or complexity levels.`,
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
    return res.status(200).json({ recipes });
  } catch (error) {
    console.error("AI recipe suggestion error:", error);
    return res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// Import recipe from URL
exports.importRecipeFromUrl = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

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
        'User-Agent': 'Mozilla/5.0 (compatible; Familiesenter/1.0)',
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

Return ONLY valid JSON with this exact structure:
{
  "name": "Recipe name",
  "description": "Short 1-2 sentence description",
  "ingredients": [{"name": "Ingredient name MUST be in ${responseLangName}", "amount": "Amount", "unit": "Unit"}],
  "instructions": ["Step MUST be in ${responseLangName}", "Step MUST be in ${responseLangName}"],
  "time": 30,
  "portions": 4,
  "category": "kylling|kjoett|fisk|vegetar|pasta|gryte|suppe|frokost|sott",
  "variation": "",
  "cuisine": ""
}

Extract the recipe name, ingredients with amounts and units, step-by-step instructions, estimated cooking time in minutes, number of servings, and categorize the dish.
If you cannot extract a recipe from the content, return {"error": "Could not extract recipe from URL"}.`,
        },
        {
          role: "user",
          content: `Extract the recipe from this webpage content:\n\n${html.substring(0, 8000)}`,
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

// Translate recipe to all supported languages
exports.translateRecipe = onRequest({ region: "us-central1", memory: "256MB" }, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

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

