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
import { Home, HomeProject, HomePaintColor } from '../types';
import { getHomePaintColors, addHomePaintColor, deleteHomePaintColor } from '../services/homeService';
import { ActionModal } from '../components/ActionModal';

const HOME_THEME = MODULE_COLORS.home;

interface HomeProjectDetailScreenProps {
  navigation: any;
  route: { params: { home: Home; project: HomeProject } };
}

export const HomeProjectDetailScreen: React.FC<HomeProjectDetailScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { home, project } = route.params;

  const [paintColors, setPaintColors] = useState<HomePaintColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddColor, setShowAddColor] = useState(false);
  const [colorActionModal, setColorActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });

  const [colorName, setColorName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [colorBrand, setColorBrand] = useState('');
  const [colorRoom, setColorRoom] = useState('');
  const [colorHex, setColorHex] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadColors = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getHomePaintColors(familyId, project.homeId);
      setPaintColors(data);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [familyId, project.homeId]);

  useEffect(() => { loadColors(); }, [loadColors]);

  const resetForm = () => {
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
        if (!permission.granted) {
          crossAlert(t('common.error'), 'Kamera tillatelse er nødvendig');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });
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

      const res = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();
      if (data.error) {
        crossAlert(t('common.error'), data.error);
        return;
      }

      if (data.name) setColorName(data.name);
      if (data.code) setColorCode(data.code);
      if (data.hexColor) setColorHex(data.hexColor);
      if (data.brand) setColorBrand(data.brand);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveColor = async () => {
    if (!colorName.trim() && !colorCode.trim()) {
      crossAlert(t('common.error'), t('homes.colorNameOrCodeRequired'));
      return;
    }
    if (!familyId) return;
    setSaving(true);
    try {
      await addHomePaintColor({
        homeId: project.homeId,
        name: colorName.trim(),
        code: colorCode.trim(),
        brand: colorBrand.trim(),
        room: colorRoom.trim(),
        hexColor: colorHex,
        familyId,
      });
      resetForm();
      setShowAddColor(false);
      loadColors();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteColor = async () => {
    if (!colorActionModal.id) return;
    try {
      await deleteHomePaintColor(colorActionModal.id);
      setColorActionModal({ visible: false, id: '', title: '' });
      loadColors();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

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
          <AppIcon name="activities" size={28} color={HOME_THEME} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: colors.text }]} numberOfLines={1}>{project.title}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{home.name}</Text>
          </View>
        </View>
      </View>
      <ScrollView style={styles.content}>
        {/* Colors section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="paintColor" size={18} color={HOME_THEME} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('homes.paintColors')}</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({paintColors.length})</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: HOME_THEME }]}
              onPress={() => { resetForm(); setShowAddColor(true); }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>

          {paintColors.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textDisabled, textAlign: 'center', padding: 16 }}>{t('homes.noColors')}</Text>
          ) : (
            paintColors.map((color) => (
              <TouchableOpacity
                key={color.id}
                style={[styles.colorItem, { borderBottomColor: colors.border }]}
                onLongPress={() => setColorActionModal({ visible: true, id: color.id, title: color.name || color.code })}
              >
                {color.hexColor ? (
                  <View style={[styles.colorSwatch, { backgroundColor: color.hexColor }]} />
                ) : (
                  <View style={[styles.colorSwatch, { backgroundColor: colors.inputBackground }]}>
                    <Text style={{ fontSize: 10, color: colors.textDisabled }}>🎨</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.colorName, { color: colors.text }]} numberOfLines={1}>{color.name || t('homes.unnamed')}</Text>
                  <Text style={[styles.colorCode, { color: colors.textSecondary }]} numberOfLines={1}>{color.code}{color.brand ? ` · ${color.brand}` : ''}</Text>
                  {color.room ? <Text style={[styles.colorRoom, { color: colors.textDisabled }]} numberOfLines={1}>📍 {color.room}</Text> : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <ActionModal
        visible={colorActionModal.visible}
        title={colorActionModal.title}
        onDelete={handleDeleteColor}
        onCancel={() => setColorActionModal({ visible: false, id: '', title: '' })}
        accentColor={HOME_THEME}
      />

      <Modal visible={showAddColor} transparent animationType="slide" onRequestClose={() => setShowAddColor(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('homes.addColor')}</Text>

              {/* AI extraction buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[styles.aiButton, { backgroundColor: HOME_THEME + '15', borderColor: HOME_THEME }]}
                  onPress={() => handleExtractColor(true)}
                  disabled={extracting}
                >
                  {extracting ? (
                    <ActivityIndicator size="small" color={HOME_THEME} />
                  ) : (
                    <AppIcon name="camera" size={20} color={HOME_THEME} />
                  )}
                  <Text style={{ color: HOME_THEME, fontSize: 12, fontWeight: '600' }}>{t('homes.photoTag')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.aiButton, { backgroundColor: HOME_THEME + '15', borderColor: HOME_THEME }]}
                  onPress={() => handleExtractColor(false)}
                  disabled={extracting}
                >
                  {extracting ? (
                    <ActivityIndicator size="small" color={HOME_THEME} />
                  ) : (
                    <AppIcon name="camera" size={20} color={HOME_THEME} />
                  )}
                  <Text style={{ color: HOME_THEME, fontSize: 12, fontWeight: '600' }}>{t('homes.photoWall')}</Text>
                </TouchableOpacity>
              </View>

              {/* Color preview */}
              {colorHex ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: colors.inputBackground }}>
                  <View style={[styles.colorSwatchLarge, { backgroundColor: colorHex }]} />
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{colorName || t('homes.extractedColor')}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{colorCode} · {colorHex}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.colorName')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                  value={colorName}
                  onChangeText={setColorName}
                  placeholder={t('homes.colorNamePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.colorCode')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                  value={colorCode}
                  onChangeText={setColorCode}
                  placeholder={t('homes.colorCodePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.colorBrand')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    value={colorBrand}
                    onChangeText={setColorBrand}
                    placeholder={t('homes.colorBrandPlaceholder')}
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.colorRoom')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    value={colorRoom}
                    onChangeText={setColorRoom}
                    placeholder={t('homes.colorRoomPlaceholder')}
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowAddColor(false); resetForm(); }}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: HOME_THEME, opacity: saving ? 0.5 : 1, flex: 1 }]}
                  onPress={handleSaveColor}
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
  sectionCount: { fontSize: 14, fontWeight: '400' },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  colorItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  colorSwatch: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  colorSwatchLarge: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  colorName: { fontSize: 14, fontWeight: '600' },
  colorCode: { fontSize: 12 },
  colorRoom: { fontSize: 11, marginTop: 2 },
  aiButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1 },
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
