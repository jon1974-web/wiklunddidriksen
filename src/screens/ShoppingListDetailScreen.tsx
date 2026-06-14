import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { ShoppingList, ShoppingItem } from '../types';
import { ShoppingItem as ShoppingItemComponent } from '../components/ShoppingItem';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

interface ShoppingListDetailScreenProps {
  navigation: any;
  route: any;
}

export const ShoppingListDetailScreen: React.FC<ShoppingListDetailScreenProps> = ({ navigation, route }) => {
  const { list } = route.params as { list: ShoppingList };
  const [currentList, setCurrentList] = useState<ShoppingList>(list);
  const [newItemName, setNewItemName] = useState('');
  const newItemInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'shoppingLists', list.id), (doc) => {
      if (doc.exists()) {
        setCurrentList({
          id: doc.id,
          ...doc.data(),
        } as ShoppingList);
      }
    });
    return () => unsubscribe();
  }, [list.id]);

  const handleDeleteList = useCallback(() => {
    crossAlert('Slett liste', 'Er du sikker på at du vil slette denne listen?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'shoppingLists', list.id));
            navigation.goBack();
          } catch (error) {
            crossAlert('Error', getErrorMessage(error));
          }
        },
      },
    ]);
  }, [list.id, navigation]);

  const handleCopyList = useCallback(async () => {
    try {
      const newListRef = await addDoc(collection(db, 'shoppingLists'), {
        title: `${currentList.title} (kopiert)`,
        items: currentList.items.map((item) => ({ ...item, id: generateId(), checked: false })),
        createdBy: user?.uid,
        createdAt: Date.now(),
        familyId: familyId || null,
      });
      navigation.goBack();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [currentList, user, familyId, navigation]);

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      crossAlert('Error', 'Vennligst skriv et varenavn');
      return;
    }

    const newItem: ShoppingItem = {
      id: generateId(),
      name: newItemName.trim(),
      checked: false,
    };

    try {
      await updateDoc(doc(db, 'shoppingLists', list.id), {
        items: arrayUnion(newItem),
      });
      setNewItemName('');
      setTimeout(() => newItemInputRef.current?.focus(), 100);
    } catch (error: any) {
      crossAlert('Error', error.message);
    }
  };

  const handleToggleItem = async (item: ShoppingItem) => {
    const updatedItem = { ...item, checked: !item.checked };
    await updateDoc(doc(db, 'shoppingLists', list.id), {
      items: arrayRemove(item),
    });
    await updateDoc(doc(db, 'shoppingLists', list.id), {
      items: arrayUnion(updatedItem),
    });
  };

  const handleDeleteItem = async (item: ShoppingItem) => {
    await updateDoc(doc(db, 'shoppingLists', list.id), {
      items: arrayRemove(item),
    });
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <ShoppingItemComponent
      item={item}
      onToggle={() => handleToggleItem(item)}
      onDelete={() => handleDeleteItem(item)}
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
              {currentList.items.filter((i) => i.checked).length}/{currentList.items.length} varer krysset av
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.inputBackground }]}
              onPress={handleCopyList}
            >
              <Text style={[styles.headerButtonText, { color: colors.text }]}>Kopier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.inputBackground }]}
              onPress={handleDeleteList}
            >
              <Text style={[styles.headerButtonText, { color: colors.danger }]}>Slett</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.addItemContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          ref={newItemInputRef}
          style={[styles.addItemInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder="Legg til vare..."
          placeholderTextColor={colors.textDisabled}
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={[styles.addItemButton, { backgroundColor: colors.accent }]} onPress={handleAddItem}>
          <Text style={styles.addItemButtonText}>Legg til</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentList.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>Ingen varer i listen. Legg til varer!</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  addItemInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  addItemButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
});
