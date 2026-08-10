import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { crossAlert } from '../utils/alert';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { formatDate } from '../utils/dateUtils';
import { deleteTripHotel, deleteTripRestaurant, deleteTripActivity, deleteTripBoat, deleteTripTaxi, deleteTripFerry } from '../services/tripService';
import { MODULE_COLORS } from '../constants/moduleColors';
import { useTranslation } from 'react-i18next';

interface TripItemDetailScreenProps {
  navigation: any;
  route: any;
}

type ItemType = 'hotel' | 'restaurant' | 'activity' | 'boat' | 'taxi' | 'ferry';

const deleteHandlers: Record<ItemType, (tripId: string, itemId: string) => Promise<void>> = {
  hotel: deleteTripHotel,
  restaurant: deleteTripRestaurant,
  activity: deleteTripActivity,
  boat: deleteTripBoat,
  taxi: deleteTripTaxi,
  ferry: deleteTripFerry,
};

export const TripItemDetailScreen: React.FC<TripItemDetailScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { item, tripId, trip, itemType } = route.params as {
    item: any;
    tripId: string;
    trip: any;
    itemType: ItemType;
  };
  const { colors } = useTheme();
  const typeConfig: Record<ItemType, { icon: string; label: string; editParam: string }> = {
    hotel: { icon: '🛏️', label: t('hotels.title'), editParam: 'openHotelEditId' },
    restaurant: { icon: '🍽️', label: t('restaurants.title'), editParam: 'openRestaurantEditId' },
    activity: { icon: '🎯', label: t('activities.title'), editParam: 'openActivityEditId' },
    boat: { icon: '⛵', label: t('transport.boatCruise'), editParam: 'openBoatEditId' },
    taxi: { icon: '🚕', label: t('transport.taxi'), editParam: 'openTaxiEditId' },
    ferry: { icon: '⛴️', label: t('transport.ferry'), editParam: 'openFerryEditId' },
  };
  const config = typeConfig[itemType];

  const handleDelete = useCallback(() => {
    crossAlert(`${t('detail.delete')} ${config.label.toLowerCase()}`, `${t('common.confirm')}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHandlers[itemType](tripId, item.id);
            navigation.goBack();
          } catch {
            crossAlert('Error', t('common.deleteFailed'));
          }
        },
      },
    ]);
  }, [tripId, item.id, navigation, itemType, config.label]);

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
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderLeftColor: MODULE_COLORS.trips }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerIcon}>{config.icon}</Text>
          <View style={styles.headerText}>
            <Text style={[styles.headerDir, { color: MODULE_COLORS.trips }]}>{config.label}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        {itemType === 'hotel' && (
          <>
            {renderRow(t('common.address'), item.address)}
            {renderRow(t('common.phone'), item.phone)}
            {(item.startDate || item.endDate) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: MODULE_COLORS.trips }]}>📅 {t('hotels.stay')}</Text>
                {item.startDate && renderRow(t('common.startDate'), formatDate(item.startDate))}
                {item.endDate && renderRow(t('common.endDate'), formatDate(item.endDate))}
              </View>
            )}
            {(item.checkInTime || item.checkOutTime) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: MODULE_COLORS.trips }]}>🕐 {t('hotels.times')}</Text>
                {item.checkInTime && renderRow(t('hotels.checkIn'), item.checkInTime)}
                {item.checkOutTime && renderRow(t('hotels.checkOut'), item.checkOutTime)}
              </View>
            )}
          </>
        )}

        {itemType === 'restaurant' && (
          <>
            {renderRow(t('common.address'), item.address)}
            {renderNotesRow(t('common.note'), item.note)}
          </>
        )}

        {itemType === 'activity' && (
          <>
            {renderRow(t('common.address'), item.address)}
            {(item.startDate || item.endDate) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: MODULE_COLORS.trips }]}>📅 {t('common.date')}</Text>
                {item.startDate && renderRow(t('common.startDate'), formatDate(item.startDate))}
                {item.endDate && renderRow(t('common.endDate'), formatDate(item.endDate))}
              </View>
            )}
            {(item.startTime || item.endTime) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: MODULE_COLORS.trips }]}>🕐 {t('common.time')}</Text>
                {item.startTime && renderRow(t('pickers.startTime'), item.startTime)}
                {item.endTime && renderRow(t('pickers.endTime'), item.endTime)}
              </View>
            )}
            {renderNotesRow(t('common.note'), item.note)}
          </>
        )}

        {itemType === 'boat' && (
          <>
            {renderRow(t('transport.routeName'), item.routeName)}
            {renderRow(t('common.reference'), item.reference)}
            {(item.departureDate || item.departureTime) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: MODULE_COLORS.trips }]}>🛫 {t('transport.departure')}</Text>
                {item.departureDate && renderRow(t('common.date'), formatDate(item.departureDate))}
                {item.departureTime && renderRow(t('common.time'), item.departureTime)}
                {item.departureAddress && renderRow(t('transport.departureTerminal'))}
              </View>
            )}
            {(item.arrivalDate || item.arrivalTime) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: '#E53935' }]}>🛬 {t('transport.arrival')}</Text>
                {item.arrivalDate && renderRow(t('common.date'), formatDate(item.arrivalDate))}
                {item.arrivalTime && renderRow(t('common.time'), item.arrivalTime)}
                {item.arrivalAddress && renderRow(t('transport.arrivalTerminal'))}
              </View>
            )}
            {renderRow(t('common.phone'), item.phone)}
            {item.hasCar && renderRow(t('common.carWith'), t('common.yes'))}
            {item.hasCar && renderRow(t('common.carRegNr'), item.carRegistration)}
            {renderRow(t('common.driver'), item.driver)}
            {renderRow(t('common.passengers'), item.passengers)}
            {renderNotesRow(t('common.note'), item.note)}
          </>
        )}

        {itemType === 'taxi' && (
          <>
            {renderRow(t('common.reference'), item.reference)}
            {(item.departureDate || item.departureTime) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: MODULE_COLORS.trips }]}>📍 {t('transport.pickup')}</Text>
                {item.departureDate && renderRow(t('common.date'), formatDate(item.departureDate))}
                {item.departureTime && renderRow(t('common.time'), item.departureTime)}
                {item.departureAddress && renderRow(t('transport.pickupAddress'))}
              </View>
            )}
            {(item.arrivalDate || item.arrivalTime) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: '#E53935' }]}>📍 {t('transport.dropoff')}</Text>
                {item.arrivalDate && renderRow(t('common.date'), formatDate(item.arrivalDate))}
                {item.arrivalTime && renderRow(t('common.time'), item.arrivalTime)}
                {item.arrivalAddress && renderRow(t('transport.arrivalAddress'))}
              </View>
            )}
            {renderRow(t('common.phone'), item.phone)}
            {renderRow(t('common.driver'), item.driver)}
            {renderRow(t('common.passengers'), item.passengers)}
            {renderNotesRow(t('common.note'), item.note)}
          </>
        )}

        {itemType === 'ferry' && (
          <>
            {renderRow(t('transport.routeName'), item.routeName)}
            {renderRow(t('common.reference'), item.reference)}
            {renderRow(t('transport.cabin'), item.cabin)}
            {(item.departureDate || item.departureTime) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: MODULE_COLORS.trips }]}>🛫 {t('transport.departure')}</Text>
                {item.departureDate && renderRow(t('common.date'), formatDate(item.departureDate))}
                {item.departureTime && renderRow(t('common.time'), item.departureTime)}
                {item.departureAddress && renderRow(t('transport.departureTerminal'))}
              </View>
            )}
            {(item.arrivalDate || item.arrivalTime) && (
              <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeSectionTitle, { color: '#E53935' }]}>🛬 {t('transport.arrival')}</Text>
                {item.arrivalDate && renderRow(t('common.date'), formatDate(item.arrivalDate))}
                {item.arrivalTime && renderRow(t('common.time'), item.arrivalTime)}
                {item.arrivalAddress && renderRow(t('transport.arrivalTerminal'))}
              </View>
            )}
            {renderRow(t('common.phone'), item.phone)}
            {item.hasCar && renderRow(t('common.carWith'), t('common.yes'))}
            {item.hasCar && renderRow(t('common.carRegNr'), item.carRegistration)}
            {renderRow(t('common.driver'), item.driver)}
            {renderRow(t('common.passengers'), item.passengers)}
            {renderNotesRow(t('common.note'), item.note)}
          </>
        )}
      </View>

      {/* Maps */}
      {(itemType === 'boat' || itemType === 'ferry' || itemType === 'taxi') && (item.departureAddress || item.arrivalAddress) ? (
        <View>
          {item.departureAddress && (
            <TouchableOpacity
              style={[styles.mapCard, { backgroundColor: colors.surface }]}
              onPress={() => Linking.openURL(getGoogleMapsUrl(item.departureAddress))}
              activeOpacity={0.8}
            >
              <Image source={{ uri: getStaticMapUrl(item.departureAddress, 15, '600x200') }} style={[styles.mapImage, { height: 160 }]} />
              <View style={[styles.mapOverlay, { backgroundColor: colors.surface }]}>
                <Text style={[styles.mapOverlayText, { color: colors.text }]}>📍 {item.departureAddress}</Text>
                <Text style={[styles.mapOverlayLink, { color: MODULE_COLORS.trips }]}>Åpne i Maps →</Text>
              </View>
            </TouchableOpacity>
          )}
          {item.departureAddress && item.arrivalAddress && (
            <View style={[styles.arrowContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.arrowIcon, { color: MODULE_COLORS.trips }]}>⛵ →</Text>
              <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
            </View>
          )}
          {item.arrivalAddress && (
            <TouchableOpacity
              style={[styles.mapCard, { backgroundColor: colors.surface }]}
              onPress={() => Linking.openURL(getGoogleMapsUrl(item.arrivalAddress))}
              activeOpacity={0.8}
            >
              <Image source={{ uri: getStaticMapUrl(item.arrivalAddress, 15, '600x200') }} style={[styles.mapImage, { height: 160 }]} />
              <View style={[styles.mapOverlay, { backgroundColor: colors.surface }]}>
                <Text style={[styles.mapOverlayText, { color: colors.text }]}>📍 {item.arrivalAddress}</Text>
                <Text style={[styles.mapOverlayLink, { color: MODULE_COLORS.trips }]}>Åpne i Maps →</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : item.address ? (
        <TouchableOpacity
          style={[styles.mapCard, { backgroundColor: colors.surface }]}
          onPress={() => Linking.openURL(getGoogleMapsUrl(item.address))}
          activeOpacity={0.8}
        >
          <Image source={{ uri: getStaticMapUrl(item.address, 15, '600x300') }} style={styles.mapImage} />
          <View style={[styles.mapOverlay, { backgroundColor: colors.surface }]}>
            <Text style={[styles.mapOverlayText, { color: colors.text }]}>📍 {item.address}</Text>
            <Text style={[styles.mapOverlayLink, { color: MODULE_COLORS.trips }]}>Åpne i Google Maps →</Text>
          </View>
        </TouchableOpacity>
      ) : null}

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
            navigation.navigate({ name: 'TripDetail', params: { trip, openItemEditId: item.id, openItemType: itemType }, merge: true });
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
  container: { flex: 1, padding: 16 },
  headerCard: { borderRadius: 12, borderLeftWidth: 4, padding: 16, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { fontSize: 36 },
  headerText: { flex: 1 },
  headerDir: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  infoCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 12 },
  notesRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  notesValue: { fontSize: 15, fontWeight: '400', marginTop: 4, lineHeight: 21 },
  timeSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  timeSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  mapCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  mapImage: { width: '100%', height: 200 },
  mapOverlay: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapOverlayText: { fontSize: 14, flex: 1 },
  mapOverlayLink: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
});
