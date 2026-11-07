'use strict';

// Entry point: load server/.env (if present), build the app and start listening.

const fs = require('node:fs');
const path = require('node:path');

const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const { loadConfig } = require('./src/config');
const { createApp, VERSION } = require('./src/app');

const config = loadConfig();
const app = createApp(config);

const server = app.listen(config.port, config.host, () => {
  console.log('');
  console.log(`AI Object Scanner API v${VERSION}`);
  console.log(`  Local:    http://localhost:${config.port}/api`);
  console.log(`  Vision:   ${config.visionModel}${config.groqApiKey ? '' : '  (GROQ_API_KEY missing)'}`);
  console.log(`  Chat:     ${config.chatModel}`);
  console.log(`  Shopping: ${config.serpApiKey ? `Google Shopping via SerpApi (${config.currency})` : 'disabled (SERPAPI_KEY missing)'}`);
  console.log('');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Set PORT in server/.env to use another port.`);
    process.exit(1);
  }
  throw error;
});
