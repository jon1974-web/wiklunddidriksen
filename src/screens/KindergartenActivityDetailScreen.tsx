import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { KindergartenActivity } from '../types';
import { MODULE_COLORS } from '../constants/moduleColors';
import { ActionModal } from '../components/ActionModal';
import { deleteKindergartenActivity } from '../services/kindergartenService';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { toDateSafe } from '../utils/dateUtils';

interface Props {
  navigation: any;
  route: any;
}

const KINDERGARTEN_COLOR = MODULE_COLORS.kindergarten;

export const KindergartenActivityDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { activity, source } = route.params as { activity: KindergartenActivity; source?: string };
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyRole = useUserStore((state) => state.familyRole);
  const [showFullNote, setShowFullNote] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const d = toDateSafe(activity.dateFrom) || toDateSafe((activity as any).date);
  const DAY_NAMES = ['SØN', 'MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];
  const dayName = d ? DAY_NAMES[d.getDay()] : '';
  const dayNum = d ? d.getDate() : '';
  const monthStr = d ? MONTHS[d.getMonth()] : '';

  const timeText = useMemo(() => {
    if (activity.startTime && activity.endTime) return `${activity.startTime} — ${activity.endTime}`;
    return activity.startTime || '';
  }, [activity.startTime, activity.endTime]);

  const mapUrl = useMemo(() => activity.location ? getStaticMapUrl(activity.location, 15, '600x300') : null, [activity.location]);

  const isCompleted = activity.dateFrom < new Date().toISOString().slice(0, 10);
  const familyId = useUserStore((state) => state.familyId);
  const canDelete = activity.createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin';

  const handleDelete = async () => {
    try {
      await deleteKindergartenActivity(familyId || '', activity.id);
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const typeLabel = activity.activityType === 'tur' ? t('school.activityTypeTur') : activity.activityType === 'aktivitet' ? t('school.activityTypeAktivitet') : t('school.activityTypeMøte');

  return (
    <ScrollView style={[styles.container, { backgroundColor: MODULE_COLORS.kindergartenBg }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: KINDERGARTEN_COLOR }]}>
        <Text style={{ color: KINDERGARTEN_COLOR, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      {/* Top card with calendar icon */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: KINDERGARTEN_COLOR, marginBottom: 10, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={styles.calIcon}>
            <View style={[styles.calTopBar, { backgroundColor: KINDERGARTEN_COLOR }]}>
              <Text style={styles.calDayName}>{dayName}</Text>
            </View>
            <Text style={[styles.calDayNum, { color: colors.text }]}>{dayNum}</Text>
            <Text style={[styles.calMonth, { color: colors.textSecondary }]}>{monthStr}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>{activity.title}</Text>
            {timeText ? <Text style={[styles.timeText, { color: '#333' }]}>{timeText}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <View style={[styles.badge, { backgroundColor: KINDERGARTEN_COLOR + '20' }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: KINDERGARTEN_COLOR }}>{typeLabel}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: isCompleted ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: isCompleted ? '#43A047' : '#FB8C00' }}>
                  {isCompleted ? t('health.completed') : getDaysUntil(activity.dateFrom)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Detail card */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: KINDERGARTEN_COLOR, backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: KINDERGARTEN_COLOR }]}>Detaljer</Text>
        {activity.location && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>📍</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>{activity.location}</Text>
          </View>
        )}
        {activity.note && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }}>📝</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: KINDERGARTEN_COLOR }}>Notat</Text>
            </View>
            <View style={{ paddingLeft: 22 }}>
              <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={showFullNote ? undefined : 2}>
                {activity.note}
              </Text>
              {activity.note.length > 60 && (
                <TouchableOpacity onPress={() => setShowFullNote(!showFullNote)}>
                  <Text style={{ fontSize: 12, color: KINDERGARTEN_COLOR, fontWeight: '600', marginTop: 4 }}>
                    {showFullNote ? t('common.back') : 'Les mer'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Map */}
      {activity.location && mapUrl && (
        <View style={[styles.card, { padding: 0, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: KINDERGARTEN_COLOR, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(activity.location!))} style={{ width: '100%', height: 140 }}>
            <Image source={{ uri: mapUrl }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(activity.location!))} style={{ padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: KINDERGARTEN_COLOR, fontWeight: '600' }}>Åpne i Google Maps →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Documents */}
      {activity.documents && activity.documents.length > 0 && (
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: KINDERGARTEN_COLOR, backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: KINDERGARTEN_COLOR }]}>📎 {t('school.activityDocuments')} ({activity.documents.length})</Text>
          {activity.documents.map((doc, i) => (
            <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < (activity.documents?.length || 0) - 1 ? 1 : 0, borderBottomColor: colors.border }} onPress={() => Linking.openURL(doc.url)}>
              {doc.type === 'image' ? (
                <Image source={{ uri: doc.url }} style={{ width: 48, height: 48, borderRadius: 8 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>📄</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{doc.fileName}</Text>
                <Text style={{ fontSize: 12, color: KINDERGARTEN_COLOR }}>{t('documents.open')} →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Button box */}
      <View style={[styles.card, { marginTop: 10, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: KINDERGARTEN_COLOR, flex: 1 }]}
            onPress={() => navigation.navigate('KindergartenSpace', { editActivityId: activity.id, childId: activity.childId, editActivityData: { title: activity.title, activityType: activity.activityType, dateFrom: activity.dateFrom, dateTo: activity.dateTo || '', startTime: activity.startTime || '', endTime: activity.endTime || '', location: activity.location || '', note: activity.note || '', reminder: activity.reminder || '', documents: activity.documents || [] }, returnToEvents: source === 'events' })}
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
        title={activity.title}
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
  if (diff > 0) return `${diff} dager`;
  return `${Math.abs(diff)} dager siden`;
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
