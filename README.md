# 🔍 AI Object Scanner

Point your phone at an object and get its **name, brand, model, details and live market prices** in a few seconds.

AI Object Scanner is a cross-platform app (Android, iOS and web) built with **Expo / React Native** and a small **Node.js + Express** backend. Photos are identified by a vision model on **Groq**, and matching products and prices come from **Google Shopping via SerpApi**. It also has a built-in chat assistant for follow-up questions.

API keys stay on the backend. The app never sees them.

## 🙂 The project in simple words

You take a photo of something, like a water bottle, headphones or a shoe. The app tells you **what it is** and **how much it costs** in online shops.

1. 📸 **Take a photo.** Use the camera, or pick a picture from your gallery.
2. 🤖 **AI looks at it.** The photo goes to our small server, which asks an AI model "what is this?". The AI answers with the name, brand, color, material and features.
3. 🛒 **See prices.** The server searches Google Shopping for that item and shows real listings with prices, so you can compare and tap to buy.
4. 💬 **Ask questions.** A chat assistant answers anything else you want to know.

There are only two parts:

| Part | What it is | Where |
|---|---|---|
| 📱 **App** | What you see and touch (screens, camera, chat, animations) | `src/` |
| 🖥️ **Server** | Talks to the AI and the shopping search and keeps your API keys secret | `server/` |

To make it work you need **one free key**, from Groq (for the AI). A SerpApi key is optional and adds live prices. Setup takes about 5 minutes; see [Setup and running](#-setup-and-running).

---

## Contents

- [The project in simple words](#-the-project-in-simple-words)
- [Features](#-features)
- [How it works](#-how-it-works)
- [Models and data](#-models-and-data)
- [Project structure](#-project-structure)
- [Requirements](#-requirements)
- [Setup and running](#-setup-and-running)
- [Configuration](#-configuration)
- [API reference](#-api-reference)
- [Testing and quality checks](#-testing-and-quality-checks)
- [Troubleshooting](#-troubleshooting)
- [Tech stack](#-tech-stack)
- [Changelog](#-changelog)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## ✨ Features

- 🎨 **Motion design**: a gradient hero header, a pulsing scan button, a radar-style live logo, chat bubbles that pop in, a typing animation, a scanning laser line on the camera and photo, a shutter flash, skeleton loading, an animated confidence bar and cards that slide in one after another.
- 💬 **Graphic chat**: AI avatar, gradient message bubbles, icon suggestion chips, and a step-by-step setup card when the AI key is missing (no confusing errors).
- 📸 **Camera scanning** with an animated framing guide, front/back camera switch and torch toggle.
- 🖼️ **Pick from photos** if you already have a picture, or if camera access is denied. This also works in the web version.
- 🤖 **AI identification**: name, brand, model, category, type, color, material, description and key features.
- 🎯 **Confidence badge** (high / medium / low), plus a tip to retake the photo when the model is unsure.
- 🛒 **Live prices**: up to 10 Google Shopping listings with store, price, rating and review count. Tap a listing to open it.
- 📊 **Price summary**: the lowest-to-highest range and the typical (median) price.
- 🧩 **Graceful degradation**: if shopping search is off or fails, you still get the identification and a one-tap Google Shopping link.
- 💬 **Chat assistant** (Groq LLM) with suggested questions and Enter-to-send on web.
- 🟢 **Live server status** on the home screen, with clear hints when the backend is unreachable or the Groq key is missing.
- 🔐 **Keys stay server-side**. The backend validates the image type and size, applies timeouts and returns friendly error messages.
- 🌐 **Zero-config networking**: the app finds the backend on the computer running Expo automatically, so you don't have to copy your IP address.

## 🧠 How it works

```text
 ┌──────────────────────────── Expo app (src/) ───────────────────────────┐
 │                                                                        │
 │  Home (index.tsx) ──► Scanner (scanner.tsx) ──► Result (result.tsx)    │
 │   chat + status        camera / photo picker      object + prices      │
 │        │                     │ base64 JPEG               ▲             │
 │        └────────── services/scannerApi.ts ───────────────┘             │
 └────────────────────────────────┬───────────────────────────────────────┘
                                  │ HTTP (JSON)
 ┌────────────────────────────────▼──── Backend (server/) ────────────────┐
 │  Express app (src/app.js)                                              │
 │   POST /api/scanner/analyze ──► validate image ──► Groq vision model   │
 │   POST /api/scanner/search  ──► SerpApi Google Shopping                │
 │   POST /api/chat            ──► Groq chat model                        │
 │   GET  /api/health          ──► which features are configured          │
 │                                                                        │
 │  src/normalize.js  cleans model / provider output into a stable shape  │
 └────────────────────────────────────────────────────────────────────────┘
```

1. **Capture.** The scanner takes a photo (JPEG, quality 0.6, usually 0.3–2 MB) or loads one from the library, and keeps it in memory (`scannerSession.ts`). The image is not passed through the URL.
2. **Identify.** The result screen sends the image as a base64 data URL to `POST /api/scanner/analyze`. The backend checks the type (JPEG/PNG/WebP) and size (8 MB by default), then asks the Groq vision model for strict JSON.
3. **Normalize.** The model's reply is parsed (code fences and extra text are tolerated) and cleaned: placeholder values like `"null"` or `"unknown"` are dropped, features are de-duplicated, confidence is clamped to 0–1 (`85` becomes `0.85`), and a search query is built if the model didn't give one.
4. **Price lookup.** The app sends the model's `searchQuery` to `POST /api/scanner/search`. The backend calls SerpApi's `google_shopping` engine, normalizes and de-duplicates the listings, and computes the min, max and median price.
5. **Display.** The result screen shows the object card, the price card and the tappable product listings. If the price search fails, the identification is still shown with an explanation.

## 🧬 Models and data

| What | Default | Notes |
|---|---|---|
| Vision model | `qwen/qwen3.8-27b` on Groq | Multimodal (text + image). Groq allows up to 20 MB and 3 images per request; this app sends one image of at most 8 MB. Override with `GROQ_VISION_MODEL`. |
| Chat model | `openai/gpt-oss-20b` on Groq | Override with `GROQ_CHAT_MODEL`. |
| Shopping data | SerpApi `google_shopping` engine | Defaults to India (`google.co.in`, `gl=in`, Ahmedabad location, prices in INR). Every setting can be changed. |

- No model weights are downloaded or bundled. Inference runs on Groq's servers.
- Images are sent to Groq for identification and are not stored by this app. Search queries (text only) are sent to SerpApi.
- Identification quality depends on the photo. Brands and models are only reported when readable or unmistakable, and the prompt tells the model never to invent them or quote prices.
- Prices come from live listings, so they change over time and may include sponsored or marketplace offers.

## 📂 Project structure

```text
AI-Object-Scanner/
├── app.json                  # Expo config (name, icons, permissions, plugins)
├── package.json              # App dependencies and scripts
├── eslint.config.js          # ESLint (eslint-config-expo)
├── tsconfig.json
├── .env.example              # Optional EXPO_PUBLIC_API_URL override
├── assets/                   # App icon, splash screen, favicon
├── src/
│   ├── app/                  # Screens (Expo Router, file-based routes)
│   │   ├── _layout.tsx       # Root stack navigator
│   │   ├── index.tsx         # Home: scan button, server status, chat assistant
│   │   ├── scanner.tsx       # Camera, photo picker, torch, flip
│   │   └── result.tsx        # Identification, price summary, product list
│   ├── components/
│   │   ├── ObjectCard.tsx    # Object details + confidence badge
│   │   ├── ProductCard.tsx   # One shopping listing
│   │   └── motion.tsx        # Animations: fade/pop-in, pulse, ripple, scan line, typing dots
│   ├── constants/
│   │   └── theme.ts          # Colors, gradients, radii, shadow
│   └── services/
│       ├── scannerApi.ts     # Backend client (timeouts, typed errors)
│       ├── scannerSession.ts # In-memory hand-off of the captured image
│       ├── imageCapture.ts   # Photo library picker + size check
│       └── utils.ts          # Pure helpers: price formatting, URLs, etc.
├── tests/
│   └── utils.test.ts         # App unit tests (node:test)
└── server/
    ├── server.js             # Entry point: loads server/.env and listens
    ├── .env.example          # Backend configuration template
    ├── package.json
    ├── src/
    │   ├── app.js            # Express routes and error handling
    │   ├── config.js         # Environment → config object
    │   ├── normalize.js      # Validation + output normalization (pure)
    │   └── providers.js      # Groq and SerpApi calls
    └── test/
        ├── normalize.test.js # Unit tests
        └── api.test.js       # HTTP tests with a fake Groq/SerpApi
```

## ⚙️ Requirements

- **Node.js 22.18 or newer** (Node 24 LTS recommended; the app tests use Node's built-in TypeScript support). The backend alone needs Node 20.12 or newer.
- **npm** (comes with Node)
- A free **Groq API key**: <https://console.groq.com/keys>
- *(Optional)* A **SerpApi key** for live prices: <https://serpapi.com/manage-api-key> (the free plan includes a monthly search quota)
- To run on a phone: the **Expo Go** app (for SDK 58) from the App Store or Play Store, with the phone on the same Wi-Fi as your computer. Alternatively an Android emulator or iOS simulator, or just a web browser.

## 🚀 Setup and running

### 1. Clone and install

```bash
git clone https://github.com/Harsh-Mandaliya/AI-Object-Scanner.git
cd AI-Object-Scanner
npm install
npm --prefix server install
```

### 2. Configure the backend

**Windows (PowerShell):**

```powershell
Copy-Item server\.env.example server\.env
notepad server\.env
```

**macOS / Linux:**

```bash
cp server/.env.example server/.env
nano server/.env
```

Set at least `GROQ_API_KEY`. Add `SERPAPI_KEY` if you want prices.

### 3. Start the backend (terminal 1)

```bash
npm run server
```

You should see `AI Object Scanner API v2.0.0` and the port. Check it at <http://localhost:4000/api/health>.

> **Windows firewall:** the first time Node listens on the network, Windows asks whether to allow it. Allow **Private networks**, or your phone won't be able to reach the backend.

### 4. Start the app (terminal 2)

```bash
npm start
```

Then:

- **Phone:** scan the QR code with Expo Go (Android) or the Camera app (iOS).
- **Web:** press `w`, or run `npm run web`.
- **Emulator/simulator:** press `a` (Android) or `i` (iOS, macOS only).

The app automatically calls port `4000` on the computer running Expo. Look for the green **Online** dot on the home screen. If it shows **Server offline**, see [Troubleshooting](#-troubleshooting).

### Pointing the app at another backend (optional)

Only needed if the backend runs on a different machine or port, or behind a tunnel:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# macOS / Linux
cp .env.example .env
```

Then set `EXPO_PUBLIC_API_URL=http://<host>:<port>/api` and restart Expo with `npx expo start --clear`.

## 🔧 Configuration

### Backend: `server/.env`

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | **Required** for scanning and chat. |
| `SERPAPI_KEY` | — | Optional. Turns on live product listings and prices. |
| `PORT` | `4000` | Port the API listens on. |
| `HOST` | `0.0.0.0` | Interface to bind to. `0.0.0.0` lets phones on your LAN connect. |
| `GROQ_VISION_MODEL` | `qwen/qwen3.8-27b` | Any Groq model that accepts image input. |
| `GROQ_CHAT_MODEL` | `openai/gpt-oss-20b` | Model for the chat assistant. |
| `SHOPPING_LOCATION` | `Ahmedabad, Gujarat, India` | SerpApi `location`. |
| `SHOPPING_GOOGLE_DOMAIN` | `google.co.in` | SerpApi `google_domain`. |
| `SHOPPING_COUNTRY` | `in` | SerpApi `gl` (country). |
| `SHOPPING_LANGUAGE` | `en` | SerpApi `hl` (language). |
| `SHOPPING_CURRENCY` | `INR` | Currency label shown with prices. Set it to match the country, e.g. `USD` with `SHOPPING_COUNTRY=us`. |
| `MAX_PRODUCTS` | `10` | Maximum listings returned. |
| `MAX_IMAGE_MB` | `8` | Largest accepted image (decoded). |
| `UPSTREAM_TIMEOUT_MS` | `45000` | Timeout for Groq and SerpApi calls. |
| `CORS_ORIGIN` | `*` | Restrict this if you deploy the API publicly. |

Example for US shopping results:

```env
SHOPPING_LOCATION=New York, New York, United States
SHOPPING_GOOGLE_DOMAIN=google.com
SHOPPING_COUNTRY=us
SHOPPING_CURRENCY=USD
```

### App: `.env` (optional)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Full backend base URL, e.g. `http://192.168.1.20:4000/api`. Leave it unset to auto-detect. Never put API keys in `EXPO_PUBLIC_*` variables: they are bundled into the app. |

## 📡 API reference

All responses are JSON with `success: true|false`. Errors also include `code` and `message`.

| Method & path | Body | Response |
|---|---|---|
| `GET /api/health` | — | `{ status, version, features: { vision, chat, shopping }, models, currency }` |
| `POST /api/scanner/analyze` | `{ imageBase64: "data:image/jpeg;base64,..." }` (a bare base64 string is treated as JPEG) | `{ object: { name, brand, model, category, type, color, material, description, features[], confidence, searchQuery } }` |
| `POST /api/scanner/search` | `{ query: "..." }` | `{ query, products: [{ name, price, currency, imageUrl, productUrl, source, rating, reviews }], priceRange: { min, max, median, currency } }` |
| `POST /api/chat` | `{ messages: [{ role: "user"\|"assistant", content }] }` (the last message must be from the user) | `{ reply }` |

Common error codes: `IMAGE_REQUIRED` / `IMAGE_INVALID` (400), `IMAGE_TOO_LARGE` (413), `IMAGE_TYPE` (415), `UPSTREAM_RATE_LIMIT` (429), `UPSTREAM_AUTH` / `UPSTREAM_ERROR` / `INVALID_MODEL_JSON` (502), `GROQ_NOT_CONFIGURED` / `SHOPPING_NOT_CONFIGURED` (503), `UPSTREAM_TIMEOUT` (504).

Quick test with curl (macOS/Linux, or Git Bash on Windows):

```bash
curl http://localhost:4000/api/health
curl -X POST http://localhost:4000/api/chat -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## 🧪 Testing and quality checks

```bash
npm test                  # app unit tests (price formatting, URL detection, image helpers)
npm --prefix server test  # backend unit + HTTP tests (Groq/SerpApi are faked, no keys needed)
npm run typecheck         # TypeScript
npm run lint              # ESLint (eslint-config-expo)
npm run doctor            # expo-doctor dependency/config checks
npm run check             # typecheck + lint + all tests
```

The backend tests start the real Express app on a random port and swap `fetch` for a fake Groq/SerpApi. They cover request validation, model-output parsing, upstream error mapping (401/429/invalid JSON), SerpApi's "no results" case, body size limits and the chat proxy.

## 🛠️ Troubleshooting

**Home screen says "Server offline"**
- Make sure `npm run server` is running and <http://localhost:4000/api/health> opens on your computer.
- Phone and computer must be on the same Wi-Fi. Guest networks and some office networks block device-to-device traffic.
- Allow Node.js through the firewall (Windows: *Windows Defender Firewall → Allow an app*, Private networks).
- If Expo runs in `--tunnel` mode, the phone can't reach your LAN IP. Set `EXPO_PUBLIC_API_URL` to a reachable address, or skip tunnel mode.
- Don't use `localhost` in `EXPO_PUBLIC_API_URL` for a phone: on the phone, `localhost` means the phone itself. On the Android emulator, use `http://10.0.2.2:4000/api`.

**"GROQ_API_KEY is not set" / "Groq rejected the API key"**
- Put the key in `server/.env` (not the root `.env`) and restart the server.

**"Groq rate limit reached"**
- The free tier has per-minute limits. Wait a moment and retry.

**"Price search is turned off"**
- Add `SERPAPI_KEY` to `server/.env`. Identification works without it.

**"Image is too large"**
- Choose a smaller photo, or raise `MAX_IMAGE_MB` on the server (the app also checks against 8 MB).

**"Unsupported image type: image/heic"**
- Some iPhone library photos are HEIC. Take the photo with the in-app camera, or export the image as JPEG.

**Camera is black or permission was denied**
- Enable camera access for Expo Go (or the app) in system settings, or use **Choose from Photos**. In a browser, the camera needs `localhost` or HTTPS.

**Bundling errors after pulling changes**
- Run `npm install`, then `npx expo install --check`, then `npx expo start --clear`.

**Port 4000 or 8081 already in use**
- Set `PORT=4001` in `server/.env` (and `EXPO_PUBLIC_API_URL` to match), or run `npx expo start --port 8082`.

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 |
| Navigation | Expo Router (file-based stack) |
| Device features | expo-camera, expo-image-picker, expo-web-browser |
| Design & motion | expo-linear-gradient, @expo/vector-icons (Ionicons), React Native `Animated` |
| Backend | Node.js, Express 5, cors |
| AI | Groq API: `qwen/qwen3.8-27b` (vision), `openai/gpt-oss-20b` (chat) |
| Shopping data | SerpApi Google Shopping |
| Quality | node:test, ESLint (eslint-config-expo), `tsc`, expo-doctor |

## 📝 Changelog

### v2.1.0 (2026-11)
- **New look:** gradient design system (indigo → violet → cyan) and vector icons (Ionicons) instead of emoji.
- **Motion:** pop-in chat bubbles, typing dots, a pulsing scan button, a radar ripple, a scanning laser line, a shutter flash, skeleton loading, staggered card entrances and an animated confidence bar. All animations use React Native's built-in `Animated` API.
- **Chat:** when the server has no Groq key, the chat now shows a clear 3-step setup card and disables the input, instead of failing with an error. The status pill can be tapped to re-check the server.
- Added `expo-linear-gradient` and `@expo/vector-icons`.

### v2.0.0 (2026-11)
- **Upgraded** to Expo SDK 58 / React Native 0.88 / React 19.3 so the app runs in the current Expo Go, and pinned all dependency versions.
- **Removed** unused template packages (`@expo/ui`, `expo-device`, `expo-glass-effect`, `expo-symbols`, `expo-image`, `expo-file-system`, `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`), unused template images, and the backend's `dotenv` (Node's built-in `process.loadEnvFile` is used instead).
- **Fixed:** the chat assistant called Groq directly from the app with a hard-coded placeholder key, so it never worked and would have exposed a real key. Chat now goes through the new `POST /api/chat` endpoint.
- **Fixed:** a failed or unconfigured price search made the whole scan fail. The identification is now always shown, with a notice about the price search.
- **Fixed:** the result screen briefly showed "No Image Found" before loading, and the home screen showed "Online" even when the backend was down.
- **Fixed:** the backend URL fallback was a broken placeholder (`http://#IPCONFIG(IPv4):4000/api`). The app now detects the dev machine automatically.
- **Fixed:** Enter didn't send chat messages in the web version.
- **New:** choose an image from the photo library (on both the permission screen and the camera screen), torch toggle, retry button, tappable product listings, median ("typical") price, ratings and review counts, confidence levels, a Google Shopping fallback link, chat suggestions and Clear.
- **Backend:** split the single 960-line file into config, routes, providers and normalization modules. Added image type and size validation, upstream timeouts, mapped Groq/SerpApi errors to clear messages with proper status codes, de-duplicated listings, made every model and shopping setting configurable, and added `/api/health` feature flags.
- **Tests:** 22 backend tests (unit + HTTP with faked upstreams) and 7 app unit tests. Added ESLint and typecheck scripts.
- **Docs:** rewrote this README, added `.env.example` files and an MIT license.

### v1.0.0 (2026-10)
- First version: camera capture, Groq vision identification, Google Shopping prices via SerpApi, and a text chat screen.

## 🗺️ Roadmap

- Scan history saved on the device
- Barcode / QR scanning for an exact product match
- Multiple objects in one photo
- Price alerts and comparison across currencies
- Deployable backend (Docker) with authentication and rate limiting

## 👨‍💻 Author

**Harsh Mandaliya** · GitHub: [@Harsh-Mandaliya](https://github.com/Harsh-Mandaliya)

## 📄 License

**Copyright © 2026 Harsh Mandaliya.**

This project is released under the [MIT License](LICENSE). You can use, copy and modify it, as long as you keep the copyright notice and the license text.
