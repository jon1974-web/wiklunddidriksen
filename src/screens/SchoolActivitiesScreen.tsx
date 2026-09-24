import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { SchoolChild, SchoolYear, SchoolActivity } from '../types';
import { useUserStore } from '../store/userStore';
import { getSchoolActivities, addSchoolActivity } from '../services/schoolService';
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
    if (!familyId || !child) return;
    const data = await getSchoolActivities(familyId, child.id);
    setActivities(data);
  }, [familyId, child]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const today = new Date().toISOString().split('T')[0];
  const sorted = [...activities].sort((a, b) => {
    const aPast = (a.dateTo || a.dateFrom) < today;
    const bPast = (b.dateTo || b.dateFrom) < today;
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;
    if (aPast && bPast) return (b.dateFrom || '').localeCompare(a.dateFrom || '');
    return (a.dateFrom || '').localeCompare(b.dateFrom || '');
  });

  const getDaysUntil = (dateStr: string): string => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return t('health.past');
    if (diff === 0) return t('health.today');
    if (diff === 1) return t('health.tomorrow');
    return t('health.inDays', { count: diff });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: SCHOOL_THEME, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: SCHOOL_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="activities" size={28} color={SCHOOL_THEME} />
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('school.activities')} {child.name}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="activities" size={18} color={SCHOOL_THEME} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.activities')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>({activities.length})</Text>
            </View>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: SCHOOL_THEME }]} onPress={() => navigation.navigate('SchoolSpace', { openAddSection: 'activities', childId: child.id, yearId: selectedYear?.id })}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
          {sorted.map(a => {
            const isPast = (a.dateTo || a.dateFrom) < today;
            return (
              <TouchableOpacity key={a.id} style={[styles.activityCard, { backgroundColor: colors.surface, opacity: isPast ? 0.6 : 1 }]} onPress={() => navigation.navigate('SchoolActivityDetail', { activity: a, childId: child.id, yearId: selectedYear?.id })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.activityIcon, { backgroundColor: SCHOOL_THEME + '15' }]}>
                    <AppIcon name="activities" size={20} color={SCHOOL_THEME} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{a.title}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(a.dateFrom)}{a.dateTo ? ` → ${formatDate(a.dateTo)}` : ''} {a.startTime ? `${a.startTime}–${a.endTime || ''}` : ''}</Text>
                  </View>
                  <Text style={[styles.badge, { backgroundColor: isPast ? '#E8F5E9' : '#FFF3E0', color: isPast ? '#43A047' : '#FB8C00' }]}>{isPast ? t('health.completed') : getDaysUntil(a.dateFrom)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {activities.length === 0 && (
            <View style={styles.emptyState}>
              <AppIcon name="activities" size={48} color={colors.textDisabled} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>{t('school.noActivities')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  screenTitle: { fontSize: 22, fontWeight: '700' },
  addBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activityCard: { padding: 12, borderRadius: 10, marginBottom: 6 },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  badge: { fontSize: 11, fontWeight: '600', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  section: { borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
});
