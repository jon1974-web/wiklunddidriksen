require("dotenv").config();
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");
const OpenAI = require("openai");
const functions = require("firebase-functions");
const Busboy = require("busboy");

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
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
          const err = await response.json().catch(() => ({}));
          return res.status(response.status).json(err);
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

// Scheduled function: check reminders every minute and send FCM push notifications
exports.checkReminders = onSchedule({ schedule: "every 1 minutes", region: "us-central1" }, async (event) => {
  const db = getFirestore();
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const eventsSnap = await db.collection("events").where("reminderMinutes", ">", 0).limit(500).get();

  const notifications = [];

  for (const doc of eventsSnap.docs) {
    const eventData = doc.data();
    if (!eventData.date || !eventData.time || !eventData.createdBy) continue;

    const [h, m] = eventData.time.split(":").map(Number);
    const eventDate = new Date(eventData.date);
    eventDate.setHours(h, m, 0, 0);

    const reminderTime = new Date(eventDate.getTime() - (eventData.reminderMinutes || 0) * 60 * 1000);

    if (reminderTime >= fiveMinAgo && reminderTime <= fiveMinFromNow) {
      const notifRef = db.collection("sentNotifications").doc(doc.id);
      const notifSnap = await notifRef.get();
      if (notifSnap.exists) continue;

      const userSnap = await db.collection("users").doc(eventData.createdBy).get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

      notifications.push({
        docId: doc.id,
        token: fcmToken,
        title: `📅 ${eventData.title}`,
        body: `Påminnelse om ${eventData.reminderMinutes} minutter`,
        eventId: doc.id,
        createdBy: eventData.createdBy,
      });
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

        await db.collection("sentNotifications").doc(n.docId).set({
          sentAt: new Date().toISOString(),
          createdBy: n.createdBy,
        });

        return { status: "sent", docId: n.docId };
      } catch (error) {
        if (error.code === "messaging/registration-token-not-registered") {
          await db.collection("users").doc(n.createdBy).update({ fcmToken: null });
        }
        return { status: "error", docId: n.docId, error: error.message };
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value?.status === "sent").length;
  const failed = results.filter((r) => r.status === "fulfilled" && r.value?.status === "error").length;

  console.log(`checkReminders: ${sent} sent, ${failed} failed, ${notifications.length} total`);
  return { sent, failed, total: notifications.length };
});
