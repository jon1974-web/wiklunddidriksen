import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Image, Platform } from 'react-native';
import { Event, Trip, SpondEvent, Birthday, MealPlan, Recipe, HealthAppointment, HealthMedication, HealthVaccination, PetVetVisit, PetVaccination, PetMedication, SchoolHoliday, SchoolChild, KindergartenChild, SchoolActivity, KindergartenActivity, HomeService, WeatherDay } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getWeekNumber, formatTime, formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getLocale } from '../constants/languages';
import { AppIcon } from './AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import Svg, { Line } from 'react-native-svg';
import { getForecast, geocodeCity, reverseGeocode, wmoToEmoji, getHistoricalWeather } from '../services/weatherService';

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
  schoolHolidays?: SchoolHoliday[];
  kindergartenHolidays?: SchoolHoliday[];
  schoolActivities?: SchoolActivity[];
  kindergartenActivities?: KindergartenActivity[];
  schoolChildren?: SchoolChild[];
  kindergartenChildren?: KindergartenChild[];
  homeServices?: HomeService[];
  homeAddress?: string;
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

export const WeeklySummary: React.FC<WeeklySummaryProps> = React.memo(({ visible, onClose, events, trips, spondEvents, birthdays = [], mealPlan = null, recipes = [], groupLogos = {}, healthAppointments = [], healthMedications = [], healthVaccinations = [], petVetVisits = [], petVaccinations = [], petMedications = [], sectionSettings = {}, schoolHolidays = [], kindergartenHolidays = [], schoolChildren = [], kindergartenChildren = [], schoolActivities = [], kindergartenActivities = [], homeServices = [], homeAddress }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { colors } = useTheme();
  const [langKey, setLangKey] = useState(0);
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setLangKey(k => k + 1);
    i18nInstance.on('languageChanged', handler);
    return () => i18nInstance.off('languageChanged', handler);
  }, [i18nInstance]);

  // Fetch weather when modal opens
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const fetchWeather = async () => {
      let lat: number | null = null;
      let lon: number | null = null;

      // Step 1: Try browser Geolocation
      if (Platform.OS === 'web' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: false });
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        } catch {}
      }

      // Step 2: Fallback to home address
      if (lat === null && homeAddress) {
        const coords = await geocodeCity(homeAddress);
        if (coords && !cancelled) {
          lat = coords.latitude;
          lon = coords.longitude;
        }
      }

      if (lat === null || lon === null || cancelled) return;

      // Get city name + forecast + historical in parallel
      const { start: weekStart } = getWeekRange(new Date());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      const [name, forecast, historical] = await Promise.all([
        reverseGeocode(lat, lon),
        getForecast(lat, lon, 10),
        todayDate > weekStart ? getHistoricalWeather(lat, lon, toLocalDateStr(weekStart), toLocalDateStr(todayDate < weekEnd ? todayDate : weekEnd)) : Promise.resolve([]),
      ]);

      if (!cancelled) {
        setCityName(name);
        // Merge: historical for past days, forecast for today+future
        const merged = [...historical, ...forecast];
        const unique = merged.filter((w, i, arr) => arr.findIndex(x => x.date === w.date) === i);
        setWeather(unique);
      }
    };

    fetchWeather();
    return () => { cancelled = true; };
  }, [visible, homeAddress]);

  const today = useMemo(() => new Date(), [visible]);
  const todayStr = toLocalDateStr(today);

  const weekData = useMemo(() => {
    const now = new Date();
    const { start, end } = getWeekRange(now);
    const weekNum = getWeekNumber(now);

    const weekStr = toLocalDateStr(start);
    const endStr = toLocalDateStr(end);
    const startStr = weekStr;

    // Count stats
    let eventCount = 0;
    let healthCount = 0;
    let petCount = 0;
    let tripCount = 0;
    let birthdayCount = 0;
    let holidayCount = 0;
    let schoolActivityCount = 0;
    let kindergartenActivityCount = 0;
    let homeServiceCount = 0;

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
        if ((a.dateFrom || a.date) === dateStr) {
          const time = a.endTime ? `${a.startTime || ''} – ${a.endTime}` : a.startTime || '';
          items.push({ type: 'health', icon: 'medication', iconBg: '#FFEBEE', title: `${a.title} — ${a.person}`, time });
          healthCount++;
        }
      });
      healthVaccinations.forEach((v) => {
        if ((v.dateFrom || v.date) === dateStr) {
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
        if ((v.dateFrom || v.date) === dateStr) {
          const time = v.endTime ? `${v.startTime || ''} – ${v.endTime}` : v.startTime || '';
          items.push({ type: 'pet', icon: 'pet', iconBg: '#F3E5F5', title: `${v.title} — ${v.petId}`, time });
          petCount++;
        }
      });
      petVaccinations.forEach((v) => {
        if ((v.dateFrom || v.date) === dateStr) {
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
          if (dateStr === tr.startDate || (dateStr > tr.startDate && dateStr === startStr)) tripCount++;
        }
      });

      // School holidays
      schoolHolidays.forEach((h) => {
        if (dateStr >= h.dateFrom && dateStr <= (h.dateTo || h.dateFrom)) {
          const child = schoolChildren.find(c => c.id === h.childId);
          const firstName = child ? child.name.split(' ')[0] : '';
          const time = h.timeFrom ? `${h.timeFrom} – ${h.timeTo || ''}` : '';
          items.push({ type: 'schoolHoliday', icon: 'school', iconBg: MODULE_COLORS.school, title: `${h.title}${firstName ? ` — ${firstName}` : ''}`, time });
          holidayCount++;
        }
      });
      // Kindergarten holidays
      kindergartenHolidays.forEach((h) => {
        if (dateStr >= h.dateFrom && dateStr <= (h.dateTo || h.dateFrom)) {
          const child = kindergartenChildren.find(c => c.id === h.childId);
          const firstName = child ? child.name.split(' ')[0] : '';
          const time = h.timeFrom ? `${h.timeFrom} – ${h.timeTo || ''}` : '';
          items.push({ type: 'kindergartenHoliday', icon: 'kindergarten', iconBg: MODULE_COLORS.kindergarten, title: `${h.title}${firstName ? ` — ${firstName}` : ''}`, time });
          holidayCount++;
        }
      });

      // School activities
      schoolActivities.forEach((a) => {
        if (a.dateFrom === dateStr || (a.dateTo && dateStr >= a.dateFrom && dateStr <= a.dateTo)) {
          const typeLabel = a.activityType === 'tur' ? t('school.activityTypeTur') : a.activityType === 'aktivitet' ? t('school.activityTypeAktivitet') : t('school.activityTypeMøte');
          const time = a.startTime ? (a.endTime ? `${a.startTime} – ${a.endTime}` : a.startTime) : '';
          items.push({ type: 'schoolActivity', icon: 'school', iconBg: MODULE_COLORS.school, title: `${a.title} (${typeLabel})`, time });
          schoolActivityCount++;
        }
      });

      // Kindergarten activities
      kindergartenActivities.forEach((a) => {
        if (a.dateFrom === dateStr || (a.dateTo && dateStr >= a.dateFrom && dateStr <= a.dateTo)) {
          const typeLabel = a.activityType === 'tur' ? t('school.activityTypeTur') : a.activityType === 'aktivitet' ? t('school.activityTypeAktivitet') : t('school.activityTypeMøte');
          const time = a.startTime ? (a.endTime ? `${a.startTime} – ${a.endTime}` : a.startTime) : '';
          items.push({ type: 'kindergartenActivity', icon: 'kindergarten', iconBg: MODULE_COLORS.kindergarten, title: `${a.title} (${typeLabel})`, time });
          kindergartenActivityCount++;
        }
      });

      // Home services
      homeServices.forEach((s) => {
        const end = s.dateTo || s.dateFrom;
        if (dateStr >= s.dateFrom && dateStr <= end) {
          const time = s.endTime ? `${s.startTime || ''} – ${s.endTime}` : s.startTime || '';
          items.push({ type: 'homeService', icon: 'vedlikehold', iconBg: MODULE_COLORS.home, title: s.title, time });
          homeServiceCount++;
        }
      });

      // Sort: events/activities/trips by startTime first, then health/pet/holidays, then birthdays at bottom
      const birthdaysItems = items.filter(i => i.type === 'birthday');
      const otherItems = items.filter(i => i.type !== 'birthday');
      otherItems.sort((a, b) => {
        const timeA = a.time || 'zz';
        const timeB = b.time || 'zz';
        return timeA.localeCompare(timeB);
      });
      items.length = 0;
      items.push(...otherItems, ...birthdaysItems);

      days.push({
        date: d,
        dayName: DAY_NAMES_NB[i],
        dayNameShort: t(DAY_NAMES_KEY[i]),
        dateNum: d.getDate(),
        monthStr: MONTHS[d.getMonth()],
        items,
      });
    }

    return { weekNum, days, eventCount, healthCount, petCount, tripCount, birthdayCount, holidayCount, schoolActivityCount, kindergartenActivityCount, homeServiceCount, startLabel: start.toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'long' }), endLabel: end.toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'long', year: 'numeric' }) };
  }, [events, trips, spondEvents, birthdays, healthAppointments, healthVaccinations, petVetVisits, petVaccinations, schoolHolidays, kindergartenHolidays, schoolChildren, kindergartenChildren, schoolActivities, kindergartenActivities, homeServices, t, i18nInstance, langKey]);

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
            {cityName && weather.length > 0 && (
              <Text style={[styles.headerWeather, { color: MODULE_COLORS.trips }]}>
                {cityName} · {wmoToEmoji(weather[0].weatherCode)} {weather[0].tempMin}°/{weather[0].tempMax}°
              </Text>
            )}
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
            {weekData.eventCount > 0 && <StatChip count={weekData.eventCount} label={t('weekly.events')} color={MODULE_COLORS.home} />}
            {weekData.healthCount > 0 && <StatChip count={weekData.healthCount} label={t('health.title')} color={MODULE_COLORS.health} />}
            {weekData.petCount > 0 && <StatChip count={weekData.petCount} label={t('pets.title')} color={MODULE_COLORS.pets} />}
            {weekData.tripCount > 0 && <StatChip count={weekData.tripCount} label={t('weekly.trips')} color={MODULE_COLORS.trips} />}
            {weekData.schoolActivityCount > 0 && <StatChip count={weekData.schoolActivityCount} label={t('weekly.schoolActivities')} color={MODULE_COLORS.school} />}
            {weekData.kindergartenActivityCount > 0 && <StatChip count={weekData.kindergartenActivityCount} label={t('weekly.kindergartenActivities')} color={MODULE_COLORS.kindergarten} />}
            {weekData.homeServiceCount > 0 && <StatChip count={weekData.homeServiceCount} label={t('homes.service')} color={MODULE_COLORS.home} />}
            {weekData.birthdayCount > 0 && <StatChip count={weekData.birthdayCount} label={t('birthdays.title')} color={MODULE_COLORS.birthdays} />}
          </View>

          {/* Day cards */}
          {weekData.days.map((day, idx) => {
            const isToday = toLocalDateStr(day.date) === todayStr;
            return (
              <View key={idx} style={[styles.dayCard, isToday && { borderColor: colors.accent, borderWidth: 2 }]}>
                <View style={styles.dayCardHeader}>
                  <CalendarIcon dayName={day.dayName} dayNum={day.dateNum} monthStr={day.monthStr} isToday={isToday} accentColor={colors.accent} />
                  <View style={styles.dayCardItems}>
                    {day.items.length > 0 ? day.items.map((item, i) => {
                      const itemColor = item.type === 'event' ? MODULE_COLORS.home : item.type === 'health' ? MODULE_COLORS.health : item.type === 'pet' ? MODULE_COLORS.pets : item.type === 'trip' ? MODULE_COLORS.trips : item.type === 'schoolHoliday' ? MODULE_COLORS.school : item.type === 'schoolActivity' ? MODULE_COLORS.school : item.type === 'kindergartenActivity' ? MODULE_COLORS.kindergarten : item.type === 'kindergartenHoliday' ? MODULE_COLORS.kindergarten : item.type === 'homeService' ? MODULE_COLORS.home : MODULE_COLORS.birthdays;
                      const isEmoji = item.icon && item.icon.length <= 2 && /[\u{1F000}-\u{1FFFF}]/u.test(item.icon);
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
                {(() => {
                  const dayDateStr = toLocalDateStr(day.date);
                  const dayWeather = weather.find(w => w.date === dayDateStr);
                  if (dayWeather) {
                    return (
                      <View style={styles.weatherRow}>
                        <Text style={styles.weatherEmoji}>{wmoToEmoji(dayWeather.weatherCode)}</Text>
                        <Text style={[styles.weatherTemp, { color: colors.text }]}>{dayWeather.tempMin}° / {dayWeather.tempMax}°</Text>
                        <Text style={[styles.weatherDetail, { color: colors.textSecondary }]}>
                          {dayWeather.precipitationProbability != null && dayWeather.precipitationProbability > 0 ? `🌧 ${dayWeather.precipitationProbability}%` : ''}
                          {dayWeather.windSpeed != null && dayWeather.windSpeed > 0 ? ` 💨${dayWeather.windSpeed}` : ''}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}
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
  headerWeather: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 12 },
  statsRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  dayCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden' },
  dayCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10 },
  weatherChip: { alignItems: 'center', marginBottom: 4 },
  weatherEmoji: { fontSize: 14 },
  weatherTemp: { fontSize: 10, fontWeight: '600', color: '#666' },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  weatherDetail: { fontSize: 10 },
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
