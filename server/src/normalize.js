'use strict';

// Pure helpers that turn untrusted model / provider output into a stable shape.

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /^(null|unknown|n\/a|none)$/i.test(trimmed)) return null;
  return trimmed;
}

function cleanStringArray(value, limit = 12) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const text = cleanString(item);
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      result.push(text);
    }
    if (result.length >= limit) break;
  }
  return result;
}

function cleanConfidence(value) {
  let number = Number(value);
  if (!Number.isFinite(number)) return 0;
  // Some models answer 85 instead of 0.85.
  if (number > 1 && number <= 100) number /= 100;
  return Math.max(0, Math.min(1, number));
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Models sometimes wrap JSON in ``` fences or add text around it.
function extractJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new HttpError(502, 'The vision model returned an empty response.', 'EMPTY_MODEL_RESPONSE');
  }
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new HttpError(502, 'The vision model returned invalid JSON.', 'INVALID_MODEL_JSON');
  }
}

function normalizeObjectAnalysis(raw) {
  const object = raw && typeof raw === 'object' ? raw : {};
  const name = cleanString(object.name) || 'Unknown Object';
  const brand = cleanString(object.brand);
  const model = cleanString(object.model);
  const type = cleanString(object.type);
  const color = cleanString(object.color);

  let searchQuery = cleanString(object.searchQuery);
  if (!searchQuery) {
    searchQuery = [brand, model, name !== 'Unknown Object' ? name : null, type]
      .filter(Boolean)
      .join(' ') || name;
  }

  return {
    name,
    brand,
    model,
    category: cleanString(object.category) || 'Unknown',
    type: type || 'Unknown',
    color,
    material: cleanString(object.material),
    description: cleanString(object.description) || 'No description available.',
    features: cleanStringArray(object.features),
    confidence: cleanConfidence(object.confidence),
    searchQuery,
  };
}

function normalizeProduct(product, currency = 'INR') {
  const price = toNumberOrNull(product?.extracted_price);
  const rating = toNumberOrNull(product?.rating);
  const reviews = toNumberOrNull(product?.reviews);
  return {
    name: cleanString(product?.title) || 'Unknown Product',
    price: price !== null && price > 0 ? price : null,
    currency,
    imageUrl: cleanString(product?.thumbnail),
    productUrl: cleanString(product?.product_link || product?.link),
    source: cleanString(product?.source),
    rating: rating !== null && rating >= 0 && rating <= 5 ? rating : null,
    reviews: reviews !== null && reviews >= 0 ? Math.round(reviews) : null,
  };
}

function normalizeProducts(rawProducts, { currency = 'INR', limit = 10 } = {}) {
  if (!Array.isArray(rawProducts)) return [];
  const seen = new Set();
  const products = [];
  for (const raw of rawProducts) {
    const product = normalizeProduct(raw, currency);
    if (product.name === 'Unknown Product') continue;
    const key = (product.productUrl || `${product.name}|${product.source}|${product.price}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    products.push(product);
    if (products.length >= limit) break;
  }
  return products;
}

function computePriceRange(products, currency = 'INR') {
  const prices = (products || [])
    .map((product) => product?.price)
    .filter((price) => typeof price === 'number' && Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return { min: null, max: null, median: null, currency };
  }
  const middle = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
  return { min: prices[0], max: prices[prices.length - 1], median, currency };
}

// Accepts "data:image/png;base64,AAAA" or bare base64 (assumed JPEG).
function parseImageInput(input, maxBytes) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new HttpError(400, 'imageBase64 is required.', 'IMAGE_REQUIRED');
  }

  let mimeType = 'image/jpeg';
  let data = input.trim();
  const match = /^data:([^;,]+);base64,/i.exec(data);
  if (match) {
    mimeType = match[1].toLowerCase();
    data = data.slice(match[0].length);
  } else if (data.startsWith('data:')) {
    throw new HttpError(400, 'Image must be base64 encoded.', 'IMAGE_INVALID');
  }

  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new HttpError(415, `Unsupported image type: ${mimeType}. Use JPEG, PNG or WebP.`, 'IMAGE_TYPE');
  }

  data = data.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(data) || data.length < 16) {
    throw new HttpError(400, 'Image data is not valid base64.', 'IMAGE_INVALID');
  }

  const bytes = Math.floor((data.length * 3) / 4);
  if (maxBytes && bytes > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0);
    throw new HttpError(413, `Image is too large. Maximum size is ${mb} MB.`, 'IMAGE_TOO_LARGE');
  }

  return { mimeType, bytes, dataUrl: `data:${mimeType};base64,${data}` };
}

const CHAT_ROLES = new Set(['user', 'assistant']);

function parseChatMessages(messages, { maxMessages = 20, maxChars = 4000 } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpError(400, 'messages must be a non-empty array.', 'MESSAGES_REQUIRED');
  }
  const cleaned = messages
    .filter((m) => m && CHAT_ROLES.has(m.role) && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, maxChars) }))
    .slice(-maxMessages);

  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== 'user') {
    throw new HttpError(400, 'The last message must be from the user.', 'MESSAGES_INVALID');
  }
  return cleaned;
}

module.exports = {
  HttpError,
  cleanString,
  cleanStringArray,
  cleanConfidence,
  extractJson,
  normalizeObjectAnalysis,
  normalizeProduct,
  normalizeProducts,
  computePriceRange,
  parseImageInput,
  parseChatMessages,
};
