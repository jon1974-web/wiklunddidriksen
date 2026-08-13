import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Image } from 'react-native';
import { Event, Trip, SpondEvent, Birthday, MealPlan, Recipe, HealthAppointment, HealthMedication, HealthVaccination, PetVetVisit, PetVaccination, PetMedication } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getWeekNumber, formatTime, formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getLocale } from '../constants/languages';
import { AppIcon } from './AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import Svg, { Line } from 'react-native-svg';

interface WeeklySummaryProps {
  visible: boolean;
  onClose: () => void;
  events: Event[];
  trips: Trip[];
  spondEvents: SpondEvent[];
  birthdays?: Birthday[];
  mealPlan?: MealPlan | null;
  recipes?: Recipe[];
  groupLogos?: Record<string, string>;
  tripSubcollections?: Record<string, any>;
  healthAppointments?: HealthAppointment[];
  healthMedications?: HealthMedication[];
  healthVaccinations?: HealthVaccination[];
  petVetVisits?: PetVetVisit[];
  petVaccinations?: PetVaccination[];
  petMedications?: PetMedication[];
  sectionSettings?: Record<string, boolean>;
}

const MONTHS = ['JAN','FEB','MAR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DES'];

const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
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

const DAY_NAMES_NB = ['MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR', 'SØN'];
const DAY_NAMES_KEY = ['weekdays.monday', 'weekdays.tuesday', 'weekdays.wednesday', 'weekdays.thursday', 'weekdays.friday', 'weekdays.saturday', 'weekdays.sunday'];

const ClockIcon = ({ size = 12, color = '#999' }: { size?: number; color?: string }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ position: 'absolute', width: 1.5, height: size * 0.3, backgroundColor: color, top: 2 }} />
    <View style={{ position: 'absolute', width: size * 0.25, height: 1.5, backgroundColor: color, left: size * 0.35, top: size * 0.42 }} />
  </View>
);

const CalendarIcon = ({ dayName, dayNum, monthStr, isToday, accentColor }: { dayName: string; dayNum: number; monthStr: string; isToday: boolean; accentColor: string }) => (
  <View style={[calStyles.icon, isToday && { borderColor: accentColor, shadowColor: accentColor, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 }]}>
    <View style={[calStyles.top, isToday ? { backgroundColor: accentColor } : { backgroundColor: '#f0f0f0' }]}>
      <Text style={[calStyles.topText, isToday ? { color: '#fff' } : { color: '#999' }]}>{dayName}</Text>
    </View>
    <Text style={[calStyles.day, isToday ? { color: accentColor } : { color: '#999' }]}>{dayNum}</Text>
    <Text style={[calStyles.month, isToday ? {} : { color: '#bbb' }]}>{monthStr}</Text>
  </View>
);

const calStyles = StyleSheet.create({
  icon: { width: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0' },
  top: { height: 14, justifyContent: 'center', alignItems: 'center' },
  topText: { fontSize: 8, fontWeight: '800' },
  day: { fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 20, marginTop: 1 },
  month: { fontSize: 8, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase' },
});

const StatChip = ({ count, label, color }: { count: number; label: string; color: string }) => (
  <View style={statStyles.chip}>
    <Text style={[statStyles.num, { color }]}>{count}</Text>
    <Text style={[statStyles.label, { color }]}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  chip: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  num: { fontSize: 22, fontWeight: '800', lineHeight: 24 },
  label: { fontSize: 8, fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.3 },
});

export const WeeklySummary: React.FC<WeeklySummaryProps> = React.memo(({ visible, onClose, events, trips, spondEvents, birthdays = [], mealPlan = null, recipes = [], groupLogos = {}, healthAppointments = [], healthMedications = [], healthVaccinations = [], petVetVisits = [], petVaccinations = [], petMedications = [], sectionSettings = {} }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { colors } = useTheme();
  const [langKey, setLangKey] = useState(0);

  useEffect(() => {
    const handler = () => setLangKey(k => k + 1);
    i18nInstance.on('languageChanged', handler);
    return () => i18nInstance.off('languageChanged', handler);
  }, [i18nInstance]);

  const today = useMemo(() => new Date(), []);
  const todayStr = toLocalDateStr(today);

  const weekData = useMemo(() => {
    const now = new Date();
    const { start, end } = getWeekRange(now);
    const weekNum = getWeekNumber(now);

    const weekStr = toLocalDateStr(start);
    const endStr = toLocalDateStr(end);

    // Count stats
    let eventCount = 0;
    let healthCount = 0;
    let petCount = 0;
    let tripCount = 0;
    let birthdayCount = 0;

    // Build days with items
    const days: { date: Date; dayName: string; dayNameShort: string; dateNum: number; monthStr: string; items: { type: string; icon: string; iconBg: string; title: string; time: string }[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = toLocalDateStr(d);
      const items: { type: string; icon: string; iconBg: string; title: string; time: string }[] = [];

      // Events + Spond
      events.forEach((e) => {
        const eStart = e.date;
        const eEnd = e.endDate || e.date;
        if (dateStr >= eStart && dateStr <= eEnd) {
          const time = e.endTime ? `${formatTime(e.time)} – ${formatTime(e.endTime)}` : formatTime(e.time);
          items.push({ type: 'event', icon: e.icon || 'calendar', iconBg: '#E8F5E9', title: e.title, time });
          eventCount++;
        }
      });
      // Spond events
      spondEvents.forEach((e) => {
        const sStart = formatSpondDate(e.startTimestamp);
        const sEnd = e.endTimestamp ? formatSpondDate(e.endTimestamp) : sStart;
        if (dateStr >= sStart && dateStr <= sEnd) {
          const startTime = formatSpondTimestamp(e.startTimestamp);
          const endTime = e.endTimestamp ? formatSpondTimestamp(e.endTimestamp) : null;
          const time = endTime ? `${startTime} – ${endTime}` : startTime;
          const logoUrl = e.groupName ? groupLogos[e.groupName] : undefined;
          items.push({ type: 'spond', icon: 'calendar', iconBg: '#E8F5E9', title: e.heading, time, logoUrl });
          eventCount++;
        }
      });

      // Health — appointments + vaccinations
      healthAppointments.forEach((a) => {
        if (a.date === dateStr) {
          const time = a.endTime ? `${a.startTime || ''} – ${a.endTime}` : a.startTime || '';
          items.push({ type: 'health', icon: 'medication', iconBg: '#FFEBEE', title: `${a.title} — ${a.person}`, time });
          healthCount++;
        }
      });
      healthVaccinations.forEach((v) => {
        if (v.date === dateStr) {
          items.push({ type: 'health', icon: 'vaccination', iconBg: '#FFEBEE', title: `${v.name} — ${v.person}`, time: '' });
          healthCount++;
        }
      });
      // Health medications — show on active days
      healthMedications.forEach((m) => {
        const isActive = (!m.dateFrom || m.dateFrom <= dateStr) && (!m.dateTo || m.dateTo >= dateStr);
        if (isActive) {
          items.push({ type: 'health', icon: 'medication', iconBg: '#FFEBEE', title: `${m.name} — ${m.person}`, time: [m.dosage, (m.timeSlots || []).map(s => s.time).join(', ')].filter(Boolean).join(' · ') });
          healthCount++;
        }
      });

      // Pets
      petVetVisits.forEach((v) => {
        if (v.date === dateStr) {
          const time = v.endTime ? `${v.startTime || ''} – ${v.endTime}` : v.startTime || '';
          items.push({ type: 'pet', icon: 'pet', iconBg: '#F3E5F5', title: `${v.title} — ${v.petId}`, time });
          petCount++;
        }
      });
      petVaccinations.forEach((v) => {
        if (v.date === dateStr) {
          items.push({ type: 'pet', icon: 'vaccination', iconBg: '#F3E5F5', title: `${v.name} — ${v.petId}`, time: '' });
          petCount++;
        }
      });
      // Pet medications — show on active days
      petMedications.forEach((m) => {
        const isActive = (!m.dateFrom || m.dateFrom <= dateStr) && (!m.dateTo || m.dateTo >= dateStr);
        if (isActive) {
          items.push({ type: 'pet', icon: 'medication', iconBg: '#F3E5F5', title: `${m.name}`, time: [m.dosage, (m.timeSlots || []).map(s => s.time).join(', ')].filter(Boolean).join(' · ') });
          petCount++;
        }
      });

      // Birthdays
      birthdays.forEach((b) => {
        const bDate = new Date(b.date);
        if (bDate.getMonth() === d.getMonth() && bDate.getDate() === d.getDate()) {
          const age = new Date().getFullYear() - bDate.getFullYear();
          items.push({ type: 'birthday', icon: 'birthday', iconBg: '#FFF3E0', title: t('weekly.birthdayAge', { name: b.name, age }), time: '' });
          birthdayCount++;
        }
      });

      // Trips
      trips.forEach((tr) => {
        if (dateStr >= tr.startDate && dateStr <= tr.endDate) {
          const isStart = dateStr === tr.startDate;
          const isEnd = dateStr === tr.endDate;
          let time = '';
          if (isStart && isEnd) time = t('weekly.allDay');
          else if (isStart) time = tr.city ? t('weekly.from', { city: tr.city }) : t('weekly.fromStart');
          else if (isEnd) time = tr.city ? t('weekly.to', { city: tr.city }) : t('weekly.toEnd');
          else time = tr.city || t('weekly.ongoing');
          items.push({ type: 'trip', icon: 'transport', iconBg: '#E3F2FD', title: tr.title, time });
          if (isStart) tripCount++;
        }
      });

      days.push({
        date: d,
        dayName: DAY_NAMES_NB[i],
        dayNameShort: t(DAY_NAMES_KEY[i]),
        dateNum: d.getDate(),
        monthStr: MONTHS[d.getMonth()],
        items,
      });
    }

    return { weekNum, days, eventCount, healthCount, petCount, tripCount, birthdayCount, startLabel: start.toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'long' }), endLabel: end.toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'long', year: 'numeric' }) };
  }, [events, trips, spondEvents, birthdays, healthAppointments, healthVaccinations, petVetVisits, petVaccinations, t, i18nInstance, langKey]);

  // Meal plan data
  const mealData = useMemo(() => {
    if (!mealPlan?.meals) return null;
    const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const DAY_LABELS = ['MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR', 'SØN'];
    let plannedCount = 0;
    const showFrokost = sectionSettings.mealFrokost !== false;
    const showLunsj = sectionSettings.mealLunsj !== false;
    const showMiddag = sectionSettings.mealMiddag !== false;
    const activeMeals = (showFrokost ? 1 : 0) + (showLunsj ? 1 : 0) + (showMiddag ? 1 : 0);
    const totalSlots = activeMeals * 7;
    const rows = DAY_KEYS.map((key, i) => {
      const dayMeals = mealPlan.meals[key] || {};
      const parts: string[] = [];
      if (showFrokost && dayMeals.frokost) { const r = recipes.find(rec => rec.id === dayMeals.frokost); if (r) { parts.push(`🥞 ${r.name}`); plannedCount++; } }
      if (showLunsj && dayMeals.lunsj) { const r = recipes.find(rec => rec.id === dayMeals.lunsj); if (r) { parts.push(`🥪 ${r.name}`); plannedCount++; } }
      if (showMiddag && dayMeals.middag) { const r = recipes.find(rec => rec.id === dayMeals.middag); if (r) { parts.push(`🍽️ ${r.name}`); plannedCount++; } }
      return { day: DAY_LABELS[i], meals: parts, hasMeals: parts.length > 0 };
    });
    return { rows, plannedCount, totalSlots };
  }, [mealPlan, recipes, langKey, sectionSettings]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('events.weeklySummary')}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {t('weekdays.week')} {weekData.weekNum} · {weekData.startLabel} – {weekData.endLabel}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: colors.accent }]}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round">
              <Line x1="18" y1="6" x2="6" y2="18"/>
              <Line x1="6" y1="6" x2="18" y2="18"/>
            </Svg>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Stats bar */}
          <View style={styles.statsRow}>
            <StatChip count={weekData.eventCount} label={t('quickCreate.events')} color={MODULE_COLORS.home} />
            <StatChip count={weekData.healthCount} label={t('health.title')} color={MODULE_COLORS.health} />
            <StatChip count={weekData.petCount} label={t('pets.title')} color={MODULE_COLORS.pets} />
            <StatChip count={weekData.tripCount} label={t('quickCreate.trips')} color={MODULE_COLORS.trips} />
            <StatChip count={weekData.birthdayCount} label={t('birthdays.title')} color={MODULE_COLORS.birthdays} />
          </View>

          {/* Day cards */}
          {weekData.days.map((day, idx) => {
            const isToday = toLocalDateStr(day.date) === todayStr;
            return (
              <View key={idx} style={[styles.dayCard, isToday && { borderColor: MODULE_COLORS.mealplan, borderWidth: 2 }]}>
                <View style={styles.dayCardHeader}>
                  <CalendarIcon dayName={day.dayName} dayNum={day.dateNum} monthStr={day.monthStr} isToday={isToday} accentColor={MODULE_COLORS.mealplan} />
                  <View style={styles.dayCardItems}>
                    {day.items.length > 0 ? day.items.map((item, i) => {
                      const itemColor = item.type === 'event' ? MODULE_COLORS.home : item.type === 'health' ? MODULE_COLORS.health : item.type === 'pet' ? MODULE_COLORS.pets : item.type === 'trip' ? MODULE_COLORS.trips : MODULE_COLORS.birthdays;
                      const isEmoji = item.type === 'event' && item.icon && item.icon.length <= 2 && /[\u{1F000}-\u{1FFFF}]/u.test(item.icon);
                      return (
                        <View key={i} style={styles.itemRow}>
                          {item.logoUrl ? (
                            <Image source={{ uri: item.logoUrl }} style={styles.itemLogo} />
                          ) : isEmoji ? (
                            <View style={[styles.itemIcon]}>
                              <Text style={{ fontSize: 12 }}>{item.icon}</Text>
                            </View>
                          ) : (
                            <View style={[styles.itemIcon]}>
                              <AppIcon name={item.icon as any} size={16} color={itemColor} />
                            </View>
                          )}
                          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                          {item.time ? <Text style={[styles.itemTime, { color: colors.textSecondary }]}>{item.time}</Text> : null}
                        </View>
                      );
                    }) : (
                      <Text style={[styles.dayEmpty, { color: colors.textDisabled }]}>{t('events.noEventsDay')}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Trips section */}
          {trips.filter(tr => {
            const { start, end } = getWeekRange(new Date());
            return tr.startDate <= toLocalDateStr(end) && tr.endDate >= toLocalDateStr(start);
          }).length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: MODULE_COLORS.trips }]}>
                  <AppIcon name="transport" size={14} color="#fff" />
                </View>
                <Text style={[styles.sectionTitle, { color: MODULE_COLORS.trips }]}>{t('quickCreate.trips')}</Text>
              </View>
              <View style={styles.sectionBody}>
                {trips.filter(tr => {
                  const { start, end } = getWeekRange(new Date());
                  return tr.startDate <= toLocalDateStr(end) && tr.endDate >= toLocalDateStr(start);
                }).map((trip, i) => {
                  const startLabel = new Date(trip.startDate + 'T00:00:00').toLocaleDateString(getLocale(i18nInstance.language), { day: 'numeric', month: 'short' });
                  const endLabel = new Date(trip.endDate + 'T23:59:59').toLocaleDateString(getLocale(i18nInstance.language), { day: 'numeric', month: 'short' });
                  return (
                    <View key={trip.id} style={[styles.tripItem, i < trips.length - 1 && { borderBottomColor: colors.border }]}>
                      <View style={[styles.itemIcon]}>
                        <AppIcon name="transport" size={13} color={MODULE_COLORS.trips} />
                      </View>
                      <Text style={[styles.itemName, { color: colors.text, flex: 1 }]} numberOfLines={1}>{trip.title}</Text>
                      <Text style={[styles.itemTime, { color: colors.textSecondary }]}>{startLabel} – {endLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Matplan */}
          {mealData && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: MODULE_COLORS.mealplan }]}>
                  <AppIcon name="utensils" size={14} color="#fff" />
                </View>
                <Text style={[styles.sectionTitle, { color: MODULE_COLORS.mealplan }]}>{t('mealPlanner.weeklyPlan')}</Text>
                <Text style={[styles.sectionCount, { color: MODULE_COLORS.mealplan }]}>{mealData.plannedCount}/{mealData.totalSlots}</Text>
              </View>
              <View style={styles.sectionBody}>
                {mealData.rows.map((row, i) => (
                  <View key={i} style={[styles.mealRow, i % 2 === 0 && { backgroundColor: '#fafafa' }]}>
                    <Text style={[styles.mealDay, { color: colors.text }]}>{row.day}</Text>
                    <Text style={[styles.mealContent, { color: row.hasMeals ? colors.text : colors.textDisabled }]}>
                      {row.hasMeals ? row.meals.join(' · ') : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 12 },
  statsRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  dayCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden' },
  dayCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10 },
  dayCardItems: { flex: 1, gap: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  itemLogo: { width: 24, height: 24, borderRadius: 6 },
  itemName: { fontSize: 13, fontWeight: '500', flex: 1 },
  itemTime: { fontSize: 12, fontWeight: '600', color: '#999' },
  dayEmpty: { fontSize: 11, fontStyle: 'italic' },
  section: { borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, paddingBottom: 4 },
  sectionIcon: { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  sectionCount: { fontSize: 10, fontWeight: '600' },
  sectionBody: { padding: 0, paddingBottom: 8 },
  tripItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1 },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 10 },
  mealDay: { fontSize: 10, fontWeight: '700', width: 30 },
  mealContent: { fontSize: 10, flex: 1 },
});
