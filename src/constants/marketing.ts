import { MODULE_COLORS } from './moduleColors';

export const BRAND = {
  name: 'fampad',
  domain: 'fampad.app',
  url: 'https://fampad.app',
} as const;

export const BRAND_COLORS = {
  blueLight: '#517494',
  blueDark: '#2D485E',
  accent: '#3b5a75',
  blueDarkBorder: 'rgba(45, 72, 94, 0.30)',
  blueDarkTint: 'rgba(45, 72, 94, 0.06)',
  blueLightTintDark: 'rgba(139, 180, 216, 0.10)',
  blueLightBorderDark: 'rgba(139, 180, 216, 0.28)',
} as const;

export const INTRO_VIDEO: { duration: string; src: string | null } = {
  duration: '1:00',
  src: null,
};

export const DESKTOP_BENEFITS = [
  { icon: '✅', titleKey: 'desktop.benefit1Title', textKey: 'desktop.benefit1Text' },
  { icon: '🔒', titleKey: 'desktop.benefit2Title', textKey: 'desktop.benefit2Text' },
  { icon: '📱', titleKey: 'desktop.benefit3Title', textKey: 'desktop.benefit3Text' },
] as const;

export const LANDING_FEATURES = [
  { icon: '📅', tint: 'rgba(59, 90, 117, 0.12)', titleKey: 'landing.featureEventsTitle', textKey: 'landing.featureEventsText' },
  { icon: '💬', tint: 'rgba(59, 90, 117, 0.12)', titleKey: 'landing.featureChatTitle', textKey: 'landing.featureChatText' },
  { icon: '🎂', tint: 'rgba(230, 168, 23, 0.14)', titleKey: 'landing.featureBirthdaysTitle', textKey: 'landing.featureBirthdaysText' },
  { icon: '❤️', tint: 'rgba(198, 123, 92, 0.14)', titleKey: 'landing.featureHealthTitle', textKey: 'landing.featureHealthText' },
  { icon: '🏠', tint: 'rgba(59, 90, 117, 0.12)', titleKey: 'landing.featureHomeTitle', textKey: 'landing.featureHomeText' },
  { icon: '🎒', tint: 'rgba(107, 143, 113, 0.14)', titleKey: 'landing.featureSchoolTitle', textKey: 'landing.featureSchoolText' },
  { icon: '✈️', tint: 'rgba(126, 200, 227, 0.16)', titleKey: 'landing.featureTripsTitle', textKey: 'landing.featureTripsText' },
  { icon: '🍽️', tint: 'rgba(232, 144, 108, 0.14)', titleKey: 'landing.featureMealsTitle', textKey: 'landing.featureMealsText' },
] as const;

export const TRUST_FLAGS = '🇳🇴 🇸🇪 🇩🇰 🇫🇮 🇬🇧';

export const LANDING_SAMPLES = [
  { icon: '⚽', tint: 'rgba(59, 90, 117, 0.12)', titleKey: 'landing.sample1Title', textKey: 'landing.sample1Text', spond: true },
  { icon: '🎉', tint: 'rgba(230, 168, 23, 0.14)', titleKey: 'landing.sample2Title', textKey: 'landing.sample2Text' },
  { icon: '🍕', tint: 'rgba(232, 131, 106, 0.14)', titleKey: 'landing.sample3Title', textKey: 'landing.sample3Text' },
] as const;

export const LANDING_FAQ = [
  { qKey: 'landing.faqCostQ', aKey: 'landing.faqCostA' },
  { qKey: 'landing.faqInstallQ', aKey: 'landing.faqInstallA' },
  { qKey: 'landing.faqFamilyQ', aKey: 'landing.faqFamilyA' },
  { qKey: 'landing.faqSafetyQ', aKey: 'landing.faqSafetyA' },
] as const;

export const CONTACT_EMAIL = 'jon@wiklunddidriksen.com';

export const PRICING = {
  freeDuringBeta: true,
  pricePerMonth: 0,
} as const;

const DOC_LANGS = ['nb', 'en', 'sv', 'da', 'fi'] as const;
export type DocLang = (typeof DOC_LANGS)[number];

export function normalizeDocLang(lang: string): DocLang {
  return (DOC_LANGS as readonly string[]).includes(lang) ? (lang as DocLang) : 'nb';
}

export const docUrls = {
  privacy: (lang: string) => `/docs/privacy-${normalizeDocLang(lang)}.html`,
  terms: (lang: string) => `/docs/terms-${normalizeDocLang(lang)}.html`,
};

export interface GuideSpace {
  key: string;
  icon: string;
  color: string;
  colorBg: string;
}

export const GUIDE_SPACES: GuideSpace[] = [
  { key: 'Health', icon: '❤️', color: MODULE_COLORS.health, colorBg: MODULE_COLORS.healthBg },
  { key: 'Birthdays', icon: '🎂', color: MODULE_COLORS.birthdays, colorBg: MODULE_COLORS.birthdaysBg },
  { key: 'Pets', icon: '🐾', color: MODULE_COLORS.pets, colorBg: MODULE_COLORS.petsBg },
  { key: 'Home', icon: '🏠', color: MODULE_COLORS.home, colorBg: MODULE_COLORS.homeBg },
  { key: 'School', icon: '🎒', color: MODULE_COLORS.school, colorBg: MODULE_COLORS.schoolBg },
  { key: 'Kindergarten', icon: '🧸', color: MODULE_COLORS.kindergarten, colorBg: MODULE_COLORS.kindergartenBg },
  { key: 'Trips', icon: '✈️', color: MODULE_COLORS.trips, colorBg: MODULE_COLORS.tripsBg },
  { key: 'Meals', icon: '🍽️', color: MODULE_COLORS.mealplan, colorBg: MODULE_COLORS.mealplanBg },
];

export const guideSpaceNameKey = (space: GuideSpace) => `desktop.space${space.key}`;
export const guideSpaceHintKey = (space: GuideSpace) => `desktop.space${space.key}Hint`;
