import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { SchoolChild, SchoolYear, SchoolSchedule } from '../types';
import { useUserStore } from '../store/userStore';
import { getSchoolSchedules } from '../services/schoolService';

const SCHOOL_THEME = MODULE_COLORS.school;
const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

interface Props {
  navigation: any;
  route: { params: { child: SchoolChild; selectedYear: SchoolYear | null } };
}

export const SchoolScheduleScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child, selectedYear } = route.params;
  const familyId = useUserStore((state) => state.familyId);
  const [schedules, setSchedules] = useState<SchoolSchedule[]>([]);

  const loadSchedules = useCallback(async () => {
    if (!familyId || !selectedYear) return;
    const data = await getSchoolSchedules(familyId, selectedYear.id);
    setSchedules(data);
  }, [familyId, selectedYear]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const grouped = DAYS.map(day => ({
    day,
    items: schedules.filter(s => s.day === day).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: SCHOOL_THEME }]}>
          <Text style={{ color: SCHOOL_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <AppIcon name="schedule" size={24} color={SCHOOL_THEME} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('school.schedule')} — {child.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        {grouped.map(({ day, items }) => (
          <View key={day} style={[styles.daySection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dayTitle, { color: SCHOOL_THEME }]}>{day}</Text>
            {items.length > 0 ? items.map((s, i) => (
              <View key={s.id || i} style={[styles.scheduleItem, { borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
                <Text style={[styles.scheduleTime, { color: colors.text }]}>{s.startTime || ''} → {s.endTime || ''}</Text>
                <Text style={[styles.scheduleSubject, { color: colors.text }]}>{s.subject || ''}</Text>
              </View>
            )) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noSchedule')}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  daySection: { borderRadius: 12, marginBottom: 10, padding: 12 },
  dayTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  scheduleTime: { fontSize: 13, fontWeight: '600', width: 100 },
  scheduleSubject: { fontSize: 14, flex: 1 },
  emptyText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: 8 },
});
