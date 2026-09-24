import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { KindergartenChild, KindergartenYear, KindergartenSchedule, SchoolScheduleEntry } from '../types';
import { useUserStore } from '../store/userStore';
import { getKindergartenSchedules, addKindergartenSchedule, updateKindergartenSchedule, deleteKindergartenSchedule } from '../services/kindergartenService';
import { crossAlert } from '../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { IMAGE_QUALITY } from '../constants/limits';
import { auth } from '../services/firebase';
import { ActionModal } from '../components/ActionModal';

const KG_THEME = MODULE_COLORS.kindergarten;
const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

interface Props {
  navigation: any;
  route: { params: { child: KindergartenChild; selectedYear: KindergartenYear | null } };
}

export const KindergartenScheduleScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child, selectedYear } = route.params;
  const familyId = useUserStore((state) => state.familyId);
  const [schedules, setSchedules] = useState<KindergartenSchedule[]>([]);
  const [semester, setSemester] = useState<'høst' | 'vår'>('høst');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editEntries, setEditEntries] = useState<Record<string, SchoolScheduleEntry[]>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newEntryDay, setNewEntryDay] = useState<string | null>(null);
  const [newEntryTime, setNewEntryTime] = useState('');
  const [newEntrySubject, setNewEntrySubject] = useState('');
  const [newEntryTeacher, setNewEntryTeacher] = useState('');

  const loadSchedules = useCallback(async () => {
    if (!familyId || !selectedYear) return;
    const data = await getKindergartenSchedules(familyId, selectedYear.id);
    setSchedules(data);
  }, [familyId, selectedYear]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const currentSchedule = schedules.find(s => s.semester === semester);

  const grouped = DAYS.map(day => ({
    day,
    items: (currentSchedule?.entries || []).filter(e => e.day?.toLowerCase() === day.toLowerCase()).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
  }));

  const startEdit = () => {
    const entries = currentSchedule?.entries || [];
    const grouped: Record<string, SchoolScheduleEntry[]> = {};
    DAYS.forEach(d => { grouped[d] = entries.filter(e => e.day?.toLowerCase() === d.toLowerCase()); });
    setEditEntries(grouped);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!currentSchedule) return;
    const allEntries: SchoolScheduleEntry[] = [];
    DAYS.forEach(d => { (editEntries[d] || []).forEach(e => allEntries.push(e)); });
    try {
      await updateKindergartenSchedule(currentSchedule.id, { entries: allEntries });
      setEditMode(false);
      loadSchedules();
    } catch (e) {
      crossAlert(t('common.error'), t('common.error'));
    }
  };

  const handleAddToDay = (day: string) => {
    setNewEntryDay(day);
    setNewEntryTime('');
    setNewEntrySubject('');
  };

  const confirmAddEntry = () => {
    if (!newEntryDay || !newEntryTime.trim() || !newEntrySubject.trim()) return;
    setEditEntries(prev => ({
      ...prev,
      [newEntryDay]: [...(prev[newEntryDay] || []), { day: newEntryDay, time: newEntryTime, subject: newEntrySubject, teacher: newEntryTeacher }],
    }));
    setNewEntryDay(null);
    setNewEntryTime('');
    setNewEntrySubject('');
    setNewEntryTeacher('');
  };

  const removeEntry = (day: string, index: number) => {
    setEditEntries(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, i) => i !== index),
    }));
  };

  const handleUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      crossAlert(t('common.error'), 'Tilgang til bilder er nødvendig');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: IMAGE_QUALITY,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      let blob: Blob;
      if (asset.uri.startsWith('data:')) {
        const byteString = atob(asset.uri.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        blob = new Blob([ab], { type: 'image/jpeg' });
      } else {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      }
      const fileName = `schedule_${semester}_${Date.now()}.jpg`;

      const { webUploadFile } = await import('../services/webStorage');
      const downloadURL = await webUploadFile(`kindergarten-schedules/${familyId}/${fileName}`, blob);

      const scheduleId = await addKindergartenSchedule({
        yearId: selectedYear!.id,
        childId: child.id,
        semester,
        imageUrl: downloadURL,
        fileName,
        familyId: familyId || '',
      });

      setAnalyzing(true);
      const base64 = asset.base64;
      const idToken = await auth.currentUser?.getIdToken();

      try {
        const aiRes = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/photoToData', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageBase64: base64, type: 'timetable' }),
        });

        console.log('AI response status:', aiRes.status);
        if (aiRes.ok) {
          const data = await aiRes.json();
          console.log('AI response data:', JSON.stringify(data).substring(0, 200));
          if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
            await updateKindergartenSchedule(scheduleId, { entries: data.schedule });
            crossAlert(t('common.success'), `${data.schedule.length} ${t('school.entriesExtracted')}`);
          } else {
            crossAlert(t('school.noDataFound'), t('school.tryAgainPhoto'));
          }
        } else {
          const errorText = await aiRes.text();
          console.log('AI error response:', errorText);
          crossAlert(t('common.error'), `AI-feil: ${aiRes.status}`);
        }
      } catch (e) {
        console.log('AI analysis error:', e);
        crossAlert(t('common.error'), `AI-feil: ${e.message || e}`);
      }

      loadSchedules();
    } catch (error) {
      crossAlert(t('common.error'), 'Feil ved opplasting');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!currentSchedule) return;
    try {
      await deleteKindergartenSchedule(currentSchedule.id);
      setShowDeleteModal(false);
      loadSchedules();
    } catch (e) {
      crossAlert(t('common.error'), t('common.error'));
    }
  };

  if (!editMode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: KG_THEME }]}>
            <Text style={{ color: KG_THEME, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <AppIcon name="schedule" size={24} color={KG_THEME} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('school.schedule')} — {child.name}</Text>
          {currentSchedule && (
            <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={{ padding: 8 }}>
              <Text style={{ color: colors.danger, fontSize: 12 }}>{t('school.deleteSchedule')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.semesterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {(['høst', 'vår'] as const).map(s => (
            <TouchableOpacity key={s} style={[styles.semesterTab, { backgroundColor: semester === s ? KG_THEME : 'transparent' }]} onPress={() => setSemester(s)}>
              <Text style={{ color: semester === s ? '#fff' : colors.text, fontWeight: '600', fontSize: 14 }}>{s === 'høst' ? t('school.autumn') : t('school.spring')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ flex: 1, padding: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: KG_THEME, flex: 1 }]} onPress={handleUploadPhoto} disabled={uploading || analyzing}>
              {uploading || analyzing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <AppIcon name="ai" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>{t('school.aiScheduleHint')}</Text>
                </>
              )}
            </TouchableOpacity>
            {currentSchedule && (
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.inputBackground }]} onPress={startEdit}>
                <AppIcon name="pencil" size={18} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{t('common.edit')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {grouped.map(({ day, items }) => (
            <View key={day} style={[styles.daySection, { backgroundColor: colors.surface }]}>
              <View style={[styles.dayHeader, { backgroundColor: KG_THEME + '15' }]}>
                <Text style={[styles.dayTitle, { color: KG_THEME }]}>{day}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{items.length} {items.length === 1 ? 'time' : 'timer'}</Text>
              </View>
              {items.length > 0 ? items.map((item, i) => (
                <View key={i} style={[styles.scheduleItem, { borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
                  <Text style={[styles.scheduleTime, { color: colors.text }]}>{item.time || ''}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scheduleSubject, { color: colors.text }]}>{item.subject || ''}</Text>
                    {item.teacher ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.teacher}</Text> : null}
                  </View>
                </View>
              )) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noSchedule')}</Text>
              )}
            </View>
          ))}

          {(currentSchedule?.entries || []).length === 0 && currentSchedule && (
            <View style={[styles.imageCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.imageTitle, { color: colors.textSecondary }]}>{t('school.originalPhoto')}</Text>
              <Image source={{ uri: currentSchedule.imageUrl }} style={styles.scheduleImage} resizeMode="contain" />
            </View>
          )}

          {(currentSchedule?.entries || []).length === 0 && !currentSchedule && !uploading && (
            <View style={styles.emptyState}>
              <AppIcon name="ai" size={48} color={colors.textDisabled} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>{t('school.noSchedule')}</Text>
              <Text style={{ color: colors.textDisabled, fontSize: 12, marginTop: 4 }}>{t('school.uploadScheduleHint')}</Text>
            </View>
          )}
        </ScrollView>

        <ActionModal visible={showDeleteModal} title={t('school.deleteSchedule')} subtitle={semester === 'høst' ? t('school.autumnSchedule') : t('school.springSchedule')} onDelete={handleDeleteSchedule} onCancel={() => setShowDeleteModal(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setEditMode(false)} style={[styles.backBtn, { borderColor: KG_THEME }]}>
          <Text style={{ color: KG_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <AppIcon name="pencil" size={24} color={KG_THEME} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('school.editSchedule')} — {child.name}</Text>
        <TouchableOpacity onPress={handleSaveEdit} style={[styles.saveBtn, { backgroundColor: KG_THEME }]}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{t('common.save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        {DAYS.map(day => (
          <View key={day} style={[styles.daySection, { backgroundColor: colors.surface }]}>
            <View style={[styles.dayHeader, { backgroundColor: KG_THEME + '15' }]}>
              <Text style={[styles.dayTitle, { color: KG_THEME }]}>{day}</Text>
              <TouchableOpacity onPress={() => handleAddToDay(day)} style={[styles.addDayBtn, { backgroundColor: KG_THEME }]}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>+ {t('school.addEntry')}</Text>
              </TouchableOpacity>
            </View>
            {(editEntries[day] || []).map((entry, i) => (
              <View key={i} style={[styles.scheduleItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Text style={[styles.scheduleTime, { color: colors.text }]}>{entry.time || ''}</Text>
                <Text style={[styles.scheduleSubject, { color: colors.text, flex: 1 }]}>{entry.subject || ''}</Text>
                <TouchableOpacity onPress={() => removeEntry(day, i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '600' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {(editEntries[day] || []).length === 0 && (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noSchedule')}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      {newEntryDay && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('school.addEntry')} — {newEntryDay}</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('common.time')}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={newEntryTime} onChangeText={setNewEntryTime} placeholder="08:00-09:00" placeholderTextColor={colors.textDisabled} autoFocus />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('school.subject')}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={newEntrySubject} onChangeText={setNewEntrySubject} placeholder={t('school.subject')} placeholderTextColor={colors.textDisabled} />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('school.teacher')}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={newEntryTeacher} onChangeText={setNewEntryTeacher} placeholder={t('school.teacher')} placeholderTextColor={colors.textDisabled} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground, flex: 1 }]} onPress={() => setNewEntryDay(null)}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: KG_THEME, flex: 1 }]} onPress={confirmAddEntry}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  semesterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
  semesterTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  uploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 12 },
  daySection: { borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  dayTitle: { fontSize: 15, fontWeight: '700' },
  addDayBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, gap: 12 },
  scheduleTime: { fontSize: 13, fontWeight: '600', width: 100 },
  scheduleSubject: { fontSize: 14, flex: 1 },
  emptyText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: 8 },
  imageCard: { borderRadius: 12, padding: 12, marginBottom: 12 },
  imageTitle: { fontSize: 12, marginBottom: 8 },
  scheduleImage: { width: '100%', height: 250, borderRadius: 8 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  modalOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, justifyContent: 'flex-end' },
  modalContent: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalLabel: { fontSize: 12, marginBottom: 4, marginTop: 8 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, borderColor: '#e0e0e0' },
  modalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
