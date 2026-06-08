import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Trip } from '../types';
import { getTrips } from '../services/tripService';
import { formatDate } from '../utils/dateUtils';
import { getErrorMessage } from '../utils/validation';
import { GOOGLE_MAPS_API_KEY } from '../constants/api';
import { MAP_ZOOM, MAP_SIZE } from '../constants/limits';

interface TripsScreenProps {
  navigation: any;
}

export const TripsScreen: React.FC<TripsScreenProps> = ({ navigation }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  const loadTrips = useCallback(async () => {
    try {
      const data = await getTrips();
      setTrips(data);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadTrips);
    return unsubscribe;
  }, [navigation, loadTrips]);

  const renderTrip = ({ item }: { item: Trip }) => {
    const locationQuery = item.country ? `${item.city}, ${item.country}` : item.city;
    const tripMapUrl = item.city
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(locationQuery)}&zoom=${MAP_ZOOM}&size=${MAP_SIZE}&markers=color:red%7C${encodeURIComponent(locationQuery)}&key=${GOOGLE_MAPS_API_KEY}`
      : null;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('TripDetail', { trip: item })}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>✈️</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            </View>
            <Text style={[styles.cardLocation, { color: colors.textSecondary }]}>
              {item.city}{item.country ? `, ${item.country}` : ''}
            </Text>
            <Text style={[styles.cardDateText, { color: colors.textSecondary }]}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
          </View>
          {tripMapUrl && (
            <TouchableOpacity
              style={styles.mapContainer}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;
                Linking.openURL(url);
              }}
            >
              <Image source={{ uri: tripMapUrl }} style={styles.mapImage} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>✈️ Reiser</Text>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Laster...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✈️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Ingen reiser ennå</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Trykk + for å planlegge en ny reise
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
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
    lineHeight: 30,
  },
});
