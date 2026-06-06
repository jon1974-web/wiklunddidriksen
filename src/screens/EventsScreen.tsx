import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebCalendar } from '../platform/CalendarView';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { Event, Trip, SpondEvent, SpondMember } from '../types';
import { EventCard } from '../components/EventCard';
import { SpondResponseModal } from '../components/SpondResponseModal';
import { sortEventsByDateTime, getWeekNumber, getTodayLocal, formatDate, formatTime } from '../utils/dateUtils';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { getTrips } from '../services/tripService';
import { getSpondConfig, getSpondEvents, getSpondMembers, changeSpondResponse } from '../services/spondService';

interface EventsScreenProps {
  navigation: any;
}

const EVENT_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];
const TRIP_COLOR = '#0097A7';
const SPOND_COLOR = '#E53935';

type UnifiedItem =
  | (Event & { _type: 'event' })
  | (Trip & { _type: 'trip' })
  | (SpondEvent & { _type: 'spond' });

export const EventsScreen: React.FC<EventsScreenProps> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [spondEvents, setSpondEvents] = useState<SpondEvent[]>([]);
  const [spondMembers, setSpondMembers] = useState<Record<string, SpondMember[]>>({});
  const [spondConfig, setSpondConfig] = useState<{ email: string; password: string } | null>(null);
  const [responseModal, setResponseModal] = useState<{ eventId: string; groupId: string; type: 'accept' | 'decline' } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal());
  const [showPastEvents, setShowPastEvents] = useState(false);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { colors } = useTheme();

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date'));
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
  }, []);

  const loadTrips = useCallback(async () => {
    try {
      const data = await getTrips();
      setTrips(data);
    } catch (error) {
      // Silently fail for trips
    }
  }, []);

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

        const membersMap: Record<string, SpondMember[]> = {};
        for (const group of config.groups) {
          try {
            const members = await getSpondMembers(config.email, config.password, group.id);
            membersMap[group.id] = members;
          } catch {
            // Silently fail for members
          }
        }
        setSpondMembers(membersMap);
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

  const filteredItems = useMemo(() => {
    const getDateStr = (item: UnifiedItem): string => {
      if (item._type === 'trip') return item.startDate;
      if (item._type === 'spond') return item.startTimestamp.split('T')[0];
      return item.endDate || item.date;
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
        const start = e.startTimestamp.split('T')[0];
        const end = e.endTimestamp ? e.endTimestamp.split('T')[0] : start;
        return selectedDate >= start && selectedDate <= end;
      }).map((e) => ({ ...e, _type: 'spond' as const }));
      return [...dayEvents, ...dayTrips, ...daySpond];
    }
    const allItems: UnifiedItem[] = [
      ...events.map((e) => ({ ...e, _type: 'event' as const })),
      ...trips.map((t) => ({ ...t, _type: 'trip' as const })),
      ...spondEvents.map((e) => ({ ...e, _type: 'spond' as const })),
    ].filter((i) => getDateStr(i) >= threeMonthsAgo);
    const upcoming = allItems.filter((i) => getDateStr(i) >= today);
    const past = allItems.filter((i) => getDateStr(i) < today);
    const sortByDate = (a: UnifiedItem, b: UnifiedItem) => getDateStr(a).localeCompare(getDateStr(b));
    return showPastEvents
      ? [...upcoming.sort(sortByDate), ...past.sort(sortByDate).reverse()]
      : upcoming.sort(sortByDate);
  }, [events, trips, spondEvents, viewMode, selectedDate, showPastEvents, today, threeMonthsAgo]);

  const hasPastItems = useMemo(() => {
    const getDateStr = (item: UnifiedItem): string => {
      if (item._type === 'trip') return item.startDate;
      if (item._type === 'spond') return item.startTimestamp.split('T')[0];
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
      const startStr = event.startTimestamp.split('T')[0];
      const endStr = event.endTimestamp ? event.endTimestamp.split('T')[0] : startStr;
      
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

  const renderItem = useCallback(({ item }: { item: UnifiedItem }) => {
    if (item._type === 'trip') {
      return (
        <TouchableOpacity
          style={[styles.tripCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Trips', { screen: 'TripDetail', params: { trip: item } })}
        >
          <View style={styles.tripCardHeader}>
            <Text style={styles.tripCardIcon}>✈️</Text>
            <View style={styles.tripCardContent}>
              <Text style={[styles.tripCardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.tripCardLocation, { color: colors.textSecondary }]}>
                {item.city}{item.country ? `, ${item.country}` : ''}
              </Text>
              <Text style={[styles.tripCardDates, { color: colors.textSecondary }]}>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    if (item._type === 'spond') {
      const dateText = item.endTimestamp
        ? `${formatDate(item.startTimestamp.split('T')[0])} - ${formatDate(item.endTimestamp.split('T')[0])}`
        : formatDate(item.startTimestamp.split('T')[0]);
      const timeText = item.endTimestamp
        ? `${item.startTimestamp.split('T')[1]?.substring(0, 5) || ''} - ${item.endTimestamp.split('T')[1]?.substring(0, 5) || ''}`
        : item.startTimestamp.split('T')[1]?.substring(0, 5) || '';
      const accepted = item.responses?.acceptedIds?.length || 0;
      const declined = item.responses?.declinedIds?.length || 0;
      const unanswered = item.responses?.unansweredIds?.length || 0;
      return (
        <View style={[styles.spondCard, { backgroundColor: colors.surface }]}>
          <View style={styles.spondCardHeader}>
            <Text style={styles.spondCardIcon}>🏟️</Text>
            <View style={styles.spondCardContent}>
              <Text style={[styles.spondCardTitle, { color: colors.text }]}>{item.heading}</Text>
              {item.description && (
                <Text style={[styles.spondCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
              )}
              <Text style={[styles.spondCardDates, { color: colors.textSecondary }]}>
                {dateText}{timeText ? ` · ${timeText}` : ''}
              </Text>
              {item.groupName && (
                <Text style={[styles.spondCardGroup, { color: SPOND_COLOR }]}>{item.groupName}</Text>
              )}
              {item.address && (
                <Text style={[styles.spondCardAddress, { color: colors.accent }]} numberOfLines={1}>{item.address}</Text>
              )}
              {item.responses && (
                <Text style={[styles.spondCardResponses, { color: colors.textSecondary }]}>
                  {accepted} akseptert · {declined} avslått · {unanswered} ikke svart
                </Text>
              )}
            </View>
          </View>
          {item.groupId && (
            <View style={styles.spondCardActions}>
              <TouchableOpacity
                style={[styles.spondActionButton, { backgroundColor: colors.accent }]}
                onPress={() => setResponseModal({ eventId: item.id, groupId: item.groupId!, type: 'accept' })}
              >
                <Text style={styles.spondActionButtonText}>Aksepter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.spondActionButton, { backgroundColor: colors.danger }]}
                onPress={() => setResponseModal({ eventId: item.id, groupId: item.groupId!, type: 'decline' })}
              >
                <Text style={styles.spondActionButtonText}>Avslå</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
    return (
      <EventCard
        event={item}
        onPress={() => navigation.navigate('EventDetail', { event: item })}
      />
    );
  }, [navigation, colors, setResponseModal]);

  const handleSendResponse = useCallback(async (memberIds: string[]) => {
    if (!responseModal || !spondConfig) return;
    const { eventId, type } = responseModal;
    const accepted = type === 'accept';
    for (const memberId of memberIds) {
      try {
        await changeSpondResponse(spondConfig.email, spondConfig.password, eventId, memberId, accepted);
      } catch {
        // Continue with next member
      }
    }
    loadSpondEvents();
  }, [responseModal, spondConfig, loadSpondEvents]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Arrangementer</Text>
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
        </View>
      </View>

      {viewMode === 'calendar' && (
        <View style={[styles.calendarContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.weekNumberContainer}>
            <Text style={[styles.weekNumber, { color: colors.textSecondary }]}>Uke {currentWeek}</Text>
          </View>
          <WebCalendar
            current={selectedDate}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            markingType="period"
            theme={{
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
            }}
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
          members={spondMembers[responseModal.groupId] || []}
          onSend={handleSendResponse}
          onClose={() => setResponseModal(null)}
        />
      )}
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
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripCardIcon: {
    fontSize: 24,
  },
  tripCardContent: {
    flex: 1,
    gap: 2,
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
  },
  spondCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  spondCardIcon: {
    fontSize: 24,
  },
  spondCardContent: {
    flex: 1,
    gap: 2,
  },
  spondCardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  spondCardDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  spondCardDates: {
    fontSize: 14,
    marginTop: 4,
  },
  spondCardGroup: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  spondCardAddress: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  spondCardResponses: {
    fontSize: 14,
    marginTop: 6,
  },
  spondCardActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  spondActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  spondActionButtonText: {
    color: '#fff',
    fontSize: 14,
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
