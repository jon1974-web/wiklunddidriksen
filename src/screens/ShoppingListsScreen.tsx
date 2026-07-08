import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { ShoppingList } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage, sanitizeInput } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { CartIcon } from '../components/CartIcon';
import { ActionModal } from '../components/ActionModal';
import { useTranslation } from 'react-i18next';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

interface ShoppingListsScreenProps {
  navigation: any;
}

export const ShoppingListsScreen: React.FC<ShoppingListsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [listActionModal, setListActionModal] = useState<{ visible: boolean; title: string; onDelete?: () => void }>({ visible: false, title: '' });
  const [copyListTitle, setCopyListTitle] = useState('');
  const [copyingList, setCopyingList] = useState<ShoppingList | null>(null);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
  const familyRole = useUserStore((state) => state.familyRole);
  const { colors } = useTheme();

  useEffect(() => {
    if (!familyId) return;
    const q = query(collection(db, 'shoppingLists'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        items: doc.data().items || [],
        createdBy: doc.data().createdBy,
        createdAt: doc.data().createdAt,
      })) as ShoppingList[];
      setLists(listsData);
    }, (error) => {
      crossAlert('Error', getErrorMessage(error));
    });
    return () => unsubscribe();
  }, [familyId]);

  const handleCreateList = useCallback(async () => {
    if (!newListTitle.trim()) {
      crossAlert('Error', 'Vennligst skriv en tittel');
      return;
    }

    try {
      await addDoc(collection(db, 'shoppingLists'), {
        title: sanitizeInput(newListTitle),
        items: [],
        createdBy: user?.uid,
        createdAt: Date.now(),
        familyId: familyId || null,
      });
      setNewListTitle('');
      setModalVisible(false);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [newListTitle, user, familyId]);

  const handleDeleteList = useCallback((listId: string, listTitle: string) => {
    setListActionModal({
      visible: true,
      title: listTitle,
      onDelete: async () => {
        try {
          await deleteDoc(doc(db, 'shoppingLists', listId));
        } catch (error) {
          crossAlert('Error', getErrorMessage(error));
        }
      },
    });
  }, []);

  const handleCopyList = useCallback((list: ShoppingList) => {
    setCopyingList(list);
    setCopyListTitle(`${list.title} (kopiert)`);
    setCopyModalVisible(true);
  }, []);

  const handleConfirmCopy = useCallback(async () => {
    if (!copyingList || !copyListTitle.trim()) return;
    try {
      await addDoc(collection(db, 'shoppingLists'), {
        title: sanitizeInput(copyListTitle),
        items: copyingList.items.map((item) => ({ ...item, id: generateId(), checked: false })),
        createdBy: user?.uid,
        createdAt: Date.now(),
        familyId: familyId || null,
      });
      setCopyModalVisible(false);
      setCopyingList(null);
      setCopyListTitle('');
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [copyingList, copyListTitle, user, familyId]);

  const renderList = ({ item }: { item: ShoppingList }) => {
    const checkedCount = item.items.filter((i) => i.checked).length;
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' }) : '';
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('ShoppingListDetail', { list: item })}
      >
        <View style={styles.listCardHeader}>
          <View style={styles.listCardInfo}>
            <Text style={[styles.listTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
              {checkedCount}/{item.items.length} {t('shopping.itemsChecked')}
            </Text>
          </View>
          <View style={styles.listCardDate}>
            <Text style={[styles.dateIcon, { color: colors.textSecondary }]}>📅</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</Text>
          </View>
        </View>
        <View style={styles.listCardActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.inputBackground }]}
            onPress={() => handleCopyList(item)}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('shopping.copy')}</Text>
          </TouchableOpacity>
          {(item.createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin') && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.inputBackground }]}
              onPress={() => handleDeleteList(item.id, item.title)}
            >
              <Text style={[styles.actionButtonText, { color: colors.danger }]}>{t('shopping.delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <CartIcon size={24} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text, marginLeft: 8 }]}>{t('shopping.title')}</Text>
          </View>
          <Image source={require('../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 9 }} />
        </View>
        {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary }]}>{familyName}</Text> : null}
      </View>

      <FlatList
        data={lists}
        renderItem={renderList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          lists.length > 0 ? (
            <View style={[styles.helperCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                {t('shopping.helperText')}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>{t('shopping.noLists')}</Text>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('shopping.newList')}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
              value={newListTitle}
              onChangeText={setNewListTitle}
              placeholder="F.eks.handle til helgen"
              placeholderTextColor={colors.textDisabled}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setNewListTitle('');
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, { backgroundColor: colors.accent }]}
                onPress={handleCreateList}
              >
                <Text style={styles.modalCreateText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={copyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCopyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Kopier liste</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
              value={copyListTitle}
              onChangeText={setCopyListTitle}
              placeholder="Listetittel"
              placeholderTextColor={colors.textDisabled}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setCopyModalVisible(false);
                  setCopyingList(null);
                  setCopyListTitle('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, { backgroundColor: colors.accent }]}
                onPress={handleConfirmCopy}
              >
                <Text style={styles.modalCreateText}>Kopier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ActionModal
        visible={listActionModal.visible}
        title={listActionModal.title}
        onDelete={listActionModal.onDelete}
        onCancel={() => setListActionModal({ visible: false, title: '' })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  familySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  helperCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCardInfo: {
    flex: 1,
  },
  listCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listCardDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateIcon: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 30,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalCreateButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
