import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Image } from 'react-native';
import { Event, Trip, SpondEvent, Birthday, MealPlan, Recipe } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getWeekNumber, formatTime, formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getLocale } from '../constants/languages';

interface WeeklySummaryProps {
  visible: boolean;
  onClose: () => void;
  events: Event[];
  trips: Trip[];
  spondEvents: SpondEvent[];
  birthdays?: Birthday[];
  mealPlan?: MealPlan | null;
  recipes?: Recipe[];
  sectionSettings?: Record<string, boolean>;
  groupLogos?: Record<string, string>;
}

const DAY_NAMES_KEY = ['weekdays.monday', 'weekdays.tuesday', 'weekdays.wednesday', 'weekdays.thursday', 'weekdays.friday', 'weekdays.saturday', 'weekdays.sunday'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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
  type: 'event' | 'trip' | 'spond' | 'meal';
  title: string;
  timeRange: string;
  icon: string;
  groupName?: string;
  logoUrl?: string;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = React.memo(({ visible, onClose, events, trips, spondEvents, birthdays = [], mealPlan = null, recipes = [], sectionSettings = {}, groupLogos = {} }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { colors } = useTheme();
  const [langKey, setLangKey] = useState(0);

  useEffect(() => {
    const handler = () => setLangKey(k => k + 1);
    i18nInstance.on('languageChanged', handler);
    return () => i18nInstance.off('languageChanged', handler);
  }, [i18nInstance]);

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
      const dateLabel = d.toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'short' });
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
            logoUrl: e.groupName ? groupLogos[e.groupName] : undefined,
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

    return { weekNum, days, startLabel: start.toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'long' }), endLabel: end.toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'long', year: 'numeric' }) };
  }, [events, trips, spondEvents, mealPlan, recipes, t, i18nInstance, langKey]);

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
          {/* Birthday section */}
          {sectionSettings.birthdays !== false && (() => {
            const { start, end } = getWeekRange(new Date());
            const weekBirthdays = birthdays.filter(b => {
              const bDate = new Date(b.date);
              const bMonth = bDate.getMonth();
              const bDay = bDate.getDate();
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === bMonth && d.getDate() === bDay) return true;
              }
              return false;
            });
            if (weekBirthdays.length === 0) {
              return (
                <View style={[styles.birthdaySection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.birthdaySectionTitle, { color: colors.text }]}>🎂 {t('birthdays.title')}</Text>
                  <Text style={[styles.birthdayEmpty, { color: colors.textDisabled }]}>{t('birthdays.noBirthdaysWeek')}</Text>
                </View>
              );
            }
            return (
              <View style={[styles.birthdaySection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.birthdaySectionTitle, { color: colors.text }]}>🎂 {t('birthdays.title')}</Text>
                {weekBirthdays.map((b, i) => {
                  const bDate = new Date(b.date);
                  const today = new Date();
                  const age = today.getFullYear() - bDate.getFullYear();
                  const dayName = new Date(start.getTime() + [...Array(7)].findIndex((_, di) => {
                    const d = new Date(start);
                    d.setDate(d.getDate() + di);
                    return d.getMonth() === bDate.getMonth() && d.getDate() === bDate.getDate();
                  }) * 86400000).toLocaleDateString(getLocale(i18n.language), { weekday: 'long' });
                  return (
                    <View key={i} style={[styles.birthdayItem, i < weekBirthdays.length - 1 && { borderBottomColor: colors.border }]}>
                      <Text style={[styles.birthdayItemText, { color: colors.text }]}>
                        {b.name} fyller {age} år ({dayName})
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* Meal plan compact section */}
          {sectionSettings.meals !== false && mealPlan?.meals && (() => {
            const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const DAY_LABELS_SHORT = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];
            let plannedCount = 0;
            const totalSlots = 14;
            const dayRows = DAY_KEYS.map((key, i) => {
              const dayMeals = mealPlan.meals[key] || {};
              const lunsjRecipe = dayMeals.lunsj ? recipes.find(r => r.id === dayMeals.lunsj) : null;
              const middagRecipe = dayMeals.middag ? recipes.find(r => r.id === dayMeals.middag) : null;
              if (lunsjRecipe) plannedCount++;
              if (middagRecipe) plannedCount++;
              const mealParts = [];
              if (lunsjRecipe) mealParts.push(`🥪 ${lunsjRecipe.name}`);
              if (middagRecipe) mealParts.push(`🍽️ ${middagRecipe.name}`);
              return { day: DAY_LABELS_SHORT[i], meals: mealParts, hasMeals: mealParts.length > 0 };
            });

            return (
              <View style={[styles.mealSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.mealSectionTitle, { color: colors.text }]}>🍽️ {t('mealPlanner.weeklyPlan')}</Text>
                <Text style={[styles.mealProgress, { color: colors.textSecondary }]}>
                  {t('mealPlanner.mealsPlanned', { planned: plannedCount, total: totalSlots })}
                </Text>
                {dayRows.map((row, i) => (
                  <View key={i} style={[styles.mealDayRow, i < 6 && { borderBottomColor: colors.border }]}>
                    <Text style={[styles.mealDayLabel, { color: colors.text }]}>{row.day}</Text>
                    <Text style={[styles.mealDayContent, { color: row.hasMeals ? colors.text : colors.textDisabled }]}>
                      {row.hasMeals ? row.meals.join(' · ') : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Day sections */}
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
                      {item.logoUrl ? (
                        <Image source={{ uri: item.logoUrl }} style={{ width: 28, height: 28, borderRadius: 6 }} />
                      ) : (
                        <Text style={styles.itemIcon}>{item.icon}</Text>
                      )}
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
  birthdaySection: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  birthdaySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  birthdayEmpty: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  birthdayItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  birthdayItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  mealSection: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  mealProgress: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  mealDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  mealDayLabel: {
    fontSize: 14,
    fontWeight: '700',
    width: 36,
  },
  mealDayContent: {
    fontSize: 14,
    flex: 1,
  },
});
