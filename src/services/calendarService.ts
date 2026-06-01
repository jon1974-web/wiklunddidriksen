import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export const requestCalendarPermission = async (): Promise<boolean> => {
  const { status } = await Calendar.requestCalendarPermissions();
  return status === 'granted';
};

export const pickCalendar = async (): Promise<Calendar.Calendar | null> => {
  if (Platform.OS !== 'ios') return null;
  try {
    const calendar = await Calendar.presentPickerAsync({
      title: 'Velg kalender',
      eventStorePreference: Calendar.EventStorePreference.WRITE_ONLY,
    });
    return calendar;
  } catch {
    return null;
  }
};

export const getDefaultCalendar = async (): Promise<Calendar.Calendar | null> => {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    if (status !== 'granted') return null;
    return await Calendar.getDefaultCalendarAsync();
  } catch {
    return null;
  }
};

export const getCalendarName = async (calendarId: string): Promise<string | null> => {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const found = calendars.find((c) => c.id === calendarId);
    return found?.title ?? null;
  } catch {
    return null;
  }
};

interface SyncEventParams {
  title: string;
  description?: string;
  address?: string;
  startDate: Date;
  endDate?: Date;
  reminderMinutes: number;
}

export const syncEventToCalendar = async (
  calendarId: string,
  event: SyncEventParams
): Promise<string | null> => {
  try {
    const calendar = await Calendar.getCalendarAsync(calendarId);
    const alarms = event.reminderMinutes > 0
      ? [{ relativeOffset: -event.reminderMinutes }]
      : [];

    const eventId = await Calendar.createEventAsync(calendar.id, {
      title: event.title,
      notes: event.description || undefined,
      location: event.address || undefined,
      startDate: event.startDate,
      endDate: event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000),
      alarms,
    });

    return eventId;
  } catch {
    return null;
  }
};

export const updateCalendarEvent = async (
  calendarEventId: string,
  event: SyncEventParams
): Promise<void> => {
  try {
    await Calendar.updateEventAsync(calendarEventId, {
      title: event.title,
      notes: event.description || undefined,
      location: event.address || undefined,
      startDate: event.startDate,
      endDate: event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000),
      alarms: event.reminderMinutes > 0
        ? [{ relativeOffset: -event.reminderMinutes }]
        : [],
    });
  } catch {
    // silent fail
  }
};

export const deleteCalendarEvent = async (calendarEventId: string): Promise<void> => {
  try {
    await Calendar.deleteEventAsync(calendarEventId, { thisInstance: false });
  } catch {
    // silent fail
  }
};
