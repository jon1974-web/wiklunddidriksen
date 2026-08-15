import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Alert, Platform, Linking, Animated } from 'react-native';
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
import { MODULE_COLORS } from '../constants/moduleColors';
import { WeeklySummary } from '../components/WeeklySummary';
import { MissedRemindersBanner } from '../components/MissedRemindersBanner';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface EventsScreenProps {
  navigation: any;
}

const EVENT_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];
const TRIP_COLOR = MODULE_COLORS.trips;
const SPOND_COLOR = '#E53935';
const DAY_KEYS = ['days.sun','days.mon','days.tue','days.wed','days.thu','days.fri','days.sat'];

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
  const [filterModule, setFilterModule] = useState<string | null>(null);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal());
  const [visibleDate, setVisibleDate] = useState<string>(getTodayLocal());
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [eventActionModal, setEventActionModal] = useState<{ visible: boolean; title: string; onDelete?: () => void }>({ visible: false, title: '' });
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [minUkeSections, setMinUkeSections] = useState<Record<string, boolean>>({ meals: true });
  const [tripSubcollections, setTripSubcollections] = useState<Record<string, any>>({});
  const user = useUserStore((state) => state.user);
  const scrollY = useRef(0);
  const headerVisible = useRef(true);
  const headerAnim = useRef(new Animated.Value(1)).current;

  const handleScroll = (e: any) => {
    const currentY = e.nativeEvent.contentOffset.y;
    const diff = currentY - scrollY.current;
    if (diff > 10 && currentY > 20 && headerVisible.current) {
      headerVisible.current = false;
      Animated.timing(headerAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else if (diff < -10 && !headerVisible.current) {
      headerVisible.current = true;
      Animated.timing(headerAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
    scrollY.current = currentY;
  };

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
      const dayPetVetVisits = petVetVisits.filter((v) => v.date === selectedDate).map((v) => ({
        ...v, _type: 'healthAppointment' as const, time: v.startTime || '09:00', address: v.location || '', title: v.title, date: v.date, description: v.petId, icon: 'pet-visit',
      }));
      const dayPetVaccinations = petVaccinations.filter((v) => v.date === selectedDate).map((v) => ({
        ...v, _type: 'healthAppointment' as const, time: '09:00', address: v.location || '', title: `${t('pets.vaccinations')}: ${v.name}`, date: v.date, description: v.petId, icon: 'pet-vaccination',
      }));
      let dayItems = [...dayEvents, ...dayTrips, ...daySpond, ...dayHealth, ...dayVaccinations, ...dayPetVetVisits, ...dayPetVaccinations];
      if (filterModule === 'event') dayItems = dayItems.filter((i) => i._type === 'event');
      else if (filterModule === 'health') dayItems = dayItems.filter((i) => i._type === 'healthAppointment');
      else if (filterModule === 'pet') dayItems = dayItems.filter((i) => i._type === 'healthAppointment' && ((i as any).icon === 'pet-visit' || (i as any).icon === 'pet-vaccination'));
      else if (filterModule === 'trip') dayItems = dayItems.filter((i) => i._type === 'trip');
      else if (filterSource && filterSource !== 'app') dayItems = dayItems.filter((i) => i._type === 'spond' && i.groupName === filterSource);
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
      ...petVetVisits.filter(v => v.date).map((v) => ({
        ...v,
        _type: 'healthAppointment' as const,
        time: v.startTime || '09:00',
        address: v.location || '',
        title: v.title,
        date: v.date,
        description: v.petId,
        icon: 'pet-visit',
      })),
      ...petVaccinations.filter(v => v.date).map((v) => ({
        ...v,
        _type: 'healthAppointment' as const,
        time: '09:00',
        address: v.location || '',
        title: `${t('pets.vaccinations')}: ${v.name}`,
        date: v.date,
        description: v.petId,
        icon: 'pet-vaccination',
      })),
    ].filter((i) => getDateStr(i) >= threeMonthsAgo);
    let filtered = allItems;
    if (filterModule === 'event') filtered = allItems.filter((i) => i._type === 'event');
    else if (filterModule === 'health') filtered = allItems.filter((i) => i._type === 'healthAppointment');
    else if (filterModule === 'pet') filtered = allItems.filter((i) => i._type === 'healthAppointment' && ((i as any).icon === 'pet-visit' || (i as any).icon === 'pet-vaccination'));
    else if (filterModule === 'trip') filtered = allItems.filter((i) => i._type === 'trip');
    else if (filterSource && filterSource !== 'app') filtered = allItems.filter((i) => i._type === 'spond' && i.groupName === filterSource);
    else if (filterSource === 'app') filtered = allItems.filter((i) => i._type === 'event' || i._type === 'trip');
    const upcoming = filtered.filter((i) => getDateStr(i) >= today);
    const past = filtered.filter((i) => getDateStr(i) < today);
    return showPastEvents
      ? [...upcoming.sort(sortByDate), ...past.sort(sortByDate).reverse()]
      : upcoming.sort(sortByDate);
  }, [events, trips, spondEvents, viewMode, selectedDate, showPastEvents, today, threeMonthsAgo, filterSource, filterModule]);

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
      const d = item.startDate ? new Date(item.startDate) : null;
      const calDay = d ? d.getDate() : '?';
      const MONTHS_SV = ['JAN','FEB','MAR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DES'];
      const calMonth = d ? MONTHS_SV[d.getMonth()] : '';
      const calDayName = d ? t(DAY_KEYS[d.getDay()]) : '';
      const dateText = item.endDate ? `${formatDate(item.startDate)} – ${formatDate(item.endDate)}` : formatDate(item.startDate);
      return (
        <TouchableOpacity
          style={[styles.spondCard, { backgroundColor: colors.surface, borderLeftColor: TRIP_COLOR }]}
          onPress={() => navigation.navigate('Trips', { screen: 'TripDetail', params: { trip: item } })}
        >
          <View style={styles.spondCardRow}>
            <View style={styles.spondCalIcon}>
              <View style={[styles.spondCalTopBar, { backgroundColor: TRIP_COLOR }]}>
                <Text style={styles.spondCalYear}>{calDayName}</Text>
              </View>
              <Text style={[styles.spondCalDay, { color: colors.text }]}>{calDay}</Text>
              <Text style={[styles.spondCalMonth, { color: colors.textSecondary }]}>{calMonth}</Text>
            </View>
            <View style={styles.spondCardContent}>
              <Text style={[styles.spondCardTitle, { color: colors.text }]} numberOfLines={2}>{item.icon || '✈️'} {item.title}</Text>
              <View style={styles.spondTimeRow}>
                <View style={styles.tripDateIconOuter}>
                  <View style={styles.tripDateIconTop} />
                </View>
                <Text style={[styles.spondCardTime, { color: colors.text }]}>{dateText}</Text>
              </View>
              <Text style={[styles.spondCardAddress, { color: colors.textSecondary }]}>
                📍 {item.city}{item.country ? `, ${item.country}` : ''}
              </Text>
            </View>
            {tripMapUrl && (
              <TouchableOpacity
                style={styles.spondMapContainer}
                onPress={() => Linking.openURL(getGoogleMapsUrl(locationQuery))}
              >
                <Image source={{ uri: tripMapUrl }} style={styles.spondMapImage} />
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
      const calDayName = t(DAY_KEYS[startDate.getDay()]);
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
                <Text style={styles.spondCalYear}>{calDayName}</Text>
              </View>
              <Text style={[styles.spondCalDay, { color: colors.text }]}>{calDay}</Text>
              <Text style={[styles.spondCalMonth, { color: colors.textSecondary }]}>{calMonth}</Text>
            </View>
            <View style={styles.spondCardContent}>
              <View style={styles.spondTitleRow}>
                {item.groupName && spondGroupLogos[item.groupName] ? (
                  <Image source={{ uri: spondGroupLogos[item.groupName] }} style={styles.spondTitleLogo} />
                ) : (
                  <Text style={styles.spondTitleFallback}>🏟️</Text>
                )}
                <Text style={[styles.spondCardTitle, { color: colors.text, flex: 1 }]} numberOfLines={2}>{item.heading}</Text>
              </View>
              {item.groupName && (
                <View style={styles.spondGroupRow}>
                  <Text style={styles.spondTeamIcon}>👥</Text>
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
      const calDayName = d ? t(DAY_KEYS[d.getDay()]) : '';
      const timeText = item.endTime ? `${item.startTime || '09:00'} – ${item.endTime}` : item.startTime || '09:00';
      return (
        <TouchableOpacity
          style={[styles.spondCard, { backgroundColor: colors.surface, borderLeftColor: '#E53935' }]}
          onPress={() => navigation.navigate('Trips', { screen: 'HealthSpace' })}
        >
          <View style={styles.spondCardRow}>
            <View style={styles.spondCalIcon}>
              <View style={[styles.spondCalTopBar, { backgroundColor: '#E53935' }]}>
                <Text style={styles.spondCalYear}>{calDayName}</Text>
              </View>
              <Text style={[styles.spondCalDay, { color: colors.text }]}>{calDay}</Text>
              <Text style={[styles.spondCalMonth, { color: colors.textSecondary }]}>{calMonth}</Text>
            </View>
            <View style={styles.spondCardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppIcon
                  name={item.icon === 'vaccination' || item.icon === 'pet-vaccination' ? 'vaccination' : 'calendar'}
                  size={14}
                  color={(item.icon === 'pet-visit' || item.icon === 'pet-vaccination') ? '#8E24AA' : '#E53935'}
                />
                <Text style={[styles.spondCardTitle, { color: colors.text, flex: 1 }]} numberOfLines={2}>{item.title}</Text>
              </View>
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
            </View>
            {mapUrl && (
              <TouchableOpacity
                style={styles.spondMapContainer}
                onPress={() => Linking.openURL(getGoogleMapsUrl(item.address))}
              >
                <Image source={{ uri: mapUrl }} style={styles.spondMapImage} />
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
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <Animated.View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }], overflow: 'hidden', maxHeight: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }]}>
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
            style={[styles.minUkeButton, { borderColor: MODULE_COLORS.mealplan }]}
            onPress={() => {
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
            <AppIcon name="calendar" size={16} color={MODULE_COLORS.mealplan} />
            <Text style={[styles.minUkeText, { color: MODULE_COLORS.mealplan }]}>{t('events.weeklySummary')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortIconButton, { borderColor: colors.accent }, showSortPanel && { backgroundColor: colors.accent }]}
            onPress={() => setShowSortPanel(!showSortPanel)}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={showSortPanel ? '#fff' : colors.accent} strokeWidth="2.5" strokeLinecap="round">
              <Line x1="4" y1="6" x2="20" y2="6"/>
              <Line x1="4" y1="12" x2="20" y2="12"/>
              <Line x1="4" y1="18" x2="20" y2="18"/>
              <Circle cx="8" cy="6" r="2" fill={showSortPanel ? '#fff' : colors.accent}/>
              <Circle cx="16" cy="12" r="2" fill={showSortPanel ? '#fff' : colors.accent}/>
              <Circle cx="10" cy="18" r="2" fill={showSortPanel ? '#fff' : colors.accent}/>
            </Svg>
          </TouchableOpacity>
          </View>
      </Animated.View>
        {showSortPanel && (
          <View style={[styles.sortPanel, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sortSectionLabel, { color: colors.textSecondary }]}>{t('events.sortBy')}</Text>
            <View style={styles.sortIconRow}>
              <TouchableOpacity
                style={[styles.sortIconBtn, { borderColor: colors.border }, filterModule === 'event' && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => { const v = filterModule === 'event' ? null : 'event'; setFilterModule(v); setShowSortPanel(false); }}
              >
                <AppIcon name="calendar" size={18} color={filterModule === 'event' ? '#fff' : colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortIconBtn, { borderColor: colors.border }, filterModule === 'health' && { backgroundColor: MODULE_COLORS.health, borderColor: MODULE_COLORS.health }]}
                onPress={() => { const v = filterModule === 'health' ? null : 'health'; setFilterModule(v); setShowSortPanel(false); }}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill={filterModule === 'health' ? '#fff' : MODULE_COLORS.health}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Svg>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortIconBtn, { borderColor: colors.border }, filterModule === 'pet' && { backgroundColor: MODULE_COLORS.pets, borderColor: MODULE_COLORS.pets }]}
                onPress={() => { const v = filterModule === 'pet' ? null : 'pet'; setFilterModule(v); setShowSortPanel(false); }}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill={filterModule === 'pet' ? '#fff' : MODULE_COLORS.pets}><circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><ellipse cx="12" cy="18" rx="5" ry="3.5"/></Svg>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortIconBtn, { borderColor: colors.border }, filterModule === 'trip' && { backgroundColor: MODULE_COLORS.trips, borderColor: MODULE_COLORS.trips }]}
                onPress={() => { const v = filterModule === 'trip' ? null : 'trip'; setFilterModule(v); setShowSortPanel(false); }}
              >
                <AppIcon name="transport" size={18} color={filterModule === 'trip' ? '#fff' : MODULE_COLORS.trips} />
              </TouchableOpacity>
            </View>
            {Object.keys(spondGroupLogos).length > 0 && (
              <>
                <Text style={[styles.sortSectionLabel, { color: colors.textSecondary, marginTop: 8 }]}>{t('events.spondGroups')}</Text>
                <View style={styles.sortIconRow}>
                  {Object.entries(spondGroupLogos).map(([groupName, logoUrl]) => (
                    <TouchableOpacity
                      key={groupName}
                      style={[styles.sortIconBtn, { borderColor: colors.border }, filterSource === groupName && { borderColor: colors.accent }]}
                      onPress={() => { const v = filterSource === groupName ? null : groupName; setFilterSource(v); setShowSortPanel(false); }}
                    >
                      <Image source={{ uri: logoUrl }} style={{ width: 20, height: 20, borderRadius: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

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
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
  minUkeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  minUkeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  sortPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
  },
  sortSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sortIconRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sortIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  spondTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spondTitleLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  spondTitleFallback: {
    fontSize: 16,
  },
  spondTeamIcon: {
    fontSize: 12,
  },
  spondCardDates: {
    fontSize: 13,
    marginTop: 3,
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
  tripDateIconOuter: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#999',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 1,
  },
  tripDateIconTop: {
    width: '100%',
    height: 3,
    backgroundColor: '#999',
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
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
