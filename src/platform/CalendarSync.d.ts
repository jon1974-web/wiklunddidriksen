// Type declarations for the platform-specific CalendarSync module.
// Implementations: CalendarSync.native.tsx (expo-calendar), CalendarSync.web.tsx (.ics download)
import type { ExpoCalendar } from 'expo-calendar';

interface SyncEventParams {
  title: string;
  description?: string;
  address?: string;
  startDate: Date;
  endDate?: Date;
  reminderMinutes: number;
}

export declare const requestCalendarPermission: () => Promise<boolean>;
export declare const pickCalendar: () => Promise<ExpoCalendar | null>;
export declare const getDefaultCalendar: () => Promise<ExpoCalendar | null>;
export declare const getCalendarName: (calendarId: string) => Promise<string | null>;
export declare const syncEventToCalendar: (calendarId: string, event: SyncEventParams) => Promise<string | null>;
export declare const updateCalendarEvent: (calendarEventId: string, event: SyncEventParams) => Promise<void>;
export declare const deleteCalendarEvent: (calendarEventId: string) => Promise<void>;
