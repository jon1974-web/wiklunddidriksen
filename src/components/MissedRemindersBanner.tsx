import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';

export const MissedRemindersBanner: React.FC = () => {
  const [missedCount, setMissedCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const user = useUserStore((state) => state.user);
  const { colors } = useTheme();

  useEffect(() => {
    if (!user || dismissed) return;

    const checkMissedReminders = async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const q = query(
          collection(db, 'events'),
          where('createdBy', '==', user.uid),
          where('date', '<=', today),
          orderBy('date', 'desc'),
          limit(20)
        );

        const snap = await getDocs(q);
        let count = 0;

        for (const doc of snap.docs) {
          const event = doc.data();
          if (!event.date || !event.time || !event.reminderMinutes) continue;

          const [h, m] = event.time.split(':').map(Number);
          const eventDate = new Date(event.date);
          eventDate.setHours(h, m, 0, 0);

          const reminderTime = new Date(eventDate.getTime() - event.reminderMinutes * 60 * 1000);

          // Reminder is in the past but event is still today or just passed
          if (reminderTime < now && eventDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
            count++;
          }
        }

        setMissedCount(count);
      } catch {
        // Silently fail
      }
    };

    checkMissedReminders();
  }, [user, dismissed]);

  if (dismissed || missedCount === 0) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
      <Text style={[styles.bannerText, { color: colors.text }]}>
        🔔 Du har {missedCount} påminnelse{missedCount > 1 ? 'r' : ''} du kan ha gått glipp av
      </Text>
      <TouchableOpacity onPress={() => setDismissed(true)} style={styles.dismissButton}>
        <Text style={[styles.dismissText, { color: colors.accent }]}>OK</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    marginLeft: 12,
    padding: 4,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
