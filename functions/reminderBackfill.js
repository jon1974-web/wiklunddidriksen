// One-time backfill of reminderAt for records saved before reminders were stored consistently.
// Idempotent: only fills records that have a reminder but no reminderAt, and skips past reminders.
const { FieldPath } = require("firebase-admin/firestore");
const reminderRules = require("./reminderRules");

async function runReminderBackfill(db, now = Date.now()) {
  const timeZoneByFamily = {};
  const familyTimeZone = async (familyId) => {
    if (timeZoneByFamily[familyId]) return timeZoneByFamily[familyId];
    let tz = reminderRules.DEFAULT_TIMEZONE;
    try {
      const familySnap = await db.collection("families").doc(familyId).get();
      const ownerUid = familySnap.exists ? Object.keys(familySnap.data().members || {})[0] : null;
      if (ownerUid) {
        const userSnap = await db.collection("users").doc(ownerUid).get();
        if (userSnap.data()?.timezone) tz = userSnap.data().timezone;
      }
    } catch {}
    timeZoneByFamily[familyId] = tz;
    return tz;
  };

  const sources = [
    { name: "activities", kind: "activity", group: true, keep: (doc) => ["schoolActivities", "kindergartenActivities"].includes(doc.ref.parent.parent?.parent?.id) },
    { name: "appointments", kind: "appointment", group: true, keep: (doc) => doc.ref.parent.parent?.parent?.id === "health" },
    { name: "vaccinations", kind: "vaccination", group: true, keep: (doc) => doc.ref.parent.parent?.parent?.id === "health" },
    { name: "petVetVisits", kind: "vetVisit", group: false, keep: () => true },
    { name: "homeServices", kind: "homeService", group: false, keep: () => true },
  ];

  const report = {};
  for (const source of sources) {
    const counts = { scanned: 0, updated: 0 };
    const base = source.group ? db.collectionGroup(source.name) : db.collection(source.name);
    let last = null;
    for (;;) {
      let query = base.orderBy(FieldPath.documentId()).limit(300);
      if (last) query = query.startAfter(last);
      const snap = await query.get();
      if (snap.empty) break;
      let batch = db.batch();
      let pending = 0;
      for (const doc of snap.docs) {
        if (!source.keep(doc)) continue;
        counts.scanned++;
        const data = doc.data();
        const familyId = data.familyId || (doc.ref.parent.parent && source.name !== "petVetVisits" && source.name !== "homeServices" ? doc.ref.parent.parent.id : null);
        const tz = familyId ? await familyTimeZone(familyId) : reminderRules.DEFAULT_TIMEZONE;
        const update = reminderRules.planReminderBackfill(source.kind, data, now, tz);
        if (!update) continue;
        batch.update(doc.ref, update);
        counts.updated++;
        pending++;
        if (pending >= 400) {
          await batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
      if (pending > 0) await batch.commit();
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < 300) break;
    }
    report[source.name] = counts;
  }
  return report;
}

module.exports = { runReminderBackfill };
