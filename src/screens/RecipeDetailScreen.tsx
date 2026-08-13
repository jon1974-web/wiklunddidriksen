import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useUserStore } from '../store/userStore';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Recipe } from '../types';
import { ActionModal } from '../components/ActionModal';
import { InfoModal } from '../components/InfoModal';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { generateId } from '../utils/generateId';

interface Props {
  navigation: any;
  route: { params: { recipe: Recipe } };
}

export const RecipeDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const familyId = useUserStore((state) => state.familyId);
  const user = useUserStore((state) => state.user);
  const recipe = route.params.recipe;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message?: string }>({ visible: false, title: '' });

  const getRecipeText = (field: 'name' | 'description' | 'ingredients' | 'instructions') => {
    if (recipe.translations?.[i18n.language]?.[field]) {
      return recipe.translations[i18n.language][field];
    }
    return recipe[field];
  };

  const toggleFavorite = async () => {
    try {
      await updateDoc(doc(db, 'recipes', recipe.id), { isFavorite: !recipe.isFavorite });
      navigation.setParams({ recipe: { ...recipe, isFavorite: !recipe.isFavorite } });
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'recipes', recipe.id));
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleAddToShoppingList = async () => {
    if (!familyId) return;
    try {
      const listsQ = query(collection(db, 'shoppingLists'), where('familyId', '==', familyId));
      const listsSnap = await getDocs(listsQ);
      if (listsSnap.docs.length > 0) {
        const listDoc = listsSnap.docs[0];
        const existingItems = listDoc.data().items || [];
        const newItems = (getRecipeText('ingredients') || recipe.ingredients).map((ing: any) => ({
          id: generateId(),
          name: ing.amount ? `${ing.name} (${ing.amount} ${ing.unit})` : ing.name,
          checked: false,
        }));
        await import('firebase/firestore').then(({ updateDoc }) =>
          updateDoc(doc(db, 'shoppingLists', listDoc.id), { items: [...newItems, ...existingItems] })
        );
        setInfoModal({ visible: true, title: t('common.success'), message: `${recipe.ingredients.length} ingredienser lagt til i handlelisten` });
      } else {
        setInfoModal({ visible: true, title: t('common.info'), message: 'Opprett en handleliste først' });
      }
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const getCategoryEmoji = (cat: string) => {
    const map: Record<string, string> = { kjoett: '🥩', fisk: '🐟', vegetar: '🥗', pasta: '🍝', sott: '🍰' };
    return map[cat] || '🍽️';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleFavorite} style={styles.headerBtn}>
            <Text style={{ fontSize: 22 }}>{recipe.isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.headerBtn}>
            <Text style={{ fontSize: 18, color: '#E53935' }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.recipeTitle, { color: colors.text }]}>{getRecipeText('name')}</Text>
          {recipe.variation && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.accentLight || '#E8F5E9', alignSelf: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>{recipe.variation}</Text>
            </View>
          )}
          {recipe.cuisine && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border, alignSelf: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{recipe.cuisine}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.recipeMeta, { color: colors.textSecondary }]}>
          {getCategoryEmoji(recipe.category)} {recipe.time} {t('mealPlanner.minutes')} · {recipe.portions} {t('mealPlanner.servings')} · {recipe.category ? t(`mealPlanner.${recipe.category}`) : ''}
        </Text>

        {recipe.description ? (
          <Text style={[styles.recipeDesc, { color: colors.textSecondary }]}>{getRecipeText('description')}</Text>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]} onPress={handleAddToShoppingList}>
            <Text style={styles.actionBtnText}>🛒 {t('mealPlanner.addToShoppingList')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>📋 {t('mealPlanner.ingredientsList')}</Text>
          {recipe.ingredients.map((ing, i) => {
            const translatedIng = getRecipeText('ingredients')?.[i] || ing;
            return (
              <View key={i} style={[styles.ingredientRow, { borderBottomColor: colors.border }]}>
                <View style={styles.ingredientCheck} />
                <Text style={[styles.ingredientName, { color: colors.text }]}>{translatedIng.name}</Text>
                <Text style={[styles.ingredientQty, { color: colors.textSecondary }]}>{translatedIng.amount} {translatedIng.unit}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>👨‍🍳 {t('mealPlanner.instructionsList')}</Text>
          {(getRecipeText('instructions') || recipe.instructions).map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.accent }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <ActionModal
        visible={showDeleteModal}
        title={recipe.name}
        subtitle={t('mealPlanner.deleteRecipeConfirm')}
        onDelete={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        onConfirm={() => setInfoModal({ visible: false, title: '' })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  recipeTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  recipeMeta: { fontSize: 14, marginBottom: 12 },
  recipeDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  ingredientCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#ddd', marginRight: 10 },
  ingredientName: { fontSize: 14, flex: 1 },
  ingredientQty: { fontSize: 13, color: '#888' },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 14, lineHeight: 22, flex: 1 },
});
