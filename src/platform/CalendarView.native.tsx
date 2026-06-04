import React from 'react';
import { Calendar, CalendarProps } from 'react-native-calendars';

interface WebCalendarProps {
  current: string;
  onDayPress: (day: { dateString: string; day: number; month: number; year: number }) => void;
  markedDates: Record<string, any>;
  markingType?: string;
  theme?: Record<string, string>;
}

export const WebCalendar: React.FC<WebCalendarProps> = ({ current, onDayPress, markedDates, markingType, theme }) => {
  return (
    <Calendar
      current={current}
      onDayPress={onDayPress}
      markedDates={markedDates}
      markingType={markingType as CalendarProps['markingType']}
      theme={theme as CalendarProps['theme']}
    />
  );
};
