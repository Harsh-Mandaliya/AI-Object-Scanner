'use strict';

// Reads all runtime configuration from environment variables.
// Kept as a function so tests can build a config without touching process.env.

function toInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function loadConfig(env = process.env) {
  return {
    port: toInt(env.PORT, 4000),
    host: env.HOST || '0.0.0.0',

    groqApiKey: env.GROQ_API_KEY || '',
    groqApiUrl: env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
    visionModel: env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b',
    chatModel: env.GROQ_CHAT_MODEL || 'openai/gpt-oss-20b',

    serpApiKey: env.SERPAPI_KEY || '',
    serpApiUrl: env.SERPAPI_URL || 'https://serpapi.com/search',
    shoppingLocation: env.SHOPPING_LOCATION || 'Ahmedabad, Gujarat, India',
    shoppingDomain: env.SHOPPING_GOOGLE_DOMAIN || 'google.co.in',
    shoppingCountry: env.SHOPPING_COUNTRY || 'in',
    shoppingLanguage: env.SHOPPING_LANGUAGE || 'en',
    currency: env.SHOPPING_CURRENCY || 'INR',
    maxProducts: toInt(env.MAX_PRODUCTS, 10),

    // Decoded image size limit. Groq accepts up to 20 MB per request,
    // phone photos at quality 0.6 are usually well under 2 MB.
    maxImageBytes: toInt(env.MAX_IMAGE_MB, 8) * 1024 * 1024,
    upstreamTimeoutMs: toInt(env.UPSTREAM_TIMEOUT_MS, 45000),
    corsOrigin: env.CORS_ORIGIN || '*',
  };
}

module.exports = { loadConfig };
