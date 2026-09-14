import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { crossAlert } from '../utils/alert';
import { MODULE_COLORS } from '../constants/moduleColors';
import { getErrorMessage } from '../utils/validation';
import { Home, HomeType } from '../types';
import { getHomes, addHome, updateHome, deleteHome } from '../services/homeService';
import { ActionModal } from '../components/ActionModal';
import { HelpCenter } from '../components/HelpCenter';
import { getStaticMapUrl } from '../utils/maps';

const HOME_THEME = MODULE_COLORS.home;

const HOME_TYPES: { type: HomeType; icon: string; label: string }[] = [
  { type: 'house', icon: 'house', label: 'Hus' },
  { type: 'cabin', icon: 'hotel', label: 'Hytte' },
  { type: 'summerCabin', icon: 'hotel', label: 'Sommerhytte' },
  { type: 'winterCabin', icon: 'hotel', label: 'Vinterhytte' },
  { type: 'apartment', icon: 'house', label: 'Leilighet' },
];

interface HomeSpaceScreenProps {
  navigation: any;
  route?: { params?: { editHomeId?: string } };
}

export const HomeSpaceScreen: React.FC<HomeSpaceScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);

  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHome, setEditingHome] = useState<string | null>(null);
  const [homeActionModal, setHomeActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [showHelp, setShowHelp] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<HomeType>('house');
  const [formAddress, setFormAddress] = useState('');
  const [formPostNumber, setFormPostNumber] = useState('');
  const [formPostCity, setFormPostCity] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadHomes = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getHomes(familyId);
      setHomes(data);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    loadHomes();
  }, [loadHomes]);

  useEffect(() => {
    if (route?.params?.editHomeId) {
      const home = homes.find((h) => h.id === route.params!.editHomeId);
      if (home) {
        setEditingHome(home.id);
        setFormName(home.name);
        setFormType(home.homeType);
        setFormAddress(home.address);
        setFormPostNumber(home.postNumber);
        setFormPostCity(home.postCity);
        setFormDescription(home.description);
        setShowAddModal(true);
        navigation.setParams({ editHomeId: undefined });
      }
    }
  }, [route?.params?.editHomeId, homes]);

  const resetForm = () => {
    setFormName('');
    setFormType('house');
    setFormAddress('');
    setFormPostNumber('');
    setFormPostCity('');
    setFormDescription('');
    setEditingHome(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      crossAlert(t('common.error'), t('homes.nameRequired'));
      return;
    }
    if (!familyId) return;
    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        homeType: formType,
        address: formAddress.trim(),
        postNumber: formPostNumber.trim(),
        postCity: formPostCity.trim(),
        description: formDescription.trim(),
        familyId,
      };
      if (editingHome) {
        await updateHome(editingHome, data);
      } else {
        await addHome(data);
      }
      resetForm();
      setShowAddModal(false);
      loadHomes();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!homeActionModal.id) return;
    try {
      await deleteHome(homeActionModal.id);
      setHomeActionModal({ visible: false, id: '', title: '' });
      loadHomes();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleEdit = () => {
    const home = homes.find((h) => h.id === homeActionModal.id);
    if (home) {
      setEditingHome(home.id);
      setFormName(home.name);
      setFormType(home.homeType);
      setFormAddress(home.address);
      setFormPostNumber(home.postNumber);
      setFormPostCity(home.postCity);
      setFormDescription(home.description);
      setShowAddModal(true);
    }
    setHomeActionModal({ visible: false, id: '', title: '' });
  };

  const getHomeTypeIcon = (type: HomeType): string => {
    return HOME_TYPES.find((ht) => ht.type === type)?.icon || 'house';
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
          <AppIcon name="house" size={28} color={HOME_THEME} />
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('spaces.home')}</Text>
          <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: HOME_THEME, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelp(true)}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: HOME_THEME, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.grid}>
            {homes.map((home) => {
              const mapUrl = home.address ? getStaticMapUrl(home.address, 15, '200x200') : null;
              return (
                <TouchableOpacity
                  key={home.id}
                  style={[styles.homeCard, { backgroundColor: colors.surface }]}
                  onPress={() => navigation.navigate('HomeDetail', { home })}
                  onLongPress={() => setHomeActionModal({ visible: true, id: home.id, title: home.name })}
                >
                  <View style={[styles.homeCardHeader, { backgroundColor: HOME_THEME + '20' }]}>
                    <AppIcon name={getHomeTypeIcon(home.homeType) as any} size={24} color={HOME_THEME} />
                    <Text style={[styles.homeCardType, { color: HOME_THEME }]}>
                      {HOME_TYPES.find((ht) => ht.type === home.homeType)?.label || home.homeType}
                    </Text>
                  </View>
                  <View style={styles.homeCardBody}>
                    <Text style={[styles.homeCardName, { color: colors.text }]} numberOfLines={1}>{home.name}</Text>
                    {home.address ? (
                      <Text style={[styles.homeCardAddress, { color: colors.textSecondary }]} numberOfLines={1}>📍 {home.address}</Text>
                    ) : null}
                  </View>
                  {mapUrl && (
                    <Image source={{ uri: mapUrl }} style={styles.homeCardMap} resizeMode="cover" />
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.homeCard, styles.homeCardAdd, { borderColor: colors.textDisabled }]}
              onPress={() => { resetForm(); setShowAddModal(true); }}
            >
              <AppIcon name="house" size={36} color={colors.textDisabled} />
              <Text style={[styles.homeCardName, { color: colors.textDisabled }]}>{t('homes.addHome')}</Text>
            </TouchableOpacity>
          </View>
      </ScrollView>

      <ActionModal
        visible={homeActionModal.visible}
        title={homeActionModal.title}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancel={() => setHomeActionModal({ visible: false, id: '', title: '' })}
        accentColor={HOME_THEME}
      />

      <HelpCenter
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('homes.helpTitle')}
        sections={[
          { icon: '🏠', title: t('homes.helpWhat'), text: t('homes.helpWhatText') },
          { icon: '👉', title: t('homes.helpHow'), text: t('homes.helpHowText') },
        ]}
      />

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingHome ? t('homes.editHome') : t('homes.addHome')}</Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.name')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder={t('homes.namePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.type')}</Text>
                <View style={styles.typeGrid}>
                  {HOME_TYPES.map((ht) => {
                    const isSelected = formType === ht.type;
                    return (
                      <TouchableOpacity
                        key={ht.type}
                        style={[styles.typeOption, { backgroundColor: colors.surface, borderColor: isSelected ? HOME_THEME : colors.border }, isSelected && { backgroundColor: HOME_THEME }]}
                        onPress={() => setFormType(ht.type)}
                      >
                        <AppIcon name={ht.icon as any} size={22} color={isSelected ? '#fff' : HOME_THEME} />
                        <Text style={[styles.typeLabel, { color: isSelected ? '#fff' : colors.text }]}>{ht.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.address')}</Text>
                <GooglePlacesInput
                  placeholder={t('homes.addressPlaceholder')}
                  address={formAddress}
                  onAddressChange={(addr: string, details?: any) => {
                    setFormAddress(addr);
                    if (details) {
                      const comps = details.address_components || [];
                      const postal = comps.find((c: any) => c.types.includes('postal_code'));
                      const city = comps.find((c: any) => c.types.includes('locality') || c.types.includes('sublocality'));
                      if (postal) setFormPostNumber(postal.long_name);
                      if (city) setFormPostCity(city.long_name);
                    }
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.postNumber')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    value={formPostNumber}
                    onChangeText={setFormPostNumber}
                    placeholder="0000"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.field, { flex: 2 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.postCity')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    value={formPostCity}
                    onChangeText={setFormPostCity}
                    placeholder={t('homes.postCityPlaceholder')}
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.description')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder={t('homes.descriptionPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  numberOfLines={3}
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
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  homeCard: { width: '30%', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  homeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  homeCardType: { fontSize: 11, fontWeight: '600' },
  homeCardBody: { padding: 10, paddingBottom: 6 },
  homeCardName: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  homeCardAddress: { fontSize: 11, textAlign: 'center' },
  homeCardMap: { width: '100%', height: 80 },
  homeCardAdd: { borderWidth: 2, borderStyle: 'dashed', backgroundColor: 'transparent', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRight: 20, maxHeight: '85%', padding: 20 },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  typeLabel: { fontSize: 13, fontWeight: '600' },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
