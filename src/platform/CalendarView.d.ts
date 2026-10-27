// Type declarations for the platform-specific CalendarView module.
// Implementations: CalendarView.native.tsx, CalendarView.web.tsx
import type { FC } from 'react';

interface WebCalendarProps {
  current: string;
  onDayPress: (day: { dateString: string; day: number; month: number; year: number }) => void;
  markedDates: Record<string, any>;
  markingType?: string;
  theme?: Record<string, string>;
  onMonthChange?: (year: number, month: number) => void;
  minDate?: string;
  maxDate?: string;
  lang?: string;
}

export declare const WebCalendar: FC<WebCalendarProps>;
