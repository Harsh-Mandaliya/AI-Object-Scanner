// Pure helpers with no React Native imports, so they can be unit-tested with plain Node.

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
};

const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
};

export function formatPrice(price: number | null | undefined, currency = 'INR'): string {
  if (price === null || price === undefined || !Number.isFinite(price)) {
    return 'Price unavailable';
  }
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const locale = CURRENCY_LOCALES[currency] ?? 'en-US';
  const rounded = Math.round(price * 100) / 100;
  return `${symbol}${rounded.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
}

export function formatPriceRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = 'INR'
): string {
  const hasMin = typeof min === 'number' && Number.isFinite(min);
  const hasMax = typeof max === 'number' && Number.isFinite(max);
  if (hasMin && hasMax) {
    return min === max ? formatPrice(min, currency) : `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`;
  }
  if (hasMin) return `From ${formatPrice(min, currency)}`;
  if (hasMax) return `Up to ${formatPrice(max, currency)}`;
  return 'Price unavailable';
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function confidenceInfo(value: unknown): { percent: number; level: ConfidenceLevel; label: string } {
  const number = Number(value);
  const clamped = Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
  const percent = Math.round(clamped * 100);
  if (percent >= 75) return { percent, level: 'high', label: 'High confidence' };
  if (percent >= 45) return { percent, level: 'medium', label: 'Medium confidence' };
  return { percent, level: 'low', label: 'Low confidence' };
}

// Turns whatever the camera / picker gives us into a data URL the backend accepts.
export function toImageDataUrl(base64: string | null | undefined, mimeType = 'image/jpeg'): string | null {
  if (!base64) return null;
  const trimmed = base64.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  return `data:${mimeType || 'image/jpeg'};base64,${trimmed}`;
}

// Approximate decoded size of a base64 data URL in bytes.
export function dataUrlSizeBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const data = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((data.length * 3) / 4) - padding);
}

/**
 * Works out where the backend lives.
 * 1. EXPO_PUBLIC_API_URL if set (trailing slash removed).
 * 2. Otherwise the machine running the Expo dev server (hostUri "192.168.1.5:8081"),
 *    or the browser's hostname on web, on the backend port.
 * 3. Falls back to localhost.
 */
export function resolveApiBaseUrl(options: {
  envUrl?: string | null;
  hostUri?: string | null;
  webHostname?: string | null;
  port?: number;
}): string {
  const port = options.port ?? 4000;
  const envUrl = options.envUrl?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');

  const fromHostUri = options.hostUri?.trim().replace(/^[a-z]+:\/\//i, '').split('/')[0];
  let host = fromHostUri ? fromHostUri.replace(/:\d+$/, '') : '';
  if (!host && options.webHostname) host = options.webHostname;
  if (!host) host = 'localhost';
  if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
  return `http://${host}:${port}/api`;
}

export function googleShoppingUrl(query: string): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query.trim())}`;
}
