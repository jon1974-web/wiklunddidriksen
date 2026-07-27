import { getDefaultCurrency } from './languages';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export interface CountryCurrency {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: Record<string, CountryCurrency> = {
  EUR: { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  NOK: { code: 'NOK', name: 'Norsk krone', flag: '🇳🇴' },
  SEK: { code: 'SEK', name: 'Svensk krone', flag: '🇸🇪' },
  DKK: { code: 'DKK', name: 'Dansk krone', flag: '🇩🇰' },
  GBP: { code: 'GBP', name: 'Britisk pund', flag: '🇬🇧' },
  USD: { code: 'USD', name: 'Amerikansk dollar', flag: '🇺🇸' },
  THB: { code: 'THB', name: 'Thailandsk baht', flag: '🇹🇭' },
  JPY: { code: 'JPY', name: 'Japansk yen', flag: '🇯🇵' },
  CHF: { code: 'CHF', name: 'Sveitsisk franc', flag: '🇨🇭' },
  ISK: { code: 'ISK', name: 'Islandsk krone', flag: '🇮🇸' },
  PLN: { code: 'PLN', name: 'Polsk zloty', flag: '🇵🇱' },
  CZK: { code: 'CZK', name: 'Tsjekkisk koruna', flag: '🇨🇿' },
  HUF: { code: 'HUF', name: 'Ungarsk forint', flag: '🇭🇺' },
  TRY: { code: 'TRY', name: 'Tyrkisk lira', flag: '🇹🇷' },
  BRL: { code: 'BRL', name: 'Brasiliansk real', flag: '🇧🇷' },
  INR: { code: 'INR', name: 'Indisk rupi', flag: '🇮🇳' },
  CNY: { code: 'CNY', name: 'Kinesisk yuan', flag: '🇨🇳' },
  KRW: { code: 'KRW', name: 'Sørkoreansk won', flag: '🇰🇷' },
  IDR: { code: 'IDR', name: 'Indonesisk rupi', flag: '🇮🇩' },
  MXN: { code: 'MXN', name: 'Mexicansk peso', flag: '🇲🇽' },
  SGD: { code: 'SGD', name: 'Singaporsk dollar', flag: '🇸🇬' },
  HKD: { code: 'HKD', name: 'Hongkong-dollar', flag: '🇭🇰' },
  TWD: { code: 'TWD', name: 'Taiwansk dollar', flag: '🇹🇼' },
  MYR: { code: 'MYR', name: 'Malaysisk ringgit', flag: '🇲🇾' },
  PHP: { code: 'PHP', name: 'Filippinsk peso', flag: '🇵🇭' },
  VND: { code: 'VND', name: 'Vietnamesisk dong', flag: '🇻🇳' },
  EGP: { code: 'EGP', name: 'Egyptisk pund', flag: '🇪🇬' },
  ZAR: { code: 'ZAR', name: 'Sørafrikansk rand', flag: '🇿🇦' },
  RUB: { code: 'RUB', name: 'Russisk rubel', flag: '🇷🇺' },
  AED: { code: 'AED', name: 'Emiratisk dirham', flag: '🇦🇪' },
  ILS: { code: 'ILS', name: 'Israelsk shekel', flag: '🇮🇱' },
  SAR: { code: 'SAR', name: 'Saudisk riyal', flag: '🇸🇦' },
  CLP: { code: 'CLP', name: 'Chilensk peso', flag: '🇨🇱' },
  COP: { code: 'COP', name: 'Colombiansk peso', flag: '🇨🇴' },
  PEN: { code: 'PEN', name: 'Peruansk sol', flag: '🇵🇪' },
  ARS: { code: 'ARS', name: 'Argentinsk peso', flag: '🇦🇷' },
  MAD: { code: 'MAD', name: 'Marokkansk dirham', flag: '🇲🇦' },
  KES: { code: 'KES', name: 'Kenyanisk shilling', flag: '🇰🇪' },
  AUD: { code: 'AUD', name: 'Australsk dollar', flag: '🇦🇺' },
  CAD: { code: 'CAD', name: 'Canadisk dollar', flag: '🇨🇦' },
  NZD: { code: 'NZD', name: 'Newzealandsk dollar', flag: '🇳🇿' },
};

export const CURRENCY_INFO: Record<string, CurrencyInfo> = COUNTRIES;

const COUNTRY_NAME_MAP: Record<string, string> = {
  // Eurozone countries
  spania: 'EUR', spain: 'EUR', españa: 'EUR', espanja: 'EUR', spanien: 'EUR', españa: 'EUR',
  kroatia: 'EUR', croatia: 'EUR', kroatien: 'EUR', hrvatska: 'EUR',
  frankrike: 'EUR', france: 'EUR', frankrig: 'EUR', ranska: 'EUR',
  tyskland: 'EUR', germany: 'EUR', deutschland: 'EUR', saksa: 'EUR',
  italia: 'EUR', italy: 'EUR', italien: 'EUR', italia: 'EUR',
  portugal: 'EUR', hellas: 'EUR', greece: 'EUR', nederland: 'EUR', netherlands: 'EUR',
  belgia: 'EUR', belgium: 'EUR', østerrike: 'EUR', austria: 'EUR',
  irland: 'EUR', ireland: 'EUR', finland: 'EUR', estland: 'EUR', latvia: 'EUR', litauen: 'EUR',
  slovakia: 'EUR', slovenia: 'EUR', kypros: 'EUR', luxembourg: 'EUR', malta: 'EUR',
  // Nordic
  norge: 'NOK', norway: 'NOK', norwegen: 'NOK', norja: 'NOK',
  sverige: 'SEK', sweden: 'SEK', sverige: 'SEK', ruotsi: 'SEK',
  danmark: 'DKK', denmark: 'DKK', danmark: 'DKK', tanska: 'DKK',
  island: 'ISK', iceland: 'ISK', island: 'ISK',
  // UK
  storbritannia: 'GBP', 'storbritannien': 'GBP', 'united kingdom': 'GBP', 'england': 'GBP', uk: 'GBP', 'britannia': 'GBP',
  // Switzerland
  sveits: 'CHF', switzerland: 'CHF', schweiz: 'CHF', sveitsi: 'CHF',
  // USA/Canada/Australia
  usa: 'USD', 'usa': 'USD', 'forente stater': 'USD', 'amerikas forente stater': 'USD',
  canada: 'CAD', australia: 'CAD', australia: 'AUD', 'new zealand': 'NZD',
  // Asia
  thailand: 'THB', 'thailand': 'THB', thaailand: 'THB',
  japan: 'JPY', 'japan': 'JPY', japani: 'JPY',
  kina: 'CNY', china: 'CNY', 'kina': 'CNY', kiina: 'CNY',
  'sør-korea': 'KRW', 'south korea': 'KRW', korea: 'KRW',
  india: 'INR', 'india': 'INR', intia: 'INR',
  indonesia: 'IDR', filippinene: 'PHP', philippines: 'PHP',
  vietnam: 'VND', malaysia: 'MYR', singapore: 'SGD',
  'hong kong': 'HKD', taiwan: 'TWD',
  // Middle East
  tyrkia: 'TRY', turkey: 'TRY', tyrkiet: 'TRY', turkki: 'TRY',
  'forente arabiske emirater': 'AED', uae: 'AED', 'emiratene': 'AED',
  israel: 'ILS', 'saudi-arabia': 'SAR', 'saudi arabia': 'SAR',
  egypt: 'EGP', egypten: 'EGP',
  // Africa
  'sør-afrika': 'ZAR', 'south africa': 'ZAR', 'sør-afrika': 'ZAR',
  marokko: 'MAD', morocco: 'MAD', marocko: 'MAD',
  kenya: 'KES',
  // South America
  brasil: 'BRL', brazil: 'BRL', brasilien: 'BRL',
  mexico: 'MXN', mexico: 'MXN',
  argentina: 'ARS', chile: 'CLP', colombia: 'COP', peru: 'PEN',
  // Eastern Europe
  polen: 'PLN', poland: 'PLN', polen: 'PLN', puola: 'PLN',
  tsjekkia: 'CZK', 'czech republic': 'CZK', tjekkiet: 'CZK', tsekki: 'CZK',
  ungarn: 'HUF', hungary: 'HUF', ungarn: 'HUF', unkar: 'HUF',
  russland: 'RUB', russia: 'RUB', russland: 'RUB', venäjä: 'RUB',
};

export function getCurrencyForCountry(countryName: string): CountryCurrency | null {
  const normalized = countryName.toLowerCase().trim();
  const currencyCode = COUNTRY_NAME_MAP[normalized];
  if (currencyCode && COUNTRIES[currencyCode]) {
    return COUNTRIES[currencyCode];
  }
  return null;
}

export function getCurrencyForLanguage(lang: string): CurrencyInfo {
  const code = getDefaultCurrency(lang);
  return COUNTRIES[code] || COUNTRIES.NOK;
}

export const ALL_CURRENCIES: CurrencyInfo[] = Object.values(COUNTRIES).sort((a, b) => a.code.localeCompare(b.code));
