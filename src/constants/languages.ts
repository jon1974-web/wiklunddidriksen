export interface LanguageConfig {
  code: string;
  aiName: string;
  englishName: string;
  flag: string;
  label: string;
  locale: string;
  defaultCurrency: string;
  devicePrefix: string;
  countryKey: string;
}

export const LANGUAGES: LanguageConfig[] = [
  { code: 'nb', aiName: 'norsk', englishName: 'Norwegian', flag: '🇳🇴', label: 'NO', locale: 'nb-NO', defaultCurrency: 'NOK', devicePrefix: 'nb', countryKey: 'Norge' },
  { code: 'sv', aiName: 'svensk', englishName: 'Swedish', flag: '🇸🇪', label: 'SV', locale: 'sv-SE', defaultCurrency: 'SEK', devicePrefix: 'sv', countryKey: 'Sverige' },
  { code: 'da', aiName: 'dansk', englishName: 'Danish', flag: '🇩🇰', label: 'DA', locale: 'da-DK', defaultCurrency: 'DKK', devicePrefix: 'da', countryKey: 'Danmark' },
  { code: 'en', aiName: 'engelsk', englishName: 'English', flag: '🇬🇧', label: 'EN', locale: 'en-GB', defaultCurrency: 'GBP', devicePrefix: 'en', countryKey: 'England' },
  { code: 'fi', aiName: 'finsk', englishName: 'Finnish', flag: '🇫🇮', label: 'FI', locale: 'fi-FI', defaultCurrency: 'EUR', devicePrefix: 'fi', countryKey: 'Finland' },
  { code: 'it', aiName: 'italiensk', englishName: 'Italian', flag: '🇮🇹', label: 'IT', locale: 'it-IT', defaultCurrency: 'EUR', devicePrefix: 'it', countryKey: 'Italia' },
  { code: 'es', aiName: 'spansk', englishName: 'Spanish', flag: '🇪🇸', label: 'ES', locale: 'es-ES', defaultCurrency: 'EUR', devicePrefix: 'es', countryKey: 'Spania' },
  { code: 'fr', aiName: 'fransk', englishName: 'French', flag: '🇫🇷', label: 'FR', locale: 'fr-FR', defaultCurrency: 'EUR', devicePrefix: 'fr', countryKey: 'Frankrike' },
  { code: 'de', aiName: 'tysk', englishName: 'German', flag: '🇩🇪', label: 'DE', locale: 'de-DE', defaultCurrency: 'EUR', devicePrefix: 'de', countryKey: 'Tyskland' },
  { code: 'gr', aiName: 'gresk', englishName: 'Greek', flag: '🇬🇷', label: 'GR', locale: 'el-GR', defaultCurrency: 'EUR', devicePrefix: 'el', countryKey: 'Hellas' },
  { code: 'tr', aiName: 'tyrkisk', englishName: 'Turkish', flag: '🇹🇷', label: 'TR', locale: 'tr-TR', defaultCurrency: 'TRY', devicePrefix: 'tr', countryKey: 'Tyrkia' },
  { code: 'in', aiName: 'indisk', englishName: 'Indian', flag: '🇮🇳', label: 'IN', locale: 'hi-IN', defaultCurrency: 'INR', devicePrefix: 'hi', countryKey: 'India' },
  { code: 'ja', aiName: 'japansk', englishName: 'Japanese', flag: '🇯🇵', label: 'JA', locale: 'ja-JP', defaultCurrency: 'JPY', devicePrefix: 'ja', countryKey: 'Japan' },
  { code: 'th', aiName: 'thailandsk', englishName: 'Thai', flag: '🇹🇭', label: 'TH', locale: 'th-TH', defaultCurrency: 'THB', devicePrefix: 'th', countryKey: 'Thailand' },
  { code: 'mx', aiName: 'mexicansk', englishName: 'Mexican', flag: '🇲🇽', label: 'MX', locale: 'es-MX', defaultCurrency: 'MXN', devicePrefix: 'es', countryKey: 'Mexico' },
  { code: 'cn', aiName: 'kinesisk', englishName: 'Chinese', flag: '🇨🇳', label: 'CN', locale: 'zh-CN', defaultCurrency: 'CNY', devicePrefix: 'zh', countryKey: 'Kina' },
  { code: 'kr', aiName: 'koreansk', englishName: 'Korean', flag: '🇰🇷', label: 'KR', locale: 'ko-KR', defaultCurrency: 'KRW', devicePrefix: 'ko', countryKey: 'Korea' },
  { code: 'hr', aiName: 'kroatisk', englishName: 'Croatian', flag: '🇭🇷', label: 'HR', locale: 'hr-HR', defaultCurrency: 'EUR', devicePrefix: 'hr', countryKey: 'Kroatia' },
  { code: 'pt', aiName: 'portugisisk', englishName: 'Portuguese', flag: '🇵🇹', label: 'PT', locale: 'pt-PT', defaultCurrency: 'EUR', devicePrefix: 'pt', countryKey: 'Portugal' },
  { code: 'us', aiName: 'amerikansk', englishName: 'American', flag: '🇺🇸', label: 'US', locale: 'en-US', defaultCurrency: 'USD', devicePrefix: 'en', countryKey: 'USA' },
  { code: 'ar', aiName: 'argentinsk', englishName: 'Argentinian', flag: '🇦🇷', label: 'AR', locale: 'es-AR', defaultCurrency: 'ARS', devicePrefix: 'es', countryKey: 'Argentina' },
  { code: 'br', aiName: 'brasiliansk', englishName: 'Brazilian', flag: '🇧🇷', label: 'BR', locale: 'pt-BR', defaultCurrency: 'BRL', devicePrefix: 'pt', countryKey: 'Brasil' },
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
