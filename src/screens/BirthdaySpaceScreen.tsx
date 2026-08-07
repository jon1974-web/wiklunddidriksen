import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { getBirthdays, addBirthday, deleteBirthday, getGiftIdeas, addGiftIdea, updateGiftIdea, deleteGiftIdea } from '../services/birthdayService';
import { Birthday, GiftIdea } from '../types';
import { ActionModal } from '../components/ActionModal';
import { HelpCenter } from '../components/HelpCenter';

interface BirthdaySpaceScreenProps {
  navigation: any;
}

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

function getDaysUntilBirthday(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  const thisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (thisYear < today) {
    thisYear.setFullYear(thisYear.getFullYear() + 1);
  }
  return Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const BirthdaySpaceScreen: React.FC<BirthdaySpaceScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const familyId = useUserStore((state) => state.familyId);
  const user = useUserStore((state) => state.user);

  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [giftIdeas, setGiftIdeas] = useState<Record<string, GiftIdea[]>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null);
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newMonth, setNewMonth] = useState('');
  const [newDay, setNewDay] = useState('');
  const [newGiftText, setNewGiftText] = useState('');
  const [actionModal, setActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [showHelp, setShowHelp] = useState(false);

  const loadData = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getBirthdays(familyId);
      setBirthdays(data);
      // Load gift ideas for each birthday
      const giftsMap: Record<string, GiftIdea[]> = {};
      for (const b of data) {
        const gifts = await getGiftIdeas(b.id);
        giftsMap[b.id] = gifts;
      }
      setGiftIdeas(giftsMap);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [familyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddBirthday = async () => {
    if (!familyId || !user) return;
    if (!newName.trim()) { crossAlert('Error', t('birthdays.enterName')); return; }
    if (!newYear || !newMonth || !newDay) { crossAlert('Error', t('birthdays.enterDate')); return; }
    try {
      const date = `${newYear}-${newMonth.padStart(2, '0')}-${newDay.padStart(2, '0')}`;
      await addBirthday({
        name: newName.trim(),
        date,
        addedBy: user.uid,
        addedByName: user.displayName || '',
        familyId,
      });
      setNewName('');
      setNewYear('');
      setNewMonth('');
      setNewDay('');
      setShowAddModal(false);
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!actionModal.id) return;
    try {
      await deleteBirthday(actionModal.id);
      setActionModal({ visible: false, id: '', title: '' });
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleAddGift = async () => {
    if (!selectedBirthday || !newGiftText.trim()) return;
    try {
      await addGiftIdea({
        birthdayId: selectedBirthday.id,
        name: newGiftText.trim(),
        purchased: false,
      });
      setNewGiftText('');
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleToggleGift = async (gift: GiftIdea) => {
    try {
      await updateGiftIdea(gift.id, { purchased: !gift.purchased });
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDeleteGift = async (giftId: string) => {
    try {
      await deleteGiftIdea(giftId);
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayMonthDay = today.substring(5); // "MM-DD"
  const upcoming = birthdays.filter(b => {
    const bMonthDay = b.date.substring(5);
    return bMonthDay >= todayMonthDay;
  }).slice(0, 5);
  const sorted = [...birthdays].sort((a, b) => {
    const aDays = getDaysUntilBirthday(a.date);
    const bDays = getDaysUntilBirthday(b.date);
    return aDays - bDays;
  });

  const getCountdownBadge = (date: string) => {
    const days = getDaysUntilBirthday(date);
    if (days === 0) return { text: t('health.today'), style: 'countdown-today' };
    if (days <= 14) return { text: t('health.inDays', { count: days }), style: 'countdown-soon' };
    return { text: t('health.inDays', { count: days }), style: 'countdown-later' };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="birthday" size={28} color={colors.accent} />
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('spaces.birthdays')}</Text>
          <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelp(true)}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Upcoming birthdays */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <AppIcon name="birthday" size={18} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('birthdays.upcoming')}</Text>
            </View>
          </View>
          {upcoming.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('birthdays.noUpcoming')}</Text>
          ) : (
            upcoming.map(b => {
              const days = getDaysUntilBirthday(b.date);
              const badge = getCountdownBadge(b.date);
              return (
                <TouchableOpacity key={b.id} style={styles.item} onPress={() => { setSelectedBirthday(b); setShowGiftModal(true); }} onLongPress={() => setActionModal({ visible: true, id: b.id, title: b.name })}>
                  <AppIcon name="birthday" size={20} color={colors.accent} />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{b.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{b.date} — {calculateAge(b.date)} {t('birthdays.years')}</Text>
                  </View>
                  <Text style={[styles.badge, { backgroundColor: badge.style === 'countdown-today' ? '#FFEBEE' : badge.style === 'countdown-soon' ? '#FFF3E0' : '#E8F5E9', color: badge.style === 'countdown-today' ? '#E53935' : badge.style === 'countdown-soon' ? '#FB8C00' : '#43A047' }]}>{badge.text}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Gift lists for upcoming birthdays */}
        {upcoming.map(b => {
          const gifts = giftIdeas[b.id] || [];
          if (gifts.length === 0 && !selectedBirthday) return null;
          return (
            <View key={`gift-${b.id}`} style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <AppIcon name="destination" size={18} color={colors.accent} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{t('birthdays.giftList')} — {b.name}</Text>
                </View>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={() => { setSelectedBirthday(b); setShowGiftModal(true); }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
                </TouchableOpacity>
              </View>
              {gifts.map(gift => (
                <TouchableOpacity key={gift.id} style={styles.giftItem} onPress={() => handleToggleGift(gift)} onLongPress={() => deleteGiftIdea(gift.id)}>
                  <View style={[styles.giftCheckbox, gift.purchased && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                    {gift.purchased && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                  </View>
                  <Text style={[styles.giftText, gift.purchased && { textDecorationLine: 'line-through', color: colors.textSecondary }]}>{gift.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.giftAdd} onPress={() => { setSelectedBirthday(b); setShowGiftModal(true); }}>
                <Text style={{ color: colors.accent, fontSize: 12 }}>+ {t('birthdays.addGiftIdea')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* All birthdays */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <AppIcon name="birthday" size={18} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('birthdays.all')}</Text>
            </View>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={() => setShowAddModal(true)}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
          {sorted.map(b => {
            const badge = getCountdownBadge(b.date);
            return (
              <TouchableOpacity key={b.id} style={styles.item} onPress={() => { setSelectedBirthday(b); setShowGiftModal(true); }} onLongPress={() => setActionModal({ visible: true, id: b.id, title: b.name })}>
                <AppIcon name="birthday" size={20} color={colors.accent} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{b.name}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{b.date} — {calculateAge(b.date)} {t('birthdays.years')}</Text>
                </View>
                <Text style={[styles.badge, { backgroundColor: badge.style === 'countdown-today' ? '#FFEBEE' : badge.style === 'countdown-soon' ? '#FFF3E0' : '#E8F5E9', color: badge.style === 'countdown-today' ? '#E53935' : badge.style === 'countdown-soon' ? '#FB8C00' : '#43A047' }]}>{badge.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Add Birthday Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('birthdays.addBirthday')}</Text>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>{t('birthdays.name')}</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={newName} onChangeText={setNewName} placeholder={t('birthdays.namePlaceholder')} placeholderTextColor={colors.textDisabled} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>{t('birthdays.day')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={newDay} onChangeText={setNewDay} placeholder="DD" placeholderTextColor={colors.textDisabled} keyboardType="numeric" maxLength={2} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>{t('birthdays.month')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={newMonth} onChangeText={setNewMonth} placeholder="MM" placeholderTextColor={colors.textDisabled} keyboardType="numeric" maxLength={2} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>{t('birthdays.year')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={newYear} onChangeText={setNewYear} placeholder="ÅÅÅÅ" placeholderTextColor={colors.textDisabled} keyboardType="numeric" maxLength={4} />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={handleAddBirthday}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Gift Modal */}
      <Modal visible={showGiftModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('birthdays.addGiftIdea')} — {selectedBirthday?.name}</Text>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>{t('birthdays.giftIdea')}</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={newGiftText} onChangeText={setNewGiftText} placeholder={t('birthdays.giftPlaceholder')} placeholderTextColor={colors.textDisabled} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setShowGiftModal(false); setNewGiftText(''); }}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={handleAddGift}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation */}
      <ActionModal
        visible={actionModal.visible}
        title={actionModal.title}
        onDelete={handleDelete}
        onCancel={() => setActionModal({ visible: false, id: '', title: '' })}
      />

      {/* Help Center */}
      <HelpCenter
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('profile.helpBirthdaysTitle')}
        sections={[
          { icon: '🎂', title: t('profile.helpBirthdaysWhat'), text: t('profile.helpBirthdaysWhatText') },
          { icon: '👉', title: t('profile.helpBirthdaysHow'), text: t('profile.helpBirthdaysHowText'), tip: t('profile.helpBirthdaysTip') },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  screenTitle: { fontSize: 28, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  birthdayItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12 },
  badge: { fontSize: 11, fontWeight: '600', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  expandContent: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  giftItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  giftCheckbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  giftText: { fontSize: 13, flex: 1 },
  giftAdd: { marginTop: 8 },
  yearBadge: { fontSize: 10, padding: 2, borderRadius: 8, backgroundColor: '#f0f0f0', color: '#666', marginLeft: 4 },
  prevGifts: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', borderStyle: 'dashed' },
  prevTitle: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 6 },
  prevItem: { paddingVertical: 6 },
  prevYear: { fontSize: 13, fontWeight: '600' },
  prevItems: { fontSize: 11, color: '#999', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 10, padding: 14, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '600' },
});
