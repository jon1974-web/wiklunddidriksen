interface SyncEventParams {
  title: string;
  description?: string;
  address?: string;
  startDate: Date;
  endDate?: Date;
  reminderMinutes: number;
}

const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const generateICS = (event: SyncEventParams): string => {
  const now = formatICSDate(new Date());
  const start = formatICSDate(event.startDate);
  const end = formatICSDate(event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000));

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Familiesenter//NO',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DTSTAMP:${now}`,
    `UID:${Date.now()}@familiesenter.web`,
  ];

  if (event.description) {
    ics.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
  }
  if (event.address) {
    ics.push(`LOCATION:${event.address}`);
  }
  if (event.reminderMinutes > 0) {
    ics.push('BEGIN:VALARM');
    ics.push('ACTION:DISPLAY');
    ics.push(`DESCRIPTION:Påminnelse: ${event.title}`);
    ics.push(`TRIGGER:-PT${event.reminderMinutes}M`);
    ics.push('END:VALARM');
  }

  ics.push('END:VEVENT', 'END:VCALENDAR');
  return ics.join('\r\n');
};

const downloadICS = (icsContent: string, filename: string) => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const requestCalendarPermission = async (): Promise<boolean> => {
  return true;
};

export const pickCalendar = async () => {
  return null;
};

export const getDefaultCalendar = async () => {
  return null;
};

export const getCalendarName = async (_calendarId: string): Promise<string | null> => {
  return null;
};

export const syncEventToCalendar = async (
  _calendarId: string,
  event: SyncEventParams
): Promise<string | null> => {
  const ics = generateICS(event);
  const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  downloadICS(ics, filename);
  return 'web-download';
};

export const updateCalendarEvent = async (
  _calendarEventId: string,
  event: SyncEventParams
): Promise<void> => {
  const ics = generateICS(event);
  const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  downloadICS(ics, filename);
};

export const deleteCalendarEvent = async (_calendarEventId: string): Promise<void> => {
  // No-op on web — user manages downloaded .ics files themselves
};
