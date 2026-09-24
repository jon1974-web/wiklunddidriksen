import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { SchoolChild, SchoolYear, SchoolHoliday } from '../types';
import { useUserStore } from '../store/userStore';
import { getSchoolHolidays } from '../services/schoolService';
import { formatDate } from '../utils/dateUtils';

const SCHOOL_THEME = MODULE_COLORS.school;

interface Props {
  navigation: any;
  route: { params: { child: SchoolChild; selectedYear: SchoolYear | null } };
}

export const SchoolHolidaysScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child, selectedYear } = route.params;
  const familyId = useUserStore((state) => state.familyId);
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);

  const loadHolidays = useCallback(async () => {
    if (!familyId || !selectedYear) return;
    const data = await getSchoolHolidays(familyId, selectedYear.id);
    setHolidays(data);
  }, [familyId, selectedYear]);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = holidays.filter(h => (h.dateTo || h.dateFrom) >= today);
  const past = holidays.filter(h => (h.dateTo || h.dateFrom) < today);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: SCHOOL_THEME }]}>
          <Text style={{ color: SCHOOL_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18 }}>🎉</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('school.holidays')} — {child.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        {upcoming.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('events.upcoming')} ({upcoming.length})</Text>
            {upcoming.map(h => (
              <View key={h.id} style={[styles.holidayCard, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 18 }}>🎉</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{h.title}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(h.dateFrom)} → {formatDate(h.dateTo || h.dateFrom)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
        {past.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>{t('events.past')} ({past.length})</Text>
            {past.map(h => (
              <View key={h.id} style={[styles.holidayCard, { backgroundColor: colors.surface, opacity: 0.6 }]}>
                <Text style={{ fontSize: 18 }}>🎉</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{h.title}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(h.dateFrom)} → {formatDate(h.dateTo || h.dateFrom)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
        {holidays.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>🎉</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>{t('school.noHolidays')}</Text>
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
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  holidayCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, marginBottom: 6 },
  emptyState: { alignItems: 'center', marginTop: 60 },
});
