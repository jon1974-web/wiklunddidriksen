import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { crossAlert } from '../utils/alert';
import { MODULE_COLORS } from '../constants/moduleColors';
import { getErrorMessage } from '../utils/validation';
import { getTodayLocal, formatDate } from '../utils/dateUtils';
import { REMINDER_OPTIONS } from '../constants/reminderOptions';
import { Home, HomeService, HomePaintColor } from '../types';
import { getHomeServices, addHomeService, updateHomeService, deleteHomeService, getHomePaintColors, addHomePaintColor, deleteHomePaintColor } from '../services/homeService';
import { ActionModal } from '../components/ActionModal';
import { DatePickerModal } from '../components/DatePickerModal';

const HOME_THEME = MODULE_COLORS.home;

const FREQUENCY_OPTIONS = [
  { value: 'once', labelKey: 'homes.freqOnce' },
  { value: 'monthly', labelKey: 'homes.freqMonthly' },
  { value: 'quarterly', labelKey: 'homes.freqQuarterly' },
  { value: 'yearly', labelKey: 'homes.freqYearly' },
] as const;

interface HomeMaintenanceScreenProps {
  navigation: any;
  route: { params: { home: Home } };
}

export const HomeMaintenanceScreen: React.FC<HomeMaintenanceScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { home } = route.params;

  const [services, setServices] = useState<HomeService[]>([]);
  const [paintColors, setPaintColors] = useState<HomePaintColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [serviceActionModal, setServiceActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [colorActionModal, setColorActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
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

  const [colorName, setColorName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [colorBrand, setColorBrand] = useState('');
  const [colorRoom, setColorRoom] = useState('');
  const [colorHex, setColorHex] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [savingColor, setSavingColor] = useState(false);

  const loadData = useCallback(async () => {
    if (!familyId) return;
    try {
      const [svcData, colorData] = await Promise.all([
        getHomeServices(familyId, home.id),
        getHomePaintColors(familyId, home.id),
      ]);
      setServices(svcData);
      setPaintColors(colorData);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [familyId, home.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetServiceForm = () => {
    setSvcTitle('');
    setSvcDescription('');
    setSvcDateFrom(getTodayLocal());
    setSvcDateTo(getTodayLocal());
    setSvcStartTime('10:00');
    setSvcEndTime('11:00');
    setSvcReminder(60);
    setSvcFrequency('once');
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
      };
      if (editingService) {
        await updateHomeService(editingService, data);
      } else {
        await addHomeService(data);
      }
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
      await addHomePaintColor({ homeId: home.id, name: colorName.trim(), code: colorCode.trim(), brand: colorBrand.trim(), room: colorRoom.trim(), hexColor: colorHex, familyId });
      resetColorForm();
      setShowAddColor(false);
      loadData();
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setSavingColor(false); }
  };

  const handleDeleteColor = async () => {
    if (!colorActionModal.id) return;
    try { await deleteHomePaintColor(colorActionModal.id); setColorActionModal({ visible: false, id: '', title: '' }); loadData(); }
    catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
  };

  const isTimePicker = activePicker === 'startTime' || activePicker === 'endTime';
  const handlePickerSelect = (value: string) => {
    if (activePicker === 'dateFrom') { setSvcDateFrom(value); if (!svcDateTo || svcDateTo < value) setSvcDateTo(value); }
    else if (activePicker === 'dateTo') { if (value >= svcDateFrom) setSvcDateTo(value); }
    else if (activePicker === 'startTime') { setSvcStartTime(value); setSvcEndTime(`${String((parseInt(value.split(':')[0]) + 1) % 24).padStart(2, '0')}:${value.split(':')[1]}`); }
    else if (activePicker === 'endTime') { setSvcEndTime(value); }
    setActivePicker(null);
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
            return (
              <TouchableOpacity key={svc.id} style={[styles.serviceCard, { backgroundColor: colors.inputBackground }]} onLongPress={() => setServiceActionModal({ visible: true, id: svc.id, title: svc.title })}>
                <View style={styles.serviceCardHeader}>
                  <Text style={[styles.serviceCardTitle, { color: colors.text }]}>{svc.title}</Text>
                  {svc.status === 'completed' && <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}><Text style={{ fontSize: 10, fontWeight: '600', color: '#43A047' }}>✓ {t('homes.projectCompleted')}</Text></View>}
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
          ) : paintColors.map((color) => (
            <TouchableOpacity key={color.id} style={[styles.colorItem, { borderBottomColor: colors.border }]} onLongPress={() => setColorActionModal({ visible: true, id: color.id, title: color.name || color.code })}>
              {color.hexColor ? <View style={[styles.colorSwatch, { backgroundColor: color.hexColor }]} /> : <View style={[styles.colorSwatch, { backgroundColor: colors.inputBackground }]}><Text style={{ fontSize: 10, color: colors.textDisabled }}>🎨</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={[styles.colorName, { color: colors.text }]} numberOfLines={1}>{color.name || t('homes.unnamed')}</Text>
                <Text style={[styles.colorCode, { color: colors.textSecondary }]}>{color.code}{color.brand ? ` · ${color.brand}` : ''}</Text>
                {color.room ? <Text style={[styles.colorRoom, { color: colors.textDisabled }]}>📍 {color.room}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ActionModal visible={serviceActionModal.visible} title={serviceActionModal.title} onEdit={handleEditService} onDelete={handleDeleteService} onCancel={() => setServiceActionModal({ visible: false, id: '', title: '' })} accentColor={HOME_THEME} />
      <ActionModal visible={colorActionModal.visible} title={colorActionModal.title} onDelete={handleDeleteColor} onCancel={() => setColorActionModal({ visible: false, id: '', title: '' })} accentColor={HOME_THEME} />

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
