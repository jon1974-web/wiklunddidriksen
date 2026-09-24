import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { SchoolChild, SchoolYear, SchoolActivity } from '../types';
import { useUserStore } from '../store/userStore';
import { getSchoolActivities } from '../services/schoolService';
import { formatDate } from '../utils/dateUtils';

const SCHOOL_THEME = MODULE_COLORS.school;

interface Props {
  navigation: any;
  route: { params: { child: SchoolChild; selectedYear: SchoolYear | null } };
}

export const SchoolActivitiesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child, selectedYear } = route.params;
  const familyId = useUserStore((state) => state.familyId);
  const [activities, setActivities] = useState<SchoolActivity[]>([]);

  const loadActivities = useCallback(async () => {
    if (!familyId || !selectedYear) return;
    const { getSchoolActivities: load } = await import('../services/schoolService');
    const data = await load(familyId, selectedYear.id);
    setActivities(data);
  }, [familyId, selectedYear]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = activities.filter(a => (a.dateTo || a.dateFrom) >= today);
  const past = activities.filter(a => (a.dateTo || a.dateFrom) < today);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: SCHOOL_THEME }]}>
          <Text style={{ color: SCHOOL_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <AppIcon name="activities" size={24} color={SCHOOL_THEME} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('school.activities')} — {child.name}</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: SCHOOL_THEME }]} onPress={() => navigation.navigate('SchoolSpace', { openAddSection: 'activities', childId: child.id, yearId: selectedYear?.id })}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        {upcoming.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('events.upcoming')} ({upcoming.length})</Text>
            {upcoming.map(a => (
              <TouchableOpacity key={a.id} style={[styles.activityCard, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('SchoolActivityDetail', { activity: a, childId: child.id, yearId: selectedYear?.id })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.activityIcon, { backgroundColor: SCHOOL_THEME + '15' }]}>
                    <AppIcon name="activities" size={20} color={SCHOOL_THEME} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{a.title}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(a.dateFrom)}{a.dateTo ? ` → ${formatDate(a.dateTo)}` : ''} {a.startTime ? `${a.startTime}–${a.endTime || ''}` : ''}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        {past.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>{t('events.past')} ({past.length})</Text>
            {past.map(a => (
              <TouchableOpacity key={a.id} style={[styles.activityCard, { backgroundColor: colors.surface, opacity: 0.6 }]} onPress={() => navigation.navigate('SchoolActivityDetail', { activity: a, childId: child.id, yearId: selectedYear?.id })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.activityIcon, { backgroundColor: SCHOOL_THEME + '15' }]}>
                    <AppIcon name="activities" size={20} color={SCHOOL_THEME} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{a.title}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(a.dateFrom)}{a.dateTo ? ` → ${formatDate(a.dateTo)}` : ''}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        {activities.length === 0 && (
          <View style={styles.emptyState}>
            <AppIcon name="activities" size={48} color={colors.textDisabled} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>{t('school.noActivities')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  activityCard: { padding: 12, borderRadius: 10, marginBottom: 6 },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', marginTop: 60 },
});
