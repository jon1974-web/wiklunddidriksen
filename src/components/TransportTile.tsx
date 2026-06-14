import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TripFlight } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface TransportTileProps {
  flight: TripFlight;
  onPress: () => void;
  onLongPress: () => void;
}

export const TransportTile: React.FC<TransportTileProps> = React.memo(({ flight, onPress, onLongPress }) => {
  const { colors } = useTheme();
  const f = flight;

  const transportIcon = f.transportType === 'tog' ? '🚆' : f.transportType === 'bil' ? '🚗' : '✈️';
  const typeColor = f.type === 'utreise' ? colors.accent : '#E53935';
  const calDate = f.departureDate || f.arrivalDate;
  let calDay = '';
  let calMonth = '';
  if (calDate) {
    const d = new Date(calDate + 'T12:00:00');
    calDay = String(d.getDate());
    calMonth = d.toLocaleDateString('nb-NO', { month: 'short' });
  }
  const depLabel = f.transportType === 'bil' ? '🔑' : '🛫';
  const arrLabel = f.transportType === 'bil' ? '📋' : '🛬';

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: colors.surface, borderLeftColor: typeColor }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {calDate && (
        <View style={styles.calendarIcon}>
          <View style={[styles.calendarTop, { backgroundColor: typeColor }]} />
          <Text style={[styles.calendarDay, { color: colors.text, textAlign: 'center' }]}>{calDay}</Text>
          <Text style={[styles.calendarMonth, { color: colors.textSecondary, textAlign: 'center' }]}>{calMonth}</Text>
          <View style={styles.tileTransportIcon}>
            <Text style={{ fontSize: 20 }}>{transportIcon}</Text>
          </View>
        </View>
      )}
      <View style={[styles.calendarSeparator, { backgroundColor: colors.border }]} />
      <View style={styles.tileContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          {f.type && (
            <Text style={{ color: typeColor, fontWeight: '600', fontSize: 12 }}>
              {f.type === 'utreise' ? 'Utreise' : 'Hjemreise'}
            </Text>
          )}
        </View>
        {f.airline && <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>{f.airline}</Text>}
        {f.flightNumber && <Text style={[styles.tileDetail, { color: colors.accent }]}>{f.flightNumber}</Text>}
        {f.reference && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>Ref: {f.reference}</Text>}
        {f.wagon && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>{f.wagon}</Text>}
        {f.driver && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>Fører: {f.driver}</Text>}
        {f.address && <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}>{f.address}</Text>}
        <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />
        {f.departureTime ? (
          <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>
            {depLabel} {f.departureTime}
          </Text>
        ) : null}
        {f.arrivalTime ? (
          <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>
            {arrLabel} {f.arrivalTime}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 12,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  calendarIcon: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    position: 'relative',
  },
  calendarTop: {
    width: '100%',
    height: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  calendarDay: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 4,
    lineHeight: 30,
  },
  calendarMonth: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  tileTransportIcon: {
    position: 'absolute',
    left: 6,
    top: 30,
  },
  calendarSeparator: {
    height: 1,
    marginHorizontal: 10,
    marginVertical: 6,
  },
  tileContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  tileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  tileDetail: {
    fontSize: 12,
    marginTop: 1,
  },
  tileDivider: {
    height: 1,
    marginVertical: 6,
  },
});
