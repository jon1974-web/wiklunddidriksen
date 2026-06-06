import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebCalendar } from '../platform/CalendarView';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { Event, Trip } from '../types';
import { EventCard } from '../components/EventCard';
import { sortEventsByDateTime, getWeekNumber, getTodayLocal, formatDate } from '../utils/dateUtils';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { getTrips } from '../services/tripService';

interface EventsScreenProps {
  navigation: any;
}

const EVENT_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];
const TRIP_COLOR = '#0097A7';

type UnifiedItem =
  | (Event & { _type: 'event' })
  | (Trip & { _type: 'trip' });

export const EventsScreen: React.FC<EventsScreenProps> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal());
  const [showPastEvents, setShowPastEvents] = useState(false);
  const user = useUserStore((state) => state.user);
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

  const filteredItems = useMemo(() => {
    if (viewMode === 'calendar') {
      const dayEvents = events.filter((e) => {
        const start = e.date;
        const end = e.endDate || e.date;
        return selectedDate >= start && selectedDate <= end;
      }).map((e) => ({ ...e, _type: 'event' as const }));
      const dayTrips = trips.filter((t) => {
        return selectedDate >= t.startDate && selectedDate <= t.endDate;
      }).map((t) => ({ ...t, _type: 'trip' as const }));
      return [...dayEvents, ...dayTrips];
    }
    const allItems: UnifiedItem[] = [
      ...events.map((e) => ({ ...e, _type: 'event' as const })),
      ...trips.map((t) => ({ ...t, _type: 'trip' as const })),
    ];
    const upcoming = allItems.filter((i) => {
      const date = i._type === 'trip' ? i.startDate : (i.endDate || i.date);
      return date >= today;
    });
    const past = allItems.filter((i) => {
      const date = i._type === 'trip' ? i.startDate : (i.endDate || i.date);
      return date < today;
    });
    const sortByDate = (a: UnifiedItem, b: UnifiedItem) => {
      const dateA = a._type === 'trip' ? a.startDate : a.date;
      const dateB = b._type === 'trip' ? b.startDate : b.date;
      return dateA.localeCompare(dateB);
    };
    return showPastEvents
      ? [...upcoming.sort(sortByDate), ...past.sort(sortByDate).reverse()]
      : upcoming.sort(sortByDate);
  }, [events, trips, viewMode, selectedDate, showPastEvents, today]);

  const hasPastItems = useMemo(() => {
    const hasPastEvents = events.some((e) => (e.endDate || e.date) < today);
    const hasPastTrips = trips.some((t) => t.startDate < today);
    return hasPastEvents || hasPastTrips;
  }, [events, trips, today]);

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

    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.accent };
    return marks;
  }, [events, trips, selectedDate, colors.accent]);

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
    return (
      <EventCard
        event={item}
        onPress={() => navigation.navigate('EventDetail', { event: item })}
      />
    );
  }, [navigation, colors]);

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
