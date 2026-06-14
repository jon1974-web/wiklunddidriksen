import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebCalendar } from '../platform/CalendarView';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { Event, Trip, SpondEvent, SpondRespondent } from '../types';
import { EventCard } from '../components/EventCard';
import { SpondResponseModal } from '../components/SpondResponseModal';
import { getWeekNumber, getTodayLocal, formatDate, formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { getTrips } from '../services/tripService';
import { getSpondConfig, getSpondEvents, changeSpondResponse } from '../services/spondService';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { WeeklySummary } from '../components/WeeklySummary';
import { MissedRemindersBanner } from '../components/MissedRemindersBanner';

interface EventsScreenProps {
  navigation: any;
}

const EVENT_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];
const TRIP_COLOR = '#0097A7';
const SPOND_COLOR = '#E53935';

export const SPOND_GROUP_LOGOS: Record<string, any> = {
  'BSK Fotball J2010/2011': require('../../assets/Bekkelaget logo.png'),
  'Surprise 25/26': require('../../assets/Viqueens logo.png'),
};

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
  | (SpondEvent & { _type: 'spond' });

export const EventsScreen: React.FC<EventsScreenProps> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [spondEvents, setSpondEvents] = useState<SpondEvent[]>([]);
  const [spondRespondents, setSpondRespondents] = useState<SpondRespondent[]>([]);
  const [spondConfig, setSpondConfig] = useState<{ email: string; password: string } | null>(null);
  const [responseModal, setResponseModal] = useState<{ event: SpondEvent; groupId: string; type: 'accept' | 'decline' } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal());
  const [visibleDate, setVisibleDate] = useState<string>(getTodayLocal());
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
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

  // One-time migration: add familyId to existing documents
  useEffect(() => {
    if (!user) return;
    const key = 'familyIdMigrationDone';
    const alreadyDone = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (alreadyDone) return;
    (async () => {
      try {
        const { migrateAddFamilyId } = await import('../utils/migrate');
        await migrateAddFamilyId();
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, '1');
      } catch {
        // Silently fail — will retry next load
      }
    })();
  }, [user]);

  const loadTrips = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getTrips(familyId);
      setTrips(data);
    } catch (error) {
      // Silently fail for trips
    }
  }, [familyId]);

  useEffect(() => {
    loadTrips();
    const unsubscribe = navigation.addListener('focus', loadTrips);
    return unsubscribe;
  }, [navigation, loadTrips]);

  const loadSpondEvents = useCallback(async () => {
    if (!familyId) return;
    try {
      const config = await getSpondConfig(familyId);
      if (config && config.email && config.password && config.groups.length > 0) {
        setSpondConfig({ email: config.email, password: config.password });
        const groupIds = config.groups.map((g) => g.id);
        const events = await getSpondEvents(config.email, config.password, groupIds);
        const withGroupNames = events.map((e) => {
          const group = config.groups.find((g) => g.id === e.groupId);
          return { ...e, groupName: group?.name };
        });
        setSpondEvents(withGroupNames);

        if (config.respondents && config.respondents.length > 0) {
          setSpondRespondents(config.respondents);
        }
      }
    } catch {
      // Silently fail for Spond
    }
  }, [familyId]);

  useEffect(() => {
    loadSpondEvents();
    const unsubscribe = navigation.addListener('focus', loadSpondEvents);
    return unsubscribe;
  }, [navigation, loadSpondEvents]);

  const handleDelete = useCallback(async (eventId: string) => {
    Alert.alert('Slett arrangement', 'Er du sikker på at du vil slette dette?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'events', eventId));
          } catch (error) {
            Alert.alert('Error', getErrorMessage(error));
          }
        },
      },
    ]);
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
      let dayItems = [...dayEvents, ...dayTrips, ...daySpond];
      if (filterSource === 'viqueens') dayItems = dayItems.filter((i) => i._type === 'spond' && i.groupName === 'Surprise 25/26');
      else if (filterSource === 'bekkelaget') dayItems = dayItems.filter((i) => i._type === 'spond' && i.groupName === 'BSK Fotball J2010/2011');
      else if (filterSource === 'app') dayItems = dayItems.filter((i) => i._type === 'event' || i._type === 'trip');
      dayItems.sort(sortByDate);
      return dayItems;
    }
    const allItems: UnifiedItem[] = [
      ...events.map((e) => ({ ...e, _type: 'event' as const })),
      ...trips.map((t) => ({ ...t, _type: 'trip' as const })),
      ...spondEvents.map((e) => ({ ...e, _type: 'spond' as const })),
    ].filter((i) => getDateStr(i) >= threeMonthsAgo);
    const filtered = filterSource === 'viqueens'
      ? allItems.filter((i) => i._type === 'spond' && i.groupName === 'Surprise 25/26')
      : filterSource === 'bekkelaget'
      ? allItems.filter((i) => i._type === 'spond' && i.groupName === 'BSK Fotball J2010/2011')
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

    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.accent };
    return marks;
  }, [events, trips, spondEvents, selectedDate, colors.accent]);

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
          style={[styles.tripCard, { backgroundColor: colors.surface }]}
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
      const startDate = formatSpondDate(item.startTimestamp);
      const endDate = item.endTimestamp ? formatSpondDate(item.endTimestamp) : null;
      const dateText = endDate
        ? `${formatDate(startDate)} - ${formatDate(endDate)}`
        : formatDate(startDate);
      const startTime = formatSpondTimestamp(item.startTimestamp);
      const endTime = item.endTimestamp ? formatSpondTimestamp(item.endTimestamp) : null;
      const timeText = endTime ? `${startTime} - ${endTime}` : startTime;
      const accepted = item.responses?.acceptedIds?.length || 0;
      const declined = item.responses?.declinedIds?.length || 0;
      const unanswered = item.responses?.unansweredIds?.length || 0;
      const stampStatus = getSpondStampStatus(item, spondRespondents);
      return (
        <View style={[styles.spondCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.spondCardContent}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EventDetail_Spond', {
              event: item,
              spondRespondents,
              spondConfig,
            })}
          >
            <View style={styles.spondCardTitleRow}>
              {item.groupName && SPOND_GROUP_LOGOS[item.groupName] ? (
                <Image source={SPOND_GROUP_LOGOS[item.groupName]} style={styles.spondCardLogo} />
              ) : (
                <Text style={styles.spondCardIcon}>🏟️</Text>
              )}
              <Text style={[styles.spondCardTitle, { color: colors.text }]} numberOfLines={2}>{item.heading}</Text>
            </View>
            {item.description && (
              <Text style={[styles.spondCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
            )}
            <Text style={[styles.spondCardDates, { color: colors.textSecondary }]}>
              {dateText}{timeText ? ` · ${timeText}` : ''}
            </Text>
            {item.address && (
              <Text style={[styles.spondCardAddress, { color: colors.accent }]} numberOfLines={1}>{item.address}</Text>
            )}
          </TouchableOpacity>
          {item.responses && (
            <Text style={styles.spondCardResponseCounts}>
              <Text style={{ color: '#4CAF50' }}>{accepted} akseptert</Text>
              <Text style={{ color: colors.textDisabled }}> · </Text>
              <Text style={{ color: '#E53935' }}>{declined} avslått</Text>
              <Text style={{ color: colors.textDisabled }}> · </Text>
              <Text style={{ color: '#C8A96E' }}>{unanswered} ikke svart</Text>
            </Text>
          )}
          {item.groupId && (
            <View style={styles.spondCardIconsRow}>
              <TouchableOpacity
                style={[styles.spondIconBtn, { backgroundColor: colors.accentLight }]}
                onPress={() => setResponseModal({ event: item, groupId: item.groupId!, type: 'accept' })}
              >
                <Text style={styles.spondIconText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.spondIconBtn, { backgroundColor: '#FFEBEE' }]}
                onPress={() => setResponseModal({ event: item, groupId: item.groupId!, type: 'decline' })}
              >
                <Text style={[styles.spondIconText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {stampStatus?.type === 'accepted' && (
            <View style={styles.spondStampAccepted} pointerEvents="none">
              <Text style={styles.spondStampTextAccepted}>AKSEPTERT</Text>
            </View>
          )}
          {stampStatus?.type === 'declined' && (
            <View style={styles.spondStampDeclined} pointerEvents="none">
              <Text style={styles.spondStampTextDeclined}>AVSLÅTT</Text>
            </View>
          )}
          {stampStatus?.type === 'unanswered' && (
            <View style={styles.spondStampUnanswered} pointerEvents="none">
              <Text style={styles.spondStampTextUnanswered}>IKKE SVART</Text>
            </View>
          )}
          {stampStatus?.type === 'partial' && (
            <View style={styles.spondStampPartial} pointerEvents="none">
              <Text style={styles.spondStampTextPartial}>DELVIS</Text>
              {stampStatus.details.length > 1 && (
                <View style={styles.spondStampNames}>
                  {stampStatus.details.map((d, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.spondStampName,
                        { color: d.status === 'accepted' ? '#4CAF50' : d.status === 'declined' ? '#E53935' : colors.textDisabled },
                      ]}
                    >
                      {d.name}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      );
    }
    return (
      <EventCard
        event={item}
        onPress={() => navigation.navigate('EventDetail', { event: item })}
        onLongPress={() => handleDelete(item.id)}
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
        <Text style={[styles.title, { color: colors.text }]}>📅 Arrangementer</Text>
        {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary }]}>{familyName}</Text> : null}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleText, { color: viewMode === 'list' ? '#fff' : colors.textSecondary }]}>Liste</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('calendar')}
          >
            <Text style={[styles.toggleText, { color: viewMode === 'calendar' ? '#fff' : colors.textSecondary }]}>Kalender</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: TRIP_COLOR }]}
            onPress={() => setShowWeeklySummary(true)}
          >
            <Text style={[styles.toggleText, { color: '#fff' }]}>Din uke</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.filterIcon, filterSource === 'viqueens' && styles.filterIconActive]}
            onPress={() => setFilterSource(filterSource === 'viqueens' ? null : 'viqueens')}
          >
            <Image source={SPOND_GROUP_LOGOS['Surprise 25/26']} style={[styles.filterIconImg, filterSource === 'viqueens' && styles.filterIconImgActive]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterIcon, filterSource === 'bekkelaget' && styles.filterIconActive]}
            onPress={() => setFilterSource(filterSource === 'bekkelaget' ? null : 'bekkelaget')}
          >
            <Image source={SPOND_GROUP_LOGOS['BSK Fotball J2010/2011']} style={[styles.filterIconImg, filterSource === 'bekkelaget' && styles.filterIconImgActive]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterIcon, filterSource === 'app' && styles.filterIconActive]}
            onPress={() => setFilterSource(filterSource === 'app' ? null : 'app')}
          >
            <View style={[styles.filterIconCircle, filterSource === 'app' && styles.filterIconCircleActive]} />
          </TouchableOpacity>
        </View>
      </View>

      <MissedRemindersBanner />

      {viewMode === 'calendar' && (
        <View style={[styles.calendarContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.weekNumberContainer}>
            <Text style={[styles.weekNumber, { color: colors.textSecondary }]}>Uke {currentWeek}</Text>
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
              ? 'Ingen arrangementer på denne dagen'
              : 'Ingen kommende arrangementer. Legg til et nytt!'}
          </Text>
        }
        ListFooterComponent={
          viewMode === 'list' && hasPastItems ? (
            <TouchableOpacity
              style={styles.showPastButton}
              onPress={() => setShowPastEvents(!showPastEvents)}
            >
              <Text style={[styles.showPastText, { color: colors.accent }]}>
                {showPastEvents ? 'Skjul tidligere arrangementer' : 'Se tidligere arrangementer'}
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
    marginBottom: 12,
  },
  familySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
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
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: SPOND_COLOR,
    overflow: 'hidden',
  },
  spondCardIcon: {
    fontSize: 22,
  },
  spondCardLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  spondCardContent: {
    gap: 2,
  },
  spondCardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  spondCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spondCardDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  spondCardDates: {
    fontSize: 14,
    marginTop: 4,
  },
  spondCardAddress: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  spondCardResponseIcons: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 8,
  },
  spondIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spondIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  spondCardIconsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  spondCardResponseCounts: {
    fontSize: 13,
    marginTop: 6,
  },
  spondStampAccepted: {
    position: 'absolute',
    right: 8,
    bottom: 44,
    transform: [{ rotate: '-20deg' }],
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    opacity: 0.7,
  },
  spondStampTextAccepted: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  spondStampDeclined: {
    position: 'absolute',
    right: 8,
    bottom: 44,
    transform: [{ rotate: '-20deg' }],
    borderWidth: 2,
    borderColor: '#E53935',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    opacity: 0.7,
  },
  spondStampTextDeclined: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  spondStampUnanswered: {
    position: 'absolute',
    right: 8,
    bottom: 44,
    transform: [{ rotate: '-20deg' }],
    borderWidth: 2,
    borderColor: '#C8A96E',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    opacity: 0.7,
  },
  spondStampTextUnanswered: {
    color: '#C8A96E',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  spondStampPartial: {
    position: 'absolute',
    right: 8,
    bottom: 44,
    transform: [{ rotate: '-20deg' }],
    borderWidth: 2,
    borderColor: '#C8A96E',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    opacity: 0.7,
    alignItems: 'center',
  },
  spondStampTextPartial: {
    color: '#C8A96E',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  spondStampNames: {
    marginTop: 2,
    alignItems: 'center',
  },
  spondStampName: {
    fontSize: 9,
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
    fontWeight: '300',
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
});
