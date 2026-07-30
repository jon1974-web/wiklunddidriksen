import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, StyleSheet, Modal, TouchableWithoutFeedback, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useUserStore } from '../store/userStore';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Recipe, ShoppingList, ShoppingItem } from '../types';
import { LANGUAGES, getAiNameForCode } from '../constants/languages';
import { ActionModal } from '../components/ActionModal';
import { InfoModal } from '../components/InfoModal';
import { HelpCenter } from '../components/HelpCenter';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { getUserProfile } from '../services/familyService';
import { MAX_RECIPES } from '../constants/limits';
import { generateId } from '../utils/generateId';

type SubTab = 'ukemeny' | 'oppskrifter' | 'handleliste';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['mealPlanner.monday', 'mealPlanner.tuesday', 'mealPlanner.wednesday', 'mealPlanner.thursday', 'mealPlanner.friday', 'mealPlanner.saturday', 'mealPlanner.sunday'];
const MEAL_SLOTS = ['frokost', 'lunsj', 'middag'] as const;

export const MealPlanScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
  const user = useUserStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<SubTab>('ukemeny');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [showRecipeDetail, setShowRecipeDetail] = useState<Recipe | null>(null);
  const [showDeleteRecipe, setShowDeleteRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [actionModal, setActionModal] = useState<{ visible: boolean; title: string; onEdit?: () => void; onDelete?: () => void }>({ visible: false, title: '' });
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message?: string }>({ visible: false, title: '' });
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; meal: string } | null>(null);
  const [selectedRecipeForSlot, setSelectedRecipeForSlot] = useState<Recipe | null>(null);
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);
  const [mealToggles, setMealToggles] = useState<Record<string, boolean>>({ mealFrokost: true, mealLunsj: true, mealMiddag: true });
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpRandom, setShowHelpRandom] = useState(false);
  const [showHelpSearch, setShowHelpSearch] = useState(false);
  const [showHelpHandleliste, setShowHelpHandleliste] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState<Recipe[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSearchLang, setAiSearchLang] = useState('');
  const [cuisineSearch, setCuisineSearch] = useState('');
  const [showCuisineDropdown, setShowCuisineDropdown] = useState(false);
  const [showAiResults, setShowAiResults] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const getRandomRecipe = () => {
    if (recipes.length === 0) return;
    let newRecipe: Recipe;
    do {
      newRecipe = recipes[Math.floor(Math.random() * recipes.length)];
    } while (newRecipe.id === randomRecipe?.id && recipes.length > 1);
    setRandomRecipe(newRecipe);
  };
  const [recipeForm, setRecipeForm] = useState({
    name: '', description: '', time: '', portions: '', category: 'kjoett',
    ingredients: [{ name: '', amount: '', unit: '' }],
    instructions: [''],
    variation: '', cuisine: '',
  });

  const categories = [
    { key: 'all', label: t('mealPlanner.all') },
    { key: 'favorites', label: '❤️ ' + t('mealPlanner.favorites') },
    { key: 'kylling', label: '🍗 ' + t('mealPlanner.kylling') },
    { key: 'kjoett', label: '🥩 ' + t('mealPlanner.kjoett') },
    { key: 'fisk', label: '🐟 ' + t('mealPlanner.fisk') },
    { key: 'vegetar', label: '🥗 ' + t('mealPlanner.vegetar') },
    { key: 'pasta', label: '🍝 ' + t('mealPlanner.pasta') },
    { key: 'gryte', label: '🥘 ' + t('mealPlanner.gryte') },
    { key: 'suppe', label: '🍲 ' + t('mealPlanner.suppe') },
    { key: 'frokost', label: '🥞 ' + t('mealPlanner.frokost') },
    { key: 'sott', label: '🍰 ' + t('mealPlanner.sott') },
  ];

  const cuisineCountries = LANGUAGES.map(l => ({ name: l.code === 'nb' ? 'Norge' : l.code === 'sv' ? 'Sverige' : l.code === 'da' ? 'Danmark' : l.code === 'en' ? 'England' : 'Finland', flag: l.flag }));

  const languageOptions = LANGUAGES.map(l => ({ value: l.aiName, label: `${l.flag} ${t('mealPlanner.country' + (l.code === 'nb' ? 'Norge' : l.code === 'sv' ? 'Sverige' : l.code === 'da' ? 'Danmark' : l.code === 'en' ? 'England' : 'Finland'))}`, lang: l.code }));

  useEffect(() => {
    const defaultLang = languageOptions.find(o => o.lang === i18n.language);
    if (defaultLang && !aiSearchLang) setAiSearchLang(defaultLang.value);
  }, [i18n.language]);

  const getCurrentWeekStart = (): string => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  const weekStart = getCurrentWeekStart();

  const loadData = useCallback(async () => {
    if (!familyId) return;
    try {
      const recipesQ = query(collection(db, 'recipes'), where('familyId', '==', familyId));
      const recipesSnap = await getDocs(recipesQ);
      setRecipes(recipesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe)));

      const mealPlanQ = query(collection(db, 'mealPlans'), where('familyId', '==', familyId), where('weekStart', '==', weekStart));
      const mealPlanSnap = await getDocs(mealPlanQ);
      if (mealPlanSnap.docs.length > 0) {
        setMealPlan({ id: mealPlanSnap.docs[0].id, ...mealPlanSnap.docs[0].data() });
      } else {
        setMealPlan(null);
      }

      if (user) {
        getUserProfile(user.uid).then(profile => {
          if (profile?.minUkeSections) {
            setMealToggles({
              mealFrokost: profile.minUkeSections.mealFrokost !== false,
              mealLunsj: profile.minUkeSections.mealLunsj !== false,
              mealMiddag: profile.minUkeSections.mealMiddag !== false,
            });
          }
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to load meal planner data:', error);
    } finally {
      setLoading(false);
    }
  }, [familyId, weekStart]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!familyId) return;
    const q = query(collection(db, 'shoppingLists'), where('familyId', '==', familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setShoppingLists(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ShoppingList)));
    });
    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) {
        getUserProfile(user.uid).then(profile => {
          if (profile?.minUkeSections) {
            setMealToggles({
              mealFrokost: profile.minUkeSections.mealFrokost !== false,
              mealLunsj: profile.minUkeSections.mealLunsj !== false,
              mealMiddag: profile.minUkeSections.mealMiddag !== false,
            });
          }
        }).catch(() => {});
      }
    });
    return unsubscribe;
  }, [navigation, user]);

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ||
      (selectedCategory === 'favorites' && r.isFavorite) ||
      r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetRecipeForm = () => {
    setRecipeForm({ name: '', description: '', time: '', portions: '', category: 'kjoett', ingredients: [{ name: '', amount: '', unit: '' }], instructions: [''], variation: '', cuisine: '' });
  };

  const handleSaveRecipe = async () => {
    if (!recipeForm.name.trim()) {
      crossAlert('Error', t('mealPlanner.recipeName') + ' er påkrevd');
      return;
    }
    if (!familyId) return;
    try {
      const recipeData = {
        name: recipeForm.name.trim(),
        description: recipeForm.description.trim(),
        ingredients: recipeForm.ingredients.filter(i => i.name.trim()),
        instructions: recipeForm.instructions.filter(i => i.trim()),
        time: parseInt(recipeForm.time) || 0,
        portions: parseInt(recipeForm.portions) || 4,
        category: recipeForm.category,
        variation: recipeForm.variation || '',
        cuisine: recipeForm.cuisine || '',
      };
      if (editingRecipe) {
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'recipes', editingRecipe.id), { ...recipeData, translations: {} });
        await new Promise(resolve => setTimeout(resolve, 500));
        triggerRecipeTranslation(editingRecipe.id, recipeData.name, recipeData.description, recipeData.ingredients, recipeData.instructions);
      } else {
        const docRef = await addDoc(collection(db, 'recipes'), {
          ...recipeData,
          isFavorite: false,
          createdBy: user?.uid || '',
          familyId,
          createdAt: Date.now(),
        });
        triggerRecipeTranslation(docRef.id, recipeData.name, recipeData.description, recipeData.ingredients, recipeData.instructions);
      }
      setShowAddRecipe(false);
      setEditingRecipe(null);
      resetRecipeForm();
      loadData();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const getRecipeText = (recipe: Recipe, field: 'name' | 'description' | 'ingredients' | 'instructions') => {
    if (recipe.translations?.[i18n.language]?.[field]) {
      return recipe.translations[i18n.language][field];
    }
    return recipe[field];
  };

  const triggerRecipeTranslation = async (recipeId: string, name: string, description: string, ingredients: any[], instructions: string[]) => {
    try {
      const currentUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/translateRecipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ recipeId, name, description, ingredients, instructions }),
      });
      const data = await res.json();
      console.log('Translation result:', data);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!showDeleteRecipe) return;
    try {
      await deleteDoc(doc(db, 'recipes', showDeleteRecipe.id));
      setShowDeleteRecipe(null);
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const toggleFavorite = async (recipe: Recipe) => {
    try {
      await updateDoc(doc(db, 'recipes', recipe.id), { isFavorite: !recipe.isFavorite });
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleCreateList = async () => {
    if (!newListTitle.trim() || !familyId) return;
    try {
      const docRef = await addDoc(collection(db, 'shoppingLists'), {
        title: newListTitle.trim(),
        items: [],
        createdBy: user?.uid || '',
        createdAt: Date.now(),
        familyId,
      });
      setNewListTitle('');
      setShowAddList(false);
      // Navigate directly with the newly created list
      navigation.navigate('ShoppingListDetail', {
        list: {
          id: docRef.id,
          title: newListTitle.trim(),
          items: [],
          createdBy: user?.uid || '',
          createdAt: Date.now(),
          familyId,
        },
      });
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingLists', listId));
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleCopyList = async (list: ShoppingList) => {
    if (!familyId) return;
    try {
      await addDoc(collection(db, 'shoppingLists'), {
        title: list.title + ' (kopiert)',
        items: list.items.map(item => ({ ...item, id: generateId(), checked: false })),
        createdBy: user?.uid || '',
        createdAt: Date.now(),
        familyId,
      });
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleAddToShoppingList = async (recipe: Recipe) => {
    if (!familyId) return;
    try {
      const ingredients = getRecipeText(recipe, 'ingredients') || recipe.ingredients;
      const existingList = shoppingLists.find(l => l.title === recipe.name);
      if (existingList) {
        const newItems = ingredients.map(ing => ({
          id: generateId(),
          name: ing.amount ? `${ing.name} (${ing.amount} ${ing.unit})` : ing.name,
          checked: false,
        }));
        await import('firebase/firestore').then(({ updateDoc, doc }) =>
          updateDoc(doc(db, 'shoppingLists', existingList.id), {
            items: [...newItems, ...existingList.items],
          })
        );
      } else {
        await addDoc(collection(db, 'shoppingLists'), {
          title: recipe.name,
          items: ingredients.map(ing => ({
            id: generateId(),
            name: ing.amount ? `${ing.name} (${ing.amount} ${ing.unit})` : ing.name,
            checked: false,
          })),
          createdBy: user?.uid || '',
          createdAt: Date.now(),
          familyId,
        });
      }
      setInfoModal({ visible: true, title: t('common.success'), message: `${ingredients.length} ingredienser lagt til i "${recipe.name}"` });
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleAssignMeal = async (recipeId: string) => {
    if (!selectedSlot || !familyId) return;
    try {
      const meals = mealPlan?.meals || {};
      const dayMeals = meals[selectedSlot.day] || {};
      const updatedMeals = { ...meals, [selectedSlot.day]: { ...dayMeals, [selectedSlot.meal]: recipeId } };

      if (mealPlan) {
        await import('firebase/firestore').then(({ updateDoc, doc }) =>
          updateDoc(doc(db, 'mealPlans', mealPlan.id), { meals: updatedMeals })
        );
      } else {
        await addDoc(collection(db, 'mealPlans'), {
          weekStart,
          meals: updatedMeals,
          familyId,
          createdBy: user?.uid || '',
        });
      }
      setSelectedSlot(null);
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleRemoveMeal = async () => {
    if (!selectedSlot || !mealPlan || !familyId) return;
    try {
      const meals = mealPlan.meals || {};
      const dayMeals = { ...meals[selectedSlot.day] };
      delete dayMeals[selectedSlot.meal];
      const updatedMeals = { ...meals, [selectedSlot.day]: dayMeals };

      await import('firebase/firestore').then(({ updateDoc, doc }) =>
        updateDoc(doc(db, 'mealPlans', mealPlan.id), { meals: updatedMeals })
      );
      setSelectedRecipeForSlot(null);
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleAiSearch = async (query?: string) => {
    const searchQueryValue = query || aiQuery;
    if (!searchQueryValue.trim() || !user) return;
    setAiQuery(searchQueryValue);
    setAiLoading(true);
    setShowAiResults(true);
    try {
      const currentUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!currentUser) throw new Error('Ikke innlogget');
      const token = await currentUser.getIdToken();
      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/aiRecipeSuggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          prompt: searchQueryValue,
          existingRecipes: recipes.map(r => ({ name: r.name })),
          searchLanguage: aiSearchLang || 'norsk',
            responseLanguage: getAiNameForCode(i18n.language),
        }),
      });
      if (!res.ok) throw new Error('Kunne ikke generere forslag');
      const data = await res.json();
      setAiResults(data.recipes || []);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiRecipe = async (aiRecipe: any) => {
    if (!familyId) return;
    try {
      const docRef = await addDoc(collection(db, 'recipes'), {
        name: aiRecipe.name,
        description: aiRecipe.description || '',
        ingredients: aiRecipe.ingredients || [],
        instructions: aiRecipe.instructions || [],
        time: aiRecipe.time || 0,
        portions: aiRecipe.portions || 4,
        category: aiRecipe.category || 'kjoett',
        variation: aiRecipe.variation || '',
        cuisine: aiRecipe.cuisine || '',
        isFavorite: false,
        createdBy: user?.uid || '',
        familyId,
        createdAt: Date.now(),
      });
      triggerRecipeTranslation(docRef.id, aiRecipe.name, aiRecipe.description || '', aiRecipe.ingredients || [], aiRecipe.instructions || []);
      setInfoModal({ visible: true, title: t('common.success'), message: `"${aiRecipe.name}" lagt til i oppskriftsboken` });
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim() || !user) return;
    setImportLoading(true);
    try {
      const currentUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!currentUser) throw new Error('Ikke innlogget');
      const token = await currentUser.getIdToken();
      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/importRecipeFromUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: importUrl, language: getAiNameForCode(i18n.language) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Kunne ikke importere oppskrift');
      }
      const data = await res.json();
      if (data.recipe) {
        const docRef = await addDoc(collection(db, 'recipes'), {
          name: data.recipe.name,
          description: data.recipe.description || '',
          ingredients: data.recipe.ingredients || [],
          instructions: data.recipe.instructions || [],
          time: data.recipe.time || 0,
          portions: data.recipe.portions || 4,
          category: data.recipe.category || 'kjoett',
          variation: data.recipe.variation || '',
          cuisine: data.recipe.cuisine || '',
          isFavorite: false,
          createdBy: user.uid,
          familyId: familyId || '',
          createdAt: Date.now(),
        });
        const detectedLang = importUrl.includes('.no') ? 'norsk' : importUrl.includes('.se') ? 'svensk' : importUrl.includes('.dk') ? 'dansk' : importUrl.includes('.fi') ? 'finsk' : 'engelsk';
        triggerRecipeTranslation(docRef.id, data.recipe.name, data.recipe.description || '', data.recipe.ingredients || [], data.recipe.instructions || [], detectedLang);
        setInfoModal({ visible: true, title: t('common.success'), message: `"${data.recipe.name}" lagt til i oppskriftsboken` });
        setShowUrlImport(false);
        setImportUrl('');
        loadData();
      }
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setImportLoading(false);
    }
  };

  const renderUkemeny = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>🎲 {t('mealPlanner.whatToEat')}</Text>
          <TouchableOpacity
            style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowHelpRandom(true)}
          >
            <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.aiBtn, { backgroundColor: colors.accent }]} onPress={getRandomRecipe}>
          <Text style={styles.aiBtnText}>🎲 {t('mealPlanner.randomMeal')}</Text>
        </TouchableOpacity>
        {randomRecipe && (
          <View style={[styles.randomResult, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12 }} onPress={() => setRandomRecipe(null)}>
              <Text style={{ fontSize: 18, color: colors.textSecondary, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>
              {randomRecipe.category === 'kylling' ? '🍗' : randomRecipe.category === 'kjoett' ? '🥩' : randomRecipe.category === 'fisk' ? '🐟' : randomRecipe.category === 'vegetar' ? '🥗' : randomRecipe.category === 'pasta' ? '🍝' : randomRecipe.category === 'gryte' ? '🥘' : randomRecipe.category === 'suppe' ? '🍲' : randomRecipe.category === 'frokost' ? '🥞' : randomRecipe.category === 'sott' ? '🍰' : '🍽️'}
            </Text>
            <Text style={[styles.randomName, { color: colors.text }]}>{getRecipeText(randomRecipe, 'name')}</Text>
            <Text style={[styles.randomMeta, { color: colors.textSecondary }]}>{randomRecipe.time} {t('mealPlanner.minutes')} · {randomRecipe.portions} {t('mealPlanner.servings')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.randomActionBtn, { backgroundColor: colors.accent }]}
                onPress={async () => {
                  if (!familyId || !randomRecipe) return;
                  const day = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                  try {
                    const meals = mealPlan?.meals || {};
                    const dayMeals = meals[day] || {};
                    const updatedMeals = { ...meals, [day]: { ...dayMeals, middag: randomRecipe.id } };
                    if (mealPlan) {
                      await import('firebase/firestore').then(({ updateDoc, doc }) =>
                        updateDoc(doc(db, 'mealPlans', mealPlan.id), { meals: updatedMeals })
                      );
                    } else {
                      await addDoc(collection(db, 'mealPlans'), {
                        weekStart,
                        meals: updatedMeals,
                        familyId,
                        createdBy: user?.uid || '',
                      });
                    }
                    setRandomRecipe(null);
                    loadData();
                  } catch (error) {
                    crossAlert('Error', getErrorMessage(error));
                  }
                }}
              >
                <Text style={[styles.randomActionText, { color: '#fff' }]}>📅 {t('mealPlanner.addToPlan')} {t(`mealPlanner.${DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}`).toLowerCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.randomActionBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => { setShowRecipeDetail(randomRecipe); }}
              >
                <Text style={[styles.randomActionText, { color: colors.text }]}>📖 {t('mealPlanner.viewRecipe')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>📅 {t('mealPlanner.weekOverview')}</Text>
          <TouchableOpacity
            style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowHelp(true)}
          >
            <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        {DAYS.map((day, i) => (
          <TouchableOpacity key={day} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.dayName, { color: colors.accent }]}>{t(DAY_LABELS[i])}</Text>
            <View style={styles.dayMeals}>
              {MEAL_SLOTS.filter(meal => {
                if (meal === 'frokost') return mealToggles.mealFrokost !== false;
                if (meal === 'lunsj') return mealToggles.mealLunsj !== false;
                if (meal === 'middag') return mealToggles.mealMiddag !== false;
                return true;
              }).map(meal => {
                const recipeId = mealPlan?.meals?.[day]?.[meal];
                const recipe = recipes.find(r => r.id === recipeId);
                const mealEmoji = meal === 'frokost' ? '🥞' : meal === 'lunsj' ? '🥪' : '🍽️';
                const mealLabel = meal === 'frokost' ? t('mealPlanner.frokost') : meal === 'lunsj' ? t('mealPlanner.lunch') : t('mealPlanner.dinner');
                return (
                  <TouchableOpacity
                    key={meal}
                    style={[styles.mealTag, recipe ? { backgroundColor: colors.accentLight, borderColor: colors.accent } : { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => {
                      if (recipe) {
                        setSelectedRecipeForSlot(recipe);
                        setSelectedSlot({ day, meal });
                      } else {
                        setSelectedSlot({ day, meal });
                      }
                    }}
                  >
                    <Text style={{ fontSize: 12, color: recipe ? colors.accent : colors.textDisabled }}>
                      {recipe ? recipe.name : `+ ${mealLabel}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderOppskrifter = () => (
    <View style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.searchBar, { flex: 1 }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('mealPlanner.searchRecipe')}
              placeholderTextColor={colors.textDisabled}
            />
          </View>
          <TouchableOpacity
            style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowHelpSearch(true)}
          >
            <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.filterChip, { borderColor: selectedCategory === cat.key ? colors.accent : colors.border }, selectedCategory === cat.key && { backgroundColor: colors.accent }]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: selectedCategory === cat.key ? '#fff' : colors.textSecondary }}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>📖</Text>
          <Text style={[styles.emptyText, { color: colors.textDisabled, textAlign: 'center' }]}>{searchQuery ? t('mealPlanner.noRecipesSearch') : t('mealPlanner.noRecipes')}</Text>

          {/* AI Search Section */}
          {searchQuery && (
            <View style={[styles.aiSearchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.aiSearchTitle, { color: colors.text }]}>🤖 {t('mealPlanner.searchWithAI')}</Text>
              <Text style={[styles.aiSearchHint, { color: colors.textSecondary }]}>
                {t('mealPlanner.searchWithAI')} "{searchQuery}"
              </Text>

              <Text style={[styles.aiLangLabel, { color: colors.textSecondary }]}>
                {t('mealPlanner.searchInLanguage')}:
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {languageOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterChip, { borderColor: aiSearchLang === opt.value ? colors.accent : colors.border, backgroundColor: aiSearchLang === opt.value ? colors.accent : 'transparent' }]}
                    onPress={() => setAiSearchLang(opt.value)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: aiSearchLang === opt.value ? '#fff' : colors.textSecondary }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.aiBtn, { backgroundColor: colors.accent }]} onPress={() => handleAiSearch(searchQuery)}>
                <Text style={styles.aiBtnText}>🤖 {t('mealPlanner.searchWithAI')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* URL Import */}
          <TouchableOpacity style={[styles.aiSearchCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]} onPress={() => setShowUrlImport(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginRight: 10 }}>🔗</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiSearchTitle, { color: colors.text }]}>{t('mealPlanner.importURL')}</Text>
                <Text style={[styles.aiSearchHint, { color: colors.textSecondary }]}>{t('mealPlanner.urlImportHint')}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 80 }}>
          {(() => {
            const grouped: Record<string, Recipe[]> = {};
            filteredRecipes.forEach(r => {
              const cat = r.category || 'kjoett';
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(r);
            });
            const categoryOrder = ['kylling', 'kjoett', 'fisk', 'vegetar', 'pasta', 'gryte', 'suppe', 'frokost', 'sott'];
            const sortedCats = Object.keys(grouped).sort((a, b) => {
              const ai = categoryOrder.indexOf(a);
              const bi = categoryOrder.indexOf(b);
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });
            const isAllSelected = selectedCategory === 'all';

            return sortedCats.map(cat => {
              const recipes = grouped[cat];
              const catLabel = t(`mealPlanner.${cat}`);
              const catEmoji = cat === 'kylling' ? '🍗' : cat === 'kjoett' ? '🥩' : cat === 'fisk' ? '🐟' : cat === 'vegetar' ? '🥗' : cat === 'pasta' ? '🍝' : cat === 'gryte' ? '🥘' : cat === 'suppe' ? '🍲' : cat === 'frokost' ? '🥞' : '🍰';
              const isExpanded = !isAllSelected || selectedCategory === cat;

              return (
                <View key={cat} style={[styles.card, { backgroundColor: colors.surface, marginBottom: 8 }]}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Text style={{ fontSize: 22 }}>{catEmoji}</Text>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{catLabel}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.inputBackground }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{recipes.length}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>{isExpanded ? '▼' : '▶'}</Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                      {recipes.sort((a, b) => a.name.localeCompare(b.name)).map((item, i) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.recipeCard, { backgroundColor: colors.inputBackground, marginBottom: i < recipes.length - 1 ? 8 : 0 }]}
                          onPress={() => setShowRecipeDetail(item)}
                          onLongPress={() => setActionModal({ visible: true, title: item.name, onEdit: () => {
                            setEditingRecipe(item);
                            setRecipeForm({
                              name: item.name, description: item.description || '',
                              time: item.time ? String(item.time) : '', portions: item.portions ? String(item.portions) : '',
                              category: item.category || 'kjoett',
                              ingredients: item.ingredients.length > 0 ? item.ingredients : [{ name: '', amount: '', unit: '' }],
                              instructions: item.instructions.length > 0 ? item.instructions : [''],
                              variation: item.variation || '', cuisine: item.cuisine || '',
                            });
                            setShowAddRecipe(true);
                          }, onDelete: async () => {
                            try { await deleteDoc(doc(db, 'recipes', item.id)); loadData(); } catch (error) { crossAlert('Error', getErrorMessage(error)); }
                          } })}
                        >
                          <View style={styles.recipeInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={[styles.recipeName, { color: colors.text, flex: 1 }]} numberOfLines={1}>{getRecipeText(item, 'name')}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                {item.variation && (
                                  <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.accentLight || '#E8F5E9' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '600', color: colors.accent }}>{item.variation}</Text>
                                  </View>
                                )}
                                {item.cuisine && (
                                  <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                                    <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSecondary }}>{item.cuisine}</Text>
                                  </View>
                                )}
                                <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); toggleFavorite(item); }} style={{ padding: 4 }}>
                                  <Text style={{ fontSize: 16 }}>{item.isFavorite ? '❤️' : '🤍'}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                            <Text style={[styles.recipeMeta, { color: colors.textSecondary, marginTop: 4 }]}>
                              {item.time} {t('mealPlanner.minutes')} · {item.portions} {t('mealPlanner.servings')}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            });
          })()}
        </ScrollView>
      )}

      {/* AI Results */}
      {showAiResults && (
        <View style={[styles.card, { backgroundColor: colors.surface, margin: 8 }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>🤖 {t('mealPlanner.aiSuggest')}</Text>
          {aiLoading ? (
            <Text style={[styles.emptyText, { color: colors.textDisabled }]}>{t('common.loading')}</Text>
          ) : aiResults.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textDisabled }]}>{t('mealPlanner.noSuggestions')}</Text>
          ) : (
            aiResults.map((recipe, i) => (
              <View key={i} style={[styles.aiResultItem, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                    <Text style={[styles.recipePickerName, { color: colors.text }]}>{recipe.name}</Text>
                    {recipe.variation && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.accentLight || '#E8F5E9' }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.accent }}>{recipe.variation}</Text>
                      </View>
                    )}
                    {recipe.cuisine && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>{recipe.cuisine}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.recipePickerMeta, { color: colors.textSecondary }]}>{recipe.time} min · {recipe.portions} porsjoner · {t(`mealPlanner.${recipe.category || 'kjoett'}`)}</Text>
                  {recipe.description ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>{recipe.description}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.aiSaveBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => { setShowRecipeDetail(recipe); }}
                  >
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>📖 Se</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.aiSaveBtn, { backgroundColor: colors.accent }]}
                    onPress={() => handleSaveAiRecipe(recipe)}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>+ {t('mealPlanner.saveRecipe')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <TouchableOpacity style={[styles.aiBtn, { backgroundColor: colors.inputBackground, marginTop: 8 }]} onPress={() => { setShowAiResults(false); setAiResults([]); }}>
            <Text style={[styles.aiBtnText, { color: colors.text }]}>{t('mealPlanner.close')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderHandleliste = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>🛒 {t('mealPlanner.shoppingLists')}</Text>
          <TouchableOpacity
            style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowHelpHandleliste(true)}
          >
            <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.addBtnSm, { backgroundColor: colors.accent }]} onPress={() => setShowAddList(true)}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>+</Text>
          </TouchableOpacity>
        </View>

        {shoppingLists.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>{t('mealPlanner.noShoppingLists')}</Text>
        ) : (
          shoppingLists.map((list) => (
            <View key={list.id} style={[styles.shoppingListCard, { backgroundColor: colors.inputBackground }]}>
              <TouchableOpacity
                style={styles.shoppingListContent}
                onPress={() => navigation.navigate('ShoppingListDetail', { list })}
                onLongPress={() => setActionModal({ visible: true, title: list.title, onDelete: () => handleDeleteList(list.id) })}
              >
                <Text style={[styles.shoppingListTitle, { color: colors.text }]}>{list.title}</Text>
                <Text style={[styles.shoppingListCount, { color: colors.textSecondary }]}>
                  {list.items.filter(i => i.checked).length}/{list.items.length} varer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => handleCopyList(list)}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>📋</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Create list modal */}
      <Modal visible={showAddList} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowAddList(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('mealPlanner.createList')}</Text>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.listName')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={newListTitle}
                    onChangeText={setNewListTitle}
                    placeholder="F.eks. Fredagsinnkjøp"
                    placeholderTextColor={colors.textDisabled}
                    autoFocus
                  />
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setShowAddList(false); setNewListTitle(''); }}>
                    <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={handleCreateList}>
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.title, { color: colors.text }]}>🍽️ {t('mealPlanner.title')}</Text>
            <Image source={require('../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 9 }} />
          </View>
          {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary }]}>{familyName}</Text> : null}
        </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {(['ukemeny', 'oppskrifter', 'handleliste'] as SubTab[]).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && { borderBottomColor: colors.accent }]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.accent : colors.textSecondary }]}>
              {tab === 'ukemeny' ? t('mealPlanner.weeklyPlan') : tab === 'oppskrifter' ? t('mealPlanner.recipes') : t('mealPlanner.shoppingList')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>{t('common.loading')}</Text>
        </View>
      ) : (
        <>
          {activeTab === 'ukemeny' && renderUkemeny()}
          {activeTab === 'oppskrifter' && renderOppskrifter()}
          {activeTab === 'handleliste' && renderHandleliste()}
        </>
      )}

      {/* Add Recipe Modal */}
      <Modal visible={showAddRecipe === true} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowAddRecipe(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editingRecipe ? t('mealPlanner.editRecipe') : t('mealPlanner.addRecipe')}</Text>
                <ScrollView>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.recipeName')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={recipeForm.name} onChangeText={v => setRecipeForm(f => ({ ...f, name: v }))} placeholder="F.eks. Spaghetti Bolognese" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.description')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={recipeForm.description} onChangeText={v => setRecipeForm(f => ({ ...f, description: v }))} placeholder="Kort beskrivelse" placeholderTextColor={colors.textDisabled} multiline />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.time')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={recipeForm.time} onChangeText={v => setRecipeForm(f => ({ ...f, time: v }))} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.portions')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={recipeForm.portions} onChangeText={v => setRecipeForm(f => ({ ...f, portions: v }))} keyboardType="numeric" placeholder="4" placeholderTextColor={colors.textDisabled} />
                    </View>
                  </View>

                  {/* Category */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.category')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {['kylling', 'kjoett', 'fisk', 'vegetar', 'pasta', 'gryte', 'suppe', 'frokost', 'sott'].map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.filterChip, { borderColor: recipeForm.category === cat ? colors.accent : colors.border }, recipeForm.category === cat && { backgroundColor: colors.accent }]}
                          onPress={() => setRecipeForm(f => ({ ...f, category: cat }))}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: recipeForm.category === cat ? '#fff' : colors.textSecondary }}>
                            {cat === 'kylling' ? '🍗' : cat === 'kjoett' ? '🥩' : cat === 'fisk' ? '🐟' : cat === 'vegetar' ? '🥗' : cat === 'pasta' ? '🍝' : cat === 'gryte' ? '🥘' : cat === 'suppe' ? '🍲' : cat === 'frokost' ? '🥞' : '🍰'} {t(`mealPlanner.${cat}`)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Variation */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.variation')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {['Klassisk', 'Raskere', 'Med en vri'].map(v => (
                        <TouchableOpacity
                          key={v}
                          style={[styles.filterChip, { borderColor: recipeForm.variation === v ? colors.accent : colors.border }, recipeForm.variation === v && { backgroundColor: colors.accent }]}
                          onPress={() => setRecipeForm(f => ({ ...f, variation: f.variation === v ? '' : v }))}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: recipeForm.variation === v ? '#fff' : colors.textSecondary }}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Cuisine */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.cuisine')}</Text>
                    {recipeForm.cuisine ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <TouchableOpacity
                          style={[styles.input, { backgroundColor: colors.inputBackground, flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }]}
                          onPress={() => { setRecipeForm(f => ({ ...f, cuisine: '' })); setCuisineSearch(''); setShowCuisineDropdown(true); }}
                        >
                          <Text style={{ fontSize: 16 }}>{cuisineCountries.find(c => c.name === recipeForm.cuisine)?.flag}</Text>
                          <Text style={{ color: colors.text, fontSize: 14 }}>{recipeForm.cuisine}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 'auto' }}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                          value={cuisineSearch}
                          onChangeText={v => { setCuisineSearch(v); setShowCuisineDropdown(true); }}
                          onFocus={() => setShowCuisineDropdown(true)}
                          placeholder={t('mealPlanner.cuisinePlaceholder')}
                          placeholderTextColor={colors.textDisabled}
                        />
                        {showCuisineDropdown && (
                          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 4, padding: 0, overflow: 'hidden' }]}>
                            {cuisineCountries
                              .filter(c => c.name.toLowerCase().includes(cuisineSearch.toLowerCase()))
                              .map(c => (
                                <TouchableOpacity
                                  key={c.name}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                                  onPress={() => { setRecipeForm(f => ({ ...f, cuisine: c.name })); setCuisineSearch(''); setShowCuisineDropdown(false); }}
                                >
                                  <Text style={{ fontSize: 16 }}>{c.flag}</Text>
                                  <Text style={{ color: colors.text, fontSize: 14 }}>{c.name}</Text>
                                </TouchableOpacity>
                              ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Ingredients */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.ingredients')}</Text>
                    {recipeForm.ingredients.map((ing, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                        <TextInput style={[styles.input, { flex: 2, backgroundColor: colors.inputBackground, color: colors.text, fontSize: 16 }]} value={ing.name} onChangeText={v => setRecipeForm(f => { const ings = [...f.ingredients]; ings[i] = { ...ings[i], name: v }; return { ...f, ingredients: ings }; })} placeholder="Ingrediens" placeholderTextColor={colors.textDisabled} />
                        <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, color: colors.text, fontSize: 16 }]} value={ing.amount} onChangeText={v => setRecipeForm(f => { const ings = [...f.ingredients]; ings[i] = { ...ings[i], amount: v }; return { ...f, ingredients: ings }; })} placeholder="Mengde" placeholderTextColor={colors.textDisabled} />
                        <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, color: colors.text, fontSize: 16 }]} value={ing.unit} onChangeText={v => setRecipeForm(f => { const ings = [...f.ingredients]; ings[i] = { ...ings[i], unit: v }; return { ...f, ingredients: ings }; })} placeholder="Enhet" placeholderTextColor={colors.textDisabled} />
                        {recipeForm.ingredients.length > 1 && (
                          <TouchableOpacity onPress={() => setRecipeForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))}>
                            <Text style={{ color: '#E53935', fontSize: 18, padding: 8 }}>×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => setRecipeForm(f => ({ ...f, ingredients: [...f.ingredients, { name: '', amount: '', unit: '' }] }))}>
                      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>+ {t('mealPlanner.addIngredient')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Instructions */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('mealPlanner.instructions')}</Text>
                    {recipeForm.instructions.map((step, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                        <Text style={{ color: colors.accent, fontWeight: '700', width: 20 }}>{i + 1}.</Text>
                        <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, color: colors.text, fontSize: 16 }]} value={step} onChangeText={v => setRecipeForm(f => { const steps = [...f.instructions]; steps[i] = v; return { ...f, instructions: steps }; })} placeholder={`Steg ${i + 1}`} placeholderTextColor={colors.textDisabled} multiline />
                        {recipeForm.instructions.length > 1 && (
                          <TouchableOpacity onPress={() => setRecipeForm(f => ({ ...f, instructions: f.instructions.filter((_, idx) => idx !== i) }))}>
                            <Text style={{ color: '#E53935', fontSize: 18, padding: 8 }}>×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => setRecipeForm(f => ({ ...f, instructions: [...f.instructions, ''] }))}>
                      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>+ {t('mealPlanner.addStep')}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setShowAddRecipe(false); setEditingRecipe(null); resetRecipeForm(); }}>
                    <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={handleSaveRecipe}>
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{editingRecipe ? t('common.save') : t('mealPlanner.saveRecipe')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Recipe Detail Modal */}
      <Modal visible={!!showRecipeDetail} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowRecipeDetail(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{showRecipeDetail ? getRecipeText(showRecipeDetail, 'name') : ''}</Text>
                    {showRecipeDetail?.variation && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.accentLight || '#E8F5E9', alignSelf: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>{showRecipeDetail.variation}</Text>
                      </View>
                    )}
                    {showRecipeDetail?.cuisine && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border, alignSelf: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{showRecipeDetail.cuisine}</Text>
                      </View>
                    )}
                  </View>
                <ScrollView>
                  {showRecipeDetail?.description ? <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>{getRecipeText(showRecipeDetail, 'description')}</Text> : null}
                  {showRecipeDetail?.time ? <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>{showRecipeDetail.time} {t('mealPlanner.minutes')} · {showRecipeDetail.portions} {t('mealPlanner.servings')}</Text> : null}
                  {showRecipeDetail?.ingredients && showRecipeDetail.ingredients.length > 0 && (
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{t('mealPlanner.ingredientsList')}</Text>
                  )}
                  {(showRecipeDetail ? getRecipeText(showRecipeDetail, 'ingredients') : [])?.map((ing: any, i: number) => (
                    <View key={i} style={[styles.shoppingItem, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.shoppingName, { color: colors.text }]}>{ing.name}</Text>
                      <Text style={[styles.shoppingQty, { color: colors.textSecondary }]}>{ing.amount} {ing.unit}</Text>
                    </View>
                  ))}

                  {showRecipeDetail?.instructions && showRecipeDetail.instructions.length > 0 && (
                    <>
                      <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>{t('mealPlanner.instructionsList')}</Text>
                      {(showRecipeDetail ? getRecipeText(showRecipeDetail, 'instructions') : [])?.map((step: string, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                          <Text style={{ color: colors.accent, fontWeight: '700', width: 20, fontSize: 13 }}>{i + 1}.</Text>
                          <Text style={{ fontSize: 13, lineHeight: 20, color: colors.text, flex: 1 }}>{step}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => setShowRecipeDetail(null)}>
                    <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.close')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={() => { if (showRecipeDetail) { handleAddToShoppingList(showRecipeDetail); setShowRecipeDetail(null); } }}>
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('mealPlanner.addToShoppingList')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ActionModal
        visible={actionModal.visible}
        title={actionModal.title}
        onEdit={actionModal.onEdit}
        onDelete={actionModal.onDelete}
        onCancel={() => setActionModal({ visible: false, title: '' })}
      />

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        onConfirm={() => setInfoModal({ visible: false, title: '' })}
      />

      <HelpCenter
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('mealPlanner.helpTitle')}
        sections={[
          { icon: '📋', title: t('mealPlanner.helpWhat'), text: t('mealPlanner.helpWhatText') },
          { icon: '👉', title: t('mealPlanner.helpHow'), text: t('mealPlanner.helpHowText'), tip: t('mealPlanner.helpTip') },
          { icon: '⚙️', title: t('mealPlanner.helpSettings'), text: t('mealPlanner.helpSettingsText') },
        ]}
      />

      <HelpCenter
        visible={showHelpRandom}
        onClose={() => setShowHelpRandom(false)}
        title={t('mealPlanner.helpRandomTitle')}
        sections={[
          { icon: '🎲', title: t('mealPlanner.helpRandomWhat'), text: t('mealPlanner.helpRandomWhatText') },
          { icon: '👉', title: t('mealPlanner.helpRandomHow'), text: t('mealPlanner.helpRandomHowText'), tip: t('mealPlanner.helpRandomTip') },
          { icon: '⚙️', title: t('mealPlanner.helpRandomSettings'), text: t('mealPlanner.helpRandomSettingsText') },
        ]}
      />

      <HelpCenter
        visible={showHelpSearch}
        onClose={() => setShowHelpSearch(false)}
        title={t('mealPlanner.helpSearchTitle')}
        sections={[
          { icon: '🔍', title: t('mealPlanner.helpSearchWhat'), text: t('mealPlanner.helpSearchWhatText') },
          { icon: '👉', title: t('mealPlanner.helpSearchHow'), text: t('mealPlanner.helpSearchHowText'), tip: t('mealPlanner.helpSearchTip') },
          { icon: '⚙️', title: t('mealPlanner.helpSearchSettings'), text: t('mealPlanner.helpSearchSettingsText') },
        ]}
      />

      <HelpCenter
        visible={showHelpHandleliste}
        onClose={() => setShowHelpHandleliste(false)}
        title={t('mealPlanner.helpHandlelisteTitle')}
        sections={[
          { icon: '🛒', title: t('mealPlanner.helpHandlelisteWhat'), text: t('mealPlanner.helpHandlelisteWhatText') },
          { icon: '👉', title: t('mealPlanner.helpHandlelisteHow'), text: t('mealPlanner.helpHandlelisteHowText') },
          { icon: '📎', title: t('mealPlanner.helpHandlelisteRecipe'), text: t('mealPlanner.helpHandlelisteRecipeText'), tip: t('mealPlanner.helpHandlelisteRecipeTip') },
        ]}
      />

      {/* URL Import Modal */}
      <Modal visible={showUrlImport} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowUrlImport(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('mealPlanner.importURL')}</Text>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>URL</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={importUrl}
                    onChangeText={setImportUrl}
                    placeholder="https://www.matprat.no/..."
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setShowUrlImport(false); setImportUrl(''); }}>
                    <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent, opacity: importLoading ? 0.5 : 1 }]} onPress={handleUrlImport} disabled={importLoading}>
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{importLoading ? t('common.loading') : t('common.add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Recipe Picker Modal for assigning meals */}
      <Modal visible={!!selectedSlot} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => { setSelectedSlot(null); setSelectedRecipeForSlot(null); }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '70%' }]}>
                {selectedRecipeForSlot ? (
                  <>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {selectedRecipeForSlot.name}
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }]}>
                      {selectedSlot?.day && t(`mealPlanner.${selectedSlot.day}`)} · {selectedSlot?.meal === 'lunsj' ? t('mealPlanner.lunch') : t('mealPlanner.dinner')}
                    </Text>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent, marginBottom: 8 }]} onPress={() => { setShowRecipeDetail(selectedRecipeForSlot); setSelectedSlot(null); setSelectedRecipeForSlot(null); }}>
                      <Text style={[styles.modalBtnText, { color: '#fff' }]}>📖 {t('mealPlanner.viewRecipe')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#E53935', marginBottom: 8 }]} onPress={handleRemoveMeal}>
                      <Text style={[styles.modalBtnText, { color: '#fff' }]}>🗑️ {t('mealPlanner.removeFromPlan')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setSelectedSlot(null); setSelectedRecipeForSlot(null); }}>
                      <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {t('mealPlanner.selectRecipe')} {selectedSlot?.meal === 'frokost' ? t('mealPlanner.frokost').toLowerCase() : selectedSlot?.meal === 'lunsj' ? t('mealPlanner.lunch').toLowerCase() : t('mealPlanner.dinner').toLowerCase()} {t('mealPlanner.on')} {selectedSlot?.day && t(`mealPlanner.${selectedSlot.day}`)}
                    </Text>
                    <TextInput
                      style={[styles.modalSearchInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                      value={pickerSearch}
                      onChangeText={setPickerSearch}
                      placeholder={t('mealPlanner.searchInPicker')}
                      placeholderTextColor={colors.textDisabled}
                    />
                    <ScrollView style={{ maxHeight: 300 }}>
                      {recipes.filter(r => !pickerSearch || r.name.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.textDisabled, textAlign: 'center', padding: 20 }]}>{pickerSearch ? t('mealPlanner.noRecipesSearch') : t('mealPlanner.noRecipes')}</Text>
                      ) : (
                        recipes.filter(r => !pickerSearch || r.name.toLowerCase().includes(pickerSearch.toLowerCase())).map(recipe => (
                          <TouchableOpacity
                            key={recipe.id}
                            style={[styles.recipePickerItem, { borderBottomColor: colors.border }]}
                            onPress={() => handleAssignMeal(recipe.id)}
                          >
                            <Text style={{ fontSize: 20, marginRight: 10 }}>
                              {recipe.category === 'kylling' ? '🍗' : recipe.category === 'kjoett' ? '🥩' : recipe.category === 'fisk' ? '🐟' : recipe.category === 'vegetar' ? '🥗' : recipe.category === 'pasta' ? '🍝' : recipe.category === 'gryte' ? '🥘' : recipe.category === 'suppe' ? '🍲' : recipe.category === 'frokost' ? '🥞' : recipe.category === 'sott' ? '🍰' : '🍽️'}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.recipePickerName, { color: colors.text }]}>{recipe.name}</Text>
                              <Text style={[styles.recipePickerMeta, { color: colors.textSecondary }]}>{recipe.time} {t('mealPlanner.minutes')} · {recipe.portions} {t('mealPlanner.servings')}</Text>
                            </View>
                            {recipe.isFavorite && <Text style={{ fontSize: 14 }}>❤️</Text>}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setSelectedSlot(null); setSelectedRecipeForSlot(null); setPickerSearch(''); }}>
                        <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* FAB for adding recipes */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => { resetRecipeForm(); setShowAddRecipe(true); }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 28, fontWeight: 'bold' },
  familySubtitle: { fontSize: 14, fontStyle: 'italic', marginTop: 2, marginBottom: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabContent: { flex: 1 },
  card: { borderRadius: 12, margin: 8, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  cardSubtitle: { fontSize: 12, marginBottom: 8 },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1 },
  dayName: { width: 80, fontSize: 13, fontWeight: '700', paddingTop: 6 },
  dayMeals: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealTag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
  recipePickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  recipePickerName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  recipePickerMeta: { fontSize: 12 },
  modalSearchInput: { padding: 10, borderRadius: 8, borderWidth: 1, fontSize: 16, marginBottom: 10 },
  aiResultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  aiSaveBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  aiBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 200 },
  aiBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  aiSearchCard: { borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1 },
  aiSearchTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  aiSearchHint: { fontSize: 13, marginBottom: 10 },
  aiLangLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  urlImportBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1 },
  urlImportTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  urlImportHint: { fontSize: 12 },
  randomResult: { borderRadius: 10, padding: 14, marginTop: 12, alignItems: 'center', borderWidth: 1, position: 'relative' },
  randomName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  randomMeta: { fontSize: 13, marginBottom: 8 },
  randomActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  randomActionText: { fontSize: 12, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  searchBar: { padding: 8, paddingHorizontal: 16 },
  searchInput: { padding: 10, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  filterRow: { paddingHorizontal: 16, marginBottom: 8, maxHeight: 40 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, marginRight: 6, alignItems: 'center', justifyContent: 'center' },
  recipeGrid: { padding: 8, paddingBottom: 80 },
  recipeCard: { flex: 1, margin: 6, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  recipeImg: { height: 80, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  favBtn: { position: 'absolute', top: 8, right: 8 },
  recipeInfo: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  recipeName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  recipeMeta: { fontSize: 12 },
  emptyState: { flex: 1, justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  shoppingItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#ddd' },
  shoppingName: { fontSize: 14, flex: 1 },
  shoppingQty: { fontSize: 12 },
  autoTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, fontSize: 10, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  addInput: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, fontSize: 16 },
  addBtnSm: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  shoppingListCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 8 },
  shoppingListContent: { flex: 1 },
  shoppingListTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  shoppingListCount: { fontSize: 12 },
  copyBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { padding: 12, borderRadius: 8, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
