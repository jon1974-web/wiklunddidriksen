import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';

interface MissedEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  reminderMinutes: number;
  icon?: string;
}

interface MissedRemindersBannerProps {
  navigation?: any;
}

const DISMISSED_KEY = 'missedRemindersDismissed';

const getDismissedIds = (): string[] => {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveDismissedIds = (ids: string[]) => {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {}
};

export const MissedRemindersBanner: React.FC<MissedRemindersBannerProps> = ({ navigation }) => {
  const [missedEvents, setMissedEvents] = useState<MissedEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { colors } = useTheme();

  useEffect(() => {
    setDismissedIds(getDismissedIds());
  }, []);

  useEffect(() => {
    if (!user || !familyId) return;

    const checkMissedReminders = async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const q = query(
          collection(db, 'events'),
          where('familyId', '==', familyId),
          where('date', '<=', today),
          orderBy('date', 'desc'),
          limit(20)
        );

        const snap = await getDocs(q);
        const missed: MissedEvent[] = [];
        const ids = getDismissedIds();

        for (const doc of snap.docs) {
          if (ids.includes(doc.id)) continue;

          const event = doc.data();
          if (!event.date || !event.time || !event.reminderMinutes) continue;

          const [h, m] = event.time.split(':').map(Number);
          const eventDate = new Date(event.date);
          eventDate.setHours(h, m, 0, 0);

          const reminderTime = new Date(eventDate.getTime() - event.reminderMinutes * 60 * 1000);

          if (reminderTime < now && eventDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
            missed.push({
              id: doc.id,
              title: event.title,
              date: event.date,
              time: event.time,
              reminderMinutes: event.reminderMinutes,
              icon: event.icon,
            });
          }
        }

        setMissedEvents(missed);
      } catch {
        // Silently fail
      }
    };

    checkMissedReminders();
  }, [user, familyId]);

  const dismissAll = useCallback(() => {
    const allIds = [...dismissedIds, ...missedEvents.map((e) => e.id)];
    saveDismissedIds(allIds);
    setDismissedIds(allIds);
    setMissedEvents([]);
    setExpanded(false);
  }, [dismissedIds, missedEvents]);

  const dismissOne = useCallback((id: string) => {
    const newDismissed = [...dismissedIds, id];
    saveDismissedIds(newDismissed);
    setDismissedIds(newDismissed);
    setMissedEvents((prev) => prev.filter((e) => e.id !== id));
  }, [dismissedIds]);

  const formatTime = (time: string) => time;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const day = d.getDate();
    const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
    return `${day}. ${months[d.getMonth()]}`;
  };

  if (missedEvents.length === 0) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.bannerText, { color: colors.text }]}>
          🔔 {missedEvents.length} påminnelse{missedEvents.length > 1 ? 'r' : ''} du kan ha gått glipp av
        </Text>
        <Text style={[styles.chevron, { color: colors.accent }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.list}>
          {missedEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventRow, { borderBottomColor: colors.border }]}
              onPress={async () => {
                if (navigation) {
                  const eventDoc = await getDoc(doc(db, 'events', event.id));
                  if (eventDoc.exists()) {
                    navigation.navigate('EventDetail', { event: { id: eventDoc.id, ...eventDoc.data() } });
                  }
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.eventInfo}>
                <Text style={[styles.eventIcon, { color: colors.text }]}>{event.icon || '📅'}</Text>
                <View style={styles.eventDetails}>
                  <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                    {formatDate(event.date)} kl. {formatTime(event.time)} · Påminnelse {event.reminderMinutes} min før
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => dismissOne(event.id)}
                style={styles.dismissOne}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.dismissX, { color: colors.textDisabled }]}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={dismissAll} style={styles.dismissAll}>
            <Text style={[styles.dismissAllText, { color: colors.accent }]}>Avvis alle</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eventInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 12,
    marginTop: 2,
  },
  dismissOne: {
    marginLeft: 8,
    padding: 4,
  },
  dismissX: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissAll: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
