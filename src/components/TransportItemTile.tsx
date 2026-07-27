import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getLocale } from '../constants/languages';

interface TransportItemTileProps {
  icon: string;
  label: string;
  typeLabel?: string;
  name?: string;
  detail?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  hasCar?: boolean;
  isHjemreise?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export const TransportItemTile: React.FC<TransportItemTileProps> = React.memo(({
  icon, label, typeLabel, name, detail, departureDate, departureTime, arrivalTime, hasCar, isHjemreise, onPress, onLongPress,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const calDay = departureDate ? String(new Date(departureDate + 'T12:00:00').getDate()) : '';
  const calMonth = departureDate ? new Date(departureDate + 'T12:00:00').toLocaleDateString(getLocale(i18n.language), { month: 'short' }) : '';
  const depIcon = icon === '⛴️' || icon === '🚢' ? '⚓' : icon === '🚕' ? '🔑' : '🛫';
  const arrIcon = icon === '⛴️' || icon === '🚢' ? '🏁' : icon === '🚕' ? '📍' : '🛬';
  const tileColor = isHjemreise ? '#E53935' : colors.accent;

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: colors.surfaceVariant, borderLeftColor: tileColor }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {departureDate ? (
        <View style={styles.calendarIcon}>
          <View style={[styles.calendarTop, { backgroundColor: tileColor }]} />
          <Text style={[styles.calendarDay, { color: colors.text }]}>{calDay}</Text>
          <Text style={[styles.calendarMonth, { color: colors.textSecondary }]}>{calMonth}</Text>
          <View style={styles.tileTransportIcon}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.iconOnly, { backgroundColor: tileColor }]}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
      )}
      <View style={[styles.calendarSeparator, { backgroundColor: colors.border }]} />
      <View style={styles.tileContent}>
        {typeLabel ? (
          <Text style={{ color: tileColor, fontWeight: '600', fontSize: 12 }}>{typeLabel}</Text>
        ) : (
          <Text style={{ color: tileColor, fontWeight: '600', fontSize: 12 }}>{label}</Text>
        )}
        {name && <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>{name}</Text>}
        {hasCar && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>🚗 {t('common.carWith')}</Text>}
        {detail && <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}>{detail}</Text>}
        <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />
        {departureTime && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>{depIcon} {departureTime}</Text>}
        {arrivalTime && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>{arrIcon} {arrivalTime}</Text>}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: 10, borderLeftWidth: 3, overflow: 'hidden', minWidth: 0 },
  calendarIcon: { alignItems: 'center', paddingTop: 4, paddingBottom: 2 },
  calendarTop: { width: '100%', height: 2, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  calendarDay: { fontSize: 18, fontWeight: 'bold', marginTop: 2, lineHeight: 22, textAlign: 'center' },
  calendarMonth: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', textAlign: 'center' },
  tileTransportIcon: { position: 'absolute', left: 4, top: 24 },
  iconOnly: { width: '100%', height: 32, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  calendarSeparator: { height: 1, marginHorizontal: 6, marginVertical: 4 },
  tileContent: { flex: 1, minWidth: 0, paddingHorizontal: 6, paddingBottom: 6 },
  tileName: { fontSize: 12, fontWeight: '600', marginBottom: 1 },
  tileDetail: { fontSize: 10, marginTop: 1 },
  tileDivider: { height: 1, marginVertical: 4 },
});
