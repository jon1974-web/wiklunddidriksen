import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { HomeService, Home } from '../types';
import { MODULE_COLORS } from '../constants/moduleColors';
import { formatDate } from '../utils/dateUtils';
import { REMINDER_OPTIONS } from '../constants/reminderOptions';
import { ActionModal } from '../components/ActionModal';
import { AppIcon } from '../components/AppIcon';
import { deleteHomeService } from '../services/homeService';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';

interface Props {
  navigation: any;
  route: any;
}

const HOME_COLOR = MODULE_COLORS.home;

const FREQUENCY_OPTIONS = [
  { value: 'once', labelKey: 'homes.freqOnce' },
  { value: 'monthly', labelKey: 'homes.freqMonthly' },
  { value: 'quarterly', labelKey: 'homes.freqQuarterly' },
  { value: 'yearly', labelKey: 'homes.freqYearly' },
] as const;

const getDaysUntil = (date: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  if (diff > 0) return `Om ${diff} dager`;
  const absDiff = Math.abs(diff);
  if (absDiff === 1) return 'I går';
  return `${absDiff} dager siden`;
};

export const HomeServiceDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { service, home } = route.params as { service: HomeService; home?: Home };
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyRole = useUserStore((state) => state.familyRole);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const d = new Date(service.dateFrom);
  const DAY_NAMES = ['SØN', 'MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];
  const dayName = DAY_NAMES[d.getDay()];
  const dayNum = d.getDate();
  const monthStr = MONTHS[d.getMonth()];

  const timeText = useMemo(() => {
    if (service.startTime && service.endTime) return `${service.startTime} — ${service.endTime}`;
    return service.startTime || '';
  }, [service.startTime, service.endTime]);

  const isPast = d < new Date();

  const freqLabel = FREQUENCY_OPTIONS.find((f) => f.value === service.frequency);
  const reminderLabel = REMINDER_OPTIONS.find((r) => r.value === service.reminder);

  const canDelete = familyRole === 'owner' || familyRole === 'admin';

  const handleDelete = async () => {
    try {
      await deleteHomeService(service.id);
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: MODULE_COLORS.homeBg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: HOME_COLOR }]}>
          <Text style={{ color: HOME_COLOR, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      {/* Top card with calendar icon */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: HOME_COLOR, marginBottom: 10, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={styles.calIcon}>
            <View style={[styles.calTopBar, { backgroundColor: HOME_COLOR }]}>
              <Text style={styles.calDayName}>{dayName}</Text>
            </View>
            <Text style={[styles.calDayNum, { color: colors.text }]}>{dayNum}</Text>
            <Text style={[styles.calMonth, { color: colors.textSecondary }]}>{monthStr}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text, flex: 1 }]} numberOfLines={3}>{service.title}</Text>
            {timeText ? (
              <Text style={[styles.timeText, { color: '#333' }]}>{timeText}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <View style={[styles.badge, { backgroundColor: isPast ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: isPast ? '#43A047' : '#FB8C00' }}>
                  {getDaysUntil(service.dateFrom)}
                </Text>
              </View>
              {service.status === 'completed' && (
                <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#43A047' }}>✓ {t('homes.projectCompleted')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Detail card */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: HOME_COLOR, backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: HOME_COLOR }]}>{t('common.details')}</Text>
        {(() => {
          const dateFrom = service.dateFrom;
          const dateTo = service.dateTo;
          const dateText = dateTo && dateTo !== dateFrom
            ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
            : formatDate(dateFrom);
          return (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>📅</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{dateText}</Text>
            </View>
          );
        })()}
        {home && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>🏠</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{home.name}</Text>
          </View>
        )}
        {freqLabel && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>🔄</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{t(freqLabel.labelKey)}</Text>
          </View>
        )}
        {reminderLabel && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>🔔</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{reminderLabel.label}</Text>
          </View>
        )}
        {service.description ? (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }}>📝</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: HOME_COLOR }}>{t('homes.description')}</Text>
            </View>
            <View style={{ paddingLeft: 22 }}>
              <Text style={{ fontSize: 14, color: colors.text }}>{service.description}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Button box */}
      <View style={[styles.card, { marginTop: 10, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: HOME_COLOR, flex: 1 }]}
            onPress={() => {
              navigation.goBack();
            }}
          >
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>{t('common.close')}</Text>
          </TouchableOpacity>
          {canDelete && (
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#fff', borderColor: colors.danger, borderWidth: 1.5, flex: 1 }]} onPress={() => setShowDeleteModal(true)}>
              <Text style={[styles.actionButtonText, { color: colors.danger }]}>{t('common.delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ActionModal
        visible={showDeleteModal}
        title={service.title}
        onDelete={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  card: { borderRadius: 12, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  calIcon: { width: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  calTopBar: { height: 16, alignItems: 'center', justifyContent: 'center' },
  calDayName: { fontSize: 9, fontWeight: '700', color: '#fff' },
  calDayNum: { fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 30, marginTop: 2 },
  calMonth: { fontSize: 10, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '700' },
  timeText: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  detailLabel: { fontSize: 16, width: 24, textAlign: 'center' },
  detailValue: { fontSize: 14, flex: 1, textAlign: 'left', marginLeft: 4 },
  actionButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
});
