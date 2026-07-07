import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Event, Trip, SpondEvent } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getWeekNumber, formatTime, formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';

interface WeeklySummaryProps {
  visible: boolean;
  onClose: () => void;
  events: Event[];
  trips: Trip[];
  spondEvents: SpondEvent[];
}

const DAY_NAMES_KEY = ['weekdays.monday', 'weekdays.tuesday', 'weekdays.wednesday', 'weekdays.thursday', 'weekdays.friday', 'weekdays.saturday', 'weekdays.sunday'];

const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const toLocalDateStr = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

interface DayItem {
  type: 'event' | 'trip' | 'spond';
  title: string;
  timeRange: string;
  icon: string;
  groupName?: string;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = React.memo(({ visible, onClose, events, trips, spondEvents }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { colors } = useTheme();

  const weekData = useMemo(() => {
    const now = new Date();
    const { start, end } = getWeekRange(now);
    const weekNum = getWeekNumber(now);
    const startStr = toLocalDateStr(start);

    const days: { date: Date; dayName: string; dateLabel: string; items: DayItem[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = toLocalDateStr(d);
      const dateLabel = d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
      const items: DayItem[] = [];

      events.forEach((e) => {
        const eStart = e.date;
        const eEnd = e.endDate || e.date;
        if (dateStr >= eStart && dateStr <= eEnd) {
          const timeRange = e.endTime
            ? `${formatTime(e.time)} – ${formatTime(e.endTime)}`
            : formatTime(e.time);
          items.push({
            type: 'event',
            title: e.title,
            timeRange,
            icon: e.icon || '📅',
          });
        }
      });

      trips.forEach((t) => {
        if (dateStr >= t.startDate && dateStr <= t.endDate) {
          const isStart = dateStr === t.startDate;
          const isEnd = dateStr === t.endDate;
          let timeRange = '';
          if (isStart && isEnd) timeRange = 'Hele dagen';
          else if (isStart) timeRange = `Fra ${t.city || 'start'}`;
          else if (isEnd) timeRange = `Til ${t.city || 'slutt'}`;
          else timeRange = t.city || 'Pågår';
          items.push({
            type: 'trip',
            title: t.title,
            timeRange,
            icon: '✈️',
          });
        }
      });

      spondEvents.forEach((e) => {
        const sStart = formatSpondDate(e.startTimestamp);
        const sEnd = e.endTimestamp ? formatSpondDate(e.endTimestamp) : sStart;
        if (dateStr >= sStart && dateStr <= sEnd) {
          const startTime = formatSpondTimestamp(e.startTimestamp);
          const endTime = e.endTimestamp ? formatSpondTimestamp(e.endTimestamp) : null;
          const timeRange = endTime ? `${startTime} – ${endTime}` : startTime;
          items.push({
            type: 'spond',
            title: e.heading,
            timeRange,
            icon: '🏟️',
            groupName: e.groupName,
          });
        }
      });

      items.sort((a, b) => a.timeRange.localeCompare(b.timeRange));

      days.push({
        date: d,
        dayName: t(DAY_NAMES_KEY[i]),
        dateLabel,
        items,
      });
    }

    return { weekNum, days, startLabel: start.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' }), endLabel: end.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) };
  }, [events, trips, spondEvents, t, i18nInstance]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('events.weeklySummary')}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {t('weekdays.week')} {weekData.weekNum} · {weekData.startLabel} – {weekData.endLabel}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: '#0097A7' }]}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {weekData.days.map((day, idx) => {
            const isToday = toLocalDateStr(day.date) === toLocalDateStr(new Date());
            return (
              <View key={idx} style={[styles.daySection, { backgroundColor: colors.surface }]}>
                <View style={[styles.dayHeader, isToday && { backgroundColor: '#0097A7' + '20', borderLeftColor: '#0097A7' }]}>
                  <Text style={[styles.dayName, { color: isToday ? '#0097A7' : colors.text }]}>{day.dayName}</Text>
                  <Text style={[styles.dayDate, { color: isToday ? '#0097A7' : colors.textSecondary }]}>{day.dateLabel}</Text>
                </View>
                {day.items.length > 0 ? (
                  day.items.map((item, i) => (
                    <View key={i} style={[styles.itemRow, i < day.items.length - 1 && { borderBottomColor: colors.border }]}>
                      <Text style={styles.itemIcon}>{item.icon}</Text>
                      <View style={styles.itemContent}>
                        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                        <Text style={[styles.itemTime, { color: colors.textSecondary }]}>{item.timeRange}</Text>
                        {item.groupName && (
                          <Text style={[styles.itemGroup, { color: '#0097A7' }]}>{item.groupName}</Text>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyDay, { color: colors.textDisabled }]}>{t('events.noEventsDay')}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  daySection: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayDate: {
    fontSize: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  itemIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemTime: {
    fontSize: 13,
  },
  itemGroup: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyDay: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
