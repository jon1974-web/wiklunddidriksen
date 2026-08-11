import React from 'react';
import { View, Text, TouchableOpacity, Image, Linking, StyleSheet } from 'react-native';
import { Event } from '../types';
import { formatDate, formatTime } from '../utils/dateUtils';
import { useTheme } from '../theme/ThemeContext';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';

const MONTHS = ['JAN','FEB','MAR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DES'];

interface EventCardProps {
  event: Event;
  onPress: () => void;
  onLongPress?: () => void;
  canDelete?: boolean;
}

const ClockIcon: React.FC = () => (
  <View style={clockStyles.outer}>
    <View style={clockStyles.handV} />
    <View style={clockStyles.handH} />
  </View>
);

const clockStyles = StyleSheet.create({
  outer: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handV: {
    position: 'absolute',
    width: 1.5,
    height: 3.5,
    backgroundColor: '#999',
    top: 2,
    borderRadius: 1,
  },
  handH: {
    position: 'absolute',
    width: 3,
    height: 1.5,
    backgroundColor: '#999',
    left: 4.5,
    top: 5.5,
    borderRadius: 1,
  },
});

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onPress, onLongPress, canDelete }) => {
  const { colors } = useTheme();

  const d = event.date ? new Date(event.date) : null;
  const dayNum = d ? d.getDate() : '?';
  const monthStr = d ? MONTHS[d.getMonth()] : '';
  const year = d ? d.getFullYear() : new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const showYear = year !== currentYear;

  const timeText = event.endTime
    ? `${formatTime(event.time)} – ${formatTime(event.endTime)}`
    : formatTime(event.time);

  const mapUrl = event.address ? getStaticMapUrl(event.address) : null;

  const openGoogleMaps = () => {
    if (!event.address) return;
    Linking.openURL(getGoogleMapsUrl(event.address));
  };

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface }]} onPress={onPress} onLongPress={canDelete ? onLongPress : undefined}>
      <View style={styles.row}>
        <View style={styles.calIcon}>
          <View style={[styles.calTopBar, { backgroundColor: colors.accent }]}>
            {showYear && <Text style={styles.calYear}>{year}</Text>}
          </View>
          <Text style={[styles.calDay, { color: colors.text }]}>{dayNum}</Text>
          <Text style={[styles.calMonth, { color: colors.textSecondary }]}>{monthStr}</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
          <View style={styles.timeRow}>
            <ClockIcon />
            <Text style={[styles.time, { color: colors.text }]}>{timeText}</Text>
          </View>
          {event.address && (
            <Text style={[styles.address, { color: colors.accent }]} numberOfLines={1}>📍 {event.address}</Text>
          )}
        </View>
        {mapUrl && (
          <TouchableOpacity style={styles.mapContainer} onPress={openGoogleMaps}>
            <Image source={{ uri: mapUrl }} style={styles.mapImage} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  calIcon: {
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
  calTopBar: {
    width: '100%',
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calYear: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  calDay: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 2,
  },
  calMonth: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  time: {
    fontSize: 15,
    fontWeight: '700',
  },
  address: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  mapContainer: {
    marginLeft: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
});
