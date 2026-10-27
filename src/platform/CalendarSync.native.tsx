import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export const requestCalendarPermission = async (): Promise<boolean> => {
  const { status } = await Calendar.requestCalendarPermissions();
  return status === 'granted';
};

export const pickCalendar = async (): Promise<Calendar.ExpoCalendar | null> => {
  if (Platform.OS !== 'ios') return null;
  try {
    return await Calendar.presentPicker();
  } catch {
    return null;
  }
};

export const getDefaultCalendar = async (): Promise<Calendar.ExpoCalendar | null> => {
  try {
    const { status } = await Calendar.getCalendarPermissions();
    if (status !== 'granted') return null;
    return Calendar.getDefaultCalendarSync();
  } catch {
    return null;
  }
};

export const getCalendarName = async (calendarId: string): Promise<string | null> => {
  try {
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
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
    const calendar = await Calendar.ExpoCalendar.get(calendarId);
    const alarms = event.reminderMinutes > 0
      ? [{ relativeOffset: -event.reminderMinutes }]
      : [];

    const createdEvent = await calendar.createEvent({
      title: event.title,
      notes: event.description || undefined,
      location: event.address || undefined,
      startDate: event.startDate,
      endDate: event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000),
      alarms,
    });

    return createdEvent.id;
  } catch {
    return null;
  }
};

export const updateCalendarEvent = async (
  calendarEventId: string,
  event: SyncEventParams
): Promise<void> => {
  try {
    const calendarEvent = await Calendar.ExpoCalendarEvent.get(calendarEventId);
    await calendarEvent.update({
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
    const calendarEvent = await Calendar.ExpoCalendarEvent.get(calendarEventId);
    await calendarEvent.delete();
  } catch {
    // silent fail
  }
};
