import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { KindergartenChild, KindergartenYear, SchoolHoliday } from '../types';
import { useUserStore } from '../store/userStore';
import { getKindergartenHolidays, addKindergartenHoliday, updateKindergartenHoliday, deleteKindergartenHoliday } from '../services/kindergartenService';
import { crossAlert } from '../utils/alert';
import { ActionModal } from '../components/ActionModal';
import { getErrorMessage } from '../utils/validation';

const KG_THEME = MODULE_COLORS.kindergarten;

interface Props {
  navigation: any;
  route: { params: { child: KindergartenChild; selectedYear: KindergartenYear | null } };
}

export const KindergartenHolidaysScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child, selectedYear } = route.params;
  const familyId = useUserStore((state) => state.familyId);

  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', dateFrom: '', dateTo: '', timeFrom: '', timeTo: '' });
  const [actionModal, setActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResults, setUrlResults] = useState<{ title: string; dateFrom: string; dateTo: string; timeFrom: string; timeTo: string; checked: boolean }[]>([]);

  const loadHolidays = useCallback(async () => {
    if (!familyId || !selectedYear) return;
    const data = await getKindergartenHolidays(familyId, selectedYear.id);
    setHolidays(data);
  }, [familyId, selectedYear]);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = holidays.filter(h => (h.dateTo || h.dateFrom) >= today).sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || ''));
  const past = holidays.filter(h => (h.dateTo || h.dateFrom) < today).sort((a, b) => (b.dateFrom || '').localeCompare(a.dateFrom || ''));

  const handleSave = async () => {
    if (!familyId || !selectedYear || !form.title.trim()) return;
    try {
      const data = { ...form, yearId: selectedYear.id, childId: child.id, familyId };
      if (editingId) { await updateKindergartenHoliday(editingId, data); }
      else { await addKindergartenHoliday(data); }
      setShowAddModal(false);
      setEditingId(null);
      setForm({ title: '', dateFrom: '', dateTo: '', timeFrom: '', timeTo: '' });
      loadHolidays();
    } catch (e) { crossAlert(t('common.error'), t('common.error')); }
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlResults([]);
    try {
      const { auth } = await import('../services/firebase');
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/importHolidaysFromUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: urlInput, language: 'norsk' }),
      });
      if (!res.ok) throw new Error('Failed to import');
      const data = await res.json();
      setUrlResults((data.holidays || []).map((h: any) => ({ ...h, checked: true })));
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setUrlLoading(false);
    }
  };

  const handleSaveUrlImport = async () => {
    const selected = urlResults.filter(h => h.checked);
    if (selected.length === 0 || !familyId || !selectedYear) return;
    try {
      for (const h of selected) {
        await addKindergartenHoliday({ title: h.title, dateFrom: h.dateFrom, dateTo: h.dateTo, timeFrom: h.timeFrom || '', timeTo: h.timeTo || '', yearId: selectedYear.id, childId: child.id, familyId });
      }
      setShowUrlModal(false);
      setUrlInput('');
      setUrlResults([]);
      loadHolidays();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const renderHoliday = (h: SchoolHoliday) => (
    <TouchableOpacity key={h.id} style={[styles.holidayCard, { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: KG_THEME }]} onPress={() => { setEditingId(h.id); setForm({ title: h.title, dateFrom: h.dateFrom, dateTo: h.dateTo || '', timeFrom: h.timeFrom || '', timeTo: h.timeTo || '' }); setShowAddModal(true); }} onLongPress={() => setActionModal({ visible: true, id: h.id, title: h.title })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: KG_THEME + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14 }}>🎉</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{h.title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{h.dateFrom} → {h.dateTo || h.dateFrom}{h.timeFrom ? ` • ${h.timeFrom} — ${h.timeTo}` : ''}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: KG_THEME }]}>
          <Text style={{ color: KG_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18 }}>🎉</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('school.holidays')} — {child.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity style={[styles.aiCard, { backgroundColor: MODULE_COLORS.kindergartenBg, flex: 1 }]} onPress={() => navigation.navigate('KindergartenAI', { childId: child.id, yearId: selectedYear?.id || '', familyId: familyId || '', mode: 'holidays' })}>
            <Text style={{ fontSize: 20 }}>📸</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: MODULE_COLORS.kindergarten, fontWeight: '600', fontSize: 13 }}>{t('kindergarten.importFromImage')}</Text>
              <Text style={{ color: MODULE_COLORS.kindergarten, fontSize: 11 }}>{t('kindergarten.aiFridagDescription')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.aiCard, { backgroundColor: MODULE_COLORS.tripsBg, flex: 1 }]} onPress={() => { setUrlInput(''); setUrlResults([]); setShowUrlModal(true); }}>
            <Text style={{ fontSize: 20 }}>🔗</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: MODULE_COLORS.trips, fontWeight: '600', fontSize: 13 }}>{t('kindergarten.importFromUrl')}</Text>
              <Text style={{ color: MODULE_COLORS.trips, fontSize: 11 }}>{t('kindergarten.urlDescription')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {upcoming.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('events.upcoming')} ({upcoming.length})</Text>
            {upcoming.map(renderHoliday)}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>{t('events.past')} ({past.length})</Text>
            {past.map(h => <View key={h.id} style={{ opacity: 0.6 }}>{renderHoliday(h)}</View>)}
          </>
        )}

        {holidays.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>🎉</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>{t('school.noHolidays')}</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: KG_THEME }]} onPress={() => { setEditingId(null); setForm({ title: '', dateFrom: '', dateTo: '', timeFrom: '', timeTo: '' }); setShowAddModal(true); }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>+</Text>
      </TouchableOpacity>

      <Modal visible={showAddModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingId ? t('common.edit') : t('common.add')} {t('school.holiday')}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={form.title} onChangeText={(v) => setForm(f => ({ ...f, title: v }))} placeholder={t('common.title')} placeholderTextColor={colors.textDisabled} />
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={form.dateFrom} onChangeText={(v) => setForm(f => ({ ...f, dateFrom: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textDisabled} />
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={form.dateTo} onChangeText={(v) => setForm(f => ({ ...f, dateTo: v }))} placeholder="YYYY-MM-DD (valgfritt)" placeholderTextColor={colors.textDisabled} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground, flex: 1 }]} onPress={() => setShowAddModal(false)}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: KG_THEME, flex: 1 }]} onPress={handleSave}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showUrlModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUrlModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('kindergarten.importFromUrl')}</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={urlInput} onChangeText={setUrlInput} placeholder="https://..." placeholderTextColor={colors.textDisabled} />
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: KG_THEME, marginBottom: 12 }]} onPress={handleUrlImport} disabled={urlLoading || !urlInput.trim()}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{urlLoading ? '...' : t('kindergarten.findHolidays')}</Text>
              </TouchableOpacity>
              {urlResults.length > 0 && (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{urlResults.length} {t('school.holidays')} {t('common.found')}</Text>
                  {urlResults.map((h, i) => (
                    <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }} onPress={() => setUrlResults(prev => prev.map((r, j) => j === i ? { ...r, checked: !r.checked } : r))}>
                      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: h.checked ? KG_THEME : colors.textDisabled, backgroundColor: h.checked ? KG_THEME : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {h.checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{h.title}</Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{h.dateFrom} → {h.dateTo}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: KG_THEME, marginTop: 12 }]} onPress={handleSaveUrlImport} disabled={urlResults.filter(h => h.checked).length === 0}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.save')} ({urlResults.filter(h => h.checked).length})</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground, marginTop: 8 }]} onPress={() => setShowUrlModal(false)}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t('common.close')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ActionModal visible={actionModal.visible} title={actionModal.title} subtitle={t('school.holiday')} onEdit={() => { const h = holidays.find(h => h.id === actionModal.id); if (h) { setEditingId(h.id); setForm({ title: h.title, dateFrom: h.dateFrom, dateTo: h.dateTo || '', timeFrom: h.timeFrom || '', timeTo: h.timeTo || '' }); setShowAddModal(true); } setActionModal({ visible: false, id: '', title: '' }); }} onDelete={async () => { await deleteKindergartenHoliday(actionModal.id); setActionModal({ visible: false, id: '', title: '' }); loadHolidays(); }} onCancel={() => setActionModal({ visible: false, id: '', title: '' })} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  holidayCard: { padding: 12, borderRadius: 10, marginBottom: 6 },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 10, borderColor: '#e0e0e0' },
  modalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
