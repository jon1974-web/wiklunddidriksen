import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebCalendar } from '../platform/CalendarView';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { Event, Trip, SpondEvent, SpondRespondent, Birthday, HealthAppointment, HealthMedication, HealthVaccination, PetVetVisit, PetVaccination, PetMedication } from '../types';
import { EventCard } from '../components/EventCard';
import { AppIcon } from '../components/AppIcon';
import { ActionModal } from '../components/ActionModal';
import { SpondResponseModal } from '../components/SpondResponseModal';
import { getWeekNumber, getTodayLocal, formatDate, formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { getTrips, getTripTransport, getTripHotels, getTripRestaurants, getTripActivities, getTripPackingLists } from '../services/tripService';
import { getSpondConfig, getSpondEvents, changeSpondResponse, clearSpondToken } from '../services/spondService';
import { getHealthAppointments, getHealthMedications, getHealthVaccinations } from '../services/healthService';
import { getPets, getAllVetVisits, getAllPetVaccinations, getAllPetMedications } from '../services/petService';
import { getUserProfile } from '../services/familyService';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { WeeklySummary } from '../components/WeeklySummary';
import { MissedRemindersBanner } from '../components/MissedRemindersBanner';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface EventsScreenProps {
  navigation: any;
}

const EVENT_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];
const TRIP_COLOR = '#0097A7';
const SPOND_COLOR = '#E53935';

export const SPOND_GROUP_LOGOS: Record<string, any> = {};

export interface StampDetail {
  name: string;
  status: 'accepted' | 'declined' | 'unanswered';
}

export interface StampStatus {
  type: 'accepted' | 'declined' | 'unanswered' | 'partial';
  details: StampDetail[];
}

export const getEventRespondents = (
  event: SpondEvent,
  respondents: SpondRespondent[]
): SpondRespondent[] => {
  if (!event.responses) return [];
  return respondents.filter(
    (r) =>
      r.groupId === event.groupId &&
      (event.responses!.acceptedIds?.includes(r.spondId) ||
       event.responses!.declinedIds?.includes(r.spondId) ||
       event.responses!.unansweredIds?.includes(r.spondId) ||
       event.responses!.acceptedIds?.includes(r.profileId) ||
       event.responses!.declinedIds?.includes(r.profileId) ||
       event.responses!.unansweredIds?.includes(r.profileId) ||
       (r.childId && (
         event.responses!.acceptedIds?.includes(r.childId) ||
         event.responses!.declinedIds?.includes(r.childId) ||
         event.responses!.unansweredIds?.includes(r.childId)
       ))
      )
  );
};

export const getModalRespondents = (
  event: SpondEvent,
  respondents: SpondRespondent[]
): SpondRespondent[] => {
  if (!event.responses) return [];
  return respondents.filter(
    (r) =>
      r.groupId === event.groupId &&
      (event.responses!.acceptedIds?.includes(r.spondId) ||
       event.responses!.declinedIds?.includes(r.spondId) ||
       event.responses!.unansweredIds?.includes(r.spondId) ||
       event.responses!.acceptedIds?.includes(r.profileId) ||
       event.responses!.declinedIds?.includes(r.profileId) ||
       event.responses!.unansweredIds?.includes(r.profileId))
  );
};

export const getSpondStampStatus = (
  event: SpondEvent,
  respondents: SpondRespondent[]
): StampStatus | null => {
  if (!respondents.length || !event.responses) return null;

  const eventRespondents = getEventRespondents(event, respondents);
  if (!eventRespondents.length) return null;

  const details: StampDetail[] = eventRespondents.map((r) => {
    if (event.responses!.acceptedIds?.includes(r.spondId) || event.responses!.acceptedIds?.includes(r.profileId) || (r.childId && event.responses!.acceptedIds?.includes(r.childId))) {
      return { name: r.firstName, status: 'accepted' };
    }
    if (event.responses!.declinedIds?.includes(r.spondId) || event.responses!.declinedIds?.includes(r.profileId) || (r.childId && event.responses!.declinedIds?.includes(r.childId))) {
      return { name: r.firstName, status: 'declined' };
    }
    return { name: r.firstName, status: 'unanswered' };
  });

  const allAccepted = details.every((d) => d.status === 'accepted');
  const allDeclined = details.every((d) => d.status === 'declined');
  const allUnanswered = details.every((d) => d.status === 'unanswered');

  if (allAccepted) return { type: 'accepted', details };
  if (allDeclined) return { type: 'declined', details };
  if (allUnanswered) return { type: 'unanswered', details };
  return { type: 'partial', details };
};

type UnifiedItem =
  | (Event & { _type: 'event' })
  | (Trip & { _type: 'trip' })
  | (SpondEvent & { _type: 'spond' })
  | (HealthAppointment & { _type: 'healthAppointment' })
  | (PetVetVisit & { _type: 'petVetVisit'; title: string; address?: string; time: string; icon?: string })
  | (PetVaccination & { _type: 'petVaccination'; title: string; address?: string; time: string; icon?: string });

export const EventsScreen: React.FC<EventsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [spondEvents, setSpondEvents] = useState<SpondEvent[]>([]);
  const [spondRespondents, setSpondRespondents] = useState<SpondRespondent[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [healthAppointments, setHealthAppointments] = useState<HealthAppointment[]>([]);
  const [healthMedications, setHealthMedications] = useState<HealthMedication[]>([]);
  const [healthVaccinations, setHealthVaccinations] = useState<HealthVaccination[]>([]);
  const [petVetVisits, setPetVetVisits] = useState<PetVetVisit[]>([]);
  const [petVaccinations, setPetVaccinations] = useState<PetVaccination[]>([]);
  const [petMedications, setPetMedications] = useState<PetMedication[]>([]);
  const [spondConfig, setSpondConfig] = useState<{ email: string; password: string } | null>(null);
  const [spondGroupLogos, setSpondGroupLogos] = useState<Record<string, string>>({});
  const [responseModal, setResponseModal] = useState<{ event: SpondEvent; groupId: string; type: 'accept' | 'decline' } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal());
  const [visibleDate, setVisibleDate] = useState<string>(getTodayLocal());
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [eventActionModal, setEventActionModal] = useState<{ visible: boolean; title: string; onDelete?: () => void }>({ visible: false, title: '' });
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [minUkeSections, setMinUkeSections] = useState<Record<string, boolean>>({ birthdays: true, meals: true, reiser: true });
  const [tripSubcollections, setTripSubcollections] = useState<Record<string, any>>({});
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
  const familyRole = useUserStore((state) => state.familyRole);
  const { colors } = useTheme();

  useEffect(() => {
    if (!familyId) return;
    const q = query(collection(db, 'events'), where('familyId', '==', familyId), orderBy('date'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Event[];
      setEvents(eventsData);
    }, (error) => {
      Alert.alert('Error', getErrorMessage(error));
    });
    return () => unsubscribe();
  }, [familyId]);

  const loadTrips = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getTrips(familyId);
      setTrips(data);
    } catch (error) {
      // Silently fail for trips
    }
  }, [familyId]);

  const loadHealth = useCallback(async () => {
    if (!familyId) return;
    try {
      const [appts, meds, vaccs] = await Promise.all([
        getHealthAppointments(familyId),
        getHealthMedications(familyId),
        getHealthVaccinations(familyId),
      ]);
      setHealthAppointments(appts);
      setHealthMedications(meds);
      setHealthVaccinations(vaccs);
    } catch (error) {
      // Silently fail for health
    }
  }, [familyId]);

  const loadPets = useCallback(async () => {
    if (!familyId) return;
    try {
      const [visits, vaccs, meds] = await Promise.all([
        getAllVetVisits(familyId),
        getAllPetVaccinations(familyId),
        getAllPetMedications(familyId),
      ]);
      setPetVetVisits(visits);
      setPetVaccinations(vaccs);
      setPetMedications(meds);
    } catch (error) {
      // Silently fail for pets
    }
  }, [familyId]);

  useEffect(() => {
    loadTrips();
    loadHealth();
    loadPets();
    const unsubscribe = navigation.addListener('focus', () => { loadTrips(); loadHealth(); loadPets(); });
    return unsubscribe;
  }, [navigation, loadTrips, loadHealth]);

  useEffect(() => {
    if (!familyId) return;
    const q = query(collection(db, 'birthdays'), where('familyId', '==', familyId));
    getDocs(q).then((snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Birthday));
      setBirthdays(data);
    }).catch(() => {});
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !user) return;
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const q = query(collection(db, 'mealPlans'), where('familyId', '==', familyId), where('weekStart', '==', weekStart));
    getDocs(q).then(snap => {
      if (snap.docs.length > 0) setMealPlan({ id: snap.docs[0].id, ...snap.docs[0].data() });
    }).catch(() => {});
    const recipesQ = query(collection(db, 'recipes'), where('familyId', '==', familyId));
    getDocs(recipesQ).then(snap => {
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});
    getUserProfile(user.uid).then(profile => {
      if (profile?.minUkeSections) setMinUkeSections(profile.minUkeSections);
    }).catch(() => {});
  }, [familyId, user?.uid]);

  const loadSpondEvents = useCallback(async () => {
    if (!familyId) { console.log('Spond: no familyId'); return; }
    try {
      const config = await getSpondConfig(familyId);
      console.log('Spond config:', config ? `${config.groups.length} groups, email: ${!!config.email}, pass: ${!!config.password}` : 'null');
      if (config && config.email && config.password && config.groups.length > 0) {
        setSpondConfig({ email: config.email, password: config.password });
        const groupIds = config.groups.map((g) => g.id);
        console.log('Spond groupIds:', groupIds);
        const logos: Record<string, string> = {};
        config.groups.forEach(g => { if (g.logoUrl) logos[g.name] = g.logoUrl; });
        setSpondGroupLogos(logos);
        console.log('Spond logos:', Object.keys(logos));
        let events;
        try {
          events = await getSpondEvents(config.email, config.password, groupIds);
        } catch {
          clearSpondToken();
          events = await getSpondEvents(config.email, config.password, groupIds);
        }
        console.log('Spond events:', events.length);
        const withGroupNames = events.map((e) => {
          const group = config.groups.find((g) => g.id === e.groupId);
          return { ...e, groupName: group?.name };
        });
        setSpondEvents(withGroupNames);

        if (config.respondents && config.respondents.length > 0) {
          setSpondRespondents(config.respondents);
        }
      }
    } catch (e) {
      console.error('Spond load error:', e);
    }
  }, [familyId]);

  useEffect(() => {
    loadSpondEvents();
    const unsubscribe = navigation.addListener('focus', loadSpondEvents);
    return unsubscribe;
  }, [navigation, loadSpondEvents]);

  useEffect(() => {
    if (!showWeeklySummary || trips.length === 0) return;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekTrips = trips.filter(t => {
      const start = new Date(t.startDate + 'T00:00:00');
      const end = new Date(t.endDate + 'T23:59:59');
      return start <= sunday && end >= monday;
    });

    if (weekTrips.length === 0) return;

    const loadAll = async () => {
      const newMap: Record<string, any> = {};
      await Promise.all(weekTrips.map(async (trip) => {
        try {
          const [flights, hotels, restaurants, activities, packingLists] = await Promise.all([
            getTripTransport(trip.id),
            getTripHotels(trip.id),
            getTripRestaurants(trip.id),
            getTripActivities(trip.id),
            getTripPackingLists(trip.id),
          ]);
          newMap[trip.id] = { flights, hotels, restaurants, activities, packingLists };
        } catch {}
      }));
      setTripSubcollections(newMap);
    };
    loadAll();
  }, [showWeeklySummary, trips]);

  const handleDelete = useCallback(async (eventId: string, eventTitle: string) => {
    setEventActionModal({
      visible: true,
      title: eventTitle,
      onDelete: async () => {
        try {
          await deleteDoc(doc(db, 'events', eventId));
        } catch (error) {
          Alert.alert('Error', getErrorMessage(error));
        }
      },
    });
  }, []);

  const today = getTodayLocal();
  const threeMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [today]);

  const calendarMinMax = useMemo(() => {
    const now = new Date();
    const min = new Date(now);
    min.setFullYear(min.getFullYear() - 1);
    const max = new Date(now);
    max.setFullYear(max.getFullYear() + 1);
    return {
      min: `${min.getFullYear()}-${String(min.getMonth() + 1).padStart(2, '0')}-${String(min.getDate()).padStart(2, '0')}`,
      max: `${max.getFullYear()}-${String(max.getMonth() + 1).padStart(2, '0')}-${String(max.getDate()).padStart(2, '0')}`,
    };
  }, []);

  const handleMonthChange = useCallback((year: number, month: number) => {
    const newDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    setVisibleDate(newDate);
  }, []);

  const filteredItems = useMemo(() => {
    const getDateStr = (item: UnifiedItem): string => {
      if (item._type === 'trip') return item.endDate || item.startDate;
      if (item._type === 'spond') return formatSpondDate(item.endTimestamp || item.startTimestamp);
      return item.endDate || item.date;
    };
    const getTimeStr = (item: UnifiedItem): string => {
      if (item._type === 'event') return item.time || '99:99';
      if (item._type === 'spond') {
        const d = new Date(item.startTimestamp);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      return '00:00';
    };
    const sortByDate = (a: UnifiedItem, b: UnifiedItem) => {
      const dateCmp = getDateStr(a).localeCompare(getDateStr(b));
      if (dateCmp !== 0) return dateCmp;
      return getTimeStr(a).localeCompare(getTimeStr(b));
    };

    if (viewMode === 'calendar') {
      const dayEvents = events.filter((e) => {
        const start = e.date;
        const end = e.endDate || e.date;
        return selectedDate >= start && selectedDate <= end;
      }).map((e) => ({ ...e, _type: 'event' as const }));
      const dayTrips = trips.filter((t) => {
        return selectedDate >= t.startDate && selectedDate <= t.endDate;
      }).map((t) => ({ ...t, _type: 'trip' as const }));
      const daySpond = spondEvents.filter((e) => {
        const start = formatSpondDate(e.startTimestamp);
        const end = e.endTimestamp ? formatSpondDate(e.endTimestamp) : start;
        return selectedDate >= start && selectedDate <= end;
      }).map((e) => ({ ...e, _type: 'spond' as const }));
      const dayHealth = healthAppointments.filter((a) => a.date === selectedDate).map((a) => ({
        ...a, _type: 'healthAppointment' as const, time: a.startTime || '09:00', address: a.location || '', title: a.title, date: a.date, description: `${a.person}${a.location ? ' — ' + a.location : ''}`, icon: '🏥',
      }));
      const dayVaccinations = healthVaccinations.filter((v) => v.date === selectedDate).map((v) => ({
        ...v, _type: 'healthAppointment' as const, time: '09:00', address: v.location || '', title: `${t('health.vaccinations')}: ${v.name}`, date: v.date, description: v.person, icon: '💉',
      }));
      let dayItems = [...dayEvents, ...dayTrips, ...daySpond, ...dayHealth, ...dayVaccinations];
      if (filterSource && filterSource !== 'app') dayItems = dayItems.filter((i) => i._type === 'spond' && i.groupName === filterSource);
      else if (filterSource === 'app') dayItems = dayItems.filter((i) => i._type === 'event' || i._type === 'trip');
      dayItems.sort(sortByDate);
      return dayItems;
    }
    const allItems: UnifiedItem[] = [
      ...events.map((e) => ({ ...e, _type: 'event' as const })),
      ...trips.map((t) => ({ ...t, _type: 'trip' as const })),
      ...spondEvents.map((e) => ({ ...e, _type: 'spond' as const })),
      ...healthAppointments.filter(a => a.date).map((a) => ({
        ...a,
        _type: 'healthAppointment' as const,
        time: a.startTime || '09:00',
        address: a.location || '',
        title: a.title,
        date: a.date,
        description: `${a.person}${a.location ? ' — ' + a.location : ''}`,
        icon: '🏥',
      })),
      ...healthVaccinations.filter(v => v.date).map((v) => ({
        ...v,
        _type: 'healthAppointment' as const,
        time: '09:00',
        address: v.location || '',
        title: `${t('health.vaccinations')}: ${v.name}`,
        date: v.date,
        description: v.person,
        icon: '💉',
      })),
    ].filter((i) => getDateStr(i) >= threeMonthsAgo);
    const filtered = filterSource && filterSource !== 'app'
      ? allItems.filter((i) => i._type === 'spond' && i.groupName === filterSource)
      : filterSource === 'app'
      ? allItems.filter((i) => i._type === 'event' || i._type === 'trip')
      : allItems;
    const upcoming = filtered.filter((i) => getDateStr(i) >= today);
    const past = filtered.filter((i) => getDateStr(i) < today);
    return showPastEvents
      ? [...upcoming.sort(sortByDate), ...past.sort(sortByDate).reverse()]
      : upcoming.sort(sortByDate);
  }, [events, trips, spondEvents, viewMode, selectedDate, showPastEvents, today, threeMonthsAgo, filterSource]);

  const hasPastItems = useMemo(() => {
    const getDateStr = (item: UnifiedItem): string => {
      if (item._type === 'trip') return item.endDate || item.startDate;
      if (item._type === 'spond') return formatSpondDate(item.endTimestamp || item.startTimestamp);
      return item.endDate || item.date;
    };
    const allItems: UnifiedItem[] = [
      ...events.map((e) => ({ ...e, _type: 'event' as const })),
      ...trips.map((t) => ({ ...t, _type: 'trip' as const })),
      ...spondEvents.map((e) => ({ ...e, _type: 'spond' as const })),
    ];
    return allItems.some((i) => {
      const ds = getDateStr(i);
      return ds < today && ds >= threeMonthsAgo;
    });
  }, [events, trips, spondEvents, today, threeMonthsAgo]);

  const sortedEvents = filteredItems;

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    events.forEach((event, eventIndex) => {
      const startDate = event.date;
      const endDate = event.endDate || event.date;
      const color = EVENT_COLORS[eventIndex % EVENT_COLORS.length];
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isStart = dateStr === startDate;
        const isEnd = dateStr === endDate;
        
        marks[dateStr] = {
          ...marks[dateStr],
          marked: true,
          dotColor: color,
          color: color,
          startingDay: isStart,
          endingDay: isEnd,
          textColor: '#fff',
        };
      }
    });

    trips.forEach((trip) => {
      const startDate = trip.startDate;
      const endDate = trip.endDate;
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isStart = dateStr === startDate;
        const isEnd = dateStr === endDate;
        
        if (marks[dateStr]) {
          marks[dateStr] = {
            ...marks[dateStr],
            marked: true,
            dotColor: TRIP_COLOR,
          };
        } else {
          marks[dateStr] = {
            marked: true,
            dotColor: TRIP_COLOR,
            color: TRIP_COLOR,
            startingDay: isStart,
            endingDay: isEnd,
            textColor: '#fff',
          };
        }
      }
    });

    spondEvents.forEach((event) => {
      const startStr = formatSpondDate(event.startTimestamp);
      const endStr = event.endTimestamp ? formatSpondDate(event.endTimestamp) : startStr;
      
      const start = new Date(startStr);
      const end = new Date(endStr);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isStart = dateStr === startStr;
        const isEnd = dateStr === endStr;
        
        if (marks[dateStr]) {
          marks[dateStr] = {
            ...marks[dateStr],
            marked: true,
            dotColor: SPOND_COLOR,
          };
        } else {
          marks[dateStr] = {
            marked: true,
            dotColor: SPOND_COLOR,
            color: SPOND_COLOR,
            startingDay: isStart,
            endingDay: isEnd,
            textColor: '#fff',
          };
        }
      }
    });

    // Today highlight
    const todayStr = getTodayLocal();
    marks[todayStr] = { ...marks[todayStr], today: true };

    // Birthday dots
    const BIRTHDAY_COLOR = '#FF69B4';
    birthdays.forEach((b) => {
      const bDate = new Date(b.date);
      const bMonthDay = `${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
      const currentYear = new Date().getFullYear();
      const bThisYear = `${currentYear}-${bMonthDay}`;
      if (!marks[bThisYear]) {
        marks[bThisYear] = { marked: true, dotColor: BIRTHDAY_COLOR };
      } else {
        marks[bThisYear] = { ...marks[bThisYear], marked: true, dotColor: BIRTHDAY_COLOR };
      }
    });

    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.accent };
    return marks;
  }, [events, trips, spondEvents, birthdays, selectedDate, colors.accent]);

  const currentWeek = useMemo(() => getWeekNumber(new Date(selectedDate)), [selectedDate]);

  const calendarTheme = useMemo(() => ({
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textSecondary,
    selectedDayBackgroundColor: colors.accent,
    selectedDayTextColor: '#fff',
    todayTextColor: colors.accent,
    dayTextColor: colors.text,
    textDisabledColor: colors.textDisabled,
    dotColor: colors.accent,
    arrowColor: colors.accent,
    textColor: colors.text,
    accentColor: colors.accent,
  }), [colors.surface, colors.textSecondary, colors.accent, colors.text, colors.textDisabled]);

  const renderItem = useCallback(({ item }: { item: UnifiedItem }) => {
    if (item._type === 'trip') {
      const locationQuery = item.country ? `${item.city}, ${item.country}` : item.city;
      const tripMapUrl = item.city ? getStaticMapUrl(locationQuery) : null;
      return (
        <TouchableOpacity
          style={[styles.tripCard, { backgroundColor: colors.surface, borderLeftColor: TRIP_COLOR }]}
          onPress={() => navigation.navigate('Trips', { screen: 'TripDetail', params: { trip: item } })}
        >
          <View style={styles.tripCardRow}>
            <View style={styles.tripCardContent}>
              <View style={styles.tripCardTitleRow}>
                <Text style={styles.tripCardIcon}>{item.icon || '✈️'}</Text>
                <Text style={[styles.tripCardTitle, { color: colors.text }]}>{item.title}</Text>
              </View>
              <Text style={[styles.tripCardLocation, { color: colors.textSecondary }]}>
                {item.city}{item.country ? `, ${item.country}` : ''}
              </Text>
              <Text style={[styles.tripCardDates, { color: colors.textSecondary }]}>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </Text>
            </View>
            {tripMapUrl && (
              <TouchableOpacity
                style={styles.tripMapContainer}
                onPress={() => Linking.openURL(getGoogleMapsUrl(locationQuery))}
              >
                <Image source={{ uri: tripMapUrl }} style={styles.tripMapImage} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }
    if (item._type === 'spond') {
      const startDate = new Date(item.startTimestamp);
      const calDay = startDate.getDate();
      const MONTHS_SV = ['JAN','FEB','MAR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DES'];
      const calMonth = MONTHS_SV[startDate.getMonth()];
      const calYear = startDate.getFullYear();
      const startTime = formatSpondTimestamp(item.startTimestamp);
      const endTime = item.endTimestamp ? formatSpondTimestamp(item.endTimestamp) : null;
      const timeText = endTime ? `${startTime} – ${endTime}` : startTime;
      const stampStatus = getSpondStampStatus(item, spondRespondents);
      const mapUrl = item.address ? getStaticMapUrl(item.address) : null;

      let badgeBg = '#FFF8E1';
      let badgeColor = '#F57F17';
      let badgeText = '● Ikke svart';
      if (stampStatus?.type === 'accepted') { badgeBg = '#E8F5E9'; badgeColor = '#2E7D32'; badgeText = '✓ Akseptert'; }
      else if (stampStatus?.type === 'declined') { badgeBg = '#FFEBEE'; badgeColor = '#C62828'; badgeText = '✕ Avslått'; }
      else if (stampStatus?.type === 'partial') { badgeBg = '#FFF8E1'; badgeColor = '#F57F17'; badgeText = '● Delvis'; }

      return (
        <TouchableOpacity
          style={[styles.spondCard, { backgroundColor: colors.surface, borderLeftColor: SPOND_COLOR }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('EventDetail_Spond', {
            event: item,
            spondRespondents,
            spondConfig,
            groupLogos: spondGroupLogos,
          })}
        >
          <View style={styles.spondCardRow}>
            <View style={styles.spondCalIcon}>
              <View style={[styles.spondCalTopBar, { backgroundColor: SPOND_COLOR }]}>
                <Text style={styles.spondCalYear}>{calYear}</Text>
              </View>
              <Text style={[styles.spondCalDay, { color: colors.text }]}>{calDay}</Text>
              <Text style={[styles.spondCalMonth, { color: colors.textSecondary }]}>{calMonth}</Text>
            </View>
            <View style={styles.spondCardContent}>
              <Text style={[styles.spondCardTitle, { color: colors.text }]} numberOfLines={2}>{item.heading}</Text>
              {item.groupName && (
                <View style={styles.spondGroupRow}>
                  {spondGroupLogos[item.groupName] ? (
                    <Image source={{ uri: spondGroupLogos[item.groupName] }} style={styles.spondGroupLogo} />
                  ) : (
                    <View style={[styles.spondGroupDot, { backgroundColor: SPOND_COLOR }]}>
                      <Text style={styles.spondGroupDotText}>🏟️</Text>
                    </View>
                  )}
                  <Text style={[styles.spondGroupName, { color: colors.textSecondary }]} numberOfLines={1}>{item.groupName}</Text>
                </View>
              )}
              <View style={styles.spondTimeRow}>
                <View style={styles.spondClockOuter}>
                  <View style={styles.spondClockHandV} />
                  <View style={styles.spondClockHandH} />
                </View>
                <Text style={[styles.spondCardTime, { color: colors.text }]}>{timeText}</Text>
              </View>
              {item.address && (
                <Text style={[styles.spondCardAddress, { color: colors.accent }]} numberOfLines={1}>📍 {item.address}</Text>
              )}
              {stampStatus && (
                <View style={[styles.spondBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.spondBadgeText, { color: badgeColor }]}>{badgeText}</Text>
                </View>
              )}
            </View>
            {mapUrl && (
              <TouchableOpacity style={styles.spondMapContainer} onPress={() => Linking.openURL(getGoogleMapsUrl(item.address!))}>
                <Image source={{ uri: mapUrl }} style={styles.spondMapImage} />
              </TouchableOpacity>
            )}
          </View>
          {stampStatus?.type === 'partial' && stampStatus.details.length > 1 && (
            <View style={styles.spondPartialRow}>
              {stampStatus.details.map((d, i) => (
                <Text key={i} style={[styles.spondPartialName, { color: d.status === 'accepted' ? '#4CAF50' : d.status === 'declined' ? '#E53935' : colors.textDisabled }]}>
                  {d.name}: {d.status === 'accepted' ? '✓' : d.status === 'declined' ? '✕' : '●'}
                </Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    }
    if (item._type === 'healthAppointment') {
      const mapUrl = item.address ? getStaticMapUrl(item.address) : null;
      const d = item.date ? new Date(item.date) : null;
      const calDay = d ? d.getDate() : '?';
      const MONTHS_SV = ['JAN','FEB','MAR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DES'];
      const calMonth = d ? MONTHS_SV[d.getMonth()] : '';
      const calYear = d ? d.getFullYear() : new Date().getFullYear();
      const timeText = item.endTime ? `${item.startTime || '09:00'} – ${item.endTime}` : item.startTime || '09:00';
      return (
        <TouchableOpacity
          style={[styles.tripCard, { backgroundColor: colors.surface, borderLeftColor: '#E53935' }]}
          onPress={() => navigation.navigate('Trips', { screen: 'HealthSpace' })}
        >
          <View style={styles.tripCardRow}>
            <View style={styles.spondCalIcon}>
              <View style={[styles.spondCalTopBar, { backgroundColor: '#E53935' }]}>
                <Text style={styles.spondCalYear}>{calYear}</Text>
              </View>
              <Text style={[styles.spondCalDay, { color: colors.text }]}>{calDay}</Text>
              <Text style={[styles.spondCalMonth, { color: colors.textSecondary }]}>{calMonth}</Text>
            </View>
            <View style={styles.tripCardContent}>
              <Text style={[styles.tripCardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.tripCardLocation, { color: colors.textSecondary }]}>
                {item.person}{item.location ? ` — ${item.location}` : ''}
              </Text>
              <View style={styles.spondTimeRow}>
                <View style={styles.spondClockOuter}>
                  <View style={styles.spondClockHandV} />
                  <View style={styles.spondClockHandH} />
                </View>
                <Text style={[styles.spondCardTime, { color: colors.text }]}>{timeText}</Text>
              </View>
            </View>
            {mapUrl && (
              <TouchableOpacity
                style={styles.tripMapContainer}
                onPress={() => Linking.openURL(getGoogleMapsUrl(item.address))}
              >
                <Image source={{ uri: mapUrl }} style={styles.tripMapImage} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <EventCard
        event={item}
        onPress={() => navigation.navigate('EventDetail', { event: item })}
        onLongPress={() => handleDelete(item.id, item.title)}
        canDelete={item.createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin'}
      />
    );
  }, [navigation, colors, setResponseModal, spondRespondents, spondConfig]);

  const handleSendResponse = useCallback(async (memberIds: string[]) => {
    if (!responseModal || !spondConfig) return;
    const { event: spondEvent, type } = responseModal;
    const accepted = type === 'accept';
    for (const memberId of memberIds) {
      try {
        await changeSpondResponse(spondConfig.email, spondConfig.password, spondEvent.id, memberId, accepted);
      } catch {
        // Continue with next member
      }
    }
    loadSpondEvents();
  }, [responseModal, spondConfig, loadSpondEvents]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="calendar" size={28} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>{t('events.title')}</Text>
          </View>
          <Image source={require('../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 9 }} />
        </View>
        {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary, marginTop: 2 }]}>{familyName}</Text> : null}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleText, { color: viewMode === 'list' ? '#fff' : colors.textSecondary }]}>{t('events.listView')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('calendar')}
          >
            <Text style={[styles.toggleText, { color: viewMode === 'calendar' ? '#fff' : colors.textSecondary }]}>{t('events.calendarView')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: TRIP_COLOR }]}
            onPress={() => {
              // Re-fetch mealPlan and recipes
              if (familyId) {
                const now = new Date();
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(now);
                monday.setDate(diff);
                const ws = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
                const q = query(collection(db, 'mealPlans'), where('familyId', '==', familyId), where('weekStart', '==', ws));
                getDocs(q).then(snap => {
                  if (snap.docs.length > 0) setMealPlan({ id: snap.docs[0].id, ...snap.docs[0].data() });
                }).catch(() => {});
                const recipesQ = query(collection(db, 'recipes'), where('familyId', '==', familyId));
                getDocs(recipesQ).then(snap => {
                  setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }).catch(() => {});
              }
              if (user) {
                getUserProfile(user.uid).then(profile => {
                  if (profile?.minUkeSections) setMinUkeSections(profile.minUkeSections);
                }).catch(() => {});
              }
              setShowWeeklySummary(true);
            }}
          >
            <Text style={[styles.toggleText, { color: '#fff' }]}>{t('events.weeklySummary')}</Text>
          </TouchableOpacity>
        </View>
        {spondGroupLogos && Object.keys(spondGroupLogos).length > 0 && (
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 8, paddingBottom: 4, paddingHorizontal: 16 }}>
            <TouchableOpacity
              style={[styles.filterIcon, filterSource === 'app' && { borderColor: colors.accent }]}
              onPress={() => setFilterSource(filterSource === 'app' ? null : 'app')}
            >
              <View style={[styles.filterIconCircle, { backgroundColor: colors.accent }, filterSource === 'app' && styles.filterIconCircleActive]} />
            </TouchableOpacity>
            {Object.entries(spondGroupLogos).map(([groupName, logoUrl]) => (
              <TouchableOpacity
                key={groupName}
                style={[styles.filterIcon, filterSource === groupName && { borderColor: colors.accent }]}
                onPress={() => setFilterSource(filterSource === groupName ? null : groupName)}
              >
                <Image source={{ uri: logoUrl }} style={[styles.filterIconImg, filterSource === groupName && styles.filterIconImgActive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <MissedRemindersBanner navigation={navigation} />

      {viewMode === 'calendar' && (
        <View style={[styles.calendarContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.weekNumberContainer}>
            <Text style={[styles.weekNumber, { color: colors.textSecondary }]}>{t('weekdays.week')} {currentWeek}</Text>
          </View>
          <WebCalendar
            current={visibleDate}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            markingType="period"
            onMonthChange={handleMonthChange}
            minDate={calendarMinMax.min}
            maxDate={calendarMinMax.max}
            theme={calendarTheme}
            lang={i18n.language}
          />
        </View>
      )}

      <FlatList
        data={sortedEvents}
        renderItem={renderItem}
        keyExtractor={(item) => `${item._type}-${item.id}`}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>
            {viewMode === 'calendar'
              ? t('events.noEventsDay')
              : t('events.noEvents')}
          </Text>
        }
        ListFooterComponent={
          viewMode === 'list' && hasPastItems ? (
            <TouchableOpacity
              style={styles.showPastButton}
              onPress={() => setShowPastEvents(!showPastEvents)}
            >
              <Text style={[styles.showPastText, { color: colors.accent }]}>
                {showPastEvents ? t('events.hidePast') : t('events.pastEvents')}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fabMic, { backgroundColor: colors.accent }]}
        onPress={() => navigation.navigate('VoiceEvent')}
      >
        <Text style={styles.fabMicText}>🎙️</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fabCamera, { backgroundColor: colors.accent }]}
        onPress={() => navigation.navigate('PhotoEvent')}
      >
        <Text style={styles.fabMicText}>📷</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => navigation.navigate('AddEvent')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {responseModal && spondConfig && (
        <SpondResponseModal
          visible={true}
          type={responseModal.type}
          members={getModalRespondents(responseModal.event, spondRespondents)
            .map((r) => ({ id: r.spondId, firstName: r.firstName, lastName: r.lastName }))}
          onSend={handleSendResponse}
          onClose={() => setResponseModal(null)}
        />
      )}

      <WeeklySummary
        visible={showWeeklySummary}
        onClose={() => setShowWeeklySummary(false)}
        events={events}
        trips={trips}
        spondEvents={spondEvents}
        birthdays={birthdays}
        mealPlan={mealPlan}
        recipes={recipes}
        sectionSettings={minUkeSections}
        groupLogos={spondGroupLogos}
        tripSubcollections={tripSubcollections}
        healthAppointments={healthAppointments}
        healthMedications={healthMedications}
        healthVaccinations={healthVaccinations}
        petVetVisits={petVetVisits}
        petVaccinations={petVaccinations}
        petMedications={petMedications}
      />

      <ActionModal
        visible={eventActionModal.visible}
        title={eventActionModal.title}
        onDelete={eventActionModal.onDelete}
        onCancel={() => setEventActionModal({ visible: false, title: '' })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  familySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 36,
    marginTop: -8,
    marginBottom: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  toggleText: {
    fontSize: 14,
  },
  filterIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  filterIconActive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderColor: '#333',
  },
  filterIconImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  filterIconImgActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  filterIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
  },
  filterIconCircleActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  calendarContainer: {
    paddingBottom: 8,
  },
  weekNumberContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  weekNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
  showPastButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  showPastText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tripCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: TRIP_COLOR,
  },
  tripCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripCardIcon: {
    fontSize: 22,
  },
  tripCardContent: {
    flex: 1,
    gap: 2,
  },
  tripCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripCardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tripCardLocation: {
    fontSize: 14,
  },
  tripCardDates: {
    fontSize: 14,
  },
  tripMapContainer: {
    marginLeft: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tripMapImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  spondCard: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  spondCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  spondCalIcon: {
    width: 64,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  spondCalTopBar: {
    width: '100%',
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spondCalYear: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  spondCalDay: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 2,
  },
  spondCalMonth: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  spondCardContent: {
    flex: 1,
    gap: 2,
  },
  spondCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  spondGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  spondGroupLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  spondGroupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spondGroupDotText: {
    fontSize: 8,
  },
  spondGroupName: {
    fontSize: 12,
  },
  spondTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  spondClockOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spondClockHandV: {
    position: 'absolute',
    width: 1.5,
    height: 3.5,
    backgroundColor: '#999',
    top: 2,
    borderRadius: 1,
  },
  spondClockHandH: {
    position: 'absolute',
    width: 3,
    height: 1.5,
    backgroundColor: '#999',
    left: 4.5,
    top: 5.5,
    borderRadius: 1,
  },
  spondCardTime: {
    fontSize: 15,
    fontWeight: '700',
  },
  spondCardAddress: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  spondBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  spondBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  spondMapContainer: {
    marginLeft: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  spondMapImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  spondPartialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  spondPartialName: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 30,
    textAlign: 'center',
  },
  fabMic: {
    position: 'absolute',
    right: 20,
    bottom: 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabMicText: {
    fontSize: 24,
  },
  fabCamera: {
    position: 'absolute',
    right: 20,
    bottom: 156,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
