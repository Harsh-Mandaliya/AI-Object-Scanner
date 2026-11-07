// Client for the AI Object Scanner backend (server/).
// API keys live only on the backend. Never put GROQ_API_KEY or SERPAPI_KEY in the app.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { resolveApiBaseUrl } from './utils';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type ObjectAnalysis = {
  name: string;
  brand: string | null;
  model: string | null;
  category: string;
  type: string;
  color: string | null;
  material: string | null;
  description: string;
  features: string[];
  confidence: number;
  searchQuery: string;
};

export type ProductResult = {
  name: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  productUrl: string | null;
  source: string | null;
  rating: number | null;
  reviews: number | null;
};

export type PriceRange = {
  min: number | null;
  max: number | null;
  median: number | null;
  currency: string;
};

export type ShoppingResult = {
  products: ProductResult[];
  priceRange: PriceRange;
};

export type ScannerResult = ShoppingResult & {
  object: ObjectAnalysis;
  /** Set when identification worked but the price search did not. */
  shoppingError: string | null;
  shoppingDisabled: boolean;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type HealthStatus = {
  status: string;
  version: string;
  features: { vision: boolean; chat: boolean; shopping: boolean };
  models: { vision: string; chat: string };
  currency: string;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 0, code = 'ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// ------------------------------------------------------------
// Base URL
// ------------------------------------------------------------

const API_BASE_URL = resolveApiBaseUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  webHostname: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : null,
});

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

// ------------------------------------------------------------
// Request helper
// ------------------------------------------------------------

async function request<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new ApiError('The server took too long to respond. Please try again.', 0, 'TIMEOUT');
    }
    throw new ApiError(
      `Cannot reach the server at ${API_BASE_URL}. Make sure it is running and your phone is on the same Wi-Fi.`,
      0,
      'NETWORK'
    );
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    data = { message: text };
  }

  if (!response.ok || data?.success === false) {
    throw new ApiError(
      data?.message || `Server error (${response.status})`,
      response.status,
      data?.code || 'ERROR'
    );
  }
  return data as T;
}

// ------------------------------------------------------------
// Endpoints
// ------------------------------------------------------------

export async function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health', { timeoutMs: 5000 });
}

export async function analyzeObject(imageDataUrl: string): Promise<ObjectAnalysis> {
  if (!imageDataUrl) {
    throw new ApiError('No image was provided.', 400, 'IMAGE_REQUIRED');
  }
  const data = await request<{ object: ObjectAnalysis }>('/scanner/analyze', {
    method: 'POST',
    body: { imageBase64: imageDataUrl },
    timeoutMs: 90000,
  });
  if (!data?.object) {
    throw new ApiError('The server did not return object information.', 502, 'EMPTY');
  }
  return data.object;
}

export async function searchProducts(query: string): Promise<ShoppingResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { products: [], priceRange: { min: null, max: null, median: null, currency: 'INR' } };
  }
  const data = await request<ShoppingResult>('/scanner/search', {
    method: 'POST',
    body: { query: trimmed },
  });
  return {
    products: Array.isArray(data.products) ? data.products : [],
    priceRange: data.priceRange ?? { min: null, max: null, median: null, currency: 'INR' },
  };
}

/**
 * Identifies the object, then looks up shopping listings.
 * A failed price search does not throw: the identification is still shown.
 */
export async function scanObject(imageDataUrl: string): Promise<ScannerResult> {
  const object = await analyzeObject(imageDataUrl);

  try {
    const shopping = await searchProducts(object.searchQuery || object.name);
    return { object, ...shopping, shoppingError: null, shoppingDisabled: false };
  } catch (error) {
    const apiError = error instanceof ApiError ? error : null;
    return {
      object,
      products: [],
      priceRange: { min: null, max: null, median: null, currency: 'INR' },
      shoppingError: error instanceof Error ? error.message : 'Product search failed.',
      shoppingDisabled: apiError?.code === 'SHOPPING_NOT_CONFIGURED',
    };
  }
}

export async function sendChat(messages: ChatMessage[]): Promise<string> {
  const data = await request<{ reply: string }>('/chat', {
    method: 'POST',
    body: { messages },
  });
  return data.reply;
}
