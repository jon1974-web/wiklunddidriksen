import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { addSchoolContact, addSchoolHoliday } from '../services/schoolService';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { ActionModal } from '../components/ActionModal';
import { IMAGE_QUALITY } from '../constants/limits';
import { MODULE_COLORS } from '../constants/moduleColors';

interface SchoolAIScreenProps {
  navigation: any;
  route: { params: { childId: string; yearId: string; familyId: string; mode?: 'classlist' | 'holidays' } };
}

interface ParsedContact {
  name: string;
  childPhone: string;
  childEmail: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  parentName2: string;
  parentPhone2: string;
  parentEmail2: string;
  address: string;
}

interface EditableContact extends ParsedContact {
  checked: boolean;
}

const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/photoToData';

export const SchoolAIScreen: React.FC<SchoolAIScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { childId, yearId, familyId, mode = 'classlist' } = route.params;

  const [processing, setProcessing] = useState(false);
  const [contacts, setContacts] = useState<EditableContact[]>([]);
  const [holidays, setHolidays] = useState<{ title: string; dateFrom: string; dateTo: string; timeFrom: string; timeTo: string; checked: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; subtitle: string }>({ visible: false, title: '', subtitle: '' });

  const toEditable = (c: ParsedContact): EditableContact => ({ ...c, checked: true });

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: IMAGE_QUALITY, base64: true });
    if (!result.canceled && result.assets[0]) sendToCloud(result.assets[0].base64 || null);
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { crossAlert(t('common.error'), t('school.cameraRequired')); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: IMAGE_QUALITY, base64: true });
    if (!result.canceled && result.assets[0]) sendToCloud(result.assets[0].base64 || null);
  }, [t]);

  const sendToCloud = useCallback(async (base64: string | null) => {
    if (!base64) { crossAlert(t('common.error'), t('photoEvent.error')); return; }
    setProcessing(true);
    setContacts([]);
    setHolidays([]);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const currentUser = auth.currentUser;
      if (currentUser) { const idToken = await currentUser.getIdToken(); headers['Authorization'] = `Bearer ${idToken}`; }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(CLOUD_FUNCTION_URL, { method: 'POST', headers, body: JSON.stringify({ imageBase64: base64, type: mode }), signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Server error'); }
      const data = await res.json();
      if (mode === 'holidays') {
        const parsed = (data.holidays || []).map((h: any) => ({ title: h.title || '', dateFrom: h.dateFrom || '', dateTo: h.dateTo || h.dateFrom || '', timeFrom: h.timeFrom || '', timeTo: h.timeTo || '', checked: true }));
        if (parsed.length === 0) { crossAlert(t('schoolAI.title'), t('schoolAI.noContacts')); return; }
        setHolidays(parsed);
      } else {
        const parsed: ParsedContact[] = data.contacts || [];
        if (parsed.length === 0) { crossAlert(t('schoolAI.title'), t('schoolAI.noContacts')); return; }
        setContacts(parsed.map(toEditable));
      }
    } catch (error: any) {
      const msg = error?.name === 'AbortError' ? t('schoolAI.timeout') : error?.message?.includes('Failed to fetch') ? t('schoolAI.serverError') : getErrorMessage(error);
      crossAlert(t('common.error'), msg);
    } finally { setProcessing(false); }
  }, [t]);

  const handleSave = useCallback(async () => {
    if (mode === 'holidays') {
      const selected = holidays.filter(h => h.checked);
      if (selected.length === 0) return;
      setSaving(true);
      try {
        for (const h of selected) {
          await addSchoolHoliday({ title: h.title, dateFrom: h.dateFrom, dateTo: h.dateTo || h.dateFrom, timeFrom: h.timeFrom || undefined, timeTo: h.timeTo || undefined, childId, yearId, familyId });
        }
        setSuccessModal({ visible: true, title: t('common.success'), subtitle: `${selected.length} ${t('schoolAI.contactsAdded')}` });
      } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); } finally { setSaving(false); }
      return;
    }
    const selected = contacts.filter(c => c.checked);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      for (const c of selected) {
        const data: Record<string, any> = {
          name: c.name, role: 'classmate', childId, yearId, familyId,
        };
        if (c.childPhone) data.childPhone = c.childPhone;
        if (c.childEmail) data.childEmail = c.childEmail;
        if (c.parentName) data.parentName = c.parentName;
        if (c.parentPhone) data.parentPhone = c.parentPhone;
        if (c.parentEmail) data.parentEmail = c.parentEmail;
        if (c.parentName2) data.parentName2 = c.parentName2;
        if (c.parentPhone2) data.parentPhone2 = c.parentPhone2;
        if (c.parentEmail2) data.parentEmail2 = c.parentEmail2;
        if (c.address) data.address = c.address;
        await addSchoolContact(data);
      }
      setSuccessModal({ visible: true, title: t('common.success'), subtitle: `${selected.length} ${t('schoolAI.contactsAdded')}` });
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); } finally { setSaving(false); }
  }, [contacts, childId, yearId, familyId, t]);

  const updateContact = useCallback((index: number, updates: Partial<EditableContact>) => {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  }, []);

  const toggleAll = useCallback(() => {
    const allChecked = contacts.every(c => c.checked);
    setContacts(prev => prev.map(c => ({ ...c, checked: !allChecked })));
  }, [contacts]);

  const renderContact = (contact: EditableContact, index: number) => (
    <View key={index} style={[styles.card, { backgroundColor: colors.surface }]}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}>
        <TouchableOpacity style={[styles.checkbox, { borderColor: colors.border }, contact.checked && { backgroundColor: MODULE_COLORS.school, borderColor: MODULE_COLORS.school }]} onPress={() => updateContact(index, { checked: !contact.checked })}>
          {contact.checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{contact.name || t('common.name')}</Text>
          {contact.parentName ? <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('school.parent')}: {contact.parentName}</Text> : null}
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{expandedIndex === index ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {expandedIndex === index && (
        <View style={styles.cardBody}>
          {[
            { label: t('common.name'), key: 'name' }, { label: t('school.childPhone'), key: 'childPhone' }, { label: t('school.childEmail'), key: 'childEmail' },
            { label: t('school.parentName'), key: 'parentName' }, { label: t('common.phone'), key: 'parentPhone' }, { label: t('common.email'), key: 'parentEmail' },
            { label: `${t('school.parent')} 2`, key: 'parentName2' }, { label: `${t('common.phone')} 2`, key: 'parentPhone2' }, { label: `${t('common.email')} 2`, key: 'parentEmail2' },
            { label: t('common.address'), key: 'address' },
          ].map(({ label, key }) => (
            <View key={key} style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={(contact as any)[key]} onChangeText={(text) => updateContact(index, { [key]: text })} placeholderTextColor={colors.textDisabled} fontSize={16} />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const selectedCount = mode === 'holidays' ? holidays.filter(h => h.checked).length : contacts.filter(c => c.checked).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: MODULE_COLORS.schoolBg }]}>
      <View style={[styles.header, { backgroundColor: '#fff', borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: MODULE_COLORS.school }]}>
          <Text style={{ color: MODULE_COLORS.school, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{mode === 'holidays' ? t('schoolAI.titleHolidays') : t('schoolAI.title')}</Text>
      </View>
      <View style={[styles.helperSection, { backgroundColor: MODULE_COLORS.schoolBg, borderBottomColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{mode === 'holidays' ? t('kindergarten.aiFridagDescription') : t('schoolAI.instruction')}</Text>
      </View>
      <ScrollView style={styles.content}>
        {!processing && contacts.length === 0 && holidays.length === 0 && (
          <View style={styles.pickContainer}>
            <TouchableOpacity style={[styles.pickButton, { backgroundColor: MODULE_COLORS.school }]} onPress={takePhoto}>
              <Text style={styles.pickIcon}>📷</Text>
              <Text style={styles.pickButtonText}>{t('schoolAI.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickButton, { backgroundColor: MODULE_COLORS.schoolBg, borderColor: MODULE_COLORS.school, borderWidth: 1 }]} onPress={pickImage}>
              <Text style={styles.pickIcon}>🖼️</Text>
              <Text style={[styles.pickButtonText, { color: colors.text }]}>{t('schoolAI.pickImage')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={MODULE_COLORS.school} />
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('schoolAI.processing')}</Text>
          </View>
        )}
        {mode === 'holidays' && holidays.length > 0 && !processing && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: colors.text }]}>{holidays.length} {t('kindergarten.holidays')}</Text>
              <TouchableOpacity onPress={() => { const allChecked = holidays.every(h => h.checked); setHolidays(prev => prev.map(h => ({ ...h, checked: !allChecked }))); }}><Text style={{ color: MODULE_COLORS.school, fontWeight: '600', fontSize: 14 }}>{holidays.every(h => h.checked) ? t('schoolAI.deselectAll') : t('schoolAI.selectAll')}</Text></TouchableOpacity>
            </View>
            {holidays.map((h, i) => (
              <View key={i} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity style={[styles.checkbox, { borderColor: colors.border }, h.checked && { backgroundColor: MODULE_COLORS.school, borderColor: MODULE_COLORS.school }]} onPress={() => setHolidays(prev => prev.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item))}>
                    {h.checked && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{h.title}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{h.dateFrom} — {h.dateTo}{h.timeFrom ? ` • ${h.timeFrom} — ${h.timeTo}` : ''}</Text>
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: MODULE_COLORS.school, opacity: selectedCount === 0 || saving ? 0.5 : 1 }]} onPress={handleSave} disabled={selectedCount === 0 || saving}>
              <Text style={styles.primaryBtnText}>{saving ? t('schoolAI.saving') : `${t('schoolAI.addSelected')} (${selectedCount})`}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setHolidays([]); }}><Text style={{ color: MODULE_COLORS.school, textAlign: 'center', fontSize: 16, fontWeight: '600', paddingVertical: 12 }}>{t('schoolAI.tryAgain')}</Text></TouchableOpacity>
          </View>
        )}
        {mode !== 'holidays' && contacts.length > 0 && !processing && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: colors.text }]}>{contacts.length} {t('schoolAI.contactsFound')}</Text>
              <TouchableOpacity onPress={toggleAll}><Text style={{ color: MODULE_COLORS.school, fontWeight: '600', fontSize: 14 }}>{contacts.every(c => c.checked) ? t('schoolAI.deselectAll') : t('schoolAI.selectAll')}</Text></TouchableOpacity>
            </View>
            {contacts.map((c, i) => renderContact(c, i))}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: MODULE_COLORS.school, opacity: selectedCount === 0 || saving ? 0.5 : 1 }]} onPress={handleSave} disabled={selectedCount === 0 || saving}>
              <Text style={styles.primaryBtnText}>{saving ? t('schoolAI.saving') : `${t('schoolAI.addSelected')} (${selectedCount})`}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setContacts([]); }}><Text style={{ color: MODULE_COLORS.school, textAlign: 'center', fontSize: 16, fontWeight: '600', paddingVertical: 12 }}>{t('schoolAI.tryAgain')}</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <ActionModal visible={successModal.visible} title={successModal.title} subtitle={successModal.subtitle} onCancel={() => { setSuccessModal({ visible: false, title: '', subtitle: '' }); navigation.goBack(); }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  helperSection: { padding: 16, borderBottomWidth: 1 },
  content: { flex: 1, padding: 16 },
  pickContainer: { gap: 16, marginTop: 40 },
  pickButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 12, gap: 12 },
  pickIcon: { fontSize: 28 },
  pickButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  processingContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
  resultsContainer: { gap: 12 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  cardBody: { padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  input: { padding: 12, borderRadius: 8, fontSize: 16 },
  primaryBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
