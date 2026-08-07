import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Trip, WeatherDay } from '../types';
import { getTrips, deleteTrip } from '../services/tripService';
import { formatDate, getTodayLocal } from '../utils/dateUtils';
import { getErrorMessage } from '../utils/validation';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { useUserStore } from '../store/userStore';
import { crossAlert } from '../utils/alert';
import { ActionModal } from '../components/ActionModal';
import { getForecast, wmoToEmoji, geocodeCity, tempColor } from '../services/weatherService';
import { AppIcon } from '../components/AppIcon';

interface TripsScreenProps {
  navigation: any;
}

export const TripsScreen: React.FC<TripsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherDay[]>>({});
  const [refreshingWeather, setRefreshingWeather] = useState<Record<string, boolean>>({});
  const fetchedRef = useRef<Set<string>>(new Set());
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
  const user = useUserStore((state) => state.user);
  const familyRole = useUserStore((state) => state.familyRole);
  const { colors } = useTheme();
  const [tripActionModal, setTripActionModal] = useState<{ visible: boolean; title: string; onDelete?: () => void }>({ visible: false, title: '' });

  const today = getTodayLocal();

  const isUpcomingOrActive = useCallback((trip: Trip) => {
    return trip.endDate >= today;
  }, [today]);

  const getChipBg = (min: number, max: number) => {
    const avg = (min + max) / 2;
    if (avg >= 25) return 'rgba(252, 228, 236, 0.9)';
    if (avg >= 15) return 'rgba(255, 243, 224, 0.9)';
    if (avg >= 10) return 'rgba(232, 234, 246, 0.9)';
    return 'rgba(224, 242, 241, 0.9)';
  };

  const fetchWeatherForTrip = useCallback(async (trip: Trip) => {
    let lat = trip.latitude;
    let lon = trip.longitude;
    if (!lat || !lon) {
      const locationQuery = trip.country ? `${trip.city}, ${trip.country}` : trip.city;
      const coords = await geocodeCity(locationQuery);
      if (!coords) return;
      lat = coords.latitude;
      lon = coords.longitude;
    }
    if (isUpcomingOrActive(trip)) {
      const forecast = await getForecast(lat, lon, 1);
      if (forecast.length > 0) {
        setWeatherMap((prev) => ({ ...prev, [trip.id]: forecast }));
      }
    } else if (trip.weatherSummary && trip.weatherSummary.length > 0) {
      setWeatherMap((prev) => ({ ...prev, [trip.id]: trip.weatherSummary! }));
    }
  }, [isUpcomingOrActive]);

  const loadTrips = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getTrips(familyId);
      setTrips(data);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadTrips);
    return unsubscribe;
  }, [navigation, loadTrips]);

  useEffect(() => {
    for (const trip of trips) {
      if (!fetchedRef.current.has(trip.id)) {
        fetchedRef.current.add(trip.id);
        fetchWeatherForTrip(trip);
      }
    }
  }, [trips, fetchWeatherForTrip]);

  const handleRefreshWeather = useCallback(async (trip: Trip) => {
    setRefreshingWeather((prev) => ({ ...prev, [trip.id]: true }));
    fetchedRef.current.delete(trip.id);
    await fetchWeatherForTrip(trip);
    setRefreshingWeather((prev) => ({ ...prev, [trip.id]: false }));
  }, [fetchWeatherForTrip]);

  const renderTrip = ({ item }: { item: Trip }) => {
    const locationQuery = item.country ? `${item.city}, ${item.country}` : item.city;
    const tripMapUrl = item.city ? getStaticMapUrl(locationQuery) : null;
    const weather = weatherMap[item.id];
    const isActive = isUpcomingOrActive(item);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('TripDetail', { trip: item })}
        delayLongPress={500}
        onLongPress={() => {
          const canDeleteTrip = item.createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin';
          if (canDeleteTrip) {
            setTripActionModal({
              visible: true,
              title: item.title,
              onDelete: async () => {
                try {
                  await deleteTrip(item.id);
                  setTripActionModal({ visible: false, title: '' });
                  loadTrips();
                } catch (error) {
                  crossAlert('Error', getErrorMessage(error));
                }
              },
            });
          }
        }}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>{item.icon || '✈️'}</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            </View>
            <Text style={[styles.cardLocation, { color: colors.textSecondary }]}>
              {item.city}{item.country ? `, ${item.country}` : ''}
            </Text>
            <Text style={[styles.cardDateText, { color: colors.textSecondary }]}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
            {weather && weather.length > 0 && (
              <View style={[styles.weatherChip, { backgroundColor: getChipBg(weather[0].tempMin, weather[0].tempMax) }]}>
                <Text style={styles.weatherEmoji}>{wmoToEmoji(weather[0].weatherCode)}</Text>
                <Text style={[styles.weatherTemp, { color: colors.text }]}>
                  <Text style={{ color: tempColor(weather[0].tempMin) }}>{weather[0].tempMin}°</Text>
                  {' / '}
                  <Text style={{ color: tempColor(weather[0].tempMax) }}>{weather[0].tempMax}°</Text>
                </Text>
                {isActive && (
                  <TouchableOpacity
                    onPress={() => handleRefreshWeather(item)}
                    disabled={refreshingWeather[item.id]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.refreshIcon}>
                      {refreshingWeather[item.id] ? '⟳' : '↻'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          {tripMapUrl && (
            <TouchableOpacity
              style={styles.mapContainer}
              onPress={() => Linking.openURL(getGoogleMapsUrl(locationQuery))}
            >
              <Image source={{ uri: tripMapUrl }} style={styles.mapImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 8 }}>
        <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
      </TouchableOpacity>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="compass" size={28} color={colors.accent} />
            <Text style={[styles.screenTitle, { color: colors.text }]}>{t('trips.title')}</Text>
          </View>
        </View>
        {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary }]}>{familyName}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✈️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('trips.noTrips')}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('common.add')} + 
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => navigation.navigate('AddTrip')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <ActionModal
        visible={tripActionModal.visible}
        title={tripActionModal.title}
        onDelete={tripActionModal.onDelete}
        onCancel={() => setTripActionModal({ visible: false, title: '' })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  familySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 36,
    marginTop: -4,
    marginBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#0097A7',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardLocation: {
    fontSize: 14,
  },
  cardDateText: {
    fontSize: 14,
  },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingLeft: 6,
    paddingRight: 10,
    paddingTop: 4,
    paddingBottom: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  weatherEmoji: {
    fontSize: 18,
  },
  weatherTemp: {
    fontSize: 13,
    fontWeight: '500',
  },
  refreshIcon: {
    fontSize: 12,
    color: '#0097A7',
    marginLeft: 2,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30,
    textAlign: 'center',
  },
});
