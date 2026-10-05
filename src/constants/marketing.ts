import { MODULE_COLORS } from './moduleColors';
import type { AppIconName } from '../components/AppIcon';

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

export interface LandingFeature {
  icon: AppIconName;
  color: string;
  tint: string;
  titleKey: string;
  textKey: string;
}

const ACCENT_TINT = 'rgba(59, 90, 117, 0.12)';

export const LANDING_FEATURES: LandingFeature[] = [
  { icon: 'calendar', color: BRAND_COLORS.accent, tint: ACCENT_TINT, titleKey: 'spaces.avtaler', textKey: 'landing.featureEventsText' },
  { icon: 'chat', color: BRAND_COLORS.accent, tint: ACCENT_TINT, titleKey: 'spaces.chat', textKey: 'landing.featureChatText' },
  { icon: 'birthday', color: MODULE_COLORS.birthdays, tint: MODULE_COLORS.birthdaysBg, titleKey: 'spaces.birthdays', textKey: 'landing.featureBirthdaysText' },
  { icon: 'medication', color: MODULE_COLORS.health, tint: MODULE_COLORS.healthBg, titleKey: 'spaces.health', textKey: 'landing.featureHealthText' },
  { icon: 'house', color: MODULE_COLORS.home, tint: MODULE_COLORS.homeBg, titleKey: 'spaces.home', textKey: 'landing.featureHomeText' },
  { icon: 'school', color: MODULE_COLORS.school, tint: MODULE_COLORS.schoolBg, titleKey: 'spaces.school', textKey: 'landing.featureSchoolText' },
  { icon: 'kindergarten', color: MODULE_COLORS.kindergarten, tint: MODULE_COLORS.kindergartenBg, titleKey: 'spaces.kindergarten', textKey: 'landing.featureKindergartenText' },
  { icon: 'pet', color: MODULE_COLORS.pets, tint: MODULE_COLORS.petsBg, titleKey: 'spaces.pets', textKey: 'landing.featurePetsText' },
  { icon: 'compass', color: MODULE_COLORS.trips, tint: MODULE_COLORS.tripsBg, titleKey: 'spaces.trips', textKey: 'landing.featureTripsText' },
  { icon: 'utensils', color: MODULE_COLORS.mealplan, tint: MODULE_COLORS.mealplanBg, titleKey: 'spaces.mealplan', textKey: 'landing.featureMealsText' },
];

export const TRUST_FLAGS = '🇳🇴 🇸🇪 🇩🇰 🇫🇮 🇬🇧';

export interface LandingSample {
  type: 'general' | 'school' | 'birthday';
  color?: string;
  icon: AppIconName;
  weekdayKey: string;
  day: string;
  month: string;
  titleKey: string;
  timeKey?: string;
  addressKey?: string;
  nameKey?: string;
  ageKey?: string;
}

export const LANDING_SAMPLES: LandingSample[] = [
  {
    type: 'general',
    icon: 'utensils',
    weekdayKey: 'days.fri',
    day: '16',
    month: 'OKT',
    titleKey: 'landing.sample1Title',
    timeKey: 'landing.sample1Time',
    addressKey: 'landing.sample1Address',
  },
  {
    type: 'school',
    color: MODULE_COLORS.school,
    icon: 'pencil',
    weekdayKey: 'days.wed',
    day: '21',
    month: 'OKT',
    titleKey: 'landing.sample2Title',
    timeKey: 'landing.sample2Time',
    addressKey: 'landing.sample2Address',
  },
  {
    type: 'birthday',
    color: MODULE_COLORS.birthdays,
    icon: 'fest',
    weekdayKey: 'days.sat',
    day: '24',
    month: 'OKT',
    titleKey: 'landing.sample3Title',
    nameKey: 'landing.sample3Name',
    ageKey: 'landing.sample3Text',
  },
];

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
