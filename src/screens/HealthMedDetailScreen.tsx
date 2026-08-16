import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { HealthMedication } from '../types';
import { MODULE_COLORS } from '../constants/moduleColors';
import { formatDate } from '../utils/dateUtils';
import { ActionModal } from '../components/ActionModal';
import { deleteHealthMedication } from '../services/healthService';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';

interface Props {
  navigation: any;
  route: any;
}

const HEALTH_COLOR = MODULE_COLORS.health;

export const HealthMedDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { medication } = route.params as { medication: HealthMedication };
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyRole = useUserStore((state) => state.familyRole);
  const familyId = useUserStore((state) => state.familyId);
  const [showFullNote, setShowFullNote] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isFinished = medication.dateTo && medication.dateTo < today;
  const isActive = medication.dateFrom && (!medication.dateTo || medication.dateTo >= today);

  const canDelete = (medication as any).createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin';

  const handleDelete = async () => {
    try {
      await deleteHealthMedication(familyId || '', medication.id);
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: MODULE_COLORS.healthBg }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: HEALTH_COLOR }]}>
        <Text style={{ color: HEALTH_COLOR, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      {/* Top card */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: HEALTH_COLOR, marginBottom: 10, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={[styles.iconCircle, { backgroundColor: HEALTH_COLOR + '20' }]}>
            <Text style={{ fontSize: 28 }}>💊</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>{medication.name}</Text>
            <Text style={[styles.subtitle, { color: '#333' }]}>{medication.dosage}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {isFinished ? (
                <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#43A047' }}>{t('health.completed')}</Text>
                </View>
              ) : isActive ? (
                <View style={[styles.badge, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#FB8C00' }}>{t('health.ongoing')}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* Detail card */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: HEALTH_COLOR, backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: HEALTH_COLOR }]}>Detaljer</Text>
        {medication.person && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>👤</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{medication.person}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>📊</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{medication.frequency}x daglig</Text>
        </View>
        {medication.dateFrom && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>📅</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              Fra: {formatDate(medication.dateFrom)}{medication.dateTo ? ` — Til: ${formatDate(medication.dateTo)}` : ''}
            </Text>
          </View>
        )}
        {medication.note && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }}>📝</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: HEALTH_COLOR }}>Notat</Text>
            </View>
            <View style={{ paddingLeft: 22 }}>
              <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={showFullNote ? undefined : 2}>
                {medication.note}
              </Text>
              {medication.note.length > 60 && (
                <TouchableOpacity onPress={() => setShowFullNote(!showFullNote)}>
                  <Text style={{ fontSize: 12, color: HEALTH_COLOR, fontWeight: '600', marginTop: 4 }}>
                    {showFullNote ? t('common.back') : 'Les mer'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Button box */}
      <View style={[styles.card, { marginTop: 10, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: HEALTH_COLOR, flex: 1 }]} onPress={() => navigation.goBack()}>
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
        title={medication.name}
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
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  detailLabel: { fontSize: 16, width: 24, textAlign: 'center' },
  detailValue: { fontSize: 14, flex: 1 },
  actionButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
});
