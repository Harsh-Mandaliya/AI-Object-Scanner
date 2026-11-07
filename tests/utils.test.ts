// Run with: npm test   (Node 22.18+/24 strips the TypeScript types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  confidenceInfo,
  dataUrlSizeBytes,
  formatPrice,
  formatPriceRange,
  googleShoppingUrl,
  resolveApiBaseUrl,
  toImageDataUrl,
} from '../src/services/utils.ts';

test('formatPrice uses the currency symbol and Indian grouping for INR', () => {
  assert.equal(formatPrice(129999), '₹1,29,999');
  assert.equal(formatPrice(19.5, 'USD'), '$19.5');
  assert.equal(formatPrice(10, 'CHF'), 'CHF 10');
  assert.equal(formatPrice(null), 'Price unavailable');
  assert.equal(formatPrice(Number.NaN), 'Price unavailable');
});

test('formatPriceRange covers every combination', () => {
  assert.equal(formatPriceRange(100, 500), '₹100 – ₹500');
  assert.equal(formatPriceRange(250, 250), '₹250');
  assert.equal(formatPriceRange(100, null), 'From ₹100');
  assert.equal(formatPriceRange(null, 900), 'Up to ₹900');
  assert.equal(formatPriceRange(null, null), 'Price unavailable');
});

test('confidenceInfo buckets and clamps values', () => {
  assert.deepEqual(confidenceInfo(0.9), { percent: 90, level: 'high', label: 'High confidence' });
  assert.equal(confidenceInfo(0.5).level, 'medium');
  assert.equal(confidenceInfo(0.1).level, 'low');
  assert.equal(confidenceInfo(7).percent, 100);
  assert.equal(confidenceInfo('x').percent, 0);
});

test('toImageDataUrl prefixes raw base64 and keeps data URLs', () => {
  assert.equal(toImageDataUrl('AAAA'), 'data:image/jpeg;base64,AAAA');
  assert.equal(toImageDataUrl('AAAA', 'image/png'), 'data:image/png;base64,AAAA');
  assert.equal(toImageDataUrl('data:image/webp;base64,BBBB'), 'data:image/webp;base64,BBBB');
  assert.equal(toImageDataUrl(''), null);
  assert.equal(toImageDataUrl(undefined), null);
});

test('dataUrlSizeBytes estimates decoded size', () => {
  assert.equal(dataUrlSizeBytes('data:image/png;base64,AAAA'), 3);
  assert.equal(dataUrlSizeBytes('AAA='), 2);
});

test('resolveApiBaseUrl prefers the env var, then the dev server host', () => {
  assert.equal(resolveApiBaseUrl({ envUrl: 'http://10.0.0.2:4000/api/' }), 'http://10.0.0.2:4000/api');
  assert.equal(resolveApiBaseUrl({ hostUri: '192.168.1.20:8081' }), 'http://192.168.1.20:4000/api');
  assert.equal(resolveApiBaseUrl({ hostUri: 'exp://192.168.1.20:8081/--/' }), 'http://192.168.1.20:4000/api');
  assert.equal(resolveApiBaseUrl({ webHostname: 'localhost', port: 5000 }), 'http://localhost:5000/api');
  assert.equal(resolveApiBaseUrl({}), 'http://localhost:4000/api');
  assert.equal(resolveApiBaseUrl({ envUrl: '   ', hostUri: '10.1.1.1:8081' }), 'http://10.1.1.1:4000/api');
});

test('googleShoppingUrl encodes the query', () => {
  assert.equal(googleShoppingUrl(' red mug & saucer '), 'https://www.google.com/search?tbm=shop&q=red%20mug%20%26%20saucer');
});
