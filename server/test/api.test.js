'use strict';

// End-to-end tests of the HTTP API with the real Express app and real provider
// code, but with a fake `fetch` standing in for Groq and SerpApi.

const test = require('node:test');
const assert = require('node:assert/strict');

const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');
const { createProviders } = require('../src/providers');

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

// Starts the app on a random port and returns helpers.
async function startServer(env, fakeFetch) {
  const config = loadConfig({ GROQ_API_KEY: 'test-groq', SERPAPI_KEY: 'test-serp', ...env });
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return fakeFetch(String(url), options);
  };
  const app = createApp(config, createProviders(config, fetchImpl));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) =>
    fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { base, post, calls, close: () => new Promise((r) => server.close(r)) };
}

const groqObject = {
  name: 'Water Bottle',
  brand: 'Milton',
  model: null,
  category: 'Kitchenware',
  type: 'Insulated bottle',
  color: 'Blue',
  material: 'Stainless steel',
  description: 'A blue insulated steel bottle.',
  features: ['Screw cap', 'Vacuum insulated'],
  confidence: 0.82,
  searchQuery: 'Milton insulated steel water bottle blue',
};

const defaultFake = (url, options) => {
  if (url.includes('groq')) {
    const body = JSON.parse(options.body);
    if (Array.isArray(body.messages[1].content)) {
      return jsonResponse({ choices: [{ message: { content: '```json\n' + JSON.stringify(groqObject) + '\n```' } }] });
    }
    return jsonResponse({ choices: [{ message: { content: ' Hello from Groq ' } }] });
  }
  if (url.includes('serpapi')) {
    return jsonResponse({
      search_metadata: { status: 'Success' },
      shopping_results: [
        { title: 'Milton Thermosteel 1L', extracted_price: 899, source: 'Amazon.in', product_link: 'https://g/1' },
        { title: 'Milton Aqua 750ml', extracted_price: 499, source: 'Flipkart', product_link: 'https://g/2' },
      ],
    });
  }
  throw new Error('unexpected url ' + url);
};

test('GET /api/health reports configured features', async (t) => {
  const srv = await startServer({ SERPAPI_KEY: '' }, defaultFake);
  t.after(srv.close);
  const res = await fetch(srv.base + '/api/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'healthy');
  assert.deepEqual(body.features, { vision: true, chat: true, shopping: false });
  assert.equal(body.models.vision, 'qwen/qwen3.8-27b');
});

test('POST /api/scanner/analyze sends the image to Groq and normalizes the reply', async (t) => {
  const srv = await startServer({}, defaultFake);
  t.after(srv.close);
  const res = await srv.post('/api/scanner/analyze', { imageBase64: TINY_PNG });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.object.name, 'Water Bottle');
  assert.equal(body.object.brand, 'Milton');
  assert.equal(body.object.confidence, 0.82);

  const groqCall = srv.calls[0];
  assert.equal(groqCall.options.headers.Authorization, 'Bearer test-groq');
  const sent = JSON.parse(groqCall.options.body);
  assert.equal(sent.model, 'qwen/qwen3.8-27b');
  assert.equal(sent.messages[1].content[1].image_url.url, TINY_PNG);
});

test('POST /api/scanner/analyze validates input before calling Groq', async (t) => {
  const srv = await startServer({}, defaultFake);
  t.after(srv.close);
  const missing = await srv.post('/api/scanner/analyze', {});
  assert.equal(missing.status, 400);
  const gif = await srv.post('/api/scanner/analyze', { imageBase64: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });
  assert.equal(gif.status, 415);
  assert.equal(srv.calls.length, 0);
});

test('analyze returns 503 when GROQ_API_KEY is missing', async (t) => {
  const srv = await startServer({ GROQ_API_KEY: '' }, defaultFake);
  t.after(srv.close);
  const res = await srv.post('/api/scanner/analyze', { imageBase64: TINY_PNG });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'GROQ_NOT_CONFIGURED');
});

test('Groq auth and rate-limit errors are mapped to friendly messages', async (t) => {
  let status = 401;
  const srv = await startServer({}, () => jsonResponse({ error: { message: 'bad key' } }, status));
  t.after(srv.close);

  const auth = await srv.post('/api/scanner/analyze', { imageBase64: TINY_PNG });
  assert.equal(auth.status, 502);
  assert.equal((await auth.json()).code, 'UPSTREAM_AUTH');

  status = 429;
  const limited = await srv.post('/api/scanner/analyze', { imageBase64: TINY_PNG });
  assert.equal(limited.status, 429);
});

test('invalid JSON from the model becomes a 502', async (t) => {
  const srv = await startServer({}, () => jsonResponse({ choices: [{ message: { content: 'I think it is a cup.' } }] }));
  t.after(srv.close);
  const res = await srv.post('/api/scanner/analyze', { imageBase64: TINY_PNG });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).code, 'INVALID_MODEL_JSON');
});

test('POST /api/scanner/search returns products and a price range', async (t) => {
  const srv = await startServer({}, defaultFake);
  t.after(srv.close);
  const res = await srv.post('/api/scanner/search', { query: '  Milton bottle ' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.query, 'Milton bottle');
  assert.equal(body.products.length, 2);
  assert.deepEqual(body.priceRange, { min: 499, max: 899, median: 699, currency: 'INR' });

  const url = new URL(srv.calls[0].url);
  assert.equal(url.searchParams.get('engine'), 'google_shopping');
  assert.equal(url.searchParams.get('q'), 'Milton bottle');
  assert.equal(url.searchParams.get('api_key'), 'test-serp');
});

test('search treats SerpApi "no results" as an empty list', async (t) => {
  const srv = await startServer({}, () =>
    jsonResponse({ search_metadata: { status: 'Error' }, error: "Google hasn't returned any results for this query." })
  );
  t.after(srv.close);
  const res = await srv.post('/api/scanner/search', { query: 'zzzz' });
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).products, []);
});

test('search returns 503 without SERPAPI_KEY and 400 without a query', async (t) => {
  const srv = await startServer({ SERPAPI_KEY: '' }, defaultFake);
  t.after(srv.close);
  const noKey = await srv.post('/api/scanner/search', { query: 'bottle' });
  assert.equal(noKey.status, 503);
  assert.equal((await noKey.json()).code, 'SHOPPING_NOT_CONFIGURED');
  const noQuery = await srv.post('/api/scanner/search', { query: '   ' });
  assert.equal(noQuery.status, 400);
});

test('POST /api/chat proxies the conversation through Groq', async (t) => {
  const srv = await startServer({}, defaultFake);
  t.after(srv.close);
  const res = await srv.post('/api/chat', { messages: [{ role: 'user', content: 'Hi' }] });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).reply, 'Hello from Groq');
  const sent = JSON.parse(srv.calls[0].options.body);
  assert.equal(sent.model, 'openai/gpt-oss-20b');
  assert.equal(sent.messages[0].role, 'system');
  assert.deepEqual(sent.messages[1], { role: 'user', content: 'Hi' });
});

test('malformed JSON, oversize bodies and unknown routes are handled', async (t) => {
  const srv = await startServer({ MAX_IMAGE_MB: '1' }, defaultFake);
  t.after(srv.close);

  const bad = await fetch(srv.base + '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
  assert.equal(bad.status, 400);

  const huge = await srv.post('/api/scanner/analyze', { imageBase64: 'A'.repeat(2 * 1024 * 1024) });
  assert.equal(huge.status, 413);

  const missing = await fetch(srv.base + '/nope');
  assert.equal(missing.status, 404);
});
