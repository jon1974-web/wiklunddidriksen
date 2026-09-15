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
import { Home, HomeInstruction } from '../types';
import { getHomeInstructions, addHomeInstruction, updateHomeInstruction, deleteHomeInstruction } from '../services/homeService';
import { ActionModal } from '../components/ActionModal';

const HOME_THEME = MODULE_COLORS.home;

interface HomeInstructionsScreenProps {
  navigation: any;
  route: { params: { home: Home } };
}

export const HomeInstructionsScreen: React.FC<HomeInstructionsScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { home } = route.params;

  const [instructions, setInstructions] = useState<HomeInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'coming' | 'leaving'>('coming');
  const [actionModal, setActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formSection, setFormSection] = useState<'coming' | 'leaving'>('coming');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadInstructions = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getHomeInstructions(familyId, home.id);
      setInstructions(data);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [familyId, home.id]);

  useEffect(() => { loadInstructions(); }, [loadInstructions]);

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormSection('coming');
    setFormImageUrl('');
    setEditingInstruction(null);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      crossAlert(t('common.error'), t('homes.instructionTitleRequired'));
      return;
    }
    if (!familyId) return;
    setSaving(true);
    try {
      const data = {
        homeId: home.id,
        section: formSection,
        title: formTitle.trim(),
        content: formContent.trim(),
        imageUrl: formImageUrl || undefined,
        familyId,
      };
      if (editingInstruction) {
        await updateHomeInstruction(editingInstruction, data);
      } else {
        await addHomeInstruction(data);
      }
      resetForm();
      setShowAddModal(false);
      loadInstructions();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!actionModal.id) return;
    try {
      await deleteHomeInstruction(actionModal.id);
      setActionModal({ visible: false, id: '', title: '' });
      loadInstructions();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleEdit = () => {
    const instruction = instructions.find((i) => i.id === actionModal.id);
    if (instruction) {
      setEditingInstruction(instruction.id);
      setFormTitle(instruction.title);
      setFormContent(instruction.content);
      setFormSection(instruction.section);
      setFormImageUrl(instruction.imageUrl || '');
      setShowAddModal(true);
    }
    setActionModal({ visible: false, id: '', title: '' });
  };

  const handleExtractFromPhoto = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          crossAlert(t('common.error'), 'Kamera tillatelse er nødvendig');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      }

      if (result.canceled || !result.assets[0]) return;

      setExtracting(true);
      const asset = result.assets[0];

      const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/homeExtractColor';
      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        crossAlert(t('common.error'), 'Ikke logget inn');
        return;
      }

      let imageBase64: string;
      if (asset.base64) {
        imageBase64 = asset.base64;
      } else {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });
      }

      const INSTRUCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/homeExtractInstruction';
      const res = await fetch(INSTRUCTION_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();
      if (data.error) {
        crossAlert(t('common.error'), data.error);
        return;
      }

      if (data.title) setFormTitle(data.title);
      if (data.content) setFormContent(data.content);
      if (data.section) setFormSection(data.section);
      if (asset.uri) setFormImageUrl(asset.uri);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setExtracting(false);
    }
  };

  const comingInstructions = instructions.filter((i) => i.section === 'coming');
  const leavingInstructions = instructions.filter((i) => i.section === 'leaving');

  const renderInstruction = (instruction: HomeInstruction) => (
    <TouchableOpacity
      key={instruction.id}
      style={[styles.instructionCard, { backgroundColor: colors.surface }]}
      onLongPress={() => setActionModal({ visible: true, id: instruction.id, title: instruction.title })}
    >
      <Text style={[styles.instructionTitle, { color: colors.text }]}>{instruction.title}</Text>
      {instruction.content ? (
        <Text style={[styles.instructionContent, { color: colors.textSecondary }]}>{instruction.content}</Text>
      ) : null}
      {instruction.imageUrl ? (
        <Image source={{ uri: instruction.imageUrl }} style={styles.instructionImage} resizeMode="cover" />
      ) : null}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ActivityIndicator size="large" color={HOME_THEME} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
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
          <AppIcon name="instruksjon" size={28} color={HOME_THEME} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>{t('homes.instructions')}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{home.name}</Text>
          </View>
        </View>
      </View>
      <ScrollView style={styles.content}>
        {/* Coming home */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={{ fontSize: 18 }}>🏠</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('homes.comingHome')}</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({comingInstructions.length})</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: HOME_THEME }]}
              onPress={() => { resetForm(); setFormSection('coming'); setShowAddModal(true); }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
          {comingInstructions.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textDisabled, textAlign: 'center', padding: 16 }}>{t('homes.noInstructions')}</Text>
          ) : (
            comingInstructions.map(renderInstruction)
          )}
        </View>

        {/* Leaving home */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={{ fontSize: 18 }}>🚪</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('homes.leavingHome')}</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({leavingInstructions.length})</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: HOME_THEME }]}
              onPress={() => { resetForm(); setFormSection('leaving'); setShowAddModal(true); }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
          {leavingInstructions.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textDisabled, textAlign: 'center', padding: 16 }}>{t('homes.noInstructions')}</Text>
          ) : (
            leavingInstructions.map(renderInstruction)
          )}
        </View>
      </ScrollView>

      <ActionModal
        visible={actionModal.visible}
        title={actionModal.title}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancel={() => setActionModal({ visible: false, id: '', title: '' })}
        accentColor={HOME_THEME}
      />

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingInstruction ? t('homes.editInstruction') : t('homes.addInstruction')}</Text>

              {/* AI extraction buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[styles.aiButton, { backgroundColor: HOME_THEME + '15', borderColor: HOME_THEME }]}
                  onPress={() => handleExtractFromPhoto(true)}
                  disabled={extracting}
                >
                  {extracting ? <ActivityIndicator size="small" color={HOME_THEME} /> : <AppIcon name="camera" size={20} color={HOME_THEME} />}
                  <Text style={{ color: HOME_THEME, fontSize: 12, fontWeight: '600' }}>{t('homes.scanNote')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.aiButton, { backgroundColor: HOME_THEME + '15', borderColor: HOME_THEME }]}
                  onPress={() => handleExtractFromPhoto(false)}
                  disabled={extracting}
                >
                  {extracting ? <ActivityIndicator size="small" color={HOME_THEME} /> : <AppIcon name="camera" size={20} color={HOME_THEME} />}
                  <Text style={{ color: HOME_THEME, fontSize: 12, fontWeight: '600' }}>{t('homes.scanFromGallery')}</Text>
                </TouchableOpacity>
              </View>

              {/* Section selector */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.section')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['coming', 'leaving'] as const).map((sec) => {
                    const isSelected = formSection === sec;
                    return (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.sectionOption, { backgroundColor: colors.surface, borderColor: isSelected ? HOME_THEME : colors.border }, isSelected && { backgroundColor: HOME_THEME }]}
                        onPress={() => setFormSection(sec)}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isSelected ? '#fff' : colors.text }}>
                          {sec === 'coming' ? '🏠 ' + t('homes.comingHome') : '🚪 ' + t('homes.leavingHome')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.instructionTitle')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder={t('homes.instructionTitlePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.instructionContent')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, { minHeight: 120, textAlignVertical: 'top' }]}
                  value={formContent}
                  onChangeText={setFormContent}
                  placeholder={t('homes.instructionContentPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  numberOfLines={5}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowAddModal(false); resetForm(); }}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: HOME_THEME, opacity: saving ? 0.5 : 1, flex: 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.buttonText}>{saving ? '...' : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  instructionCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  instructionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  instructionContent: { fontSize: 13, lineHeight: 18 },
  instructionImage: { width: '100%', height: 120, borderRadius: 8, marginTop: 8 },
  aiButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRight: 20, maxHeight: '85%', padding: 20 },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  sectionOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
