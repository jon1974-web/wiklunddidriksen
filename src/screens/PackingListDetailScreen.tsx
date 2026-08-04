import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { PackingList, PackingItem } from '../types';
import { ShoppingItem as PackingItemComponent } from '../components/ShoppingItem';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { ActionModal } from '../components/ActionModal';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

interface PackingListDetailScreenProps {
  navigation: any;
  route: any;
}

export const PackingListDetailScreen: React.FC<PackingListDetailScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const routeList = route.params?.list as PackingList | undefined;
  const tripId = route.params?.tripId as string | undefined;

  if (!routeList || !tripId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Ingen liste valgt</Text>
      </View>
    );
  }

  const [currentList, setCurrentList] = useState<PackingList>(routeList);
  const [newItemName, setNewItemName] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingItem, setRenamingItem] = useState<PackingItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copyTitle, setCopyTitle] = useState('');
  const newItemInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyRole = useUserStore((state) => state.familyRole);
  const canDelete = currentList.createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin';

  const sortedItems = useMemo(() => {
    return [...currentList.items].sort((a, b) => {
      if (a.checked && !b.checked) return 1;
      if (!a.checked && b.checked) return -1;
      return 0;
    });
  }, [currentList.items]);

  useEffect(() => {
    if (!routeList?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'trips', tripId, 'packingLists', routeList.id), (d) => {
      if (d.exists()) {
        setCurrentList({ id: d.id, ...d.data() } as PackingList);
      }
    });
    return () => unsubscribe();
  }, [routeList?.id, tripId]);

  const [actionModal, setActionModal] = useState<{ visible: boolean; title: string; onDelete?: () => void }>({ visible: false, title: '' });

  const handleDeleteList = useCallback(() => {
    setActionModal({
      visible: true,
      title: currentList.title || 'pakkeliste',
      onDelete: async () => {
        try {
          await deleteDoc(doc(db, 'trips', tripId, 'packingLists', routeList.id));
          navigation.goBack();
        } catch (error) {
          crossAlert('Error', getErrorMessage(error));
        }
      },
    });
  }, [currentList, routeList?.id, tripId, navigation]);

  const handleCopyList = useCallback(() => {
    setCopyTitle(`${currentList.title} (kopiert)`);
    setCopyModalVisible(true);
  }, [currentList]);

  const handleConfirmCopy = useCallback(async () => {
    if (!copyTitle.trim()) return;
    try {
      await addDoc(collection(db, 'trips', tripId, 'packingLists'), {
        title: copyTitle.trim(),
        items: currentList.items.map((item) => ({ ...item, id: generateId(), checked: false })),
        createdBy: user?.uid,
        createdAt: Date.now(),
      });
      setCopyModalVisible(false);
      setCopyTitle('');
      navigation.goBack();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [currentList, copyTitle, user, tripId, navigation]);

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      crossAlert('Error', 'Vennligst skriv et navn');
      return;
    }

    const newItem: PackingItem = {
      id: generateId(),
      name: newItemName.trim(),
      checked: false,
    };

    try {
      const updatedItems = [newItem, ...currentList.items];
      await updateDoc(doc(db, 'trips', tripId, 'packingLists', currentList.id), {
        items: updatedItems,
      });
      setNewItemName('');
    } catch (error: any) {
      crossAlert('Error', error.message);
    }
  };

  const handleToggleItem = async (item: PackingItem) => {
    const updatedItem = { ...item, checked: !item.checked };
    await updateDoc(doc(db, 'trips', tripId, 'packingLists', currentList.id), {
      items: arrayRemove(item),
    });
    await updateDoc(doc(db, 'trips', tripId, 'packingLists', currentList.id), {
      items: arrayUnion(updatedItem),
    });
  };

  const handleDeleteItem = async (item: PackingItem) => {
    await updateDoc(doc(db, 'trips', tripId, 'packingLists', currentList.id), {
      items: arrayRemove(item),
    });
  };

  const handleRenameItem = (item: PackingItem) => {
    setRenamingItem(item);
    setRenameValue(item.name);
    setRenameModalVisible(true);
  };

  const handleConfirmRename = async () => {
    if (!renamingItem || !renameValue.trim()) return;
    const updatedItem = { ...renamingItem, name: renameValue.trim() };
    try {
      await updateDoc(doc(db, 'trips', tripId, 'packingLists', currentList.id), {
        items: arrayRemove(renamingItem),
      });
      await updateDoc(doc(db, 'trips', tripId, 'packingLists', currentList.id), {
        items: arrayUnion(updatedItem),
      });
      setRenameModalVisible(false);
      setRenamingItem(null);
      setRenameValue('');
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const renderItem = ({ item }: { item: PackingItem }) => (
    <PackingItemComponent
      item={item}
      onToggle={() => handleToggleItem(item)}
      onDelete={() => handleDeleteItem(item)}
      onRename={() => handleRenameItem(item)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
          <Text style={{ color: colors.accent, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: colors.text }]}>{currentList.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {currentList.items.filter((i) => i.checked).length}/{currentList.items.length} {t('shopping.itemsChecked')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.inputBackground }]}
              onPress={handleCopyList}
            >
              <Text style={[styles.headerButtonText, { color: colors.text }]}>{t('shopping.copy')}</Text>
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.inputBackground }]}
                onPress={handleDeleteList}
              >
                <Text style={[styles.headerButtonText, { color: colors.danger }]}>{t('shopping.delete')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.addItemContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          ref={newItemInputRef}
          style={[styles.addItemInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder={t('shopping.addItem')}
          placeholderTextColor={colors.textDisabled}
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={[styles.addItemButton, { backgroundColor: colors.accent }]} onPress={handleAddItem}>
          <Text style={styles.addItemButtonText}>{t('shopping.addButton')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>{t('shopping.noItems')}</Text>
        }
      />

      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('shopping.renameItem') || 'Gi nytt navn'}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Navn"
              placeholderTextColor={colors.textDisabled}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setRenameModalVisible(false);
                  setRenamingItem(null);
                  setRenameValue('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, { backgroundColor: colors.accent }]}
                onPress={handleConfirmRename}
              >
                <Text style={styles.modalCreateText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Copy List Modal */}
      <Modal visible={copyModalVisible} transparent animationType="fade" onRequestClose={() => setCopyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('shopping.copyTitle')}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
              value={copyTitle}
              onChangeText={setCopyTitle}
              placeholder="Liste_navn"
              placeholderTextColor={colors.textDisabled}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setCopyModalVisible(false); setCopyTitle(''); }}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCreateButton, { backgroundColor: colors.accent }]} onPress={handleConfirmCopy}>
                <Text style={styles.modalCreateText}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ActionModal
        visible={actionModal.visible}
        title={actionModal.title}
        onDelete={actionModal.onDelete}
        onCancel={() => setActionModal({ visible: false, title: '' })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'flex-start', padding: 16, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  headerInfo: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  headerButtonText: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4 },
  addItemContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  addItemInput: { flex: 1, padding: 12, borderRadius: 8, fontSize: 16 },
  addItemButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center' },
  addItemButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listContent: { flexGrow: 1 },
  emptyText: { textAlign: 'center', fontSize: 16, marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelButton: { paddingVertical: 12, paddingHorizontal: 20 },
  modalCancelText: { fontSize: 16 },
  modalCreateButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  modalCreateText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
