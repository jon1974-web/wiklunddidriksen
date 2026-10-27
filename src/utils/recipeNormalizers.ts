import { Recipe, RecipeIngredient, RecipeTranslation } from '../types';

/**
 * Legacy recipes may store ingredients as plain strings and instructions as a
 * single string. These helpers convert any stored shape into the typed shape.
 */
export function normalizeIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) return [];
  return value.map((item): RecipeIngredient => {
    if (typeof item === 'string') {
      return { name: item, amount: '', unit: '' };
    }
    const obj = (item ?? {}) as Partial<RecipeIngredient>;
    return {
      name: String(obj.name ?? ''),
      amount: String(obj.amount ?? ''),
      unit: String(obj.unit ?? ''),
    };
  });
}

export function normalizeInstructions(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  return value.map((step) => String(step ?? ''));
}

function normalizeTranslation(translation: RecipeTranslation): RecipeTranslation {
  return {
    ...translation,
    ingredients: normalizeIngredients(translation.ingredients),
    instructions: normalizeInstructions(translation.instructions),
  };
}

/** Returns a recipe whose list fields always have the typed shape. Call once at the read boundary. */
export function normalizeRecipe(recipe: Recipe): Recipe {
  const translations = recipe.translations
    ? Object.fromEntries(
        Object.entries(recipe.translations).map(([lang, translation]) => [lang, normalizeTranslation(translation)])
      )
    : undefined;
  return {
    ...recipe,
    ingredients: normalizeIngredients(recipe.ingredients),
    instructions: normalizeInstructions(recipe.instructions),
    ...(translations ? { translations } : {}),
  };
}

/** Translated name/description, falling back to the original text. */
export function getTranslatedRecipeText(recipe: Recipe, lang: string, field: 'name' | 'description'): string {
  return recipe.translations?.[lang]?.[field] || recipe[field];
}

/** Translated ingredients, falling back to the original list when no translation exists. */
export function getTranslatedIngredients(recipe: Recipe, lang: string): RecipeIngredient[] {
  const translated = recipe.translations?.[lang]?.ingredients;
  return translated && translated.length > 0 ? translated : recipe.ingredients;
}

/** Translated instructions, falling back to the original list when no translation exists. */
export function getTranslatedInstructions(recipe: Recipe, lang: string): string[] {
  const translated = recipe.translations?.[lang]?.instructions;
  return translated && translated.length > 0 ? translated : recipe.instructions;
}
