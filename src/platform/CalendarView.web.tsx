import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

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

const DAYS_KEYS = ['calendar.monday', 'calendar.tuesday', 'calendar.wednesday', 'calendar.thursday', 'calendar.friday', 'calendar.saturday', 'calendar.sunday'];
const MONTHS_KEYS = [
  'calendar.january', 'calendar.february', 'calendar.march', 'calendar.april', 'calendar.may', 'calendar.june',
  'calendar.july', 'calendar.august', 'calendar.september', 'calendar.october', 'calendar.november', 'calendar.december',
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
};

export const WebCalendar: React.FC<WebCalendarProps> = ({ current, onDayPress, markedDates, theme, onMonthChange, minDate, maxDate }) => {
  const { t } = useTranslation();
  const currentDate = new Date(current);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const canGoPrev = !minDate || `${year}-${String(month + 1).padStart(2, '0')}` > minDate;
  const canGoNext = !maxDate || `${year}-${String(month + 1).padStart(2, '0')}` < maxDate;

  const weeks = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const result: (number | null)[][] = [];
    let week: (number | null)[] = new Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [year, month]);

  const accent = theme?.accentColor || '#4CAF50';
  const bg = theme?.calendarBackground || '#fff';
  const text = theme?.textColor || '#333';
  const textDisabled = theme?.textDisabledColor || '#999';
  const selectedBg = theme?.selectedDayBackgroundColor || accent;

  const handlePrev = () => {
    if (!canGoPrev || !onMonthChange) return;
    const newMonth = month - 1;
    if (newMonth < 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, newMonth);
    }
  };

  const handleNext = () => {
    if (!canGoNext || !onMonthChange) return;
    const newMonth = month + 1;
    if (newMonth > 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, newMonth);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handlePrev} style={styles.arrow} disabled={!canGoPrev}>
          <Text style={[styles.arrowText, { color: canGoPrev ? accent : textDisabled }]}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: text }]}>{t(MONTHS_KEYS[month])} {year}</Text>
        <TouchableOpacity onPress={handleNext} style={styles.arrow} disabled={!canGoNext}>
          <Text style={[styles.arrowText, { color: canGoNext ? accent : textDisabled }]}>{'›'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.dayHeader}>
        {DAYS_KEYS.map((dayKey) => (
          <Text key={dayKey} style={[styles.dayHeaderText, { color: textDisabled }]}>{t(dayKey)}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day === null) return <View key={di} style={styles.dayCell} />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const marks = markedDates[dateStr];
            const isSelected = marks?.selected;
            const hasEvent = marks?.marked;

            return (
              <TouchableOpacity
                key={di}
                style={[
                  styles.dayCell,
                  styles.dayButton,
                  isSelected && { backgroundColor: selectedBg, borderRadius: 20 },
                  hasEvent && !isSelected && marks?.color && { backgroundColor: marks.color + '30' },
                ]}
                onPress={() => onDayPress({
                  dateString: dateStr,
                  day,
                  month: month + 1,
                  year,
                })}
              >
                <Text style={[
                  styles.dayText,
                  { color: isSelected ? '#fff' : text },
                ]}>
                  {day}
                </Text>
                {hasEvent && (
                  <View style={[styles.dot, { backgroundColor: marks?.dotColor || accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 150,
  },
  arrow: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});
