import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { KindergartenChild, KindergartenYear } from '../types';
import { useUserStore } from '../store/userStore';
import { getKindergartenYears, addKindergartenYear, updateKindergartenYear } from '../services/kindergartenService';
import { crossAlert } from '../utils/alert';
import { ActionModal } from '../components/ActionModal';

const KG_THEME = MODULE_COLORS.kindergarten;

interface Props {
  navigation: any;
  route: { params: { child: KindergartenChild; selectedYear?: KindergartenYear | null } };
}

export const KindergartenDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child } = route.params;
  const familyId = useUserStore((state) => state.familyId);

  const [years, setYears] = useState<KindergartenYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<KindergartenYear | null>(route.params.selectedYear || null);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [yearForm, setYearForm] = useState({ year: '', group: '', kindergarten: '' });
  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [yearActionModal, setYearActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });

  const loadYears = useCallback(async () => {
    if (!familyId) return;
    const data = await getKindergartenYears(familyId, child.id);
    setYears(data);
    if (data.length > 0 && !selectedYear) setSelectedYear(data[0]);
  }, [familyId, child.id]);

  useEffect(() => { loadYears(); }, [loadYears]);

  const handleSaveYear = async () => {
    if (!familyId || !yearForm.year.trim()) return;
    try {
      if (editingYearId) {
        await updateKindergartenYear(editingYearId, { year: yearForm.year, group: yearForm.group, kindergarten: yearForm.kindergarten });
      } else {
        const id = await addKindergartenYear({ year: yearForm.year, group: yearForm.group, kindergarten: yearForm.kindergarten, childId: child.id, familyId, createdAt: Date.now() });
        setSelectedYear({ id, year: yearForm.year, group: yearForm.group, kindergarten: yearForm.kindergarten, childId: child.id, familyId, createdAt: Date.now() });
      }
      setShowAddYearModal(false);
      setYearForm({ year: '', group: '', kindergarten: '' });
      setEditingYearId(null);
      loadYears();
    } catch (e) { crossAlert(t('common.error'), t('common.error')); }
  };

  const tiles = [
    { id: 'contacts', icon: 'contacts' as any, label: t('school.contacts'), screen: 'KindergartenContacts' },
    { id: 'schedule', icon: 'schedule' as any, label: t('school.schedule'), screen: 'KindergartenSchedule' },
    { id: 'activities', icon: 'activities' as any, label: t('school.activities'), screen: 'KindergartenActivities' },
    { id: 'holidays', icon: 'fri' as any, label: t('school.holidays'), screen: 'KindergartenHolidays' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: KG_THEME, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: KG_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {child.photoUrl ? (
            <Image source={{ uri: child.photoUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          ) : (
            <Text style={{ fontSize: 28 }}>🧒</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>{child.name}</Text>
            {(selectedYear?.kindergarten || child.kindergartenName) && (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>🏫 {selectedYear?.kindergarten || child.kindergartenName}</Text>
            )}
            {selectedYear?.group && (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>📋 {selectedYear.group}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, maxHeight: 44 }} contentContainerStyle={{ alignItems: 'center' }}>
        {years.map(y => (
          <TouchableOpacity key={y.id} style={[styles.yearTab, { backgroundColor: selectedYear?.id === y.id ? KG_THEME : colors.inputBackground }]} onPress={() => setSelectedYear(y)} onLongPress={() => setYearActionModal({ visible: true, id: y.id, title: y.year })}>
            <Text style={{ color: selectedYear?.id === y.id ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>{y.group ? `${y.year} · ${y.group}` : y.year}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.yearTab, { borderWidth: 1.5, borderColor: KG_THEME, borderStyle: 'dashed' }]} onPress={() => { setYearForm({ year: '', group: '', kindergarten: '' }); setEditingYearId(null); setShowAddYearModal(true); }}>
          <Text style={{ color: KG_THEME, fontSize: 14, fontWeight: '700' }}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.content}>
        {tiles.map((tile) => (
          <TouchableOpacity key={tile.id} style={[styles.tile, { backgroundColor: colors.surface }]} onPress={() => selectedYear && navigation.navigate(tile.screen, { child, selectedYear, years })}>
            <View style={[styles.tileIcon, { backgroundColor: KG_THEME }]}>
              <AppIcon name={tile.icon} size={24} color="#fff" />
            </View>
            <Text style={[styles.tileLabel, { color: colors.text }]}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showAddYearModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddYearModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingYearId ? t('school.editYear') : t('school.newYear')}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={yearForm.year} onChangeText={(v) => setYearForm(f => ({ ...f, year: v }))} placeholder="2025-2026" placeholderTextColor={colors.textDisabled} />
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={yearForm.group} onChangeText={(v) => setYearForm(f => ({ ...f, group: v }))} placeholder={t('kindergarten.group')} placeholderTextColor={colors.textDisabled} />
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={yearForm.kindergarten} onChangeText={(v) => setYearForm(f => ({ ...f, kindergarten: v }))} placeholder={t('kindergarten.kindergarten')} placeholderTextColor={colors.textDisabled} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground, flex: 1 }]} onPress={() => setShowAddYearModal(false)}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: KG_THEME, flex: 1 }]} onPress={handleSaveYear}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ActionModal visible={yearActionModal.visible} title={yearActionModal.title} subtitle={t('school.schoolYear')} onEdit={() => { const y = years.find(y => y.id === yearActionModal.id); if (y) { setYearForm({ year: y.year, group: y.group || '', kindergarten: y.kindergarten || '' }); setEditingYearId(y.id); setShowAddYearModal(true); } setYearActionModal({ visible: false, id: '', title: '' }); }} onDelete={async () => { const { deleteKindergartenYear } = await import('../services/kindergartenService'); await deleteKindergartenYear(yearActionModal.id); setYearActionModal({ visible: false, id: '', title: '' }); if (selectedYear?.id === yearActionModal.id) setSelectedYear(null); loadYears(); }} onCancel={() => setYearActionModal({ visible: false, id: '', title: '' })} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  screenTitle: { fontSize: 22, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 16, fontWeight: '600', flex: 1 },
  yearTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8, alignItems: 'center', minWidth: 70 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 10, borderColor: '#e0e0e0' },
  modalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
