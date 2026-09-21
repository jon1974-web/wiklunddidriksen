import { WeatherDay } from '../types';
import { GOOGLE_MAPS_API_KEY } from '../constants/api';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const GOOGLE_WEATHER_URL = 'https://weather.googleapis.com/v1/forecast/days:lookup';
const HISTORICAL_URL = 'https://archive-api.open-meteo.com/v1/archive';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(...parts: (string | number)[]): string {
  return parts.join('|');
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

export async function geocodeCity(city: string): Promise<{ latitude: number; longitude: number } | null> {
  const key = getCacheKey('geo', city);
  const cached = getCached<{ latitude: number; longitude: number }>(key);
  if (cached) return cached;

  const countryCodeMap: Record<string, string> = {
    'Norway': 'NO', 'Sverige': 'SE', 'Sweden': 'SE', 'Danmark': 'DK', 'Denmark': 'DK',
    'Finland': 'FI', 'Suomi': 'FI', 'Australia': 'AU', 'USA': 'US', 'United States': 'US',
    'Storbritannia': 'GB', 'United Kingdom': 'GB', 'Tyskland': 'DE', 'Germany': 'DE',
    'Frankrike': 'FR', 'France': 'FR', 'Spania': 'ES', 'Spain': 'ES', 'Italia': 'IT', 'Italy': 'IT',
    'Hellas': 'GR', 'Greece': 'GR', 'Kroatia': 'HR', 'Croatia': 'HR', 'Thailand': 'TH',
    'Japan': 'JP', 'Kina': 'CN', 'China': 'CN', 'Brasil': 'BR', 'Brazil': 'BR',
    'India': 'IN', 'Mexico': 'MX', 'Canada': 'CA', 'New Zealand': 'NZ', 'Sør-Afrika': 'ZA',
    'South Africa': 'ZA', 'Singapore': 'SG', 'Sør-Korea': 'KR', 'South Korea': 'KR',
  };

  const tryGeocode = async (query: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const res = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=1&language=no`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return { latitude: result.latitude, longitude: result.longitude };
      }
    } catch {}
    return null;
  };

  const countryPart = city.includes(',') ? city.split(',').pop()?.trim() : null;
  const cityPart = city.includes(',') ? city.split(',').slice(0, -1).join(',').trim() : city;
  const fullQuery = countryPart ? `${cityPart}, ${countryPart}` : city;
  let coords = await tryGeocode(fullQuery);
  if (coords) { setCache(key, coords); return coords; }

  const cityName = cityPart.split(/\s+/)[0];
  coords = await tryGeocode(cityName);
  if (coords) { setCache(key, coords); return coords; }

  if (countryPart) {
    const code = countryCodeMap[countryPart] || countryPart.substring(0, 2).toUpperCase();
    coords = await tryGeocode(`${cityName}, ${code}`);
    if (coords) { setCache(key, coords); return coords; }
  }

  coords = await tryGeocode(city);
  if (coords) { setCache(key, coords); return coords; }

  return null;
}

function googleTypeToCode(type: string): number {
  const map: Record<string, number> = {
    CLEAR: 0, MOSTLY_CLEAR: 1, PARTLY_CLOUDY: 2, MOSTLY_CLOUDY: 3, OVERCAST: 4,
    FOG: 45, FOG_LIGHT: 45,
    DRIZZLE_LIGHT: 51, DRIZZLE: 53, DRIZZLE_HEAVY: 55,
    LIGHT_RAIN: 61, RAIN: 63, HEAVY_RAIN: 65,
    LIGHT_RAIN_SHOWERS: 80, RAIN_SHOWERS: 81, HEAVY_RAIN_SHOWERS: 82,
    LIGHT_SNOW: 71, SNOW: 73, HEAVY_SNOW: 75,
    LIGHT_SNOW_SHOWERS: 85, SNOW_SHOWERS: 86,
    THUNDERSTORM: 95, THUNDERSTORM_WITH_HAIL: 96,
  };
  return map[type] ?? 0;
}

export function wmoToEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return code === 1 ? '🌤️' : code === 2 ? '⛅' : '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 53) return '🌦️';
  if (code <= 65) return '🌧️';
  if (code <= 67) return '🧊';
  if (code <= 73) return '🌨️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '❄️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}

export function wmoToDescription(code: number): string {
  if (code === 0) return 'Sol';
  if (code === 1) return 'Nesten klar';
  if (code === 2) return 'Delvis skyet';
  if (code === 3) return 'Skyet';
  if (code <= 48) return 'Tåke';
  if (code <= 55) return 'Dugg';
  if (code <= 65) return 'Regn';
  if (code <= 67) return 'Sludd';
  if (code <= 75) return 'Snø';
  if (code <= 77) return 'Snø';
  if (code <= 82) return 'Regnbyger';
  if (code <= 86) return 'Snøbyger';
  if (code <= 99) return 'Tordenvær';
  return 'Ukjent';
}

export function tempColor(temp: number): string {
  if (temp >= 25) return '#E53935';
  if (temp >= 15) return '#FB8C00';
  if (temp >= 10) return '#43A047';
  if (temp >= 0) return '#1E88E5';
  return '#5C6BC0';
}

export async function getForecast(
  latitude: number,
  longitude: number,
  days: number = 10
): Promise<WeatherDay[]> {
  const key = getCacheKey('forecast_g', latitude, longitude, days);
  const cached = getCached<WeatherDay[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${GOOGLE_WEATHER_URL}?key=${GOOGLE_MAPS_API_KEY}` +
      `&location.latitude=${latitude}&location.longitude=${longitude}` +
      `&days=${days}&languageCode=no`
    );
    const data = await res.json();
    if (!data.forecastDays) return [];

    const result: WeatherDay[] = data.forecastDays.map((day: any) => ({
      date: `${day.displayDate.year}-${String(day.displayDate.month).padStart(2, '0')}-${String(day.displayDate.day).padStart(2, '0')}`,
      tempMin: Math.round(day.minTemperature?.degrees ?? 0),
      tempMax: Math.round(day.maxTemperature?.degrees ?? 0),
      weatherCode: googleTypeToCode(day.daytimeForecast?.weatherCondition?.type ?? ''),
      uvIndex: day.daytimeForecast?.uvIndex ?? 0,
      humidity: day.daytimeForecast?.relativeHumidity ?? null,
      windSpeed: day.daytimeForecast?.wind?.speed?.value ?? null,
      precipitationProbability: day.daytimeForecast?.precipitation?.probability?.percent ?? null,
    }));

    setCache(key, result);
    return result;
  } catch {
    return [];
  }
}

export async function getHistoricalWeather(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<WeatherDay[]> {
  const key = getCacheKey('hist', latitude, longitude, startDate, endDate);
  const cached = getCached<WeatherDay[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${HISTORICAL_URL}?latitude=${latitude}&longitude=${longitude}` +
      `&start_date=${startDate}&end_date=${endDate}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto`
    );
    const data = await res.json();
    if (!data.daily) return [];

    const result: WeatherDay[] = data.daily.time.map((date: string, i: number) => ({
      date,
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      weatherCode: data.daily.weather_code[i],
      uvIndex: 0,
    }));

    setCache(key, result);
    return result;
  } catch {
    return [];
  }
}
