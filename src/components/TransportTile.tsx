import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { TripFlight } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getCarrierDomain } from '../constants/carrierDomains';
import { getFaviconUrl } from '../utils/favicon';
import { useTranslation } from 'react-i18next';

interface TransportTileProps {
  flight: TripFlight;
  onPress: () => void;
  onLongPress?: () => void;
}

export const TransportTile: React.FC<TransportTileProps> = React.memo(({ flight, onPress, onLongPress }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = flight;

  const extractCode = (s?: string): string => {
    if (!s) return '';
    const m = s.match(/\(([^)]+)\)/);
    return m ? m[1] : s;
  };
  const depCode = extractCode(f.departureAddress);
  const arrCode = extractCode(f.arrivalAddress);

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

  const carrierDomain = f.airline ? getCarrierDomain(f.airline) : null;
  const logoUrl = carrierDomain ? getFaviconUrl(carrierDomain) : null;

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
          {logoUrl && (
            <View style={styles.tileCompanyLogo}>
              <Image source={{ uri: logoUrl }} style={styles.companyLogo} resizeMode="contain" />
            </View>
          )}
        </View>
      )}
      <View style={[styles.calendarSeparator, { backgroundColor: colors.border }]} />
      <View style={styles.tileContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          {f.type && (
            <Text style={{ color: typeColor, fontWeight: '600', fontSize: 12 }}>
              {f.transportType === 'bil'
                ? (f.type === 'utreise' ? t('transport.pickup') : t('transport.dropoff'))
                : (f.type === 'utreise' ? t('transport.departure') : t('transport.arrival'))}
            </Text>
          )}
          {depCode && arrCode && (
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              {depCode} → {arrCode}
            </Text>
          )}
        </View>
        {f.airline && <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>{f.airline}</Text>}
        {f.flightNumber && <Text style={[styles.tileDetail, { color: colors.accent }]} numberOfLines={1}>{f.flightNumber}</Text>}
        {f.reference && <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}> {t('common.reference')}: {f.reference}</Text>}
        {f.seatNumber && <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}> {t('transport.seatNumber')}: {f.seatNumber}</Text>}
        {f.wagon && <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}>{f.wagon}</Text>}
        {f.driver && <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}> {t('common.driver')}: {f.driver}</Text>}
        {f.address && <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}>{f.address}</Text>}
        <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />
        {f.departureTime ? (
          <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}>
            {depLabel} {f.departureTime}
          </Text>
        ) : null}
        {f.arrivalTime ? (
          <Text style={[styles.tileDetail, { color: colors.textSecondary }]} numberOfLines={1}>
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
    paddingTop: 6,
    paddingBottom: 4,
    position: 'relative',
  },
  calendarTop: {
    width: '100%',
    height: 3,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  calendarDay: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
    lineHeight: 26,
  },
  calendarMonth: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  tileTransportIcon: {
    position: 'absolute',
    left: 6,
    top: 30,
  },
  tileCompanyLogo: {
    position: 'absolute',
    right: 6,
    top: 30,
  },
  companyLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  calendarSeparator: {
    height: 1,
    marginHorizontal: 10,
    marginVertical: 6,
  },
  tileContent: {
    flex: 1,
    minWidth: 0,
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
