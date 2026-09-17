import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { crossAlert } from '../utils/alert';
import { MODULE_COLORS } from '../constants/moduleColors';
import { getErrorMessage } from '../utils/validation';
import { getTodayLocal, formatDate } from '../utils/dateUtils';
import { REMINDER_OPTIONS } from '../constants/reminderOptions';
import { Home, HomeService, HomePaintColor, HomeProject } from '../types';
import { getHomeServices, addHomeService, updateHomeService, deleteHomeService, getHomePaintColors, addHomePaintColor, deleteHomePaintColor, getHomeProjects } from '../services/homeService';
import { ActionModal } from '../components/ActionModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { HelpCenter } from '../components/HelpCenter';
import { syncEventToCalendar } from '../services/calendarService';
import { getUserProfile, notifyNewEvent } from '../services/familyService';
import { DocumentUpload } from '../components/DocumentUpload';
import { ScheduleModal } from '../components/ScheduleModal';
import { addDoc as firestoreAddDoc, collection as firestoreCollection, query as firestoreQuery, where as firestoreWhere, getDocs as firestoreGetDocs, deleteDoc as firestoreDeleteDoc, doc as firestoreDoc } from 'firebase/firestore';

const HOME_THEME = MODULE_COLORS.home;

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

const FREQUENCY_OPTIONS = [
  { value: 'once', labelKey: 'homes.freqOnce' },
  { value: 'monthly', labelKey: 'homes.freqMonthly' },
  { value: 'quarterly', labelKey: 'homes.freqQuarterly' },
  { value: 'yearly', labelKey: 'homes.freqYearly' },
] as const;

interface HomeMaintenanceScreenProps {
  navigation: any;
  route: { params: { home: Home; editServiceId?: string; openAddSection?: string } };
}

export const HomeMaintenanceScreen: React.FC<HomeMaintenanceScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { home } = route.params;

  const [services, setServices] = useState<HomeService[]>([]);
  const [paintColors, setPaintColors] = useState<HomePaintColor[]>([]);
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [serviceActionModal, setServiceActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [colorActionModal, setColorActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [showHelp, setShowHelp] = useState(false);
  const [activePicker, setActivePicker] = useState<'dateFrom' | 'dateTo' | 'startTime' | 'endTime' | null>(null);

  const [svcTitle, setSvcTitle] = useState('');
  const [svcDescription, setSvcDescription] = useState('');
  const [svcDateFrom, setSvcDateFrom] = useState(getTodayLocal());
  const [svcDateTo, setSvcDateTo] = useState(getTodayLocal());
  const [svcStartTime, setSvcStartTime] = useState('10:00');
  const [svcEndTime, setSvcEndTime] = useState('11:00');
  const [svcReminder, setSvcReminder] = useState(60);
  const [svcFrequency, setSvcFrequency] = useState<'once' | 'monthly' | 'quarterly' | 'yearly'>('once');
  const [saving, setSaving] = useState(false);
  const [svcDocuments, setSvcDocuments] = useState<{ url: string; fileName: string; type: 'image' | 'document' }[]>([]);
  const [showRepeatSchedule, setShowRepeatSchedule] = useState(false);
  const [repeatScheduleConfig, setRepeatScheduleConfig] = useState<{ days: number[]; weeks: number; weekType: string; groupId: string } | null>(null);
  const [preloadedDays, setPreloadedDays] = useState<number[]>([]);
  const [preloadedWeeks, setPreloadedWeeks] = useState<number>(4);
  const [preloadedWeekType, setPreloadedWeekType] = useState<string>('all');

  const [colorName, setColorName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [colorBrand, setColorBrand] = useState('');
  const [colorRoom, setColorRoom] = useState('');
  const [colorHex, setColorHex] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!familyId) return;
    try {
      const [svcData, colorData, projectData] = await Promise.all([
        getHomeServices(familyId, home.id),
        getHomePaintColors(familyId, home.id),
        getHomeProjects(familyId, home.id),
      ]);
      setServices(svcData);
      setPaintColors(colorData);
      setProjects(projectData);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [familyId, home.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (route.params?.editServiceId && services.length > 0) {
      const svc = services.find((s) => s.id === route.params.editServiceId);
      if (svc) {
        setSvcTitle(svc.title);
        setSvcDescription(svc.description);
        setSvcDateFrom(svc.dateFrom);
        setSvcDateTo(svc.dateTo || svc.dateFrom);
        setSvcStartTime(svc.startTime);
        setSvcEndTime(svc.endTime || svc.startTime);
        setSvcReminder(svc.reminder);
        setSvcFrequency(svc.frequency);
        setSvcDocuments(svc.documents || []);
        setRepeatScheduleConfig(null);
        setEditingService(svc.id);
        setShowAddService(true);
        navigation.setParams({ editServiceId: undefined });
      }
    }
  }, [route.params?.editServiceId, services]);

  useEffect(() => {
    if (route.params?.openAddSection === 'services') {
      resetServiceForm();
      setShowAddService(true);
      navigation.setParams({ openAddSection: undefined });
    }
  }, [route.params?.openAddSection]);

  const resetServiceForm = () => {
    setSvcTitle('');
    setSvcDescription('');
    setSvcDateFrom(getTodayLocal());
    setSvcDateTo(getTodayLocal());
    setSvcStartTime('10:00');
    setSvcEndTime('11:00');
    setSvcReminder(60);
    setSvcFrequency('once');
    setSvcDocuments([]);
    setRepeatScheduleConfig(null);
    setEditingService(null);
  };

  const handleSaveService = async () => {
    if (!svcTitle.trim()) {
      crossAlert(t('common.error'), t('homes.serviceTitleRequired'));
      return;
    }
    if (!familyId) return;
    setSaving(true);
    try {
      const data = {
        homeId: home.id,
        title: svcTitle.trim(),
        description: svcDescription.trim(),
        dateFrom: svcDateFrom,
        dateTo: svcDateTo,
        startTime: svcStartTime,
        endTime: svcEndTime,
        reminder: svcReminder,
        frequency: svcFrequency,
        status: 'planned' as const,
        familyId,
        documents: svcDocuments.length > 0 ? svcDocuments : (editingService ? undefined : []),
      };
      let savedId: string | undefined;
      if (editingService) {
        await updateHomeService(editingService, data);
        savedId = editingService;
        if (repeatScheduleConfig) {
          const editingSvc = services.find((s) => s.id === editingService);
          if (editingSvc?.scheduleGroupId) {
            const q = firestoreQuery(firestoreCollection(db, 'homeServices'), firestoreWhere('familyId', '==', familyId), firestoreWhere('homeId', '==', home.id), firestoreWhere('scheduleGroupId', '==', editingSvc.scheduleGroupId));
            const snapshot = await firestoreGetDocs(q);
            let deletedCount = 0;
            for (const d of snapshot.docs) {
              const svc = d.data();
              const dateField = svc.dateFrom || svc.date;
              if (dateField) {
                const svcDate = new Date(dateField);
                if (!repeatScheduleConfig.days.includes(svcDate.getDay())) {
                  await firestoreDeleteDoc(firestoreDoc(db, 'homeServices', d.id));
                  deletedCount++;
                }
              }
            }
            if (deletedCount > 0) {
              crossAlert(t('homes.scheduleUpdated'), `${deletedCount} ${t('homes.servicesDeletedForRemovedDays')}`);
            }
          }
        }
      } else if (repeatScheduleConfig) {
        const startDate = new Date(svcDateFrom);
        for (let w = 0; w < repeatScheduleConfig.weeks; w++) {
          const weekNum = getWeekNumber(startDate) + w;
          if (repeatScheduleConfig.weekType === 'odd' && weekNum % 2 === 0) continue;
          if (repeatScheduleConfig.weekType === 'even' && weekNum % 2 !== 0) continue;

          for (let d = 0; d < 7; d++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + w * 7 + d);
            if (repeatScheduleConfig.days.includes(date.getDay())) {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              await firestoreAddDoc(firestoreCollection(db, 'homeServices'), {
                ...data,
                dateFrom: dateStr,
                dateTo: dateStr,
                scheduleGroupId: repeatScheduleConfig.groupId,
                createdAt: Date.now(),
              });
            }
          }
        }
      } else {
        savedId = await addHomeService(data);
      }

      try {
        if (user && savedId) {
          const profile = await getUserProfile(user.uid);
          if (profile?.calendarId) {
            const calEventId = await syncEventToCalendar({
              title: svcTitle.trim(),
              description: svcDescription.trim(),
              date: svcDateFrom,
              time: svcStartTime,
              endDate: svcDateTo,
              endTime: svcEndTime,
              calendarId: profile.calendarId,
            });
            if (calEventId && !editingService) {
              await updateDoc(doc(db, 'homeServices', savedId), { calendarEventId: calEventId });
            }
          }
        }
      } catch {}

      try {
        if (familyId && user) {
          notifyNewEvent(familyId, svcTitle.trim(), svcDateFrom, svcStartTime, user.displayName || 'En i familien').catch(() => {});
        }
      } catch {}

      resetServiceForm();
      setShowAddService(false);
      loadData();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async () => {
    if (!serviceActionModal.id) return;
    try {
      await deleteHomeService(serviceActionModal.id);
      setServiceActionModal({ visible: false, id: '', title: '' });
      loadData();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleEditService = () => {
    const svc = services.find((s) => s.id === serviceActionModal.id);
    if (svc) {
      setEditingService(svc.id);
      setSvcTitle(svc.title);
      setSvcDescription(svc.description);
      setSvcDateFrom(svc.dateFrom);
      setSvcDateTo(svc.dateTo || svc.dateFrom);
      setSvcStartTime(svc.startTime);
      setSvcEndTime(svc.endTime || svc.startTime);
      setSvcReminder(svc.reminder);
      setSvcFrequency(svc.frequency);
      setSvcDocuments(svc.documents || []);
      setRepeatScheduleConfig(null);
      setShowAddService(true);
    }
    setServiceActionModal({ visible: false, id: '', title: '' });
  };

  // Colors
  const resetColorForm = () => {
    setColorName('');
    setColorCode('');
    setColorBrand('');
    setColorRoom('');
    setColorHex('');
    setEditingColorId(null);
  };

  const handleExtractColor = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { crossAlert(t('common.error'), 'Kamera tillatelse er nødvendig'); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      }
      if (result.canceled || !result.assets[0]) return;
      setExtracting(true);
      const asset = result.assets[0];
      let imageBase64: string;
      if (asset.base64) { imageBase64 = asset.base64; } else {
        const response = await fetch(asset.uri); const blob = await response.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => { reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(blob); });
      }
      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/homeExtractColor', {
        method: 'POST', headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      if (data.name) setColorName(data.name);
      if (data.code) setColorCode(data.code);
      if (data.hexColor) setColorHex(data.hexColor);
      if (data.brand) setColorBrand(data.brand);
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setExtracting(false); }
  };

  const handleFetchColor = async () => {
    if (!colorCode.trim()) return;
    setExtracting(true);
    try {
      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/homeExtractColor', {
        method: 'POST', headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorCode: colorCode.trim() }),
      });
      const data = await res.json();
      if (data.hexColor) setColorHex(data.hexColor);
      if (data.name && !colorName) setColorName(data.name);
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setExtracting(false); }
  };

  const handleSaveColor = async () => {
    if (!colorName.trim() && !colorCode.trim()) {
      crossAlert(t('common.error'), t('homes.colorNameOrCodeRequired'));
      return;
    }
    if (!familyId) return;
    setSavingColor(true);
    try {
      const data = { homeId: home.id, name: colorName.trim(), code: colorCode.trim(), brand: colorBrand.trim(), room: colorRoom.trim(), hexColor: colorHex, familyId };
      if (editingColorId) {
        await updateHomePaintColor(editingColorId, data);
      } else {
        await addHomePaintColor(data);
      }
      resetColorForm();
      setShowAddColor(false);
      setEditingColorId(null);
      loadData();
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setSavingColor(false); }
  };

  const handleDeleteColor = async () => {
    if (!colorActionModal.id) return;
    try { await deleteHomePaintColor(colorActionModal.id); setColorActionModal({ visible: false, id: '', title: '' }); loadData(); }
    catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
  };

  const handleEditColor = () => {
    const color = paintColors.find((c) => c.id === colorActionModal.id);
    if (color) {
      setEditingColorId(color.id);
      setColorName(color.name);
      setColorCode(color.code);
      setColorBrand(color.brand || '');
      setColorRoom(color.room || '');
      setColorHex(color.hexColor || '');
      setShowAddColor(true);
    }
    setColorActionModal({ visible: false, id: '', title: '' });
  };

  const isTimePicker = activePicker === 'startTime' || activePicker === 'endTime';
  const handlePickerSelect = (value: string) => {
    if (activePicker === 'dateFrom') { setSvcDateFrom(value); if (!svcDateTo || svcDateTo < value) setSvcDateTo(value); }
    else if (activePicker === 'dateTo') { if (value >= svcDateFrom) setSvcDateTo(value); }
    else if (activePicker === 'startTime') { setSvcStartTime(value); setSvcEndTime(`${String((parseInt(value.split(':')[0]) + 1) % 24).padStart(2, '0')}:${value.split(':')[1]}`); }
    else if (activePicker === 'endTime') { setSvcEndTime(value); }
    setActivePicker(null);
  };

  const getDaysUntilBadge = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return { text: t('homes.today'), color: '#43A047', bg: '#E8F5E9' };
    if (diff === 1) return { text: t('homes.tomorrow'), color: '#FB8C00', bg: '#FFF3E0' };
    if (diff > 0) return { text: t('homes.inXDays', { count: diff }), color: '#1976D2', bg: '#E3F2FD' };
    const absDiff = Math.abs(diff);
    if (absDiff === 1) return { text: t('homes.yesterday'), color: '#C62828', bg: '#FFEBEE' };
    return { text: t('homes.xDaysAgo', { count: absDiff }), color: '#C62828', bg: '#FFEBEE' };
  };

  if (loading) {
    return (<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}><ActivityIndicator size="large" color={HOME_THEME} style={{ marginTop: 100 }} /></SafeAreaView>);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: HOME_THEME, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: HOME_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="vedlikehold" size={28} color={HOME_THEME} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>{t('homes.maintenance')}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{home.name}</Text>
          </View>
          <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#3b5a75', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelp(true)}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#3b5a75', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content}>
        {/* Service Appointments */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="calendar" size={18} color={HOME_THEME} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('homes.serviceAppointments')}</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({services.length})</Text>
            </View>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: HOME_THEME }]} onPress={() => { resetServiceForm(); setShowAddService(true); }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
          {services.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textDisabled, textAlign: 'center', padding: 16 }}>{t('homes.noServices')}</Text>
          ) : services.map((svc) => {
            const freqLabel = FREQUENCY_OPTIONS.find((f) => f.value === svc.frequency);
            const badge = getDaysUntilBadge(svc.dateFrom);
            return (
              <TouchableOpacity key={svc.id} style={[styles.serviceCard, { backgroundColor: colors.inputBackground }]} onPress={() => navigation.navigate('HomeServiceDetail', { service: svc, home })} onLongPress={() => setServiceActionModal({ visible: true, id: svc.id, title: svc.title })}>
                <View style={styles.serviceCardHeader}>
                  <Text style={[styles.serviceCardTitle, { color: colors.text }]}>{svc.title}</Text>
                  <View style={[styles.daysBadge, { backgroundColor: badge.bg }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: badge.color }}>{badge.text}</Text>
                  </View>
                </View>
                <View style={styles.serviceCardDetails}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>📅 {formatDate(svc.dateFrom)}</Text>
                  {freqLabel && <Text style={{ fontSize: 12, color: colors.textSecondary }}>🔄 {t(freqLabel.labelKey)}</Text>}
                  {svc.reminder > 0 && <Text style={{ fontSize: 12, color: colors.textSecondary }}>🔔 {REMINDER_OPTIONS.find((r) => r.value === svc.reminder)?.label}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Paint Colors */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="paintColor" size={18} color={HOME_THEME} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('homes.paintColors')}</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({paintColors.length})</Text>
            </View>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: HOME_THEME }]} onPress={() => { resetColorForm(); setShowAddColor(true); }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
          {paintColors.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textDisabled, textAlign: 'center', padding: 16 }}>{t('homes.noColors')}</Text>
          ) : paintColors.map((color) => {
            const project = color.projectId ? projects.find((p) => p.id === color.projectId) : null;
            return (
            <TouchableOpacity key={color.id} style={[styles.colorItem, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('HomeColorDetail', { color })} onLongPress={() => {
              if (!color.projectId) {
                setColorActionModal({ visible: true, id: color.id, title: color.name || color.code });
              }
            }}>
              {color.hexColor ? <View style={[styles.colorSwatch, { backgroundColor: color.hexColor }]} /> : <View style={[styles.colorSwatch, { backgroundColor: colors.inputBackground }]}><Text style={{ fontSize: 10, color: colors.textDisabled }}>🎨</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={[styles.colorName, { color: colors.text }]} numberOfLines={1}>{color.name || t('homes.unnamed')}</Text>
                <Text style={[styles.colorCode, { color: colors.textSecondary }]}>{color.code}{color.brand ? ` · ${color.brand}` : ''}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {project ? <Text style={[styles.colorRoom, { color: colors.textDisabled }]}>📋 {project.title}</Text> : null}
                  {color.room ? <Text style={[styles.colorRoom, { color: colors.textDisabled }]}>📍 {color.room}</Text> : null}
                </View>
              </View>
            </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <ActionModal visible={serviceActionModal.visible} title={serviceActionModal.title} onEdit={handleEditService} onDelete={handleDeleteService} onCancel={() => setServiceActionModal({ visible: false, id: '', title: '' })} accentColor={HOME_THEME} />
      <ActionModal visible={colorActionModal.visible} title={colorActionModal.title} onEdit={handleEditColor} onDelete={handleDeleteColor} onCancel={() => setColorActionModal({ visible: false, id: '', title: '' })} accentColor={HOME_THEME} />

      {/* Add/Edit Service Modal */}
      <Modal visible={showAddService} transparent animationType="slide" onRequestClose={() => setShowAddService(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingService ? t('homes.editService') : t('homes.addService')}</Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.serviceTitle')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={svcTitle} onChangeText={setSvcTitle} placeholder={t('homes.serviceTitlePlaceholder')} placeholderTextColor={colors.textDisabled} />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.description')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, { minHeight: 60, textAlignVertical: 'top' }]} value={svcDescription} onChangeText={setSvcDescription} placeholder={t('homes.descriptionPlaceholder')} placeholderTextColor={colors.textDisabled} multiline numberOfLines={2} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.dateFrom')}</Text>
                  <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('dateFrom')}><Text style={{ color: colors.text }}>{svcDateFrom}</Text></TouchableOpacity>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.dateTo')}</Text>
                  <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('dateTo')}><Text style={{ color: colors.text }}>{svcDateTo}</Text></TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.timeFrom')}</Text>
                  <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('startTime')}><Text style={{ color: colors.text }}>{svcStartTime}</Text></TouchableOpacity>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.timeTo')}</Text>
                  <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('endTime')}><Text style={{ color: colors.text }}>{svcEndTime}</Text></TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.frequency')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {FREQUENCY_OPTIONS.map((opt) => {
                    const isSelected = svcFrequency === opt.value;
                    return (
                      <TouchableOpacity key={opt.value} style={[styles.freqOption, { backgroundColor: colors.surface, borderColor: isSelected ? HOME_THEME : colors.border }, isSelected && { backgroundColor: HOME_THEME }]} onPress={() => setSvcFrequency(opt.value)}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : colors.text }}>{t(opt.labelKey)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('events.reminder')}</Text>
                <View style={styles.reminderOptions}>
                  {REMINDER_OPTIONS.map((opt) => (
                    <TouchableOpacity key={opt.value} style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, svcReminder === opt.value && { backgroundColor: HOME_THEME, borderColor: HOME_THEME }]} onPress={() => setSvcReminder(opt.value)}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: svcReminder === opt.value ? '#fff' : colors.textSecondary }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Schedule */}
              <View style={styles.field}>
                {repeatScheduleConfig ? (
                  <View style={{ padding: 12, borderRadius: 10, backgroundColor: HOME_THEME + '15', borderWidth: 1, borderColor: HOME_THEME + '40' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <AppIcon name="schedule" size={18} color={HOME_THEME} />
                      <Text style={{ color: HOME_THEME, fontSize: 14, fontWeight: '700' }}>{t('homes.repeatSchedule')}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 13, marginBottom: 4 }}>
                      {repeatScheduleConfig.days.map((d) => ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'][d]).join(', ')} {t('homes.inWeeks', { count: repeatScheduleConfig.weeks })}
                    </Text>
                    <TouchableOpacity onPress={() => setRepeatScheduleConfig(null)}>
                      <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>{t('homes.removeSchedule')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                    onPress={async () => {
                      if (editingService) {
                        const editingSvc = services.find((s) => s.id === editingService);
                        if (editingSvc?.scheduleGroupId && familyId) {
                          try {
                            const groupId = editingSvc.scheduleGroupId;
                            const q = firestoreQuery(firestoreCollection(db, 'homeServices'), firestoreWhere('familyId', '==', familyId), firestoreWhere('homeId', '==', home.id), firestoreWhere('scheduleGroupId', '==', groupId));
                            const snapshot = await firestoreGetDocs(q);
                            const daySet = new Set<number>();
                            const weekNums = new Set<number>();
                            let minDate = Infinity;
                            let maxDate = -Infinity;
                            for (const d of snapshot.docs) {
                              const svc = d.data();
                              const dateField = svc.dateFrom || svc.date;
                              if (dateField) {
                                const dt = new Date(dateField);
                                daySet.add(dt.getDay());
                                weekNums.add(getWeekNumber(dt));
                                const ts = dt.getTime();
                                if (ts < minDate) minDate = ts;
                                if (ts > maxDate) maxDate = ts;
                              }
                            }
                            const days = Array.from(daySet).sort((a, b) => a - b);
                            const weeks = Math.max(1, Math.round((maxDate - minDate) / (7 * 86400000)) + 1);
                            const hasOdd = Array.from(weekNums).some((w) => w % 2 !== 0);
                            const hasEven = Array.from(weekNums).some((w) => w % 2 === 0);
                            setPreloadedDays(days);
                            setPreloadedWeeks(weeks);
                            setPreloadedWeekType(hasOdd && hasEven ? 'all' : hasOdd ? 'odd' : hasEven ? 'even' : 'all');
                          } catch {
                            setPreloadedDays([1]);
                            setPreloadedWeeks(4);
                            setPreloadedWeekType('all');
                          }
                        }
                      }
                      setShowRepeatSchedule(true);
                    }}
                  >
                    <AppIcon name="schedule" size={18} color={HOME_THEME} />
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{editingService && services.find((s) => s.id === editingService)?.scheduleGroupId ? t('homes.editSchedule') : t('homes.planSchedule')}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 'auto' }}>›</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Documents */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.documents')}</Text>
                <DocumentUpload
                  storagePath={`home-services/${editingService || 'new'}/documents`}
                  onUploaded={(doc) => setSvcDocuments((prev) => [...prev, doc])}
                  accentColor={HOME_THEME}
                />
                {svcDocuments.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {svcDocuments.map((doc, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{doc.type === 'image' ? '🖼️' : '📄'} {doc.fileName}</Text>
                        <TouchableOpacity onPress={() => setSvcDocuments((prev) => prev.filter((_, idx) => idx !== i))}>
                          <Text style={{ color: colors.danger, fontSize: 12 }}>{t('common.delete')}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowAddService(false); resetServiceForm(); }}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: HOME_THEME, opacity: saving ? 0.5 : 1, flex: 1 }]} onPress={handleSaveService} disabled={saving}>
                  <Text style={styles.buttonText}>{saving ? '...' : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Color Modal */}
      <Modal visible={showAddColor} transparent animationType="slide" onRequestClose={() => setShowAddColor(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('homes.addColor')}</Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity style={[styles.aiButton, { backgroundColor: HOME_THEME + '15', borderColor: HOME_THEME }]} onPress={() => handleExtractColor(true)} disabled={extracting}>
                  {extracting ? <ActivityIndicator size="small" color={HOME_THEME} /> : <AppIcon name="camera" size={20} color={HOME_THEME} />}
                  <Text style={{ color: HOME_THEME, fontSize: 12, fontWeight: '600' }}>{t('homes.photoTag')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.aiButton, { backgroundColor: HOME_THEME + '15', borderColor: HOME_THEME }]} onPress={() => handleExtractColor(false)} disabled={extracting}>
                  {extracting ? <ActivityIndicator size="small" color={HOME_THEME} /> : <AppIcon name="camera" size={20} color={HOME_THEME} />}
                  <Text style={{ color: HOME_THEME, fontSize: 12, fontWeight: '600' }}>{t('homes.photoWall')}</Text>
                </TouchableOpacity>
              </View>

              {colorHex ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: colors.inputBackground }}>
                  <View style={[styles.colorSwatchLarge, { backgroundColor: colorHex }]} />
                  <View><Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{colorName || t('homes.extractedColor')}</Text><Text style={{ fontSize: 12, color: colors.textSecondary }}>{colorCode} · {colorHex}</Text></View>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.colorName')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={colorName} onChangeText={setColorName} placeholder={t('homes.colorNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.colorCode')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, flex: 1 }]} value={colorCode} onChangeText={setColorCode} placeholder={t('homes.colorCodePlaceholder')} placeholderTextColor={colors.textDisabled} />
                  <TouchableOpacity style={[styles.fetchButton, { backgroundColor: HOME_THEME, opacity: (extracting || !colorCode.trim()) ? 0.5 : 1 }]} disabled={extracting || !colorCode.trim()} onPress={handleFetchColor}>
                    {extracting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{t('homes.fetchColor')}</Text>}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.hexColor')}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {colorHex ? (
                    <View style={[styles.colorSwatch, { backgroundColor: colorHex, width: 36, height: 36 }]} />
                  ) : (
                    <View style={[styles.colorSwatch, { backgroundColor: colors.inputBackground, width: 36, height: 36 }]} />
                  )}
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, flex: 1 }]}
                    value={colorHex}
                    onChangeText={setColorHex}
                    placeholder="#F5F0EB"
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.colorBrand')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={colorBrand} onChangeText={setColorBrand} placeholder={t('homes.colorBrandPlaceholder')} placeholderTextColor={colors.textDisabled} />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.colorRoom')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={colorRoom} onChangeText={setColorRoom} placeholder={t('homes.colorRoomPlaceholder')} placeholderTextColor={colors.textDisabled} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowAddColor(false); resetColorForm(); }}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: HOME_THEME, opacity: savingColor ? 0.5 : 1, flex: 1 }]} onPress={handleSaveColor} disabled={savingColor}>
                  <Text style={styles.buttonText}>{savingColor ? '...' : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePickerModal visible={activePicker !== null} title={activePicker === 'dateFrom' ? t('homes.dateFrom') : activePicker === 'dateTo' ? t('homes.dateTo') : activePicker === 'startTime' ? t('homes.timeFrom') : t('homes.timeTo')} mode={isTimePicker ? 'time' : 'date'} dateOffset={isTimePicker ? 0 : -30} dateCount={isTimePicker ? 48 : 760} selectedValue={activePicker === 'dateFrom' ? svcDateFrom : activePicker === 'dateTo' ? svcDateTo : activePicker === 'startTime' ? svcStartTime : svcEndTime} onSelect={handlePickerSelect} onClose={() => setActivePicker(null)} />

      <ScheduleModal
        visible={showRepeatSchedule}
        onClose={() => setShowRepeatSchedule(false)}
        onConfirm={(config) => {
          setRepeatScheduleConfig(config);
          setShowRepeatSchedule(false);
        }}
        startDate={svcDateFrom}
        moduleColor={HOME_THEME}
        preselectedDays={preloadedDays}
        preselectedWeeks={preloadedWeeks}
        preselectedWeekType={preloadedWeekType}
        isEditing={!!editingService}
      />

      <HelpCenter
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('homes.vedlikeholdHelpTitle')}
        sections={[
          { icon: '🔧', title: t('homes.vedlikeholdHelpWhat'), text: t('homes.vedlikeholdHelpWhatText') },
          { icon: '👉', title: t('homes.vedlikeholdHelpHow'), text: t('homes.vedlikeholdHelpHowText'), tip: t('homes.vedlikeholdHelpTip') },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  screenTitle: { fontSize: 22, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  section: { borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCount: { fontSize: 14 },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceCard: { borderRadius: 10, padding: 12, marginBottom: 8 },
  serviceCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  serviceCardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  serviceCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  colorItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  colorSwatch: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  colorSwatchLarge: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  colorName: { fontSize: 14, fontWeight: '600' },
  colorCode: { fontSize: 12 },
  colorRoom: { fontSize: 11, marginTop: 2 },
  aiButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1 },
  fetchButton: { paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  freqOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRight: 20, maxHeight: '85%', padding: 20 },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
