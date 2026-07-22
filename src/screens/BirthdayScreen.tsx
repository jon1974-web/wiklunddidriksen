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
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');

  const loadBirthdays = useCallback(async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'birthdays'),
        where('familyId', '==', user.familyId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Birthday));
      setBirthdays(data);
    } catch (error) {
      console.error('Failed to load birthdays:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.familyId]);

  useEffect(() => { loadBirthdays(); }, [loadBirthdays]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      crossAlert('Error', t('birthdays.name') + ' er påkrevd');
      return;
    }
    if (!newDate) {
      crossAlert('Error', t('birthdays.date') + ' er påkrevd');
      return;
    }
    if (birthdays.length >= MAX_BIRTHDAYS) {
      crossAlert('Error', `Maks ${MAX_BIRTHDAYS} bursdager`);
      return;
    }
    try {
      await addDoc(collection(db, 'birthdays'), {
        name: newName.trim(),
        date: newDate,
        addedBy: user!.uid,
        addedByName: user!.displayName || 'Ukjent',
        familyId: user!.familyId,
        createdAt: Date.now(),
      });
      setNewName('');
      setNewDate('');
      setShowAddModal(false);
      loadBirthdays();
    } catch (error) {
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
          onPress={() => { setNewName(''); setNewDate(''); setShowAddModal(true); }}
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
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={newDate.split('-')[0] || ''}
                      onChangeText={(v) => {
                        const month = newDate.split('-')[1] || '';
                        const day = newDate.split('-')[2] || '';
                        setNewDate(v && month && day ? `${v}-${month}-${day}` : v);
                      }}
                      placeholder="År"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={newDate.split('-')[1] || ''}
                      onChangeText={(v) => {
                        const year = newDate.split('-')[0] || '';
                        const day = newDate.split('-')[2] || '';
                        setNewDate(year && v && day ? `${year}-${v}-${day}` : v);
                      }}
                      placeholder="Mnd"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={newDate.split('-')[2] || ''}
                      onChangeText={(v) => {
                        const year = newDate.split('-')[0] || '';
                        const month = newDate.split('-')[1] || '';
                        setNewDate(year && month && v ? `${year}-${month}-${v}` : v);
                      }}
                      placeholder="Dag"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="numeric"
                      maxLength={2}
                    />
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { padding: 12, borderRadius: 8, fontSize: 15 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, padding: 12, borderRadius: 8, fontSize: 15, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '600' },
});
