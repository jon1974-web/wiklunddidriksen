/**
 * Shared reminder fields for every module that supports reminders.
 *
 * Each record stores:
 *  - reminder:   minutes before the start time (0 = no reminder)
 *  - reminderAt: ISO timestamp when the push should fire, or null when no reminder
 *
 * The server job checkReminders reads reminderAt and sends the push, the same
 * way it does for events, medication and vaccinations. Always spread this into
 * both add and update payloads so that clearing a reminder also clears reminderAt.
 */
export const DEFAULT_REMINDER_TIME = '09:00';

export interface ReminderFields {
  reminder: number;
  reminderAt: string | null;
}

export const buildReminderFields = (
  date: string | undefined,
  time: string | undefined,
  reminderMinutes: number | string | undefined,
): ReminderFields => {
  const minutes = Number(reminderMinutes) || 0;
  if (minutes <= 0 || !date) {
    return { reminder: 0, reminderAt: null };
  }
  const start = new Date(`${date}T${time || DEFAULT_REMINDER_TIME}:00`);
  if (Number.isNaN(start.getTime())) {
    return { reminder: minutes, reminderAt: null };
  }
  return {
    reminder: minutes,
    reminderAt: new Date(start.getTime() - minutes * 60 * 1000).toISOString(),
  };
};

/**
 * Health vaccination reminders were saved as translated labels ("1 dag før"). They are now
 * minutes before the next due date. This maps old labels (in every supported language) and old
 * numeric strings to minutes. Keep in sync with functions/reminderRules.js.
 */
const LEGACY_VACCINATION_REMINDER_MINUTES: Record<string, number> = {
  '': 0,
  '1 dag før': 1440, '1 dag före': 1440, '1 dag': 1440, '1 day before': 1440, '1 päivä ennen': 1440,
  '3 dager før': 4320, '3 dage før': 4320, '3 dagar före': 4320, '3 days before': 4320, '3 päivää ennen': 4320,
  '1 uke før': 10080, '1 uge før': 10080, '1 vecka före': 10080, '1 week before': 10080, '1 viikko ennen': 10080,
};

export const legacyVaccinationReminderMinutes = (value: unknown): number => {
  if (typeof value === 'number') return value > 0 ? value : 0;
  if (value === undefined || value === null) return 0;
  const text = String(value).trim();
  if (Object.prototype.hasOwnProperty.call(LEGACY_VACCINATION_REMINDER_MINUTES, text)) {
    return LEGACY_VACCINATION_REMINDER_MINUTES[text];
  }
  const asNumber = Number(text);
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : 0;
};
