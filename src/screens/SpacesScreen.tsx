import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { getTrips } from '../services/tripService';
import { getHealthAppointments, getHealthMedications, getHealthVaccinations } from '../services/healthService';
import { getSchoolChildren } from '../services/schoolService';
import { getKindergartenChildren } from '../services/kindergartenService';
import { getPets } from '../services/petService';
import { MODULE_COLORS } from '../constants/moduleColors';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

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
  const familyName = useUserStore((state) => state.familyName);
  const [tripCount, setTripCount] = useState(0);
  const [healthCount, setHealthCount] = useState(0);
  const [schoolCount, setSchoolCount] = useState(0);
  const [kindergartenCount, setKindergartenCount] = useState(0);
  const [petCount, setPetCount] = useState(0);
  const [birthdayCount, setBirthdayCount] = useState(0);

  useEffect(() => {
    if (!familyId) return;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonth = today.getMonth();

    // Trips - active trips
    getTrips(familyId).then(trips => {
      const active = trips.filter(trip => trip.endDate >= todayStr);
      setTripCount(active.length);
    }).catch(() => {});

    // Health - active medications + upcoming appointments + vaccinations
    Promise.all([
      getHealthAppointments(familyId),
      getHealthMedications(familyId),
      getHealthVaccinations(familyId),
    ]).then(([appts, meds, vaccs]) => {
      const futureAppts = appts.filter(a => a.date >= todayStr);
      const activeMeds = meds.filter(m => {
        if (m.dateTo && m.dateTo < todayStr) return false;
        if (m.dateFrom && m.dateFrom > todayStr) return false;
        return true;
      });
      const futureVaccs = vaccs.filter(v => v.date >= todayStr);
      setHealthCount(futureAppts.length + activeMeds.length + futureVaccs.length);
    }).catch(() => {});

    // School - number of children
    getSchoolChildren(familyId).then(children => {
      setSchoolCount(children.length);
    }).catch(() => {});

    // Kindergarten - number of children
    getKindergartenChildren(familyId).then(children => {
      setKindergartenCount(children.length);
    }).catch(() => {});

    // Pets - number of pets
    getPets(familyId).then(pets => {
      setPetCount(pets.length);
    }).catch(() => {});

    // Birthdays - birthdays this month
    const q = query(collection(db, 'birthdays'), where('familyId', '==', familyId));
    getDocs(q).then(snapshot => {
      const monthBirthdays = snapshot.docs.filter(doc => {
        const data = doc.data();
        const bDate = new Date(data.date);
        return bDate.getMonth() === currentMonth;
      });
      setBirthdayCount(monthBirthdays.length);
    }).catch(() => {});
  }, [familyId]);

  const spaces: Space[] = [
    {
      id: 'trips',
      name: t('spaces.trips'),
      icon: 'compass',
      iconColor: MODULE_COLORS.trips,
      count: tripCount > 0 ? t('spaces.tripsCount', { count: tripCount }) : '',
      screen: 'TripsList',
    },
    {
      id: 'health',
      name: t('spaces.health'),
      icon: 'medication',
      iconColor: MODULE_COLORS.health,
      count: healthCount > 0 ? t('spaces.healthCount', { count: healthCount }) : '',
      screen: 'HealthSpace',
    },
    {
      id: 'school',
      name: t('spaces.school'),
      icon: 'documents',
      iconColor: MODULE_COLORS.school,
      count: schoolCount > 0 ? t('spaces.schoolCount', { count: schoolCount }) : '',
      screen: 'SchoolSpace',
    },
    {
      id: 'kindergarten',
      name: t('spaces.kindergarten'),
      icon: 'pet',
      iconColor: MODULE_COLORS.kindergarten,
      count: kindergartenCount > 0 ? t('spaces.kindergartenCount', { count: kindergartenCount }) : '',
      screen: 'KindergartenSpace',
      disabled: true,
    },
    {
      id: 'birthdays',
      name: t('spaces.birthdays'),
      icon: 'birthday',
      iconColor: MODULE_COLORS.birthdays,
      count: birthdayCount > 0 ? t('spaces.birthdayCount', { count: birthdayCount }) : '',
      screen: 'BirthdaySpace',
    },
    {
      id: 'pets',
      name: t('spaces.pets'),
      icon: 'activities',
      iconColor: MODULE_COLORS.pets,
      count: petCount > 0 ? t('spaces.petsCount', { count: petCount }) : '',
      screen: 'PetSpace',
    },
    {
      id: 'mealplan',
      name: t('spaces.mealplan'),
      icon: 'utensils',
      iconColor: MODULE_COLORS.mealplan,
      count: '',
      screen: 'MealPlan',
    },
    {
      id: 'home',
      name: t('spaces.home'),
      icon: 'hotel',
      iconColor: MODULE_COLORS.home,
      count: '',
      screen: 'HomeSpace',
      disabled: true,
    },
  ];

  const renderSpace = useCallback(({ item }: { item: Space }) => (
    <TouchableOpacity
      style={[styles.spaceCard, { backgroundColor: colors.surface, borderLeftColor: item.disabled ? '#ccc' : item.iconColor, opacity: item.disabled ? 0.5 : 1 }]}
      onPress={() => !item.disabled && navigation.navigate(item.screen)}
      disabled={item.disabled}
    >
      <AppIcon name={item.icon as any} size={36} color={item.disabled ? '#ccc' : item.iconColor} />
      <Text style={[styles.spaceName, { color: item.disabled ? '#aaa' : colors.text }]}>{item.name}</Text>
      <Text style={[styles.spaceCount, { color: item.disabled ? '#ccc' : colors.textSecondary }]}>{item.count}</Text>
      {item.disabled && <Text style={{ color: '#E53935', fontSize: 10, fontWeight: '600', marginTop: 4 }}>Kommer snart</Text>}
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
          <Image source={require('../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 9 }} />
        </View>
        {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary }]}>{familyName}</Text> : null}
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
  familySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 36,
    marginTop: -4,
    marginBottom: 8,
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
    fontSize: 13,
  },
});
