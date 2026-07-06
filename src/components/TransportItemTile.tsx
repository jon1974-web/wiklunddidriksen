import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatDate } from '../utils/dateUtils';

interface TransportItemTileProps {
  icon: string;
  label: string;
  name?: string;
  detail?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  hasCar?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export const TransportItemTile: React.FC<TransportItemTileProps> = React.memo(({
  icon, label, name, detail, departureDate, departureTime, arrivalTime, hasCar, onPress, onLongPress,
}) => {
  const { colors } = useTheme();
  const calDay = departureDate ? String(new Date(departureDate + 'T12:00:00').getDate()) : '';
  const calMonth = departureDate ? new Date(departureDate + 'T12:00:00').toLocaleDateString('nb-NO', { month: 'short' }) : '';
  const depIcon = icon === '⛴️' || icon === '🚢' ? '⚓' : icon === '🚕' ? '🔑' : '🛫';
  const arrIcon = icon === '⛴️' || icon === '🚢' ? '🏁' : icon === '🚕' ? '📍' : '🛬';

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: colors.surface, borderLeftColor: colors.accent }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {departureDate ? (
        <View style={styles.calendarIcon}>
          <View style={[styles.calendarTop, { backgroundColor: colors.accent }]} />
          <Text style={[styles.calendarDay, { color: colors.text }]}>{calDay}</Text>
          <Text style={[styles.calendarMonth, { color: colors.textSecondary }]}>{calMonth}</Text>
          <View style={styles.tileTransportIcon}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.iconOnly, { backgroundColor: colors.accent }]}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
      )}
      <View style={[styles.calendarSeparator, { backgroundColor: colors.border }]} />
      <View style={styles.tileContent}>
        <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 12 }}>{label}</Text>
        {name && <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>{name}</Text>}
        {hasCar && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>🚗 Bil med</Text>}
        {detail && <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}>{detail}</Text>}
        <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />
        {departureTime && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>{depIcon} {departureTime}</Text>}
        {arrivalTime && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>{arrIcon} {arrivalTime}</Text>}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: 12, borderLeftWidth: 4, overflow: 'hidden' },
  calendarIcon: { alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  calendarTop: { width: '100%', height: 3, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  calendarDay: { fontSize: 22, fontWeight: 'bold', marginTop: 4, lineHeight: 26, textAlign: 'center' },
  calendarMonth: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', textAlign: 'center' },
  tileTransportIcon: { position: 'absolute', left: 6, top: 30 },
  iconOnly: { width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  calendarSeparator: { height: 1, marginHorizontal: 10, marginVertical: 6 },
  tileContent: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingBottom: 10 },
  tileName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  tileDetail: { fontSize: 12, marginTop: 1 },
  tileDivider: { height: 1, marginVertical: 6 },
});
