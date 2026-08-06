import { WeatherDay } from '../types';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
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

  // Strategy 1: Full query as-is (e.g., "Melbourne, Australia")
  const countryPart = city.includes(',') ? city.split(',').pop()?.trim() : null;
  const cityPart = city.includes(',') ? city.split(',').slice(0, -1).join(',').trim() : city;
  const fullQuery = countryPart ? `${cityPart}, ${countryPart}` : city;
  let coords = await tryGeocode(fullQuery);
  if (coords) { setCache(key, coords); return coords; }

  // Strategy 2: City name alone (e.g., "Melbourne")
  const cityName = cityPart.split(/\s+/)[0];
  coords = await tryGeocode(cityName);
  if (coords) { setCache(key, coords); return coords; }

  // Strategy 3: City + country code (e.g., "Melbourne, AU")
  if (countryPart) {
    const code = countryCodeMap[countryPart] || countryPart.substring(0, 2).toUpperCase();
    coords = await tryGeocode(`${cityName}, ${code}`);
    if (coords) { setCache(key, coords); return coords; }
  }

  // Strategy 4: Full original string as last resort
  coords = await tryGeocode(city);
  if (coords) { setCache(key, coords); return coords; }

  return null;
}

function wmoToEmoji(code: number): string {
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

function wmoToDescription(code: number): string {
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

export { wmoToEmoji, wmoToDescription };

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
  const key = getCacheKey('forecast', latitude, longitude, days);
  const cached = getCached<WeatherDay[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max` +
      `&timezone=auto&forecast_days=${days}`
    );
    const data = await res.json();
    if (!data.daily) return [];

    const days_: WeatherDay[] = data.daily.time.map((date: string, i: number) => ({
      date,
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      weatherCode: data.daily.weather_code[i],
      uvIndex: Math.round(data.daily.uv_index_max[i] ?? 0),
    }));

    const waterTemp = await getWaterTemperature(latitude, longitude);
    if (waterTemp !== null) {
      days_.forEach((d) => { d.waterTemp = waterTemp; });
    }

    setCache(key, days_);
    return days_;
  } catch {
    return [];
  }
}

export async function getWaterTemperature(
  latitude: number,
  longitude: number
): Promise<number | null> {
  const key = getCacheKey('marine', latitude, longitude);
  const cached = getCached<number>(key);
  if (cached !== null) return cached;

  try {
    const res = await fetch(
      `${MARINE_URL}?latitude=${latitude}&longitude=${longitude}&current=sea_surface_temperature`
    );
    const data = await res.json();
    if (data.current && data.current.sea_surface_temperature != null) {
      const temp = Math.round(data.current.sea_surface_temperature);
      setCache(key, temp);
      return temp;
    }
    return null;
  } catch {
    return null;
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

    const waterTemp = await getWaterTemperature(latitude, longitude);
    if (waterTemp !== null) {
      result.forEach((d) => { d.waterTemp = waterTemp; });
    }

    setCache(key, result);
    return result;
  } catch {
    return [];
  }
}
