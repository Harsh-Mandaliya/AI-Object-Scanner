'use strict';

// Calls to the two external services: Groq (vision + chat) and SerpApi (Google Shopping).
// `fetchImpl` is injectable so the tests never hit the network.

const {
  HttpError,
  extractJson,
  normalizeObjectAnalysis,
  normalizeProducts,
  computePriceRange,
} = require('./normalize');

const VISION_PROMPT = `Identify the main physical object in this image.

Return ONLY a JSON object with exactly these keys:
{
  "name": "object name",
  "brand": "brand or null",
  "model": "model or null",
  "category": "broad category, e.g. Electronics, Furniture, Kitchenware",
  "type": "specific type",
  "color": "primary visible color or null",
  "material": "likely material or null",
  "description": "one or two factual sentences",
  "features": ["visible or confidently inferred feature"],
  "confidence": 0.0,
  "searchQuery": "best Google Shopping query for this exact item"
}

Rules:
- Only give a brand or model if it is readable on the object or unmistakable; otherwise null.
- Do not invent specifications or prices.
- Describe the main object, not the background or the hand holding it.
- If an exact match is impossible, name the closest reliable category.
- confidence is a number between 0 and 1 for how sure you are of the identification.`;

const CHAT_SYSTEM_PROMPT =
  'You are the assistant inside the AI Object Scanner app. Give clear, accurate and concise answers. ' +
  'If the user asks about a product, be honest about what you do not know, and never invent prices.';

async function readUpstreamError(response) {
  try {
    const body = await response.json();
    return body?.error?.message || body?.error || body?.message || '';
  } catch {
    return '';
  }
}

function upstreamFailure(service, status, detail) {
  if (status === 401 || status === 403) {
    return new HttpError(502, `${service} rejected the API key. Check server/.env.`, 'UPSTREAM_AUTH');
  }
  if (status === 429) {
    return new HttpError(429, `${service} rate limit reached. Wait a moment and try again.`, 'UPSTREAM_RATE_LIMIT');
  }
  if (status === 413) {
    return new HttpError(413, `${service} says the image is too large.`, 'IMAGE_TOO_LARGE');
  }
  const suffix = detail ? `: ${String(detail).slice(0, 200)}` : '';
  return new HttpError(502, `${service} request failed (${status})${suffix}`, 'UPSTREAM_ERROR');
}

async function request(fetchImpl, url, options, timeoutMs, service) {
  try {
    return await fetchImpl(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new HttpError(504, `${service} did not respond in time.`, 'UPSTREAM_TIMEOUT');
    }
    throw new HttpError(502, `Could not reach ${service}.`, 'UPSTREAM_UNREACHABLE');
  }
}

function createProviders(config, fetchImpl = globalThis.fetch) {
  async function groqCompletion(body) {
    if (!config.groqApiKey) {
      throw new HttpError(503, 'GROQ_API_KEY is not configured on the server.', 'GROQ_NOT_CONFIGURED');
    }
    const response = await request(
      fetchImpl,
      config.groqApiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.groqApiKey}`,
        },
        body: JSON.stringify({ stream: false, ...body }),
      },
      config.upstreamTimeoutMs,
      'Groq'
    );
    if (!response.ok) {
      const detail = await readUpstreamError(response);
      console.error(`Groq error ${response.status}: ${detail}`);
      throw upstreamFailure('Groq', response.status, detail);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new HttpError(502, 'Groq returned an empty response.', 'EMPTY_MODEL_RESPONSE');
    }
    return content;
  }

  async function analyzeImage(imageDataUrl) {
    const content = await groqCompletion({
      model: config.visionModel,
      messages: [
        {
          role: 'system',
          content: 'You are a precise visual object identification API. Always answer with valid JSON only.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_completion_tokens: 1200,
    });
    return normalizeObjectAnalysis(extractJson(content));
  }

  async function chat(messages) {
    const content = await groqCompletion({
      model: config.chatModel,
      messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_completion_tokens: 1024,
    });
    return content.trim();
  }

  async function searchShopping(query) {
    if (!config.serpApiKey) {
      throw new HttpError(503, 'SERPAPI_KEY is not configured, so shopping search is disabled.', 'SHOPPING_NOT_CONFIGURED');
    }
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: config.serpApiKey,
      location: config.shoppingLocation,
      google_domain: config.shoppingDomain,
      gl: config.shoppingCountry,
      hl: config.shoppingLanguage,
    });
    const response = await request(
      fetchImpl,
      `${config.serpApiUrl}?${params.toString()}`,
      { method: 'GET' },
      config.upstreamTimeoutMs,
      'SerpApi'
    );
    if (!response.ok) {
      const detail = await readUpstreamError(response);
      console.error(`SerpApi error ${response.status}: ${detail}`);
      throw upstreamFailure('SerpApi', response.status, detail);
    }
    const data = await response.json();
    if (data?.search_metadata?.status === 'Error' || (data?.error && !data?.shopping_results)) {
      const message = String(data?.error || '');
      // SerpApi reports "no results" as an error; treat it as an empty list.
      if (/hasn't returned any results/i.test(message)) {
        return { products: [], priceRange: computePriceRange([], config.currency) };
      }
      throw new HttpError(502, message || 'Google Shopping search failed.', 'UPSTREAM_ERROR');
    }
    const products = normalizeProducts(data?.shopping_results, {
      currency: config.currency,
      limit: config.maxProducts,
    });
    return { products, priceRange: computePriceRange(products, config.currency) };
  }

  return { analyzeImage, chat, searchShopping };
}

module.exports = { createProviders, VISION_PROMPT };
