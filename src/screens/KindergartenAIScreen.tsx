import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { addKindergartenContact } from '../services/kindergartenService';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { ActionModal } from '../components/ActionModal';
import { IMAGE_QUALITY } from '../constants/limits';
import { MODULE_COLORS } from '../constants/moduleColors';

interface Props {
  navigation: any;
  route: { params: { childId: string; yearId: string; familyId: string } };
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

export const KindergartenAIScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { childId, yearId, familyId } = route.params;

  const [processing, setProcessing] = useState(false);
  const [contacts, setContacts] = useState<EditableContact[]>([]);
  const [saving, setSaving] = useState(false);
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
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const currentUser = auth.currentUser;
      if (currentUser) { const idToken = await currentUser.getIdToken(); headers['Authorization'] = `Bearer ${idToken}`; }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(CLOUD_FUNCTION_URL, { method: 'POST', headers, body: JSON.stringify({ imageBase64: base64, type: 'classlist' }), signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Server error'); }
      const data = await res.json();
      const parsed: ParsedContact[] = data.contacts || [];
      if (parsed.length === 0) { crossAlert(t('schoolAI.title'), t('schoolAI.noContacts')); return; }
      setContacts(parsed.map(toEditable));
    } catch (error: any) {
      const msg = error?.name === 'AbortError' ? t('schoolAI.timeout') : error?.message?.includes('Failed to fetch') ? t('schoolAI.serverError') : getErrorMessage(error);
      crossAlert(t('common.error'), msg);
    } finally { setProcessing(false); }
  }, [t]);

  const handleSave = useCallback(async () => {
    const selected = contacts.filter(c => c.checked);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      for (const c of selected) {
        const data: Record<string, any> = {
          name: c.name, role: 'child', childId, yearId, familyId,
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
        await addKindergartenContact(data);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: MODULE_COLORS.kindergartenBg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: MODULE_COLORS.kindergarten }]}>
          <Text style={{ color: MODULE_COLORS.kindergarten, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('schoolAI.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 16 }}>{t('schoolAI.instruction')}</Text>

        {!processing && contacts.length === 0 && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={takePhoto}>
              <Text style={{ fontSize: 16 }}>📷</Text>
              <Text style={styles.pickBtnText}>{t('schoolAI.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickImage}>
              <Text style={{ fontSize: 16 }}>🖼️</Text>
              <Text style={[styles.pickBtnText, { color: colors.text }]}>{t('schoolAI.pickImage')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {processing && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={MODULE_COLORS.kindergarten} />
            <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 8 }}>{t('schoolAI.processing')}</Text>
          </View>
        )}

        {contacts.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{contacts.length} {t('schoolAI.contactsFound')}</Text>
              <TouchableOpacity onPress={toggleAll}><Text style={{ color: MODULE_COLORS.kindergarten, fontWeight: '600', fontSize: 14 }}>{contacts.every(c => c.checked) ? t('schoolAI.deselectAll') : t('schoolAI.selectAll')}</Text></TouchableOpacity>
            </View>
            {contacts.map((c, i) => (
              <TouchableOpacity key={i} style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => updateContact(i, { checked: !c.checked })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.checkbox, { borderColor: c.checked ? MODULE_COLORS.kindergarten : colors.textDisabled, backgroundColor: c.checked ? MODULE_COLORS.kindergarten : 'transparent' }]}>
                    {c.checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
                    {c.parentName ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{c.parentName}</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: MODULE_COLORS.kindergarten, marginTop: 16 }]} onPress={handleSave} disabled={saving || contacts.filter(c => c.checked).length === 0}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('schoolAI.addSelected')} ({contacts.filter(c => c.checked).length})</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ActionModal
        visible={successModal.visible}
        title={successModal.title}
        subtitle={successModal.subtitle}
        onCancel={() => { setSuccessModal({ visible: false, title: '', subtitle: '' }); navigation.goBack(); }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 12, gap: 12, borderWidth: 1 },
  pickBtnText: { fontSize: 16, fontWeight: '600', color: '#8E24AA' },
  card: { borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
});
