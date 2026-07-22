import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, TouchableWithoutFeedback, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Birthday } from '../types';
import { ActionModal } from '../components/ActionModal';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { MAX_BIRTHDAYS } from '../constants/limits';

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export const BirthdayScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useUserStore();
  const familyId = useUserStore((state) => state.familyId);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null);
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newMonth, setNewMonth] = useState('');
  const [newDay, setNewDay] = useState('');
  const [activePicker, setActivePicker] = useState<'year' | 'month' | 'day' | null>(null);

  const loadBirthdays = useCallback(async () => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'birthdays'),
        where('familyId', '==', familyId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Birthday));
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBirthdays(data);
    } catch (error) {
      console.error('Failed to load birthdays:', error);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    loadBirthdays();
  }, [loadBirthdays]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      crossAlert('Error', t('birthdays.name') + ' er påkrevd');
      return;
    }
    const dateStr = newYear && newMonth && newDay ? `${newYear}-${newMonth}-${newDay}` : '';
    if (!dateStr) {
      crossAlert('Error', t('birthdays.date') + ' er påkrevd');
      return;
    }
    if (birthdays.length >= MAX_BIRTHDAYS) {
      crossAlert('Error', `Maks ${MAX_BIRTHDAYS} bursdager`);
      return;
    }
    try {
      if (!familyId) {
        crossAlert('Error', 'Du må være med i en familie for å legge til bursdager');
        return;
      }
      await addDoc(collection(db, 'birthdays'), {
        name: newName.trim(),
        date: dateStr,
        addedBy: user.uid,
        addedByName: user.displayName || 'Ukjent',
        familyId: familyId,
        createdAt: Date.now(),
      });
      setNewName('');
      setNewYear('');
      setNewMonth('');
      setNewDay('');
      setShowAddModal(false);
      loadBirthdays();
    } catch (error) {
      console.error('Failed to add birthday:', error);
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!selectedBirthday) return;
    try {
      await deleteDoc(doc(db, 'birthdays', selectedBirthday.id));
      setShowDeleteModal(false);
      setSelectedBirthday(null);
      loadBirthdays();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: colors.accent, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🎂 {t('birthdays.title')}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => { setNewName(''); setNewYear(''); setNewMonth(''); setNewDay(''); setShowAddModal(true); }}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Birthday list */}
      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>{t('common.loading')}</Text>
        ) : birthdays.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>{t('birthdays.noBirthdays')}</Text>
        ) : (
          birthdays.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.birthdayCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                setSelectedBirthday(b);
                setShowDeleteModal(true);
              }}
            >
              <View style={[styles.avatarCircle, { backgroundColor: colors.accent + '30' }]}>
                <Text style={[styles.avatarInitial, { color: colors.accent }]}>
                  {b.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.birthdayInfo}>
                <Text style={[styles.birthdayName, { color: colors.text }]}>{b.name}</Text>
                <Text style={[styles.birthdayDate, { color: colors.textSecondary }]}>
                  {formatDate(b.date)} ({calculateAge(b.date)} {t('birthdays.years')})
                </Text>
                <Text style={[styles.birthdayAddedBy, { color: colors.textDisabled }]}>
                  {t('birthdays.addedBy')}: {b.addedByName}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('birthdays.add')}</Text>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('birthdays.name')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="F.eks. Emma Wiklund"
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('birthdays.date')}</Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      style={[styles.dateInput, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('year')}
                    >
                      <Text style={{ color: newYear ? colors.text : colors.textDisabled, fontSize: 14, textAlign: 'center' }}>
                        {newYear || 'År'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateInput, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('month')}
                    >
                      <Text style={{ color: newMonth ? colors.text : colors.textDisabled, fontSize: 14, textAlign: 'center' }}>
                        {newMonth || 'Mnd'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateInput, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('day')}
                    >
                      <Text style={{ color: newDay ? colors.text : colors.textDisabled, fontSize: 14, textAlign: 'center' }}>
                        {newDay || 'Dag'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                    onPress={handleAdd}
                  >
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete confirmation */}
      <ActionModal
        visible={showDeleteModal}
        title={selectedBirthday?.name || ''}
        subtitle="Er du sikker?"
        onDelete={handleDelete}
        onCancel={() => { setShowDeleteModal(false); setSelectedBirthday(null); }}
      />

      {/* Date picker modal */}
      <Modal visible={!!activePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActivePicker(null)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerContent, { backgroundColor: colors.surface }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={() => setActivePicker(null)}>
                    <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>
                    {activePicker === 'year' ? 'År' : activePicker === 'month' ? 'Måned' : 'Dag'}
                  </Text>
                  <View style={{ width: 60 }} />
                </View>
                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                  {activePicker === 'year' && Array.from({ length: 100 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[styles.pickerItem, { borderBottomColor: colors.border }, newYear === String(year) && { backgroundColor: colors.accent + '20' }]}
                        onPress={() => { setNewYear(String(year)); setActivePicker(null); }}
                      >
                        <Text style={[styles.pickerItemText, { color: newYear === String(year) ? colors.accent : colors.text }]}>{year}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {activePicker === 'month' && [
                    { label: 'Januar', value: '01' }, { label: 'Februar', value: '02' },
                    { label: 'Mars', value: '03' }, { label: 'April', value: '04' },
                    { label: 'Mai', value: '05' }, { label: 'Juni', value: '06' },
                    { label: 'Juli', value: '07' }, { label: 'August', value: '08' },
                    { label: 'September', value: '09' }, { label: 'Oktober', value: '10' },
                    { label: 'November', value: '11' }, { label: 'Desember', value: '12' },
                  ].map((m) => (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.pickerItem, { borderBottomColor: colors.border }, newMonth === m.value && { backgroundColor: colors.accent + '20' }]}
                      onPress={() => { setNewMonth(m.value); setActivePicker(null); }}
                    >
                      <Text style={[styles.pickerItemText, { color: newMonth === m.value ? colors.accent : colors.text }]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                  {activePicker === 'day' && Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const dayStr = String(day).padStart(2, '0');
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.pickerItem, { borderBottomColor: colors.border }, newDay === dayStr && { backgroundColor: colors.accent + '20' }]}
                        onPress={() => { setNewDay(dayStr); setActivePicker(null); }}
                      >
                        <Text style={[styles.pickerItemText, { color: newDay === dayStr ? colors.accent : colors.text }]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  birthdayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700' },
  birthdayInfo: { flex: 1 },
  birthdayName: { fontSize: 16, fontWeight: '600' },
  birthdayDate: { fontSize: 13, marginTop: 2 },
  birthdayAddedBy: { fontSize: 11, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 20, padding: 20, width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { padding: 12, borderRadius: 8, fontSize: 16 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, padding: 10, borderRadius: 8, fontSize: 14, textAlign: 'center', minWidth: 0 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '600' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  pickerTitle: { fontSize: 16, fontWeight: '700' },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 16, textAlign: 'center' },
});
