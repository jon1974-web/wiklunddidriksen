import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from './nb.json';
import sv from './sv.json';
import da from './da.json';
import en from './en.json';
import fi from './fi.json';

const resources = {
  nb: { translation: nb },
  sv: { translation: sv },
  da: { translation: da },
  en: { translation: en },
  fi: { translation: fi },
};

function getStoredLanguage(): string {
  try {
    const stored = localStorage.getItem('language');
    if (stored && ['nb', 'sv', 'da', 'en', 'fi'].includes(stored)) {
      return stored;
    }
  } catch {}
  return 'nb';
}

function getDeviceLanguage(): string {
  try {
    const lang = navigator?.language || navigator?.languages?.[0] || 'nb';
    if (lang.startsWith('sv')) return 'sv';
    if (lang.startsWith('da')) return 'da';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('fi')) return 'fi';
    return 'nb';
  } catch {
    return 'nb';
  }
}

const savedLang = typeof window !== 'undefined' ? getStoredLanguage() : 'nb';
const initialLang = savedLang !== 'nb' ? savedLang : getDeviceLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: 'nb',
  interpolation: {
    escapeValue: false,
  },
});

export const setLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  try { localStorage.setItem('language', lang); } catch {}
};

export default i18n;
