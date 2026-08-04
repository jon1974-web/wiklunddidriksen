import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getLocale } from '../constants/languages';
import { AppIcon } from './AppIcon';

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
  const iconName = icon === 'ferry' || icon === 'boat' ? 'ferry' as const : icon === 'taxi' ? 'taxi' as const : icon === 'train' ? 'train' as const : icon === 'car' ? 'car' as const : 'fly' as const;
  const depIcon = iconName === 'ferry' ? '⚓' : iconName === 'taxi' ? '🔑' : '🛫';
  const arrIcon = iconName === 'ferry' ? '🏁' : iconName === 'taxi' ? '📍' : '🛬';
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
          <Text style={[styles.calendarDay, { color: colors.text, textAlign: 'center' }]}>{calDay}</Text>
          <Text style={[styles.calendarMonth, { color: colors.textSecondary, textAlign: 'center' }]}>{calMonth}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, position: 'absolute', left: 6, top: 24 }}>
            <AppIcon name={iconName as any} size={20} color={colors.accent} />
            <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>
              {iconName === 'fly' ? t('transport.fly') : iconName === 'train' ? t('transport.train') : iconName === 'car' ? t('transport.carRental') : iconName === 'ferry' ? t('transport.ferry') : t('transport.taxi')}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.iconOnly, { backgroundColor: tileColor }]}>
          <AppIcon name={iconName as any} size={22} color="#fff" />
        </View>
      )}
      <View style={[styles.calendarSeparator, { backgroundColor: colors.border }]} />
      <View style={styles.tileContent}>
        {typeLabel && (
          <Text style={{ color: tileColor, fontWeight: '600', fontSize: 12 }}>{typeLabel}</Text>
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
  tile: { flex: 1, borderRadius: 12, borderLeftWidth: 4, overflow: 'hidden', minWidth: 0 },
  calendarIcon: { alignItems: 'center', paddingTop: 6, paddingBottom: 4, position: 'relative' },
  calendarTop: { width: '100%', height: 3, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  calendarDay: { fontSize: 22, fontWeight: 'bold', marginTop: 4, lineHeight: 26, textAlign: 'center' },
  calendarMonth: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', textAlign: 'center' },
  tileTransportIcon: { position: 'absolute', left: 4, top: 24 },
  iconOnly: { width: '100%', height: 32, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  calendarSeparator: { height: 1, marginHorizontal: 10, marginVertical: 6 },
  tileContent: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingBottom: 10 },
  tileName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  tileDetail: { fontSize: 12, marginTop: 1 },
  tileDivider: { height: 1, marginVertical: 6 },
});
