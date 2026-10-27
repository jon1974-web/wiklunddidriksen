// Shared reminder rules for every module that stores reminders.
//
// Each record has reminder (minutes before the start, 0 = none) and reminderAt (ISO timestamp
// when the push should fire). The client writes both (src/utils/reminders.ts); this module
// computes the same values for records that were saved without them (backfill).

const DEFAULT_TIME = "09:00";

// Health vaccination reminders used to be saved as translated labels. Map each label (in every
// supported language) and the old numeric strings to minutes. Unknown values map to 0.
const LEGACY_VACCINATION_LABELS = {
  "": 0,
  "1 dag før": 1440, "1 dag före": 1440, "1 dag": 1440, "1 day before": 1440, "1 päivä ennen": 1440,
  "3 dager før": 4320, "3 dage før": 4320, "3 dagar före": 4320, "3 days before": 4320, "3 päivää ennen": 4320,
  "1 uke før": 10080, "1 uge før": 10080, "1 vecka före": 10080, "1 week before": 10080, "1 viikko ennen": 10080,
};

function legacyVaccinationReminderMinutes(value) {
  if (typeof value === "number") return value > 0 ? value : 0;
  if (value === undefined || value === null) return 0;
  const text = String(value).trim();
  if (Object.prototype.hasOwnProperty.call(LEGACY_VACCINATION_LABELS, text)) return LEGACY_VACCINATION_LABELS[text];
  const asNumber = Number(text);
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : 0;
}

// Offset of a timezone from UTC at an instant, in minutes (local minus UTC).
function timeZoneOffsetMinutes(instantMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - Math.floor(instantMs / 1000) * 1000) / 60000;
}

// Converts a wall-clock time in a timezone (e.g. Europe/Oslo) to a UTC Date. Independent of the
// machine's own timezone, so the server (UTC) and tests give the same result.
function zonedDateTimeToUtc(date, time, timeZone) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const firstOffset = timeZoneOffsetMinutes(wallAsUtc, timeZone);
  let utc = wallAsUtc - firstOffset * 60000;
  // Re-check at the adjusted instant in case a DST change sits between the two
  const secondOffset = timeZoneOffsetMinutes(utc, timeZone);
  if (secondOffset !== firstOffset) utc = wallAsUtc - secondOffset * 60000;
  return new Date(utc);
}

const DEFAULT_TIMEZONE = "Europe/Oslo";

// Returns the ISO reminder timestamp, or null when there is no reminder or no valid date.
function computeReminderAt(date, time, minutes, timeZone = DEFAULT_TIMEZONE) {
  if (!minutes || minutes <= 0 || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const start = zonedDateTimeToUtc(date, time || DEFAULT_TIME, timeZone);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() - minutes * 60 * 1000).toISOString();
}

// Decides what a backfill should write for one record. Returns an update object or null.
// kind: activity | appointment | vetVisit | homeService | vaccination
// Only fills records that have a reminder but no reminderAt, and never schedules a reminder
// that is already in the past (that would fire immediately for old appointments).
function planReminderBackfill(kind, data, now = Date.now(), timeZone = DEFAULT_TIMEZONE) {
  if (!data || data.reminderAt) return null;
  if (data.status === "completed") return null;

  let date;
  let time;
  let minutes;
  if (kind === "vaccination") {
    date = data.nextDue;
    time = DEFAULT_TIME;
    minutes = legacyVaccinationReminderMinutes(data.reminder);
  } else {
    date = data.dateFrom || data.date;
    time = data.startTime || DEFAULT_TIME;
    minutes = Number(data.reminder) || 0;
  }

  const reminderAt = computeReminderAt(date, time, minutes, timeZone);
  if (!reminderAt) return null;
  if (new Date(reminderAt).getTime() <= now) return null;

  const update = { reminderAt };
  if (kind === "vaccination") update.reminder = minutes;
  return update;
}

module.exports = {
  computeReminderAt,
  legacyVaccinationReminderMinutes,
  planReminderBackfill,
  zonedDateTimeToUtc,
  DEFAULT_TIME,
  DEFAULT_TIMEZONE,
};
