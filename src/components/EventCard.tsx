import React from 'react';
import { View, Text, TouchableOpacity, Image, Linking, StyleSheet } from 'react-native';
import { Event } from '../types';
import { formatDate, formatTime } from '../utils/dateUtils';
import { useTheme } from '../theme/ThemeContext';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  onLongPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onPress, onLongPress }) => {
  const { colors } = useTheme();
  const dateText = event.endDate 
    ? `${formatDate(event.date)} - ${formatDate(event.endDate)}`
    : formatDate(event.date);
  
  const timeText = event.endTime 
    ? `${formatTime(event.time)} - ${formatTime(event.endTime)}`
    : formatTime(event.time);

  const mapUrl = event.address ? getStaticMapUrl(event.address) : null;

  const openGoogleMaps = () => {
    if (!event.address) return;
    Linking.openURL(getGoogleMapsUrl(event.address));
  };

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colors.accent }]} onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.row}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            {event.icon && <Text style={styles.icon}>{event.icon}</Text>}
            <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          </View>
          {event.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{event.description}</Text>
          )}
          <View style={styles.details}>
            <Text style={[styles.date, { color: colors.textSecondary }]}>{dateText}</Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>{timeText}</Text>
          </View>
          {event.address && (
            <Text style={[styles.address, { color: colors.accent }]} numberOfLines={1}>{event.address}</Text>
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
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    gap: 16,
  },
  description: {
    fontSize: 14,
    marginTop: 4,
  },
  address: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
  },
  time: {
    fontSize: 14,
  },
  mapContainer: {
    marginLeft: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});
