import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Home, HomeProject, HomePaintColor, HomeShoppingItem, HomeOffer } from '../types';
import { getHomePaintColors, addHomePaintColor, deleteHomePaintColor, getHomeShoppingItems, addHomeShoppingItem, updateHomeShoppingItem, deleteHomeShoppingItem, getHomeOffers, addHomeOffer, updateHomeOffer, deleteHomeOffer } from '../services/homeService';
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

  const [shoppingItems, setShoppingItems] = useState<HomeShoppingItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemActionModal, setItemActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnitPrice, setItemUnitPrice] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  const [offers, setOffers] = useState<HomeOffer[]>([]);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [editingOffer, setEditingOffer] = useState<string | null>(null);
  const [offerActionModal, setOfferActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [offerVendor, setOfferVendor] = useState('');
  const [offerPhone, setOfferPhone] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerItems, setOfferItems] = useState('');
  const [offerFileUrl, setOfferFileUrl] = useState('');
  const [offerFileName, setOfferFileName] = useState('');
  const [savingOffer, setSavingOffer] = useState(false);

  const loadData = useCallback(async () => {
    if (!familyId) return;
    try {
      const [colorData, itemData, offerData] = await Promise.allSettled([
        getHomePaintColors(familyId, project.homeId, project.id),
        getHomeShoppingItems(familyId, project.id),
        getHomeOffers(familyId, project.id),
      ]);
      setPaintColors(colorData.status === 'fulfilled' ? colorData.value : []);
      setShoppingItems(itemData.status === 'fulfilled' ? itemData.value : []);
      setOffers(offerData.status === 'fulfilled' ? offerData.value : []);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [familyId, project.homeId, project.id]);

  useEffect(() => { loadData(); }, [loadData]);

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
        projectId: project.id,
        name: colorName.trim(),
        code: colorCode.trim(),
        brand: colorBrand.trim(),
        room: colorRoom.trim(),
        hexColor: colorHex,
        familyId,
      });
      resetForm();
      setShowAddColor(false);
      loadData();
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
      loadData();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const resetItemForm = () => { setItemName(''); setItemQuantity('1'); setItemUnitPrice(''); setEditingItem(null); };

  const handleSaveItem = async () => {
    if (!itemName.trim()) { crossAlert(t('common.error'), t('homes.itemNameRequired')); return; }
    if (!familyId) return;
    setSavingItem(true);
    try {
      const data = {
        projectId: project.id,
        name: itemName.trim(),
        quantity: parseInt(itemQuantity) || 1,
        unitPrice: parseFloat(itemUnitPrice) || 0,
        checked: false,
        familyId,
      };
      if (editingItem) { await updateHomeShoppingItem(editingItem, data); }
      else { await addHomeShoppingItem(data); }
      resetItemForm();
      setShowAddItem(false);
      loadData();
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setSavingItem(false); }
  };

  const handleDeleteItem = async () => {
    if (!itemActionModal.id) return;
    try { await deleteHomeShoppingItem(itemActionModal.id); setItemActionModal({ visible: false, id: '', title: '' }); loadData(); }
    catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
  };

  const handleEditItem = () => {
    const item = shoppingItems.find((i) => i.id === itemActionModal.id);
    if (item) {
      setEditingItem(item.id);
      setItemName(item.name);
      setItemQuantity(String(item.quantity));
      setItemUnitPrice(String(item.unitPrice || ''));
      setShowAddItem(true);
    }
    setItemActionModal({ visible: false, id: '', title: '' });
  };

  const handleToggleItem = async (item: HomeShoppingItem) => {
    try { await updateHomeShoppingItem(item.id, { checked: !item.checked }); loadData(); }
    catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
  };

  const handleReceiptScan = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (result.canceled || !result.assets[0]) return;
      setExtracting(true);
      const asset = result.assets[0];

      // Upload receipt image first
      const { webUploadFile } = await import('../services/webStorage');
      let blob: Blob;
      if (asset.base64 && Platform.OS === 'web') {
        const byteString = atob(asset.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        blob = new Blob([ab], { type: 'image/jpeg' });
      } else {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      }
      const receiptUrl = await webUploadFile(`receipts/${Date.now()}.jpg`, blob);

      let imageBase64: string;
      if (asset.base64) { imageBase64 = asset.base64; } else {
        const response = await fetch(asset.uri); const b = await response.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => { reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(b); });
      }

      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/homeExtractReceipt', {
        method: 'POST', headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();

      if (data.items && data.items.length > 0 && familyId) {
        let addedCount = 0;
        for (const item of data.items) {
          await addHomeShoppingItem({
            projectId: project.id,
            name: item.name,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            checked: false,
            receiptUrl,
            familyId,
          });
          addedCount++;
        }
        crossAlert(t('homes.receiptScanned'), `${addedCount} ${t('homes.itemsAdded')}`);
        loadData();
      } else {
        crossAlert(t('homes.receiptNoItems'), t('homes.receiptNoItemsText'));
      }
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setExtracting(false);
    }
  };

  const handleUploadReceipt = async (itemId: string) => {
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const { webUploadFile } = await import('../services/webStorage');
      let blob: Blob;
      if (asset.base64 && Platform.OS === 'web') {
        const byteString = atob(asset.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        blob = new Blob([ab], { type: 'image/jpeg' });
      } else {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      }
      const url = await webUploadFile(`receipts/${Date.now()}.jpg`, blob);
      await updateHomeShoppingItem(itemId, { receiptUrl: url });
      loadData();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const resetOfferForm = () => {
    setOfferVendor('');
    setOfferPhone('');
    setOfferPrice('');
    setOfferItems('');
    setOfferFileUrl('');
    setOfferFileName('');
    setEditingOffer(null);
  };

  const handleSaveOffer = async () => {
    if (!offerVendor.trim()) { crossAlert(t('common.error'), t('homes.vendorRequired')); return; }
    if (!familyId) return;
    setSavingOffer(true);
    try {
      const data = {
        projectId: project.id,
        vendorName: offerVendor.trim(),
        vendorPhone: offerPhone.trim(),
        price: parseFloat(offerPrice) || 0,
        items: offerItems.trim(),
        fileUrl: offerFileUrl || undefined,
        fileName: offerFileName || undefined,
        familyId,
      };
      if (editingOffer) { await updateHomeOffer(editingOffer, data); }
      else { await addHomeOffer(data); }
      resetOfferForm();
      setShowAddOffer(false);
      loadData();
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setSavingOffer(false); }
  };

  const handleDeleteOffer = async () => {
    if (!offerActionModal.id) return;
    try { await deleteHomeOffer(offerActionModal.id); setOfferActionModal({ visible: false, id: '', title: '' }); loadData(); }
    catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
  };

  const handleEditOffer = () => {
    const offer = offers.find((o) => o.id === offerActionModal.id);
    if (offer) {
      setEditingOffer(offer.id);
      setOfferVendor(offer.vendorName);
      setOfferPhone(offer.vendorPhone || '');
      setOfferPrice(String(offer.price || ''));
      setOfferItems(offer.items || '');
      setOfferFileUrl(offer.fileUrl || '');
      setOfferFileName(offer.fileName || '');
      setShowAddOffer(true);
    }
    setOfferActionModal({ visible: false, id: '', title: '' });
  };

  const handleScanOffer = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (result.canceled || !result.assets[0]) return;
      setExtracting(true);
      const asset = result.assets[0];

      const { webUploadFile } = await import('../services/webStorage');
      let blob: Blob;
      if (asset.base64 && Platform.OS === 'web') {
        const byteString = atob(asset.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        blob = new Blob([ab], { type: 'image/jpeg' });
      } else {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      }
      const fileUrl = await webUploadFile(`offers/${Date.now()}.jpg`, blob);

      let imageBase64: string;
      if (asset.base64) { imageBase64 = asset.base64; } else {
        const response = await fetch(asset.uri); const b = await response.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => { reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(b); });
      }

      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/homeExtractOffer', {
        method: 'POST', headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      if (data.vendorName) setOfferVendor(data.vendorName);
      if (data.vendorPhone) setOfferPhone(data.vendorPhone);
      if (data.price) setOfferPrice(String(data.price));
      if (data.items) setOfferItems(data.items);
      if (fileUrl) { setOfferFileUrl(fileUrl); setOfferFileName('offer.jpg'); }
      setShowAddOffer(true);
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setExtracting(false); }
  };

  const totalSpent = useMemo(() => shoppingItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [shoppingItems]);
  const totalChecked = useMemo(() => shoppingItems.filter(i => i.checked).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [shoppingItems]);
  const totalOffers = useMemo(() => offers.reduce((sum, o) => sum + (o.price || 0), 0), [offers]);

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

        {/* Shopping List */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="shopping" size={18} color={HOME_THEME} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('homes.shoppingList')}</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({shoppingItems.length})</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: HOME_THEME + '20' }]} onPress={handleReceiptScan}>
                <AppIcon name="camera" size={16} color={HOME_THEME} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: HOME_THEME }]} onPress={() => { resetItemForm(); setShowAddItem(true); }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Budget overview */}
          {shoppingItems.length > 0 && (
            <View style={[styles.budgetRow, { backgroundColor: colors.inputBackground }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t('homes.totalItems')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{shoppingItems.length}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t('homes.totalCost')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: HOME_THEME }}>{totalSpent.toLocaleString('nb-NO', { minimumFractionDigits: 0 })} kr</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t('homes.checkedCost')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#43A047' }}>{totalChecked.toLocaleString('nb-NO', { minimumFractionDigits: 0 })} kr</Text>
              </View>
            </View>
          )}

          {shoppingItems.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.shoppingItem, { borderBottomColor: colors.border }]} onPress={() => handleToggleItem(item)} onLongPress={() => setItemActionModal({ visible: true, id: item.id, title: item.name })}>
              <View style={[styles.checkbox, { borderColor: item.checked ? HOME_THEME : colors.border, backgroundColor: item.checked ? HOME_THEME : 'transparent' }]}>
                {item.checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shoppingItemName, { color: item.checked ? colors.textDisabled : colors.text, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.name}</Text>
                {item.quantity > 1 && <Text style={{ fontSize: 11, color: colors.textSecondary }}>x{item.quantity}</Text>}
              </View>
              {item.unitPrice > 0 && (
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginRight: 8 }}>{(item.quantity * item.unitPrice).toLocaleString('nb-NO', { minimumFractionDigits: 0 })} kr</Text>
              )}
              <TouchableOpacity style={styles.receiptBtn} onPress={() => handleUploadReceipt(item.id)}>
                <AppIcon name={item.receiptUrl ? 'file' : 'camera'} size={14} color={item.receiptUrl ? '#43A047' : colors.textDisabled} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tilbud */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="shopping" size={18} color={HOME_THEME} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('homes.offers')}</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({offers.length})</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: HOME_THEME + '20' }]} onPress={handleScanOffer}>
                <AppIcon name="camera" size={16} color={HOME_THEME} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: HOME_THEME }]} onPress={() => { resetOfferForm(); setShowAddOffer(true); }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {offers.length > 0 && (
            <View style={[styles.budgetRow, { backgroundColor: colors.inputBackground }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t('homes.totalOffers')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{offers.length}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t('homes.totalOfferCost')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: HOME_THEME }}>{totalOffers.toLocaleString('nb-NO', { minimumFractionDigits: 0 })} kr</Text>
              </View>
            </View>
          )}

          {offers.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textDisabled, textAlign: 'center', padding: 16 }}>{t('homes.noOffers')}</Text>
          ) : (
            offers.map((offer) => (
              <TouchableOpacity
                key={offer.id}
                style={[styles.shoppingItem, { borderBottomColor: colors.border }]}
                onLongPress={() => setOfferActionModal({ visible: true, id: offer.id, title: offer.vendorName })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.shoppingItemName, { color: colors.text }]} numberOfLines={1}>{offer.vendorName}</Text>
                  {offer.items ? <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{offer.items}</Text> : null}
                  {offer.vendorPhone ? <Text style={{ fontSize: 11, color: colors.textDisabled }} numberOfLines={1}>📞 {offer.vendorPhone}</Text> : null}
                </View>
                {offer.price > 0 && (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginRight: 8 }}>{offer.price.toLocaleString('nb-NO', { minimumFractionDigits: 0 })} kr</Text>
                )}
                {offer.fileUrl ? (
                  <AppIcon name="file" size={14} color="#43A047" />
                ) : null}
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

      <ActionModal
        visible={itemActionModal.visible}
        title={itemActionModal.title}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        onCancel={() => setItemActionModal({ visible: false, id: '', title: '' })}
        accentColor={HOME_THEME}
      />

      <ActionModal
        visible={offerActionModal.visible}
        title={offerActionModal.title}
        onEdit={handleEditOffer}
        onDelete={handleDeleteOffer}
        onCancel={() => setOfferActionModal({ visible: false, id: '', title: '' })}
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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, flex: 1 }]}
                    value={colorCode}
                    onChangeText={setColorCode}
                    placeholder={t('homes.colorCodePlaceholder')}
                    placeholderTextColor={colors.textDisabled}
                  />
                  <TouchableOpacity
                    style={[styles.fetchButton, { backgroundColor: HOME_THEME, opacity: (extracting || !colorCode.trim()) ? 0.5 : 1 }]}
                    disabled={extracting || !colorCode.trim()}
                    onPress={async () => {
                      if (!colorCode.trim()) return;
                      setExtracting(true);
                      try {
                        const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/homeExtractColor';
                        const { auth } = await import('../services/firebase');
                        const idToken = await auth.currentUser?.getIdToken();
                        if (!idToken) return;

                        const res = await fetch(CLOUD_FUNCTION_URL, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ colorCode: colorCode.trim() }),
                        });
                        const data = await res.json();
                        if (data.hexColor) setColorHex(data.hexColor);
                        if (data.name && !colorName) setColorName(data.name);
                      } catch (error) {
                        crossAlert(t('common.error'), getErrorMessage(error));
                      } finally {
                        setExtracting(false);
                      }
                    }}
                  >
                    {extracting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{t('homes.fetchColor')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
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

      {/* Add Shopping Item Modal */}
      <Modal visible={showAddItem} transparent animationType="slide" onRequestClose={() => setShowAddItem(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingItem ? t('homes.editItem') : t('homes.addItem')}</Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.itemName')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={itemName} onChangeText={setItemName} placeholder={t('homes.itemNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.quantity')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={itemQuantity} onChangeText={setItemQuantity} keyboardType="numeric" placeholder="1" placeholderTextColor={colors.textDisabled} />
                </View>
                <View style={[styles.field, { flex: 2 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.unitPrice')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={itemUnitPrice} onChangeText={setItemUnitPrice} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textDisabled} />
                </View>
              </View>

              {itemQuantity && itemUnitPrice ? (
                <View style={[styles.budgetRow, { backgroundColor: colors.inputBackground, marginBottom: 16 }]}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: HOME_THEME }}>{t('homes.total')}: {((parseInt(itemQuantity) || 0) * (parseFloat(itemUnitPrice) || 0)).toLocaleString('nb-NO', { minimumFractionDigits: 0 })} kr</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowAddItem(false); resetItemForm(); }}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: HOME_THEME, opacity: savingItem ? 0.5 : 1, flex: 1 }]} onPress={handleSaveItem} disabled={savingItem}>
                  <Text style={styles.buttonText}>{savingItem ? '...' : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Offer Modal */}
      <Modal visible={showAddOffer} transparent animationType="slide" onRequestClose={() => setShowAddOffer(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingOffer ? t('homes.editOffer') : t('homes.addOffer')}</Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.vendorName')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={offerVendor} onChangeText={setOfferVendor} placeholder={t('homes.vendorNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.vendorPhone')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={offerPhone} onChangeText={setOfferPhone} placeholder={t('homes.vendorPhonePlaceholder')} placeholderTextColor={colors.textDisabled} />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.offerPrice')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={offerPrice} onChangeText={setOfferPrice} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textDisabled} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.offerItems')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, minHeight: 60, textAlignVertical: 'top' }]} value={offerItems} onChangeText={setOfferItems} placeholder={t('homes.offerItemsPlaceholder')} placeholderTextColor={colors.textDisabled} multiline />
              </View>

              {offerFileUrl ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: colors.inputBackground, marginBottom: 16 }}>
                  <AppIcon name="file" size={16} color="#43A047" />
                  <Text style={{ fontSize: 13, color: colors.text, flex: 1 }} numberOfLines={1}>{offerFileName || 'Vedlegg'}</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowAddOffer(false); resetOfferForm(); }}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: HOME_THEME, opacity: savingOffer ? 0.5 : 1, flex: 1 }]} onPress={handleSaveOffer} disabled={savingOffer}>
                  <Text style={styles.buttonText}>{savingOffer ? '...' : t('common.save')}</Text>
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
  fetchButton: { paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRight: 20, maxHeight: '85%', padding: 20 },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  budgetRow: { flexDirection: 'row', borderRadius: 10, padding: 12, marginBottom: 12, gap: 12 },
  shoppingItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  shoppingItemName: { fontSize: 14, fontWeight: '500' },
  receiptBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
