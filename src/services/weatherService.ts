import { WeatherDay } from '../types';
import { GOOGLE_MAPS_API_KEY } from '../constants/api';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_WEATHER_URL = 'https://weather.googleapis.com/v1/forecast/days:lookup';
const GOOGLE_HOURLY_URL = 'https://weather.googleapis.com/v1/forecast/hours:lookup';
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

  const tryGeocode = async (query: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const res = await fetch(`${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        return { latitude: loc.lat, longitude: loc.lng };
      }
    } catch {}
    return null;
  };

  // Try full query first (e.g., "Vaset, Norway")
  let coords = await tryGeocode(city);
  if (coords) { setCache(key, coords); return coords; }

  // Try just the city name
  const cityName = city.includes(',') ? city.split(',')[0].trim() : city;
  coords = await tryGeocode(cityName);
  if (coords) { setCache(key, coords); return coords; }

  return null;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const key = getCacheKey('revgeo', lat, lon);
  const cached = getCached<string>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${GOOGLE_GEOCODE_URL}?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const components = data.results[0].address_components;
      const sublocality = components.find((c: any) => c.types.includes('sublocality'));
      const locality = components.find((c: any) => c.types.includes('locality'));
      const name = sublocality?.long_name || locality?.long_name || null;
      if (name) { setCache(key, name); }
      return name;
    }
    return null;
  } catch {
    return null;
  }
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
      `&days=${days}&pageSize=${days}&languageCode=no`
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
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max` +
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
      precipitationProbability: data.daily.precipitation_sum[i] > 0 ? Math.min(Math.round(data.daily.precipitation_sum[i] * 20), 100) : 0,
      windSpeed: Math.round(data.daily.windspeed_10m_max[i] || 0),
    }));

    setCache(key, result);
    return result;
  } catch {
    return [];
  }
}

export interface WeatherHour {
  period: string;
  emoji: string;
  hour: number;
  temp: number;
  weatherCode: number;
  rainPercent: number;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
}

const TIME_PERIODS = [
  { period: 'morning', emoji: '🌅', startHour: 6, endHour: 10, representativeHour: 8 },
  { period: 'lunch', emoji: '🍽️', startHour: 10, endHour: 14, representativeHour: 12 },
  { period: 'afternoon', emoji: '☀️', startHour: 14, endHour: 18, representativeHour: 16 },
  { period: 'evening', emoji: '🌙', startHour: 18, endHour: 22, representativeHour: 20 },
  { period: 'night', emoji: '🌑', startHour: 22, endHour: 6, representativeHour: 0 },
];

export async function getHourlyForDay(
  latitude: number,
  longitude: number,
  date: string
): Promise<WeatherHour[]> {
  const key = getCacheKey('hourly', latitude, longitude, date);
  const cached = getCached<WeatherHour[]>(key);
  if (cached) return cached;

  try {
    // Request up to 120 hours (5 days) to cover dates further out
    let allHours: any[] = [];
    let pageToken: string | undefined;

    // First page
    const url1 = `${GOOGLE_HOURLY_URL}?key=${GOOGLE_MAPS_API_KEY}` +
      `&location.latitude=${latitude}&location.longitude=${longitude}` +
      `&hours=120&pageSize=48&languageCode=no`;
    const res1 = await fetch(url1);
    const data1 = await res1.json();
    if (data1.forecastHours) allHours.push(...data1.forecastHours);
    pageToken = data1.nextPageToken;

    // Fetch additional pages if needed and we haven't covered the target date
    const targetDate = new Date(date);
    const lastHour = allHours.length > 0 ? allHours[allHours.length - 1] : null;
    const lastDateStr = lastHour ? `${lastHour.displayDateTime.year}-${String(lastHour.displayDateTime.month).padStart(2, '0')}-${String(lastHour.displayDateTime.day).padStart(2, '0')}` : '';

    if (pageToken && lastDateStr < date) {
      const url2 = `${GOOGLE_HOURLY_URL}?key=${GOOGLE_MAPS_API_KEY}` +
        `&location.latitude=${latitude}&location.longitude=${longitude}` +
        `&hours=120&pageSize=48&languageCode=no&pageToken=${pageToken}`;
      const res2 = await fetch(url2);
      const data2 = await res2.json();
      if (data2.forecastHours) allHours.push(...data2.forecastHours);
    }

    if (allHours.length === 0) return [];

    const dayHours = allHours.filter((h: any) => {
      const d = h.displayDateTime;
      return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` === date;
    });

    // If no hours found for this date (too far out), return empty
    if (dayHours.length === 0) return [];

    const result: WeatherHour[] = TIME_PERIODS.map((tp) => {
      let bestHour = dayHours[0];
      let bestDiff = 999;
      for (const h of dayHours) {
        const diff = Math.abs(h.displayDateTime.hours - tp.representativeHour);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestHour = h;
        }
      }

      if (!bestHour) {
        return {
          period: tp.period,
          emoji: tp.emoji,
          hour: tp.representativeHour,
          temp: 0,
          weatherCode: 0,
          rainPercent: 0,
          windSpeed: 0,
          humidity: 0,
          uvIndex: 0,
        };
      }

      return {
        period: tp.period,
        emoji: tp.emoji,
        hour: bestHour.displayDateTime.hours,
        temp: Math.round(bestHour.temperature?.degrees ?? 0),
        weatherCode: googleTypeToCode(bestHour.weatherCondition?.type ?? ''),
        rainPercent: bestHour.precipitation?.probability?.percent ?? 0,
        windSpeed: bestHour.wind?.speed?.value ?? 0,
        humidity: bestHour.relativeHumidity ?? 0,
        uvIndex: bestHour.uvIndex ?? 0,
      };
    });

    setCache(key, result);
    return result;
  } catch {
    return [];
  }
}
