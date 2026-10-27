import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { auth } from '../services/firebase';
import { IMAGE_QUALITY } from '../constants/limits';
import { crossAlert } from '../utils/alert';
import { getErrorMessage, sanitizeInput } from '../utils/validation';
import { AppIcon } from './AppIcon';

export type ListImportKind = 'packing' | 'shopping';

const LIST_IMPORT_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/listImageToItems';
const REQUEST_TIMEOUT_MS = 60000;

type ImportMode = 'choose' | 'processing' | 'review';

interface ReviewItem {
  id: string;
  name: string;
  selected: boolean;
}

export interface ListImportModalProps {
  visible: boolean;
  kind: ListImportKind;
  accentColor: string;
  onClose: () => void;
  /** Receives the cleaned item names. The caller creates the list and closes the modal. */
  onSave: (names: string[]) => Promise<void>;
}

/**
 * Reusable "create items from a photo" flow for lists (packing, shopping).
 * Capture or pick an image, send it to listImageToItems, then review and edit
 * the extracted items before they are handed back via onSave.
 */
export const ListImportModal: React.FC<ListImportModalProps> = ({ visible, kind, accentColor, onClose, onSave }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [mode, setMode] = useState<ImportMode>('choose');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset whenever the modal is opened or closed
  useEffect(() => {
    if (!visible) {
      setMode('choose');
      setItems([]);
      setSaving(false);
    }
  }, [visible]);

  const analyzeImage = useCallback(async (base64: string) => {
    setMode('processing');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const currentUser = auth.currentUser;
      if (currentUser) {
        headers['Authorization'] = `Bearer ${await currentUser.getIdToken()}`;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(LIST_IMPORT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageBase64: base64, kind }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }
      const names: string[] = Array.isArray(data.items) ? data.items : [];
      if (names.length === 0) {
        crossAlert(t('listImport.title'), t('listImport.noItems'));
        setMode('choose');
        return;
      }
      setItems(names.map((name, index) => ({ id: `${Date.now()}-${index}`, name, selected: true })));
      setMode('review');
    } catch (error: any) {
      crossAlert(
        t('listImport.title'),
        error?.name === 'AbortError' ? t('listImport.timeout') : getErrorMessage(error),
      );
      setMode('choose');
    }
  }, [kind, t]);

  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        crossAlert(t('common.permission'), t('common.cameraPermissionNeeded'));
        return;
      }
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: IMAGE_QUALITY, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: IMAGE_QUALITY, base64: true });
    if (result.canceled || !result.assets[0]) return;
    const base64 = result.assets[0].base64;
    if (!base64) {
      crossAlert(t('listImport.title'), t('listImport.error'));
      return;
    }
    analyzeImage(base64);
  }, [analyzeImage, t]);

  const updateItem = (id: string, patch: Partial<ReviewItem>) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    const names = items
      .filter(item => item.selected)
      .map(item => sanitizeInput(item.name.trim()))
      .filter(name => name.length > 0);
    if (names.length === 0) {
      crossAlert(t('listImport.title'), t('listImport.noItems'));
      return;
    }
    setSaving(true);
    try {
      await onSave(names);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = items.filter(item => item.selected).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={styles.header}>
                <AppIcon name="camera" size={24} color={accentColor} />
                <Text style={[styles.title, { color: colors.text }]}>{t('listImport.title')}</Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {kind === 'packing' ? t('listImport.subtitlePacking') : t('listImport.subtitleShopping')}
              </Text>

              {mode === 'choose' && (
                <View style={styles.body}>
                  <TouchableOpacity style={[styles.bigButton, { backgroundColor: accentColor }]} onPress={() => pickImage('camera')}>
                    <Text style={styles.bigButtonText}>{t('listImport.takePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.bigButton, { backgroundColor: colors.inputBackground }]} onPress={() => pickImage('gallery')}>
                    <Text style={[styles.bigButtonText, { color: colors.text }]}>{t('listImport.pickGallery')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'processing' && (
                <View style={[styles.body, { alignItems: 'center', paddingVertical: 32 }]}>
                  <ActivityIndicator size="large" color={accentColor} />
                  <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 12 }]}>{t('listImport.processing')}</Text>
                </View>
              )}

              {mode === 'review' && (
                <>
                  <Text style={[styles.reviewHint, { color: colors.textSecondary }]}>{t('listImport.reviewHint')}</Text>
                  <ScrollView style={styles.reviewList}>
                    {items.map(item => (
                      <View key={item.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                          style={[styles.checkbox, { borderColor: item.selected ? accentColor : colors.textDisabled, backgroundColor: item.selected ? accentColor : 'transparent' }]}
                          onPress={() => updateItem(item.id, { selected: !item.selected })}
                        >
                          {item.selected && <Text style={styles.checkmark}>✓</Text>}
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.nameInput, { color: colors.text, opacity: item.selected ? 1 : 0.5 }]}
                          value={item.name}
                          onChangeText={(v) => updateItem(item.id, { name: v })}
                          placeholder={t('listImport.itemPlaceholder')}
                          placeholderTextColor={colors.textDisabled}
                        />
                        <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.id)}>
                          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.retakeButton} onPress={() => setMode('choose')}>
                    <Text style={{ color: accentColor, fontWeight: '600' }}>{t('listImport.retake')}</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.inputBackground }]} onPress={onClose} disabled={saving}>
                  <Text style={[styles.actionText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                {mode === 'review' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: accentColor, opacity: selectedCount === 0 || saving ? 0.5 : 1 }]}
                    onPress={handleSave}
                    disabled={selectedCount === 0 || saving}
                  >
                    <Text style={[styles.actionText, { color: '#fff' }]}>{t('listImport.addItems', { count: selectedCount })}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  body: { gap: 12 },
  bigButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  bigButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  reviewHint: { fontSize: 13, marginBottom: 8 },
  reviewList: { maxHeight: 360 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  nameInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  removeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  retakeButton: { alignSelf: 'center', paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  actionText: { fontSize: 16, fontWeight: '600' },
});
