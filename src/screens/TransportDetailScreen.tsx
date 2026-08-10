import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { TripTransport } from '../types';
import { crossAlert } from '../utils/alert';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { getCarrierDomain } from '../constants/carrierDomains';
import { getFaviconUrl } from '../utils/favicon';
import { deleteTripTransport } from '../services/tripService';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';

interface TransportDetailScreenProps {
  navigation: any;
  route: any;
}

export const TransportDetailScreen: React.FC<TransportDetailScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { flight, tripId, trip } = route.params as { flight: TripTransport; tripId: string; trip: any };
  const { colors } = useTheme();
  const f = flight;

  const transportIconName = f.transportType === 'tog' ? 'train' : f.transportType === 'bil' ? 'car' : 'fly';
  const typeLabel = f.transportType === 'fly' ? t('transport.fly') : f.transportType === 'tog' ? t('transport.train') : t('transport.carRental');
  const typeColor = f.type === 'utreise' ? MODULE_COLORS.trips : '#E53935';
  const dirLabel = f.transportType === 'bil'
    ? (f.type === 'utreise' ? 'Henting' : 'Levering')
    : (f.type === 'utreise' ? 'Utreise' : 'Hjemreise');

  const carrierDomain = f.airline ? getCarrierDomain(f.airline) : null;
  const logoUrl = carrierDomain ? getFaviconUrl(carrierDomain) : null;

  const handleDelete = useCallback(() => {
    crossAlert('Slett transport', 'Er du sikker?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTripTransport(tripId, f.id);
            navigation.goBack();
          } catch {
            crossAlert('Error', 'Kunne ikke slette transport');
          }
        },
      },
    ]);
  }, [tripId, f.id, navigation]);

  const renderRow = (label: string, value?: string) => {
    if (!value) return null;
    return (
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
      </View>
    );
  };

  const renderNotesRow = (label: string, value?: string) => {
    if (!value) return null;
    return (
      <View style={styles.notesRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.notesValue, { color: colors.text }]}>{value}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: MODULE_COLORS.tripsBg }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: MODULE_COLORS.trips, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Text style={{ color: MODULE_COLORS.trips, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderLeftColor: typeColor }]}>
        <View style={styles.headerRow}>
          <AppIcon name={transportIconName as any} size={28} color={MODULE_COLORS.trips} />
          <View style={styles.headerText}>
            <Text style={[styles.headerDir, { color: typeColor }]}>{dirLabel}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={2}>
              {f.airline || typeLabel}{f.flightNumber ? ` ${f.flightNumber}` : ''}
            </Text>
          </View>
          {logoUrl && (
            <View style={styles.logoContainer}>
              <Text style={[styles.logoDomain, { color: colors.textSecondary }]} numberOfLines={1}>
                {carrierDomain}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        {renderRow(t('transport.operator'), f.airline)}
        {f.transportType === 'fly' && renderRow(t('transport.flightNumber'), f.flightNumber)}
        {f.transportType === 'tog' && renderRow(t('transport.trainRoute'), f.flightNumber)}
        {f.transportType === 'bil' && renderRow(t('transport.regNr'), f.flightNumber)}
        {f.transportType === 'fly' && renderRow(t('transport.referencePNR'), f.reference)}
        {f.transportType !== 'fly' && renderRow(t('transport.reference'), f.reference)}
        {f.transportType === 'fly' && renderRow(t('transport.seatNumber'), f.seatNumber)}
        {f.transportType === 'tog' && renderRow(t('transport.wagon'), f.wagon)}
        {f.transportType === 'bil' && renderRow(t('transport.driver'), f.driver)}
        {f.transportType === 'fly' && f.departureAddress && renderRow(t('transport.departureAirport'), f.departureAddress)}
        {f.transportType === 'fly' && f.arrivalAddress && renderRow(t('transport.arrivalAirport'), f.arrivalAddress)}
        {f.transportType !== 'fly' && f.departureAddress && renderRow(t('transport.departureTerminal'), f.departureAddress)}
        {f.transportType !== 'fly' && f.arrivalAddress && renderRow(t('transport.arrivalTerminal'), f.arrivalAddress)}

        {(f.departureDate || f.departureTime) && (
          <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.timeSectionTitle, { color: typeColor }]}>
              {f.transportType === 'bil' ? '🔑 ' + t('transport.pickup') : '🛫 ' + t('transport.departure')}
            </Text>
            {f.departureDate && renderRow(t('common.date'), f.departureDate)}
            {f.departureTime && renderRow(t('common.time'), f.departureTime)}
          </View>
        )}

        {(f.arrivalDate || f.arrivalTime) && (
          <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.timeSectionTitle, { color: '#E53935' }]}>
              {f.transportType === 'bil' ? '📋 ' + t('transport.dropoff') : '🛬 ' + t('transport.arrival')}
            </Text>
            {f.arrivalDate && renderRow(t('common.date'), f.arrivalDate)}
            {f.arrivalTime && renderRow(t('common.time'), f.arrivalTime)}
          </View>
        )}

        {renderRow(t('common.phone'), f.phone)}
        {renderNotesRow(t('common.notes'), f.note)}
      </View>

      {/* Maps */}
      {f.departureAddress && (
        <TouchableOpacity
          style={[styles.mapCard, { backgroundColor: colors.surface }]}
          onPress={() => Linking.openURL(getGoogleMapsUrl(f.departureAddress!))}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: getStaticMapUrl(f.departureAddress!, 15, '600x200') }}
            style={[styles.mapImage, { height: 160 }]}
          />
          <View style={[styles.mapOverlay, { backgroundColor: colors.surface }]}>
            <Text style={[styles.mapOverlayText, { color: colors.text }]}>📍 {f.departureAddress}</Text>
            <Text style={[styles.mapOverlayLink, { color: MODULE_COLORS.trips }]}>Åpne i Maps →</Text>
          </View>
        </TouchableOpacity>
      )}
      {f.departureAddress && f.arrivalAddress && (
        <View style={[styles.arrowContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppIcon name={transportIconName as any} size={20} color={MODULE_COLORS.trips} />
            <Text style={[styles.arrowIcon, { color: MODULE_COLORS.trips }]}>→</Text>
          </View>
          <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
        </View>
      )}
      {f.arrivalAddress && (
        <TouchableOpacity
          style={[styles.mapCard, { backgroundColor: colors.surface }]}
          onPress={() => Linking.openURL(getGoogleMapsUrl(f.arrivalAddress!))}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: getStaticMapUrl(f.arrivalAddress!, 15, '600x200') }}
            style={[styles.mapImage, { height: 160 }]}
          />
          <View style={[styles.mapOverlay, { backgroundColor: colors.surface }]}>
            <Text style={[styles.mapOverlayText, { color: colors.text }]}>📍 {f.arrivalAddress}</Text>
            <Text style={[styles.mapOverlayLink, { color: MODULE_COLORS.trips }]}>Åpne i Maps →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.inputBackground }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('detail.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: MODULE_COLORS.trips }]}
          onPress={() => {
            navigation.navigate({ name: 'TripDetail', params: { trip, openFlightEditId: f.id }, merge: true });
          }}
        >
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>{t('detail.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#E53935' }]}
          onPress={handleDelete}
        >
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>{t('detail.delete')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 36,
  },
  headerText: {
    flex: 1,
  },
  headerDir: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoContainer: {
    alignItems: 'flex-end',
  },
  logoDomain: {
    fontSize: 11,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  notesRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  notesValue: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 21,
  },
  timeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  timeSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  mapCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapImage: {
    width: '100%',
    height: 200,
  },
  mapOverlay: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapOverlayText: {
    fontSize: 14,
    flex: 1,
  },
  mapOverlayLink: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  arrowLine: {
    flex: 1,
    height: 2,
  },
  arrowIcon: {
    fontSize: 20,
    marginHorizontal: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
