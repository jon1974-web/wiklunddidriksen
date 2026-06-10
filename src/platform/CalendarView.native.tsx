import React from 'react';
import { Calendar, CalendarProps } from 'react-native-calendars';

interface WebCalendarProps {
  current: string;
  onDayPress: (day: { dateString: string; day: number; month: number; year: number }) => void;
  markedDates: Record<string, any>;
  markingType?: string;
  theme?: Record<string, string>;
  onMonthChange?: (year: number, month: number) => void;
  minDate?: string;
  maxDate?: string;
}

export const WebCalendar: React.FC<WebCalendarProps> = ({ current, onDayPress, markedDates, markingType, theme, minDate, maxDate }) => {
  const handleMonthChange = (month: { year: number; month: number }) => {};

  return (
    <Calendar
      current={current}
      onDayPress={onDayPress}
      markedDates={markedDates}
      markingType={markingType as CalendarProps['markingType']}
      theme={theme as CalendarProps['theme']}
      minDate={minDate}
      maxDate={maxDate}
      onMonthChange={handleMonthChange}
    />
  );
};
