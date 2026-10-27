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
