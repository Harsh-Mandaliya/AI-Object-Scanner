'use strict';

const express = require('express');
const cors = require('cors');

const { HttpError, parseImageInput, parseChatMessages } = require('./normalize');
const { createProviders } = require('./providers');

const VERSION = '2.0.0';

// Builds the Express app. `providers` can be swapped for fakes in tests.
function createApp(config, providers = createProviders(config)) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin }));

  // Base64 adds ~33% on top of the image size, plus a little JSON overhead.
  const bodyLimit = Math.ceil((config.maxImageBytes * 4) / 3) + 64 * 1024;
  app.use(express.json({ limit: bodyLimit }));

  const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'AI Object Scanner API is running',
      version: VERSION,
      endpoints: {
        health: 'GET /api/health',
        analyze: 'POST /api/scanner/analyze',
        search: 'POST /api/scanner/search',
        chat: 'POST /api/chat',
      },
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      service: 'AI Object Scanner',
      version: VERSION,
      features: {
        vision: Boolean(config.groqApiKey),
        chat: Boolean(config.groqApiKey),
        shopping: Boolean(config.serpApiKey),
      },
      models: { vision: config.visionModel, chat: config.chatModel },
      currency: config.currency,
      timestamp: new Date().toISOString(),
    });
  });

  app.post(
    '/api/scanner/analyze',
    asyncRoute(async (req, res) => {
      const image = parseImageInput(req.body?.imageBase64, config.maxImageBytes);
      const started = Date.now();
      const object = await providers.analyzeImage(image.dataUrl);
      console.log(`Identified "${object.name}" in ${Date.now() - started} ms (${Math.round(image.bytes / 1024)} KB)`);
      res.json({ success: true, object });
    })
  );

  app.post(
    '/api/scanner/search',
    asyncRoute(async (req, res) => {
      const query = typeof req.body?.query === 'string' ? req.body.query.trim().slice(0, 200) : '';
      if (!query) {
        throw new HttpError(400, 'Search query is required.', 'QUERY_REQUIRED');
      }
      const { products, priceRange } = await providers.searchShopping(query);
      console.log(`Shopping search "${query}": ${products.length} products`);
      res.json({ success: true, query, products, priceRange, searchSource: 'Google Shopping' });
    })
  );

  app.post(
    '/api/chat',
    asyncRoute(async (req, res) => {
      const messages = parseChatMessages(req.body?.messages);
      const reply = await providers.chat(messages);
      res.json({ success: true, reply });
    })
  );

  app.use((req, res) => {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'API endpoint not found.', path: req.originalUrl });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ success: false, code: 'IMAGE_TOO_LARGE', message: 'Request body is too large.' });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, code: 'INVALID_JSON', message: 'Request body is not valid JSON.' });
    }
    if (error instanceof HttpError) {
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    console.error('Unhandled server error:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL', message: 'Internal server error.' });
  });

  return app;
}

module.exports = { createApp, VERSION };
