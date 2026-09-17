import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Image, ActivityIndicator, Platform, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { crossAlert } from '../utils/alert';
import { MODULE_COLORS } from '../constants/moduleColors';
import { getErrorMessage } from '../utils/validation';
import { Home, HomeProject, HomePaintColor, HomeShoppingItem, HomeOffer, HomeTask, HomeTaskStatus } from '../types';
import { getHomePaintColors, addHomePaintColor, deleteHomePaintColor, getHomeShoppingItems, addHomeShoppingItem, updateHomeShoppingItem, deleteHomeShoppingItem, getHomeOffers, addHomeOffer, updateHomeOffer, deleteHomeOffer, getHomeTasks, addHomeTask, updateHomeTask, deleteHomeTask } from '../services/homeService';
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
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
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
  const [offerItemsList, setOfferItemsList] = useState<string[]>([]);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);
  const [savingOffer, setSavingOffer] = useState(false);

  const [tasks, setTasks] = useState<HomeTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState<HomeTask | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [taskActionModal, setTaskActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [addTaskStatus, setAddTaskStatus] = useState<HomeTaskStatus>('todo');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<{ title: string; description: string; shoppingItems: string[]; selected: boolean }[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<{ name: string; quantity: number; unitPrice: number; selected: boolean }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadData = useCallback(async () => {
    if (!familyId) return;
    try {
      const [colorData, itemData, offerData, taskData] = await Promise.allSettled([
        getHomePaintColors(familyId, project.homeId, project.id),
        getHomeShoppingItems(familyId, project.id),
        getHomeOffers(familyId, project.id),
        getHomeTasks(familyId, project.id),
      ]);
      setPaintColors(colorData.status === 'fulfilled' ? colorData.value : []);
      setShoppingItems(itemData.status === 'fulfilled' ? itemData.value : []);
      setOffers(offerData.status === 'fulfilled' ? offerData.value : []);
      setTasks(taskData.status === 'fulfilled' ? taskData.value : []);
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
      const data = {
        homeId: project.homeId,
        projectId: project.id,
        name: colorName.trim(),
        code: colorCode.trim(),
        brand: colorBrand.trim(),
        room: colorRoom.trim(),
        hexColor: colorHex,
        familyId,
      };
      if (editingColorId) {
        await updateHomePaintColor(editingColorId, data);
      } else {
        await addHomePaintColor(data);
      }
      resetForm();
      setShowAddColor(false);
      setEditingColorId(null);
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
    try {
      const newChecked = !item.checked;
      await updateHomeShoppingItem(item.id, { checked: newChecked });
      if (newChecked && item.linkedTaskId) {
        await updateHomeTask(item.linkedTaskId, { status: 'done' });
      }
      loadData();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
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
    setOfferItemsList([]);
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
        itemsList: offerItemsList,
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
      setOfferItemsList(offer.itemsList || []);
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
      if (data.itemsList) setOfferItemsList(data.itemsList);
      if (fileUrl) { setOfferFileUrl(fileUrl); setOfferFileName('offer.jpg'); }
      setShowAddOffer(true);
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setExtracting(false); }
  };

  const totalSpent = useMemo(() => shoppingItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [shoppingItems]);
  const totalChecked = useMemo(() => shoppingItems.filter(i => i.checked).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [shoppingItems]);
  const totalOffers = useMemo(() => offers.reduce((sum, o) => sum + (o.price || 0), 0), [offers]);

  const resetTaskForm = () => { setTaskTitle(''); setTaskDescription(''); setAddTaskStatus('todo'); setEditingTask(null); };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) { crossAlert(t('common.error'), t('homes.taskTitleRequired')); return; }
    if (!familyId) return;
    setSavingTask(true);
    try {
      const data = {
        projectId: project.id,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        status: addTaskStatus,
        familyId,
      };
      if (editingTask) { await updateHomeTask(editingTask, data); }
      else { await addHomeTask(data); }
      resetTaskForm();
      setShowAddTask(false);
      loadData();
    } catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
    finally { setSavingTask(false); }
  };

  const handleDeleteTask = async () => {
    if (!taskActionModal.id) return;
    try { await deleteHomeTask(taskActionModal.id); setTaskActionModal({ visible: false, id: '', title: '' }); loadData(); }
    catch (error) { crossAlert(t('common.error'), getErrorMessage(error)); }
  };

  const handleEditTask = () => {
    const task = tasks.find((t) => t.id === taskActionModal.id);
    if (task) {
      setEditingTask(task.id);
      setTaskTitle(task.title);
      setTaskDescription(task.description);
      setAddTaskStatus(task.status);
      setShowAddTask(true);
    }
    setTaskActionModal({ visible: false, id: '', title: '' });
  };

  const handleMoveTask = async (taskId: string, newStatus: HomeTaskStatus) => {
    try {
      await updateHomeTask(taskId, { status: newStatus });
      const task = tasks.find(t => t.id === taskId);
      if (task && task.linkedItemIds && task.linkedItemIds.length > 0) {
        for (const itemId of task.linkedItemIds) {
          await updateHomeShoppingItem(itemId, { checked: newStatus === 'done' });
        }
      }
      loadData();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleSuggest = async () => {
    if (!project.title) {
      crossAlert(t('common.error'), t('homes.projectTitleRequired'));
      return;
    }
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    try {
      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/homeSuggestTasks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: project.title }),
      });
      const data = await res.json();
      if (data.tasks) {
        setSuggestedTasks(data.tasks.map((t: any) => ({ ...t, selected: true })));
      }
      if (data.shoppingList) {
        setSuggestedItems(data.shoppingList.map((i: any) => ({ ...i, selected: true })));
      }
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleApproveSuggestions = async () => {
    if (!familyId) return;
    const selectedTasks = suggestedTasks.filter(t => t.selected);
    const selectedItems = suggestedItems.filter(i => i.selected);

    try {
      // Create shopping items first and collect their IDs
      const createdItemIds: Record<string, string> = {};
      for (const item of selectedItems) {
        const id = await addHomeShoppingItem({
          projectId: project.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          checked: false,
          familyId,
        });
        createdItemIds[item.name.toLowerCase()] = id;
      }

      // Create tasks with linked shopping items
      for (const task of selectedTasks) {
        const linkedItemIds = task.shoppingItems
          .map((name) => createdItemIds[name.toLowerCase()])
          .filter(Boolean);
        await addHomeTask({
          projectId: project.id,
          title: task.title,
          description: task.description,
          status: 'todo',
          linkedItemIds: linkedItemIds.length > 0 ? linkedItemIds : undefined,
          familyId,
        });
      }

      crossAlert(t('common.success'), `${selectedTasks.length} ${t('homes.tasks')} + ${selectedItems.length} ${t('homes.shoppingListItems')} ${t('homes.created')}`);
      setShowSuggestions(false);
      loadData();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const todoTasks = useMemo(() => tasks.filter(t => t.status === 'todo'), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter(t => t.status === 'in-progress'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);

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
        {project.budget > 0 && (
          <View style={[styles.budgetSummary, { backgroundColor: colors.inputBackground }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{t('homes.budget')}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{project.budget.toLocaleString('nb-NO')} kr</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{t('homes.spent')}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: HOME_THEME }}>{(totalSpent + totalOffers).toLocaleString('nb-NO')} kr</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{t('homes.remaining')}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: (project.budget - totalSpent - totalOffers) < 0 ? '#E53935' : '#43A047' }}>
                {(project.budget - totalSpent - totalOffers).toLocaleString('nb-NO')} kr
              </Text>
            </View>
          </View>
        )}
      </View>
      <ScrollView style={styles.content}>
        {/* AI Suggestion */}
        <TouchableOpacity
          style={[styles.aiSuggestButton, { backgroundColor: HOME_THEME + '15', borderColor: HOME_THEME }]}
          onPress={handleSuggest}
          disabled={loadingSuggestions}
        >
          {loadingSuggestions ? (
            <ActivityIndicator size="small" color={HOME_THEME} />
          ) : (
            <AppIcon name="ai" size={20} color={HOME_THEME} />
          )}
          <Text style={{ color: HOME_THEME, fontSize: 14, fontWeight: '600' }}>{t('homes.aiSuggest')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{project.title}</Text>
        </TouchableOpacity>

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
                onPress={() => navigation.navigate('HomeColorDetail', { color, project })}
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
                <TouchableOpacity style={styles.receiptBtn} onPress={() => { setTaskTitle(`${color.name || color.code}${color.room ? ' - ' + color.room : ''}`); setTaskDescription(color.code); setAddTaskStatus('todo'); setShowAddTask(true); }}>
                  <AppIcon name="oppgaver" size={14} color={HOME_THEME} />
                </TouchableOpacity>
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
                {item.linkedTaskId && (() => {
                  const linkedTask = tasks.find(t => t.id === item.linkedTaskId);
                  return linkedTask ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <AppIcon name="oppgaver" size={10} color={HOME_THEME} />
                      <Text style={{ fontSize: 10, color: HOME_THEME }} numberOfLines={1}>{linkedTask.title}</Text>
                    </View>
                  ) : null;
                })()}
              </View>
              {item.unitPrice > 0 && (
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginRight: 8 }}>{(item.quantity * item.unitPrice).toLocaleString('nb-NO', { minimumFractionDigits: 0 })} kr</Text>
              )}
              <TouchableOpacity style={styles.receiptBtn} onPress={() => handleUploadReceipt(item.id)}>
                <AppIcon name={item.receiptUrl ? 'file' : 'camera'} size={14} color={item.receiptUrl ? '#43A047' : colors.textDisabled} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.receiptBtn} onPress={() => { setTaskTitle(item.name); setTaskDescription(item.quantity > 1 ? `x${item.quantity}` : ''); setAddTaskStatus('todo'); setShowAddTask(true); }}>
                <AppIcon name="oppgaver" size={14} color={HOME_THEME} />
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
                style={[styles.shoppingItem, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}
                onPress={() => setExpandedOffer(expandedOffer === offer.id ? null : offer.id)}
                onLongPress={() => setOfferActionModal({ visible: true, id: offer.id, title: offer.vendorName })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                </View>
                {expandedOffer === offer.id && offer.itemsList && offer.itemsList.length > 0 && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    {offer.itemsList.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>• {item}</Text>
                        <TouchableOpacity
                          style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: HOME_THEME + '20' }}
                          onPress={() => {
                            setTaskTitle(item);
                            setTaskDescription('');
                            setAddTaskStatus('todo');
                            setShowAddTask(true);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <AppIcon name="oppgaver" size={12} color={HOME_THEME} />
                            <Text style={{ fontSize: 10, fontWeight: '600', color: HOME_THEME }}>Oppgave</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Tasks Board */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="oppgaver" size={18} color={HOME_THEME} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('homes.tasks')}</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({tasks.length})</Text>
            </View>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: HOME_THEME }]} onPress={() => { resetTaskForm(); setAddTaskStatus('todo'); setShowAddTask(true); }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
            {(['todo', 'in-progress', 'done'] as const).map((status) => {
              const statusTasks = status === 'todo' ? todoTasks : status === 'in-progress' ? inProgressTasks : doneTasks;
              const statusLabel = status === 'todo' ? t('homes.statusTodo') : status === 'in-progress' ? t('homes.statusInProgress') : t('homes.statusDone');
              const statusColor = status === 'todo' ? '#F9A825' : status === 'in-progress' ? '#1976D2' : '#43A047';
              return (
                <View key={status} style={[styles.kanbanColumn, { backgroundColor: colors.inputBackground }]}>
                  <View style={[styles.kanbanColumnHeader, { borderBottomColor: statusColor }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.kanbanColumnTitle, { color: colors.text }]}>{statusLabel}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>({statusTasks.length})</Text>
                    </View>
                    {status === 'todo' && (
                      <TouchableOpacity onPress={() => { resetTaskForm(); setAddTaskStatus('todo'); setShowAddTask(true); }}>
                        <Text style={{ color: HOME_THEME, fontSize: 18, fontWeight: '600' }}>+</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {statusTasks.map((task) => (
                    <TouchableOpacity key={task.id} style={[styles.taskCard, { backgroundColor: colors.surface }]} onPress={() => setShowTaskDetail(task)} onLongPress={() => setTaskActionModal({ visible: true, id: task.id, title: task.title })}>
                      <Text style={[styles.taskCardTitle, { color: colors.text }]} numberOfLines={2}>{task.title}</Text>
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                        {status !== 'todo' && (
                          <TouchableOpacity style={[styles.taskMoveBtn, { backgroundColor: colors.inputBackground }]} onPress={() => handleMoveTask(task.id, status === 'in-progress' ? 'todo' : 'in-progress')}>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>←</Text>
                          </TouchableOpacity>
                        )}
                        {status !== 'done' && (
                          <TouchableOpacity style={[styles.taskMoveBtn, { backgroundColor: colors.inputBackground }]} onPress={() => handleMoveTask(task.id, status === 'in-progress' ? 'done' : 'in-progress')}>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>→</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {statusTasks.length === 0 && (
                    <Text style={{ fontSize: 11, color: colors.textDisabled, textAlign: 'center', padding: 8 }}>{t('homes.noTasks')}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      <ActionModal
        visible={colorActionModal.visible}
        title={colorActionModal.title}
        onEdit={handleEditColor}
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

      <ActionModal
        visible={taskActionModal.visible}
        title={taskActionModal.title}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        onCancel={() => setTaskActionModal({ visible: false, id: '', title: '' })}
        accentColor={HOME_THEME}
      />

      {/* Task Detail Modal */}
      <Modal visible={!!showTaskDetail} transparent animationType="fade" onRequestClose={() => setShowTaskDetail(null)}>
        <TouchableWithoutFeedback onPress={() => setShowTaskDetail(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 }}>
                {showTaskDetail && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.statusDot, { backgroundColor: showTaskDetail.status === 'todo' ? '#F9A825' : showTaskDetail.status === 'in-progress' ? '#1976D2' : '#43A047' }]} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                          {showTaskDetail.status === 'todo' ? t('homes.statusTodo') : showTaskDetail.status === 'in-progress' ? t('homes.statusInProgress') : t('homes.statusDone')}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setShowTaskDetail(null)}>
                        <Text style={{ fontSize: 18, color: colors.textSecondary }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{showTaskDetail.title}</Text>
                    {showTaskDetail.description ? (
                      <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 }}>{showTaskDetail.description}</Text>
                    ) : (
                      <Text style={{ fontSize: 14, color: colors.textDisabled, marginBottom: 16 }}>{t('homes.noDescription')}</Text>
                    )}
                    {/* Linked shopping items */}
                    {showTaskDetail.linkedItemIds && showTaskDetail.linkedItemIds.length > 0 && (
                      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>{t('homes.linkedItems')}</Text>
                        {showTaskDetail.linkedItemIds.map((itemId) => {
                          const linkedItem = shoppingItems.find(i => i.id === itemId);
                          return linkedItem ? (
                            <View key={itemId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                              <View style={[styles.checkbox, { borderColor: linkedItem.checked ? HOME_THEME : colors.border, backgroundColor: linkedItem.checked ? HOME_THEME : 'transparent', width: 18, height: 18 }]}>
                                {linkedItem.checked && <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>✓</Text>}
                              </View>
                              <Text style={{ fontSize: 12, color: linkedItem.checked ? colors.textDisabled : colors.text, textDecorationLine: linkedItem.checked ? 'line-through' : 'none' }}>{linkedItem.name}</Text>
                            </View>
                          ) : null;
                        })}
                      </View>
                    )}
                    {(!showTaskDetail.linkedItemIds || showTaskDetail.linkedItemIds.length === 0) && (
                      <TouchableOpacity
                        style={{ marginTop: 12, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: HOME_THEME, borderStyle: 'dashed' }}
                        onPress={async () => {
                          const unlinkedItems = shoppingItems.filter(i => !i.linkedTaskId);
                          if (unlinkedItems.length === 0) {
                            crossAlert(t('homes.noUnlinkedItems'), t('homes.noUnlinkedItemsText'));
                            return;
                          }
                          for (const item of unlinkedItems) {
                            await updateHomeShoppingItem(item.id, { linkedTaskId: showTaskDetail.id });
                          }
                          crossAlert(t('common.success'), `${unlinkedItems.length} ${t('homes.itemsLinked')}`);
                          setShowTaskDetail(null);
                          loadData();
                        }}
                      >
                        <Text style={{ fontSize: 12, color: HOME_THEME, textAlign: 'center' }}>{t('homes.linkToShoppingList')}</Text>
                      </TouchableOpacity>
                    )}
                    {showTaskDetail.status !== 'done' && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {showTaskDetail.status === 'todo' && (
                          <TouchableOpacity style={[styles.button, { backgroundColor: '#1976D2', flex: 1 }]} onPress={() => { handleMoveTask(showTaskDetail.id, 'in-progress'); setShowTaskDetail(null); }}>
                            <Text style={[styles.buttonText, { color: '#fff' }]}>{t('homes.startTask')}</Text>
                          </TouchableOpacity>
                        )}
                        {showTaskDetail.status === 'in-progress' && (
                          <TouchableOpacity style={[styles.button, { backgroundColor: '#43A047', flex: 1 }]} onPress={() => { handleMoveTask(showTaskDetail.id, 'done'); setShowTaskDetail(null); }}>
                            <Text style={[styles.buttonText, { color: '#fff' }]}>{t('homes.completeTask')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add/Edit Task Modal */}

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

              {offerItemsList.length > 0 && (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('homes.offerItems')}</Text>
                  {offerItemsList.map((item, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>• {item}</Text>
                    </View>
                  ))}
                </View>
              )}

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

      {/* Add/Edit Task Modal */}
      <Modal visible={showAddTask} transparent animationType="slide" onRequestClose={() => setShowAddTask(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingTask ? t('homes.editTask') : t('homes.addTask')}</Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.taskTitle')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} value={taskTitle} onChangeText={setTaskTitle} placeholder={t('homes.taskTitlePlaceholder')} placeholderTextColor={colors.textDisabled} />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.description')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, { minHeight: 80, textAlignVertical: 'top' }]} value={taskDescription} onChangeText={setTaskDescription} placeholder={t('homes.descriptionPlaceholder')} placeholderTextColor={colors.textDisabled} multiline numberOfLines={3} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowAddTask(false); resetTaskForm(); }}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: HOME_THEME, opacity: savingTask ? 0.5 : 1, flex: 1 }]} onPress={handleSaveTask} disabled={savingTask}>
                  <Text style={styles.buttonText}>{savingTask ? '...' : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Suggestion Preview Modal */}
      <Modal visible={showSuggestions} transparent animationType="slide" onRequestClose={() => setShowSuggestions(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: '90%' }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('homes.aiSuggestions')}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>{project.title}</Text>

              {loadingSuggestions ? (
                <ActivityIndicator size="large" color={HOME_THEME} style={{ marginVertical: 40 }} />
              ) : (
                <>
                  {suggestedTasks.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>{t('homes.tasks')} ({suggestedTasks.filter(t => t.selected).length})</Text>
                      {suggestedTasks.map((task, idx) => (
                        <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => setSuggestedTasks(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t))}>
                          <View style={[styles.checkbox, { borderColor: task.selected ? HOME_THEME : colors.border, backgroundColor: task.selected ? HOME_THEME : 'transparent' }]}>
                            {task.selected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{task.title}</Text>
                            {task.description ? <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>{task.description}</Text> : null}
                            {task.shoppingItems && task.shoppingItems.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                {task.shoppingItems.map((itemName, i) => (
                                  <View key={i} style={{ backgroundColor: HOME_THEME + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10, color: HOME_THEME }}>{itemName}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {suggestedItems.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>{t('homes.shoppingList')} ({suggestedItems.filter(i => i.selected).length})</Text>
                      {suggestedItems.map((item, idx) => (
                        <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => setSuggestedItems(prev => prev.map((i, j) => j === idx ? { ...i, selected: !i.selected } : i))}>
                          <View style={[styles.checkbox, { borderColor: item.selected ? HOME_THEME : colors.border, backgroundColor: item.selected ? HOME_THEME : 'transparent' }]}>
                            {item.selected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{item.name}</Text>
                          {item.quantity > 1 && <Text style={{ fontSize: 11, color: colors.textSecondary }}>x{item.quantity}</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => setShowSuggestions(false)}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: HOME_THEME, flex: 1 }]} onPress={handleApproveSuggestions} disabled={loadingSuggestions || (suggestedTasks.filter(t => t.selected).length === 0 && suggestedItems.filter(i => i.selected).length === 0)}>
                  <Text style={styles.buttonText}>{t('homes.approveSuggestions')}</Text>
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
  budgetSummary: { flexDirection: 'row', borderRadius: 10, padding: 10, marginTop: 8, gap: 8 },
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
  kanbanColumn: { width: 200, borderRadius: 12, padding: 10, marginRight: 10, flexShrink: 0 },
  kanbanColumnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 2, marginBottom: 8 },
  kanbanColumnTitle: { fontSize: 13, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  taskCard: { borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#e0e0e0' },
  taskCardTitle: { fontSize: 13, fontWeight: '600' },
  taskMoveBtn: { width: 24, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  aiSuggestButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
});
