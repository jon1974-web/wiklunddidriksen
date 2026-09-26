import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, StyleSheet } from 'react-native';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { HealthAppointment } from '../types';
import { MODULE_COLORS } from '../constants/moduleColors';
import { formatDate, toDateSafe } from '../utils/dateUtils';
import { ActionModal } from '../components/ActionModal';
import { AppIcon } from '../components/AppIcon';
import { deleteHealthAppointment, updateHealthAppointment } from '../services/healthService';
import { DocumentUpload } from '../components/DocumentUpload';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';

interface Props {
  navigation: any;
  route: any;
}

const HEALTH_COLOR = MODULE_COLORS.health;

export const HealthApptDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { appointment } = route.params as { appointment: HealthAppointment };
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyRole = useUserStore((state) => state.familyRole);
  const [showFullNote, setShowFullNote] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documents, setDocuments] = useState<{ url: string; fileName: string; type: 'image' | 'document' }[]>(appointment.documents || []);
  const [scheduleInfo, setScheduleInfo] = useState<{ weekType: string; startDate: string; endDate: string } | null>(null);


  const getWeekNumber = (date: Date): number => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const familyId = useUserStore((state) => state.familyId);


  useEffect(() => {
    const groupId = appointment.scheduleGroupId;
    const familyIdVal = familyId;
    if (groupId && familyIdVal) {
      const loadScheduleInfo = async () => {
        try {
          const q = query(collection(db, 'health', familyIdVal, 'appointments'), where('scheduleGroupId', '==', groupId));
          const snapshot = await getDocs(q);
          const weekNums = new Set<number>();
          let minDate = Infinity;
          let maxDate = -Infinity;
          for (const d of snapshot.docs) {
            const evt = d.data();
            const dateField = evt.dateFrom || evt.date;
            if (dateField) {
              const ts = new Date(dateField).getTime();
              weekNums.add(getWeekNumber(new Date(dateField)));
              if (ts < minDate) minDate = ts;
              if (ts > maxDate) maxDate = ts;
            }
          }
          const hasOdd = Array.from(weekNums).some(w => w % 2 !== 0);
          const hasEven = Array.from(weekNums).some(w => w % 2 === 0);
          const weekType = hasOdd && hasEven ? 'all' : hasOdd ? 'odd' : hasEven ? 'even' : 'all';
          const start = new Date(minDate);
          const end = new Date(maxDate);
          setScheduleInfo({
            weekType,
            startDate: `${start.getDate()}.${start.getMonth() + 1}.${start.getFullYear()}`,
            endDate: `${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`,
          });
        } catch (error) {}
      };
      loadScheduleInfo();
    }
  }, [appointment.scheduleGroupId, familyId]);

  const d = toDateSafe(appointment.dateFrom) || toDateSafe((appointment as any).date);
  const DAY_NAMES = ['SØN', 'MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];
  const dayName = d ? DAY_NAMES[d.getDay()] : '';
  const dayNum = d ? d.getDate() : '';
  const monthStr = d ? MONTHS[d.getMonth()] : '';

  const timeText = useMemo(() => {
    if (appointment.startTime && appointment.endTime) return `${appointment.startTime} — ${appointment.endTime}`;
    return appointment.startTime || '';
  }, [appointment.startTime, appointment.endTime]);

  const mapUrl = useMemo(() => appointment.location ? getStaticMapUrl(appointment.location, 15, '600x300') : null, [appointment.location]);

  const isCompleted = d ? d < new Date() : false;

  const canDelete = (appointment as any).createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin';

  const handleDelete = async () => {
    try {
      await deleteHealthAppointment(familyId || '', appointment.id);
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleCopy = useCallback(() => {
    navigation.navigate('HealthSpace', {
      openAddSection: 'appointments',
      prefill: {
        title: appointment.title,
        person: appointment.person || '',
        doctor: appointment.doctor || '',
        dateFrom: appointment.dateFrom || (appointment as any).date || '',
        dateTo: (appointment as any).dateTo || '',
        startTime: appointment.startTime || '',
        endTime: appointment.endTime || '',
        location: appointment.location || '',
        note: appointment.note || '',
      },
    });
  }, [appointment, navigation]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: MODULE_COLORS.healthBg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: HEALTH_COLOR }]}>
          <Text style={{ color: HEALTH_COLOR, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleCopy} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: HEALTH_COLOR, alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="links" size={16} color={HEALTH_COLOR} />
        </TouchableOpacity>
      </View>

      {/* Top card with calendar icon */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: HEALTH_COLOR, marginBottom: 10, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={styles.calIcon}>
            <View style={[styles.calTopBar, { backgroundColor: HEALTH_COLOR }]}>
              <Text style={styles.calDayName}>{dayName}</Text>
            </View>
            <Text style={[styles.calDayNum, { color: colors.text }]}>{dayNum}</Text>
            <Text style={[styles.calMonth, { color: colors.textSecondary }]}>{monthStr}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.title, { color: colors.text, flex: 1 }]} numberOfLines={3}>{appointment.title}</Text>
              {appointment.documents && appointment.documents.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <AppIcon name="file" size={12} color="#1976D2" />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#1976D2' }}>{appointment.documents.length}</Text>
                </View>
              )}
            </View>
            {timeText ? (
              <Text style={[styles.timeText, { color: '#333' }]}>{timeText}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <View style={[styles.badge, { backgroundColor: isCompleted ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: isCompleted ? '#43A047' : '#FB8C00' }}>
                  {isCompleted ? t('health.completed') : getDaysUntil(appointment.dateFrom)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Detail card */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: HEALTH_COLOR, backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: HEALTH_COLOR }]}>{t('common.details')}</Text>
        {appointment.scheduleGroupId && (
          <View style={styles.viewDetailRow}>
            <View style={[styles.viewDetailLabel, { alignItems: 'center', justifyContent: 'center' }]}><AppIcon name="schedule" size={18} color={colors.textSecondary} /></View>
            <Text style={[styles.viewDetailValue, { color: colors.text }]}>
              {scheduleInfo ? `${t('health.recurrenceInfo')} · ${scheduleInfo.weekType === 'odd' ? t('health.recurrenceOdd') : scheduleInfo.weekType === 'even' ? t('health.recurrenceEven') : t('health.recurrenceAll')} · ${scheduleInfo.startDate} – ${scheduleInfo.endDate}` : t('health.recurrenceInfo')}
            </Text>
          </View>
        )}
        {(() => {
          const dateFrom = appointment.dateFrom || (appointment as any).date;
          const dateTo = (appointment as any).dateTo;
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
        {appointment.person && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>👤</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {Array.isArray(appointment.person) ? (appointment.person as any[]).join(', ') : appointment.person}
            </Text>
          </View>
        )}
        {appointment.location && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>📍</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>{appointment.location}</Text>
          </View>
        )}
        {appointment.doctor && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>👩‍⚕️</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{appointment.doctor}</Text>
          </View>
        )}
        {appointment.note && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }}>📝</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: HEALTH_COLOR }}>{t('common.note')}</Text>
            </View>
            <View style={{ paddingLeft: 22 }}>
              <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={showFullNote ? undefined : 2}>
                {appointment.note}
              </Text>
              {appointment.note.length > 60 && (
                <TouchableOpacity onPress={() => setShowFullNote(!showFullNote)}>
                  <Text style={{ fontSize: 12, color: HEALTH_COLOR, fontWeight: '600', marginTop: 4 }}>
                    {showFullNote ? t('common.back') : t('common.readMore')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Map */}
      {appointment.location && mapUrl && (
        <View style={[styles.card, { padding: 0, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: HEALTH_COLOR, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(appointment.location!))} style={{ width: '100%', height: 140 }}>
            <Image source={{ uri: mapUrl }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(appointment.location!))} style={{ padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: HEALTH_COLOR, fontWeight: '600' }}>{t('tips.openGoogleMaps')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Documents */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: HEALTH_COLOR, backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: HEALTH_COLOR }]}>{t('homes.documents')}</Text>
        {documents && documents.length > 0 && (
          documents.map((doc, i) => (
            <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < (documents?.length || 0) - 1 ? 1 : 0, borderBottomColor: colors.border }} onPress={() => Linking.openURL(doc.url)}>
              {doc.type === 'image' ? (
                <Image source={{ uri: doc.url }} style={{ width: 48, height: 48, borderRadius: 8 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>📄</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{doc.fileName}</Text>
                <Text style={{ fontSize: 12, color: HEALTH_COLOR }}>{t('documents.open')} →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ marginTop: 8 }}>
          <DocumentUpload
            storagePath={`health/${familyId}/${appointment.id}/documents`}
            onUploaded={async (doc) => {
              const docs = [...(documents || []), doc];
              await updateHealthAppointment(familyId || '', appointment.id, { documents: docs });
              setDocuments(docs);
            }}
            accentColor={HEALTH_COLOR}
          />
        </View>
      </View>

      {/* Button box */}
      <View style={[styles.card, { marginTop: 10, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: HEALTH_COLOR, flex: 1 }]}
            onPress={() => {
              const source = route.params?.source || 'health';
              navigation.navigate('HealthSpace', { editId: appointment.id, editSection: 'appointments', returnToEvents: source === 'events' });
            }}
          >
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>{t('common.edit')}</Text>
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
        title={appointment.title}
        onDelete={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </ScrollView>
  );
};

const getDaysUntil = (date: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  return `${diff} dager`;
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
  viewDetailLabel: { fontSize: 16, width: 24, textAlign: "center" },
  viewDetailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  viewDetailValue: { fontSize: 14, flex: 1, textAlign: 'left', marginLeft: 4 },
  actionButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
});
