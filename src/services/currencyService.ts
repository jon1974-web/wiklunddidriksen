const API_BASE = 'https://api.frankfurter.dev/v1';

interface CacheEntry {
  data: ExchangeRateResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;

export interface ExchangeRateResult {
  from: string;
  to: string;
  rate: number;
  date: string;
  amount?: number;
  result?: number;
}

function getCacheKey(from: string, to: string): string {
  return `${from}|${to}`;
}

function getCached(key: string): ExchangeRateResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: ExchangeRateResult): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

export async function getExchangeRate(from: string, to: string): Promise<ExchangeRateResult> {
  if (from === to) {
    return { from, to, rate: 1, date: new Date().toISOString().slice(0, 10) };
  }

  const cacheKey = getCacheKey(from, to);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `${API_BASE}/latest?from=${from}&to=${to}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Exchange rate fetch failed: ${response.status}`);
  }

  const data = await response.json();
  const rate = data.rates[to];

  if (rate === undefined) {
    throw new Error(`Currency ${to} not found in response`);
  }

  const result: ExchangeRateResult = {
    from,
    to,
    rate,
    date: data.date,
  };

  setCache(cacheKey, result);
  return result;
}

export async function convertAmount(amount: number, from: string, to: string): Promise<ExchangeRateResult> {
  const rateData = await getExchangeRate(from, to);
  return {
    ...rateData,
    amount,
    result: amount * rateData.rate,
  };
}
