import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { SchoolChild, SchoolYear, SchoolSchedule } from '../types';
import { useUserStore } from '../store/userStore';
import { getSchoolSchedules, addSchoolSchedule, updateSchoolSchedule } from '../services/schoolService';
import { crossAlert } from '../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { IMAGE_QUALITY } from '../constants/limits';
import { auth } from '../services/firebase';
import { formatShortDate } from '../utils/dateUtils';

const SCHOOL_THEME = MODULE_COLORS.school;
const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

interface Props {
  navigation: any;
  route: { params: { child: SchoolChild; selectedYear: SchoolYear | null } };
}

export const SchoolScheduleScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child, selectedYear } = route.params;
  const familyId = useUserStore((state) => state.familyId);
  const [schedules, setSchedules] = useState<SchoolSchedule[]>([]);
  const [semester, setSemester] = useState<'høst' | 'vår'>('høst');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const loadSchedules = useCallback(async () => {
    if (!familyId || !selectedYear) return;
    const data = await getSchoolSchedules(familyId, selectedYear.id);
    setSchedules(data);
  }, [familyId, selectedYear]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const currentSchedule = schedules.find(s => s.semester === semester);
  const entries = currentSchedule?.entries || [];

  // Group entries by day
  const grouped = DAYS.map(day => ({
    day,
    items: entries.filter(e => e.day?.toLowerCase() === day.toLowerCase()).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
  }));

  const handleUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      crossAlert(t('common.error'), 'Tilgang til bilder er nødvendig');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: IMAGE_QUALITY,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.uri.split('.').pop() || 'jpg';
      const fileName = `schedule_${semester}_${Date.now()}.${ext}`;

      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storageRef = ref(`school-schedules/${familyId}/${fileName}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Save schedule image
      const scheduleId = await addSchoolSchedule({
        yearId: selectedYear!.id,
        childId: child.id,
        semester,
        imageUrl: downloadURL,
        fileName,
        familyId: familyId || '',
      });

      // Analyze with AI
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

        if (aiRes.ok) {
          const data = await aiRes.json();
          if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
            // Save extracted entries to the schedule
            await updateSchoolSchedule(scheduleId, { entries: data.schedule });
            crossAlert(t('common.success'), `${data.schedule.length} ${t('school.entriesExtracted')}`);
          } else {
            crossAlert(t('school.noDataFound'), t('school.tryAgainPhoto'));
          }
        }
      } catch (e) {
        // AI analysis failed, image is still saved
      }

      loadSchedules();
    } catch (error) {
      crossAlert(t('common.error'), 'Feil ved opplasting');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: SCHOOL_THEME }]}>
          <Text style={{ color: SCHOOL_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <AppIcon name="schedule" size={24} color={SCHOOL_THEME} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('school.schedule')} — {child.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Semester tabs */}
      <View style={[styles.semesterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['høst', 'vår'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.semesterTab, { backgroundColor: semester === s ? SCHOOL_THEME : 'transparent' }]}
            onPress={() => setSemester(s)}
          >
            <Text style={{ color: semester === s ? '#fff' : colors.text, fontWeight: '600', fontSize: 14 }}>{s === 'høst' ? t('school.autumn') : t('school.spring')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        {/* AI Upload button */}
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: SCHOOL_THEME }]}
          onPress={handleUploadPhoto}
          disabled={uploading || analyzing}
        >
          {uploading || analyzing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <AppIcon name="ai" size={20} color="#fff" />
              <Text style={styles.uploadBtnText}>{t('school.aiScheduleHint')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Monday-Friday schedule grid */}
        {grouped.map(({ day, items }) => (
          <View key={day} style={[styles.daySection, { backgroundColor: colors.surface }]}>
            <View style={[styles.dayHeader, { backgroundColor: SCHOOL_THEME + '15' }]}>
              <Text style={[styles.dayTitle, { color: SCHOOL_THEME }]}>{day}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{items.length} {items.length === 1 ? 'time' : 'timer'}</Text>
            </View>
            {items.length > 0 ? items.map((item, i) => (
              <View key={i} style={[styles.scheduleItem, { borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
                <Text style={[styles.scheduleTime, { color: colors.text }]}>{item.time || ''}</Text>
                <Text style={[styles.scheduleSubject, { color: colors.text, flex: 1 }]}>{item.subject || ''}</Text>
              </View>
            )) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noSchedule')}</Text>
            )}
          </View>
        ))}

        {/* Show uploaded image if no entries */}
        {entries.length === 0 && currentSchedule && (
          <View style={[styles.imageCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.imageTitle, { color: colors.textSecondary }]}>{t('school.originalPhoto')}</Text>
            <Image source={{ uri: currentSchedule.imageUrl }} style={styles.scheduleImage} resizeMode="contain" />
          </View>
        )}

        {entries.length === 0 && !currentSchedule && !uploading && (
          <View style={styles.emptyState}>
            <AppIcon name="ai" size={48} color={colors.textDisabled} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>{t('school.noSchedule')}</Text>
            <Text style={{ color: colors.textDisabled, fontSize: 12, marginTop: 4 }}>{t('school.uploadScheduleHint')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  semesterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
  semesterTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginBottom: 12 },
  uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  daySection: { borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  dayTitle: { fontSize: 15, fontWeight: '700' },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, gap: 12 },
  scheduleTime: { fontSize: 13, fontWeight: '600', width: 100 },
  scheduleSubject: { fontSize: 14 },
  imageCard: { borderRadius: 12, padding: 12, marginBottom: 12 },
  imageTitle: { fontSize: 12, marginBottom: 8 },
  scheduleImage: { width: '100%', height: 250, borderRadius: 8 },
  emptyState: { alignItems: 'center', marginTop: 60 },
});
