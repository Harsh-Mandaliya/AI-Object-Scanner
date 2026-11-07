'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  HttpError,
  cleanString,
  cleanConfidence,
  extractJson,
  normalizeObjectAnalysis,
  normalizeProducts,
  computePriceRange,
  parseImageInput,
  parseChatMessages,
} = require('../src/normalize');

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('cleanString trims and drops placeholder values', () => {
  assert.equal(cleanString('  Sony  '), 'Sony');
  assert.equal(cleanString(''), null);
  assert.equal(cleanString('null'), null);
  assert.equal(cleanString('Unknown'), null);
  assert.equal(cleanString(42), null);
});

test('cleanConfidence clamps and accepts percentages', () => {
  assert.equal(cleanConfidence(0.42), 0.42);
  assert.equal(cleanConfidence(85), 0.85);
  assert.equal(cleanConfidence(-1), 0);
  assert.equal(cleanConfidence(500), 1);
  assert.equal(cleanConfidence('abc'), 0);
});

test('extractJson handles fences and surrounding text', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Sure! {"a": {"b": 2}} hope that helps'), { a: { b: 2 } });
  assert.throws(() => extractJson('not json'), HttpError);
  assert.throws(() => extractJson(''), HttpError);
});

test('normalizeObjectAnalysis fills defaults and builds a search query', () => {
  const result = normalizeObjectAnalysis({
    name: 'Wireless Mouse',
    brand: 'Logitech',
    model: 'null',
    type: 'Computer mouse',
    features: ['USB receiver', 'usb receiver', '', 3],
    confidence: '0.9',
  });
  assert.equal(result.name, 'Wireless Mouse');
  assert.equal(result.brand, 'Logitech');
  assert.equal(result.model, null);
  assert.equal(result.category, 'Unknown');
  assert.deepEqual(result.features, ['USB receiver']);
  assert.equal(result.confidence, 0.9);
  assert.equal(result.searchQuery, 'Logitech Wireless Mouse Computer mouse');
});

test('normalizeObjectAnalysis survives garbage input', () => {
  const result = normalizeObjectAnalysis(null);
  assert.equal(result.name, 'Unknown Object');
  assert.equal(result.searchQuery, 'Unknown Object');
  assert.deepEqual(result.features, []);
});

test('normalizeProducts maps SerpApi fields, drops junk and duplicates', () => {
  const products = normalizeProducts(
    [
      { title: 'Mouse A', extracted_price: 799, thumbnail: 'https://x/a.jpg', product_link: 'https://g/a', source: 'Amazon', rating: 4.4, reviews: '1200' },
      { title: 'Mouse A', extracted_price: 799, product_link: 'https://g/a', source: 'Amazon' },
      { title: '', extracted_price: 10 },
      { title: 'Mouse B', extracted_price: 'n/a', link: 'https://g/b', rating: 9 },
    ],
    { currency: 'USD', limit: 10 }
  );
  assert.equal(products.length, 2);
  assert.deepEqual(products[0], {
    name: 'Mouse A',
    price: 799,
    currency: 'USD',
    imageUrl: 'https://x/a.jpg',
    productUrl: 'https://g/a',
    source: 'Amazon',
    rating: 4.4,
    reviews: 1200,
  });
  assert.equal(products[1].price, null);
  assert.equal(products[1].rating, null);
  assert.equal(products[1].productUrl, 'https://g/b');
});

test('normalizeProducts respects the limit', () => {
  const raw = Array.from({ length: 30 }, (_, i) => ({ title: `P${i}`, link: `https://g/${i}` }));
  assert.equal(normalizeProducts(raw, { limit: 5 }).length, 5);
  assert.deepEqual(normalizeProducts('nope'), []);
});

test('computePriceRange returns min, max and median', () => {
  assert.deepEqual(computePriceRange([{ price: 300 }, { price: 100 }, { price: null }, { price: 200 }], 'INR'), {
    min: 100,
    max: 300,
    median: 200,
    currency: 'INR',
  });
  assert.equal(computePriceRange([{ price: 100 }, { price: 200 }]).median, 150);
  assert.deepEqual(computePriceRange([]), { min: null, max: null, median: null, currency: 'INR' });
});

test('parseImageInput accepts data URLs and bare base64', () => {
  const fromDataUrl = parseImageInput(`data:image/png;base64,${TINY_PNG}`, 1024 * 1024);
  assert.equal(fromDataUrl.mimeType, 'image/png');
  assert.ok(fromDataUrl.dataUrl.startsWith('data:image/png;base64,'));

  const bare = parseImageInput(TINY_PNG, 1024 * 1024);
  assert.equal(bare.mimeType, 'image/jpeg');

  const jpg = parseImageInput(`data:image/jpg;base64,${TINY_PNG}`, 1024 * 1024);
  assert.equal(jpg.mimeType, 'image/jpeg');
});

test('parseImageInput rejects bad input with the right status', () => {
  const statusOf = (fn) => {
    try {
      fn();
    } catch (error) {
      return error.status;
    }
    return null;
  };
  assert.equal(statusOf(() => parseImageInput(undefined, 100)), 400);
  assert.equal(statusOf(() => parseImageInput('data:image/gif;base64,' + TINY_PNG, 1e6)), 415);
  assert.equal(statusOf(() => parseImageInput('this is not base64!!', 1e6)), 400);
  assert.equal(statusOf(() => parseImageInput(TINY_PNG, 10)), 413);
});

test('parseChatMessages keeps valid turns and requires a final user message', () => {
  const messages = parseChatMessages([
    { role: 'system', content: 'ignore me' },
    { role: 'assistant', content: 'Hi' },
    { role: 'user', content: '  What is this?  ' },
  ]);
  assert.deepEqual(messages, [
    { role: 'assistant', content: 'Hi' },
    { role: 'user', content: 'What is this?' },
  ]);
  assert.throws(() => parseChatMessages([]), HttpError);
  assert.throws(() => parseChatMessages([{ role: 'assistant', content: 'Hi' }]), HttpError);

  const many = Array.from({ length: 50 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  many.push({ role: 'user', content: 'last' });
  assert.equal(parseChatMessages(many, { maxMessages: 20 }).length, 20);
});
