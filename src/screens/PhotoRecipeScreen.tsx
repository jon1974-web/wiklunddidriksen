import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage, sanitizeInput } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { ActionModal } from '../components/ActionModal';
import { IMAGE_QUALITY } from '../constants/limits';
import { RecipeIngredient } from '../types';

interface PhotoRecipeScreenProps {
  navigation: any;
}

interface ParsedRecipe {
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  time: number;
  portions: number;
  category: string;
  variation: string;
  cuisine: string;
}

interface EditableRecipe extends ParsedRecipe {
  checked: boolean;
}

const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/photoToData';

const CATEGORIES = [
  { key: 'kylling', label: 'kylling' },
  { key: 'kjoett', label: 'kjoett' },
  { key: 'fisk', label: 'fisk' },
  { key: 'vegetar', label: 'vegetar' },
  { key: 'pasta', label: 'pasta' },
  { key: 'gryte', label: 'gryte' },
  { key: 'suppe', label: 'suppe' },
  { key: 'frokost', label: 'frokost' },
  { key: 'sott', label: 'sott' },
];

const VARIATIONS = ['Klassisk', 'Raskere', 'Med en vri'];

export const PhotoRecipeScreen: React.FC<PhotoRecipeScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [recipes, setRecipes] = useState<EditableRecipe[]>([]);
  const [creating, setCreating] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; subtitle: string }>({ visible: false, title: '', subtitle: '' });

  const toEditableRecipe = (r: ParsedRecipe): EditableRecipe => ({
    ...r,
    checked: true,
  });

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      sendToCloud(result.assets[0].base64 || null);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      crossAlert('Tilgang', 'Kameratilgang er nødvendig for å ta bilder.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      sendToCloud(result.assets[0].base64 || null);
    }
  }, []);

  const sendToCloud = useCallback(async (base64: string | null) => {
    if (!base64) {
      crossAlert('Error', t('photoRecipe.error'));
      return;
    }
    setProcessing(true);
    setRecipes([]);
    setExpandedIndex(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const apiResponse = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageBase64: base64, type: 'recipe' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Server error');
      }
      const data = await apiResponse.json();
      const parsed: ParsedRecipe[] = data.recipes || [];
      if (parsed.length === 0) {
        crossAlert(t('photoRecipe.title'), t('photoRecipe.noRecipes'));
        setImageUri(null);
        return;
      }
      const editable = parsed.map(toEditableRecipe);
      setRecipes(editable);
      setExpandedIndex(editable.length === 1 ? 0 : null);
    } catch (error: any) {
      const msg = error?.name === 'AbortError'
        ? 'Tidsavbrudd. Bildet kan være for stort eller nettverket er tregt.'
        : error?.message?.includes('Failed to fetch')
        ? 'Kunne ikke koble til serveren. Cloud Function kan mangle.'
        : getErrorMessage(error);
      crossAlert('Error', msg);
    } finally {
      setProcessing(false);
    }
  }, [t]);

  const triggerTranslation = async (recipeId: string, name: string, description: string, ingredients: RecipeIngredient[], instructions: string[]) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/translateRecipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipeId, name, description, ingredients, instructions }),
      });
    } catch {}
  };

  const handleCreateRecipe = useCallback(async (recipe: EditableRecipe, showSuccess = false) => {
    if (!user || !familyId || creating) return;
    setCreating(true);
    try {
      const recipeData = {
        name: sanitizeInput(recipe.name),
        description: recipe.description ? sanitizeInput(recipe.description) : '',
        ingredients: recipe.ingredients.filter((i) => i.name.trim()),
        instructions: recipe.instructions.filter((i) => i.trim()),
        time: recipe.time || 0,
        portions: recipe.portions || 4,
        category: recipe.category || 'kjoett',
        variation: recipe.variation || '',
        cuisine: recipe.cuisine || '',
        isFavorite: false,
        createdBy: user.uid,
        familyId,
        createdAt: Date.now(),
      };
      const docRef = await addDoc(collection(db, 'recipes'), recipeData);
      triggerTranslation(docRef.id, recipeData.name, recipeData.description, recipeData.ingredients, recipeData.instructions);
      if (showSuccess) {
        setSuccessModal({
          visible: true,
          title: t('common.success'),
          subtitle: `"${recipeData.name}" ${t('photoRecipe.saveRecipe').toLowerCase()}!`,
        });
      }
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }, [user, familyId, creating, t]);

  const handleCreateSelected = useCallback(async () => {
    const selected = recipes.filter((r) => r.checked);
    if (selected.length === 0) return;
    for (const recipe of selected) {
      await handleCreateRecipe(recipe);
    }
    setSuccessModal({
      visible: true,
      title: t('common.success'),
      subtitle: `${selected.length} ${selected.length === 1 ? t('photoRecipe.singleRecipe') : t('photoRecipe.recipesFound')}!`,
    });
  }, [recipes, handleCreateRecipe, t]);

  const handleReset = useCallback(() => {
    setImageUri(null);
    setRecipes([]);
    setExpandedIndex(null);
  }, []);

  const updateRecipe = useCallback((index: number, updates: Partial<EditableRecipe>) => {
    setRecipes((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  }, []);

  const toggleAllRecipes = useCallback(() => {
    const allChecked = recipes.every((r) => r.checked);
    setRecipes((prev) => prev.map((r) => ({ ...r, checked: !allChecked })));
  }, [recipes]);

  const addIngredient = useCallback((index: number) => {
    setRecipes((prev) => prev.map((r, i) => i === index ? { ...r, ingredients: [...r.ingredients, { name: '', amount: '', unit: '' }] } : r));
  }, []);

  const removeIngredient = useCallback((recipeIndex: number, ingredientIndex: number) => {
    setRecipes((prev) => prev.map((r, i) => i === recipeIndex ? { ...r, ingredients: r.ingredients.filter((_, j) => j !== ingredientIndex) } : r));
  }, []);

  const updateIngredient = useCallback((recipeIndex: number, ingredientIndex: number, field: keyof RecipeIngredient, value: string) => {
    setRecipes((prev) => prev.map((r, i) => i === recipeIndex ? { ...r, ingredients: r.ingredients.map((ing, j) => j === ingredientIndex ? { ...ing, [field]: value } : ing) } : r));
  }, []);

  const addInstruction = useCallback((index: number) => {
    setRecipes((prev) => prev.map((r, i) => i === index ? { ...r, instructions: [...r.instructions, ''] } : r));
  }, []);

  const removeInstruction = useCallback((recipeIndex: number, instructionIndex: number) => {
    setRecipes((prev) => prev.map((r, i) => i === recipeIndex ? { ...r, instructions: r.instructions.filter((_, j) => j !== instructionIndex) } : r));
  }, []);

  const updateInstruction = useCallback((recipeIndex: number, instructionIndex: number, value: string) => {
    setRecipes((prev) => prev.map((r, i) => i === recipeIndex ? { ...r, instructions: r.instructions.map((inst, j) => j === instructionIndex ? value : inst) } : r));
  }, []);

  const renderExpandedCard = (recipe: EditableRecipe, index: number) => (
    <View key={`expanded-${index}`} style={[styles.expandedCard, { backgroundColor: colors.surface }]}>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.title')}</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={recipe.name} onChangeText={(text) => updateRecipe(index, { name: text })} placeholder="Navn på oppskrift" placeholderTextColor={colors.textDisabled} />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }, styles.textArea]} value={recipe.description} onChangeText={(text) => updateRecipe(index, { description: text })} placeholder="Beskrivelse..." placeholderTextColor={colors.textDisabled} multiline numberOfLines={3} />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.time') || 'Tid (min)'}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={String(recipe.time || '')} onChangeText={(text) => updateRecipe(index, { time: parseInt(text) || 0 })} placeholder="30" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.portions') || 'Porsjoner'}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={String(recipe.portions || '')} onChangeText={(text) => updateRecipe(index, { portions: parseInt(text) || 4 })} placeholder="4" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Kategori</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.key} style={[styles.chip, { backgroundColor: colors.inputBackground, borderColor: colors.border }, recipe.category === cat.key && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => updateRecipe(index, { category: cat.key })}>
              <Text style={[styles.chipText, { color: recipe.category === cat.key ? '#fff' : colors.textSecondary }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Variasjon</Text>
        <View style={styles.chipRow}>
          {VARIATIONS.map((v) => (
            <TouchableOpacity key={v} style={[styles.chip, { backgroundColor: colors.inputBackground, borderColor: colors.border }, recipe.variation === v && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => updateRecipe(index, { variation: recipe.variation === v ? '' : v })}>
              <Text style={[styles.chipText, { color: recipe.variation === v ? '#fff' : colors.textSecondary }]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Ingredienser</Text>
        {recipe.ingredients.map((ing, ingIdx) => (
          <View key={ingIdx} style={styles.ingredientRow}>
            <TextInput style={[styles.input, styles.ingredientName, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ing.name} onChangeText={(text) => updateIngredient(index, ingIdx, 'name', text)} placeholder="Navn" placeholderTextColor={colors.textDisabled} />
            <TextInput style={[styles.input, styles.ingredientAmount, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ing.amount} onChangeText={(text) => updateIngredient(index, ingIdx, 'amount', text)} placeholder="Mengde" placeholderTextColor={colors.textDisabled} />
            <TextInput style={[styles.input, styles.ingredientUnit, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ing.unit} onChangeText={(text) => updateIngredient(index, ingIdx, 'unit', text)} placeholder="Enhet" placeholderTextColor={colors.textDisabled} />
            {recipe.ingredients.length > 1 && (
              <TouchableOpacity onPress={() => removeIngredient(index, ingIdx)}>
                <Text style={{ color: colors.danger, fontSize: 18, padding: 8 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={() => addIngredient(index)}>
          <Text style={[styles.addLink, { color: colors.accent }]}>+ Legg til ingrediens</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Fremgangsmåte</Text>
        {recipe.instructions.map((inst, instIdx) => (
          <View key={instIdx} style={styles.instructionRow}>
            <Text style={[styles.instructionNumber, { color: colors.textSecondary }]}>{instIdx + 1}.</Text>
            <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, color: colors.text }]} value={inst} onChangeText={(text) => updateInstruction(index, instIdx, text)} placeholder={`Steg ${instIdx + 1}`} placeholderTextColor={colors.textDisabled} multiline />
            {recipe.instructions.length > 1 && (
              <TouchableOpacity onPress={() => removeInstruction(index, instIdx)}>
                <Text style={{ color: colors.danger, fontSize: 18, padding: 8 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={() => addInstruction(index)}>
          <Text style={[styles.addLink, { color: colors.accent }]}>+ Legg til steg</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.expandedActions}>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: creating ? 0.6 : 1 }]} onPress={() => handleCreateRecipe(recipe, true)} disabled={creating}>
          <Text style={styles.primaryButtonText}>{creating ? t('photoRecipe.creating') : t('photoRecipe.saveRecipe')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSummaryCard = (recipe: EditableRecipe, index: number) => (
    <View key={`summary-${index}`} style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
      <TouchableOpacity style={styles.summaryHeader} onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}>
        <TouchableOpacity style={[styles.checkbox, { borderColor: colors.border }, recipe.checked && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => updateRecipe(index, { checked: !recipe.checked })}>
          {recipe.checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.summaryInfo}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>{recipe.name || t('common.title')}</Text>
          <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>
            {recipe.time ? `${recipe.time} min` : ''} {recipe.portions ? `· ${recipe.portions} porsjoner` : ''} {recipe.category ? `· ${recipe.category}` : ''}
          </Text>
        </View>
        <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>{expandedIndex === index ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {expandedIndex === index && renderExpandedCard(recipe, index)}
    </View>
  );

  const selectedCount = recipes.filter((r) => r.checked).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.helperSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('photoRecipe.instruction')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {!imageUri && !processing && recipes.length === 0 && (
          <View style={styles.pickContainer}>
            <TouchableOpacity style={[styles.pickButton, { backgroundColor: colors.accent }]} onPress={takePhoto}>
              <Text style={styles.pickIcon}>📷</Text>
              <Text style={styles.pickButtonText}>{t('photoRecipe.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickButton, { backgroundColor: colors.inputBackground, borderColor: colors.border, borderWidth: 1 }]} onPress={pickImage}>
              <Text style={styles.pickIcon}>🖼️</Text>
              <Text style={[styles.pickButtonText, { color: colors.text }]}>{t('photoRecipe.pickImage')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.processingText, { color: colors.textSecondary }]}>{t('photoRecipe.processing')}</Text>
          </View>
        )}

        {recipes.length > 0 && !processing && (
          <View style={styles.resultsContainer}>
            {recipes.length > 1 && (
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: colors.text }]}>{recipes.length} {t('photoRecipe.recipesFound')}</Text>
                <TouchableOpacity onPress={toggleAllRecipes}>
                  <Text style={[styles.toggleAll, { color: colors.accent }]}>{recipes.every((r) => r.checked) ? t('photoRecipe.deselectAll') : t('photoRecipe.selectAll')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {recipes.map((recipe, index) => (
              recipes.length === 1 ? <View key={index}>{renderExpandedCard(recipe, index)}</View> : renderSummaryCard(recipe, index)
            ))}

            {recipes.length > 1 && (
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: selectedCount === 0 || creating ? 0.5 : 1 }]} onPress={handleCreateSelected} disabled={selectedCount === 0 || creating}>
                <Text style={styles.primaryButtonText}>{creating ? t('photoRecipe.creating') : `${t('photoRecipe.createSelected')} (${selectedCount})`}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={[styles.resetButtonText, { color: colors.accent }]}>{t('photoRecipe.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ActionModal visible={successModal.visible} title={successModal.title} subtitle={successModal.subtitle} onCancel={() => { setSuccessModal({ visible: false, title: '', subtitle: '' }); navigation.goBack(); }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  helperSection: { padding: 16, borderBottomWidth: 1 },
  subtitle: { fontSize: 14 },
  content: { flex: 1, padding: 16 },
  pickContainer: { gap: 16, marginTop: 40 },
  pickButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 12, gap: 12 },
  pickIcon: { fontSize: 28 },
  pickButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  processingContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
  processingText: { fontSize: 16 },
  resultsContainer: { gap: 12 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { fontSize: 16, fontWeight: '600' },
  toggleAll: { fontSize: 14, fontWeight: '600' },
  summaryCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  summaryInfo: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '600' },
  summaryDetail: { fontSize: 13, marginTop: 2 },
  expandIcon: { fontSize: 12 },
  expandedCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { padding: 12, borderRadius: 8, fontSize: 16 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13 },
  ingredientRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  ingredientName: { flex: 2 },
  ingredientAmount: { flex: 1 },
  ingredientUnit: { flex: 1 },
  instructionRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  instructionNumber: { fontSize: 16, fontWeight: '600', paddingTop: 12 },
  addLink: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  expandedActions: { gap: 10, marginTop: 8 },
  primaryButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resetButton: { paddingVertical: 12, alignItems: 'center' },
  resetButtonText: { fontSize: 16, fontWeight: '600' },
});
