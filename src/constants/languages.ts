export interface LanguageConfig {
  code: string;
  aiName: string;
  englishName: string;
  flag: string;
  label: string;
  locale: string;
  defaultCurrency: string;
  devicePrefix: string;
}

export const LANGUAGES: LanguageConfig[] = [
  { code: 'nb', aiName: 'norsk', englishName: 'Norwegian', flag: '🇳🇴', label: 'NO', locale: 'nb-NO', defaultCurrency: 'NOK', devicePrefix: 'nb' },
  { code: 'sv', aiName: 'svensk', englishName: 'Swedish', flag: '🇸🇪', label: 'SV', locale: 'sv-SE', defaultCurrency: 'SEK', devicePrefix: 'sv' },
  { code: 'da', aiName: 'dansk', englishName: 'Danish', flag: '🇩🇰', label: 'DA', locale: 'da-DK', defaultCurrency: 'DKK', devicePrefix: 'da' },
  { code: 'en', aiName: 'engelsk', englishName: 'English', flag: '🇬🇧', label: 'EN', locale: 'en-GB', defaultCurrency: 'GBP', devicePrefix: 'en' },
  { code: 'fi', aiName: 'finsk', englishName: 'Finnish', flag: '🇫🇮', label: 'FI', locale: 'fi-FI', defaultCurrency: 'EUR', devicePrefix: 'fi' },
];

export const LANGUAGE_CODES = LANGUAGES.map(l => l.code);

export const getLanguageByCode = (code: string): LanguageConfig | undefined =>
  LANGUAGES.find(l => l.code === code);

export const getLanguageByAiName = (aiName: string): LanguageConfig | undefined =>
  LANGUAGES.find(l => l.aiName === aiName);

export const getLanguageCode = (code: string): string =>
  LANGUAGES.find(l => l.code === code)?.code ?? 'nb';

export const getLocale = (code: string): string =>
  LANGUAGES.find(l => l.code === code)?.locale ?? 'nb-NO';

export const getDefaultCurrency = (code: string): string =>
  LANGUAGES.find(l => l.code === code)?.defaultCurrency ?? 'NOK';

export const getAiNameForCode = (code: string): string =>
  LANGUAGES.find(l => l.code === code)?.aiName ?? 'norsk';

export const getEnglishNameForCode = (code: string): string =>
  LANGUAGES.find(l => l.code === code)?.englishName ?? 'Norwegian';

export const detectLanguage = (browserLang: string): string => {
  const match = LANGUAGES.find(l => browserLang.startsWith(l.devicePrefix));
  return match?.code ?? 'nb';
};
