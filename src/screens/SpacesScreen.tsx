import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { getTrips } from '../services/tripService';

interface Space {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  count: string;
  screen: string;
}

interface SpacesScreenProps {
  navigation: any;
}

export const SpacesScreen: React.FC<SpacesScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const familyId = useUserStore((state) => state.familyId);
  const [tripCount, setTripCount] = useState(0);

  useEffect(() => {
    if (!familyId) return;
    getTrips(familyId).then(trips => {
      const today = new Date().toISOString().split('T')[0];
      const active = trips.filter(trip => trip.endDate >= today);
      setTripCount(active.length);
    }).catch(() => {});
  }, [familyId]);

  const spaces: Space[] = [
    {
      id: 'trips',
      name: t('spaces.trips'),
      icon: 'compass',
      iconColor: colors.accent,
      count: t('spaces.tripsCount', { count: tripCount }),
      screen: 'TripsList',
    },
    {
      id: 'health',
      name: t('spaces.health'),
      icon: 'transport',
      iconColor: '#E53935',
      count: t('spaces.healthCount', { count: 2 }),
      screen: 'HealthSpace',
    },
    {
      id: 'school',
      name: t('spaces.school'),
      icon: 'documents',
      iconColor: '#43A047',
      count: t('spaces.schoolCount', { count: 3 }),
      screen: 'SchoolSpace',
    },
    {
      id: 'birthdays',
      name: t('spaces.birthdays'),
      icon: 'birthday',
      iconColor: '#FB8C00',
      count: t('spaces.birthdayCount', { count: 2 }),
      screen: 'BirthdaySpace',
    },
    {
      id: 'pets',
      name: t('spaces.pets'),
      icon: 'activities',
      iconColor: '#8E24AA',
      count: t('spaces.petsCount', { count: 1 }),
      screen: 'PetsSpace',
    },
    {
      id: 'home',
      name: t('spaces.home'),
      icon: 'hotel',
      iconColor: '#5C6BC0',
      count: t('spaces.homeCount', { count: 4 }),
      screen: 'HomeSpace',
    },
  ];

  const renderSpace = useCallback(({ item }: { item: Space }) => (
    <TouchableOpacity
      style={[styles.spaceCard, { backgroundColor: colors.surface, borderLeftColor: item.iconColor }]}
      onPress={() => navigation.navigate(item.screen)}
    >
      <AppIcon name={item.icon as any} size={36} color={item.iconColor} />
      <Text style={[styles.spaceName, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.spaceCount, { color: colors.textSecondary }]}>{item.count}</Text>
    </TouchableOpacity>
  ), [colors, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="house" size={28} color={colors.accent} />
            <Text style={[styles.screenTitle, { color: colors.text }]}>{t('spaces.title')}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={spaces}
        renderItem={renderSpace}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
  list: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  spaceCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  spaceName: {
    fontSize: 14,
    fontWeight: '700',
  },
  spaceCount: {
    fontSize: 11,
  },
});
