import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, ScrollView, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from './AppIcon';

interface ScheduleConfig {
  days: number[];
  weeks: number;
  groupId: string;
}

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (config: ScheduleConfig) => void;
  onDeleteSchedule?: () => void;
  startDate: string;
  moduleColor: string;
  preselectedDays?: number[];
  preselectedWeeks?: number;
  isEditing?: boolean;
}

const WEEK_DAYS = [
  { key: 1, label: 'Man' },
  { key: 2, label: 'Tir' },
  { key: 3, label: 'Ons' },
  { key: 4, label: 'Tor' },
  { key: 5, label: 'Fre' },
  { key: 6, label: 'Lør' },
  { key: 0, label: 'Søn' },
];

const WEEK_OPTIONS = [
  { label: 'Oddetall', value: 'odd' },
  { label: 'Partall', value: 'even' },
  { label: 'Alle', value: 'all' },
];

const WEEK_COUNTS = [2, 4, 8, 12];

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ visible, onClose, onConfirm, onDeleteSchedule, startDate, moduleColor, preselectedDays, preselectedWeeks, isEditing }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [selectedDays, setSelectedDays] = useState<number[]>(preselectedDays || [1]);
  const [weekType, setWeekType] = useState<string>('all');
  const [weekCount, setWeekCount] = useState<number>(preselectedWeeks || 4);
  const [customWeeks, setCustomWeeks] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Reset to preselected values when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedDays(preselectedDays || [1]);
      setWeekCount(preselectedWeeks || 4);
      setShowCustom(false);
      setCustomWeeks('');
    }
  }, [visible, preselectedDays, preselectedWeeks]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const effectiveWeeks = showCustom ? parseInt(customWeeks) || 4 : weekCount;

  const previewDates = useMemo(() => {
    if (selectedDays.length === 0 || effectiveWeeks <= 0) return [];

    const dates: string[] = [];
    const start = new Date(startDate);

    for (let w = 0; w < effectiveWeeks; w++) {
      const weekNum = getWeekNumber(start) + w;

      if (weekType === 'odd' && weekNum % 2 === 0) continue;
      if (weekType === 'even' && weekNum % 2 !== 0) continue;

      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);

        if (selectedDays.includes(date.getDay())) {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          dates.push(dateStr);
        }
      }
    }

    return dates;
  }, [selectedDays, weekType, effectiveWeeks, startDate]);

  const handleConfirm = useCallback(() => {
    if (selectedDays.length === 0 || previewDates.length === 0) return;
    onConfirm({
      days: selectedDays,
      weeks: effectiveWeeks,
      groupId: `schedule_${Date.now()}`,
    });
  }, [selectedDays, effectiveWeeks, previewDates, onConfirm]);

  const DAY_NAMES = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

  if (!visible) return null;

  console.log('ScheduleModal render, visible:', visible);

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlayBg}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: colors.accent }]}>
                  <Text style={{ color: colors.accent, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('schedule.title')}</Text>
                <View style={{ width: 36 }} />
              </View>

              <ScrollView style={styles.content} contentContainerStyle={{ padding: 16 }}>
                {/* Days of week */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('schedule.days')}</Text>
                <View style={styles.dayRow}>
                  {WEEK_DAYS.map((day) => {
                    const isSelected = selectedDays.includes(day.key);
                    return (
                      <TouchableOpacity
                        key={day.key}
                        style={[styles.dayBtn, { backgroundColor: isSelected ? moduleColor : colors.inputBackground, borderColor: isSelected ? moduleColor : colors.border }]}
                        onPress={() => toggleDay(day.key)}
                      >
                        <Text style={[styles.dayBtnText, { color: isSelected ? '#fff' : colors.text }]}>{day.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Week type */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>{t('schedule.repeat')}</Text>
                <View style={styles.weekTypeRow}>
                  {WEEK_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.weekTypeBtn, { backgroundColor: weekType === opt.value ? moduleColor : colors.inputBackground, borderColor: weekType === opt.value ? moduleColor : colors.border }]}
                      onPress={() => setWeekType(opt.value)}
                    >
                      <Text style={[styles.weekTypeBtnText, { color: weekType === opt.value ? '#fff' : colors.text }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Week count */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>{t('schedule.weeks')}</Text>
                <View style={styles.weekCountRow}>
                  {WEEK_COUNTS.map((count) => (
                    <TouchableOpacity
                      key={count}
                      style={[styles.weekCountBtn, { backgroundColor: !showCustom && weekCount === count ? moduleColor : colors.inputBackground, borderColor: !showCustom && weekCount === count ? moduleColor : colors.border }]}
                      onPress={() => { setWeekCount(count); setShowCustom(false); }}
                    >
                      <Text style={[styles.weekCountBtnText, { color: !showCustom && weekCount === count ? '#fff' : colors.text }]}>{count}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.weekCountBtn, { backgroundColor: showCustom ? moduleColor : colors.inputBackground, borderColor: showCustom ? moduleColor : colors.border }]}
                    onPress={() => setShowCustom(true)}
                  >
                    <Text style={[styles.weekCountBtnText, { color: showCustom ? '#fff' : colors.text }]}>{t('schedule.custom')}</Text>
                  </TouchableOpacity>
                  {showCustom && (
                    <TextInput
                      style={[styles.customInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                      value={customWeeks}
                      onChangeText={setCustomWeeks}
                      placeholder="?"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  )}
                </View>

                {/* Preview */}
                {previewDates.length > 0 && (
                  <View style={[styles.previewBox, { backgroundColor: colors.inputBackground }]}>
                    <Text style={[styles.previewTitle, { color: colors.text }]}>
                      {previewDates.length} {t('schedule.events')}
                    </Text>
                    <Text style={[styles.previewDates, { color: colors.textSecondary }]}>
                      {previewDates.slice(0, 6).map(d => {
                        const date = new Date(d);
                        return `${DAY_NAMES[date.getDay()]} ${date.getDate()}.`;
                      }).join(', ')}
                      {previewDates.length > 6 ? ` ... +${previewDates.length - 6}` : ''}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                  {isEditing && onDeleteSchedule && (
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#F44336' }]} onPress={() => { onDeleteSchedule(); onClose(); }}>
                      <Text style={[styles.btnText, { color: '#fff' }]}>{t('schedule.deleteAll')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.btn, { backgroundColor: colors.inputBackground }]} onPress={onClose}>
                    <Text style={[styles.btnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: moduleColor, opacity: previewDates.length > 0 ? 1 : 0.5 }]}
                    onPress={handleConfirm}
                    disabled={previewDates.length === 0}
                  >
                    <Text style={[styles.btnText, { color: '#fff' }]}>
                      {t('schedule.create')} ({previewDates.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  overlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  sheet: { borderTopLeftRadius: 20, borderTopRight: 20, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center' as const, marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' as const, justifyContent: 'center' as const },
  title: { fontSize: 18, fontWeight: '700' },
  content: { maxHeight: '80%' },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  dayRow: { flexDirection: 'row' as const, gap: 8, flexWrap: 'wrap' },
  dayBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, minWidth: 44, alignItems: 'center' as const },
  dayBtnText: { fontSize: 13, fontWeight: '600' },
  weekTypeRow: { flexDirection: 'row' as const, gap: 8 },
  weekTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  weekTypeBtnText: { fontSize: 13, fontWeight: '600' },
  weekCountRow: { flexDirection: 'row' as const, gap: 8, flexWrap: 'wrap' },
  weekCountBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  weekCountBtnText: { fontSize: 13, fontWeight: '600' },
  customInput: { borderWidth: 1, borderRadius: 8, padding: 8, width: 60, textAlign: 'center' as const, fontSize: 16 },
  previewBox: { marginTop: 16, padding: 12, borderRadius: 10 },
  previewTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  previewDates: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row' as const, gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
  btnText: { fontSize: 15, fontWeight: '600' },
});
