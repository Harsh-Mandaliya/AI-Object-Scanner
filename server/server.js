// ============================================================
// AI OBJECT SCANNER - BACKEND
// ============================================================
//
// Project:
// AI-Object-Scanner
//
// Responsibilities:
// 1. Receive image from Expo
// 2. Send image to Groq Vision
// 3. Identify object information
// 4. Search Google Shopping through SerpApi
// 5. Return real product listings and prices
//
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();


// ============================================================
// CONFIGURATION
// ============================================================

const PORT = Number(process.env.PORT) || 4000;

const GROQ_API_URL =
  'https://api.groq.com/openai/v1/chat/completions';

const GROQ_VISION_MODEL =
  'qwen/qwen3.8-27b';

const SERPAPI_URL =
  'https://serpapi.com/search';


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: '*',
  })
);

// Base64 images can be large.
// Increase JSON body limit for camera images.
app.use(
  express.json({
    limit: '15mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '15mb',
  })
);


// ============================================================
// ENVIRONMENT CHECK
// ============================================================

if (!process.env.GROQ_API_KEY) {
  console.warn(
    '⚠️ GROQ_API_KEY is missing from server/.env'
  );
}

if (!process.env.SERPAPI_KEY) {
  console.warn(
    '⚠️ SERPAPI_KEY is missing from server/.env'
  );
}


// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI Object Scanner API is running',
    version: '1.0.0',
    endpoints: {
      analyze: 'POST /api/scanner/analyze',
      search: 'POST /api/scanner/search',
      health: 'GET /api/health',
    },
  });
});


app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'AI Object Scanner',
    timestamp: new Date().toISOString(),
  });
});


// ============================================================
// HELPERS
// ============================================================

function cleanString(value) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}


function cleanStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        typeof item === 'string' &&
        item.trim().length > 0
    )
    .map((item) => item.trim());
}


function cleanConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, number)
  );
}


function extractJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error(
      'Groq returned an empty response.'
    );
  }

  let cleaned = text.trim();

  // Remove markdown JSON fences if present.
  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // Try to find the first JSON object.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start !== -1 && end !== -1 && end > start) {
      const possibleJson =
        cleaned.substring(
          start,
          end + 1
        );

      try {
        return JSON.parse(possibleJson);
      } catch (nestedError) {
        throw new Error(
          'Groq returned invalid JSON.'
        );
      }
    }

    throw new Error(
      'Groq returned invalid JSON.'
    );
  }
}


// ============================================================
// NORMALIZE GROQ OBJECT RESPONSE
// ============================================================

function normalizeObjectAnalysis(raw) {
  const object = raw || {};

  const name =
    cleanString(object.name) ||
    'Unknown Object';

  const category =
    cleanString(object.category) ||
    'Unknown';

  const type =
    cleanString(object.type) ||
    'Unknown';

  const description =
    cleanString(object.description) ||
    'No description available.';

  let searchQuery =
    cleanString(object.searchQuery);

  // Build a fallback search query if Groq didn't provide one.
  if (!searchQuery) {
    const parts = [
      object.brand,
      object.model,
      object.name,
      object.type,
      object.color,
    ]
      .filter(
        (value) =>
          typeof value === 'string' &&
          value.trim().length > 0
      )
      .map((value) => value.trim());

    searchQuery =
      parts.join(' ') || name;
  }

  return {
    name,

    brand: cleanString(object.brand),

    model: cleanString(object.model),

    category,

    type,

    color: cleanString(object.color),

    material: cleanString(object.material),

    description,

    features: cleanStringArray(
      object.features
    ),

    confidence: cleanConfidence(
      object.confidence
    ),

    searchQuery,
  };
}


// ============================================================
// GROQ VISION
// ============================================================

async function analyzeImageWithGroq(
  imageBase64
) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      'GROQ_API_KEY is not configured.'
    );
  }

  if (
    typeof imageBase64 !== 'string' ||
    imageBase64.length === 0
  ) {
    throw new Error(
      'No image data was provided.'
    );
  }


  // ----------------------------------------------------------
  // Accept either:
  //
  // data:image/jpeg;base64,XXXXX
  //
  // or:
  //
  // XXXXX
  // ----------------------------------------------------------

  let imageDataUrl =
    imageBase64.trim();

  if (
    !imageDataUrl.startsWith(
      'data:image/'
    )
  ) {
    imageDataUrl =
      `data:image/jpeg;base64,${imageDataUrl}`;
  }


  // ----------------------------------------------------------
  // Vision prompt
  // ----------------------------------------------------------

  const prompt = `
You are an expert visual object identification system.

Analyze the supplied image carefully.

Identify the main physical object visible in the image.

Return ONLY valid JSON.

Do NOT return markdown.
Do NOT return explanations outside JSON.

Use this exact structure:

{
  "name": "object name",
  "brand": "brand or null",
  "model": "model or null",
  "category": "category",
  "type": "specific type",
  "color": "primary visible color or null",
  "material": "likely material or null",
  "description": "short factual description",
  "features": [
    "visible or confidently inferred feature"
  ],
  "confidence": 0.0,
  "searchQuery": "best shopping search query"
}

IMPORTANT RULES:

1. Do not invent a brand.
2. Do not invent a model number.
3. If brand cannot be determined from the image, return null.
4. If model cannot be determined from the image, return null.
5. Do not invent specifications that cannot reasonably be seen or inferred.
6. Color should describe the visible primary color.
7. The searchQuery should be useful for Google Shopping.
8. confidence must be between 0 and 1.
9. Identify the main object, not the background.
10. If exact identification is impossible, identify the closest reliable object category.
11. Never provide a price. Current prices will be obtained separately from shopping search results.
`;


  // ----------------------------------------------------------
  // Groq request
  // ----------------------------------------------------------

  const response = await fetch(
    GROQ_API_URL,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',

        Authorization:
          `Bearer ${process.env.GROQ_API_KEY}`,
      },

      body: JSON.stringify({
        model: GROQ_VISION_MODEL,

        messages: [
          {
            role: 'system',

            content:
              'You are a precise visual object identification API. Always return valid JSON only.',
          },

          {
            role: 'user',

            content: [
              {
                type: 'text',

                text: prompt,
              },

              {
                type: 'image_url',

                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],

        response_format: {
          type: 'json_object',
        },

        temperature: 0.2,

        max_completion_tokens: 1200,

        stream: false,
      }),
    }
  );


  // ----------------------------------------------------------
  // Handle Groq HTTP error
  // ----------------------------------------------------------

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      'Groq API error:',
      errorText
    );

    throw new Error(
      `Groq API error: ${response.status}`
    );
  }


  const data =
    await response.json();


  const content =
    data?.choices?.[0]?.message?.content;


  if (!content) {
    throw new Error(
      'Groq did not return object information.'
    );
  }


  const parsed =
    extractJson(content);


  return normalizeObjectAnalysis(
    parsed
  );
}


// ============================================================
// POST /api/scanner/analyze
// ============================================================

app.post(
  '/api/scanner/analyze',
  async (req, res) => {

    try {

      const {
        imageBase64,
      } = req.body;


      if (
        !imageBase64 ||
        typeof imageBase64 !== 'string'
      ) {

        return res.status(400).json({
          success: false,
          message:
            'imageBase64 is required.',
        });

      }


      console.log(
        '🔍 Starting object analysis...'
      );


      const object =
        await analyzeImageWithGroq(
          imageBase64
        );


      console.log(
        '✅ Object identified:',
        object.name
      );


      return res.json({

        success: true,

        object,

      });

    } catch (error) {

      console.error(
        '❌ Object analysis failed:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error instanceof Error
            ? error.message
            : 'Object analysis failed.',

      });

    }
  }
);


// ============================================================
// GOOGLE SHOPPING SEARCH
// ============================================================

async function searchGoogleShopping(
  query
) {

  if (!process.env.SERPAPI_KEY) {
    throw new Error(
      'SERPAPI_KEY is not configured.'
    );
  }


  const params =
    new URLSearchParams({

      engine:
        'google_shopping',

      q: query,

      api_key:
        process.env.SERPAPI_KEY,

      location:
        'Ahmedabad, Gujarat, India',

      google_domain:
        'google.co.in',

      gl:
        'in',

      hl:
        'en',

      device:
        'mobile',

    });


  const response =
    await fetch(
      `${SERPAPI_URL}?${params.toString()}`
    );


  if (!response.ok) {

    const errorText =
      await response.text();

    console.error(
      'SerpApi error:',
      errorText
    );

    throw new Error(
      `Shopping search failed: ${response.status}`
    );
  }


  const data =
    await response.json();


  if (
    data?.search_metadata?.status ===
      'Error'
  ) {

    throw new Error(
      data?.error ||
        'Google Shopping search failed.'
    );

  }


  return data;
}


// ============================================================
// NORMALIZE PRODUCT RESULT
// ============================================================

function normalizeProduct(
  product
) {

  const price =
    Number(
      product?.extracted_price
    );


  return {

    name:
      cleanString(
        product?.title
      ) ||
      'Unknown Product',

    brand:
      null,

    price:
      Number.isFinite(price)
        ? price
        : null,

    currency:
      'INR',

    imageUrl:
      cleanString(
        product?.thumbnail
      ),

    productUrl:
      cleanString(
        product?.product_link ||
        product?.link
      ),

    source:
      cleanString(
        product?.source
      ),

    rating:
      Number.isFinite(
        Number(product?.rating)
      )
        ? Number(product.rating)
        : null,

    reviews:
      Number.isFinite(
        Number(product?.reviews)
      )
        ? Number(product.reviews)
        : null,

  };
}


// ============================================================
// POST /api/scanner/search
// ============================================================

app.post(
  '/api/scanner/search',
  async (req, res) => {

    try {

      const {
        query,
      } = req.body;


      if (
        typeof query !== 'string' ||
        query.trim().length === 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Search query is required.',

        });

      }


      const cleanQuery =
        query.trim();


      console.log(
        `🛒 Searching Google Shopping: ${cleanQuery}`
      );


      const data =
        await searchGoogleShopping(
          cleanQuery
        );


      const rawProducts =
        Array.isArray(
          data?.shopping_results
        )
          ? data.shopping_results
          : [];


      const products =
        rawProducts
          .map(normalizeProduct)
          .filter(
            (product) =>
              product.name &&
              product.name !==
                'Unknown Product'
          )
          .slice(0, 10);


      // --------------------------------------------------------
      // Calculate real price range
      // --------------------------------------------------------

      const prices =
        products

          .map(
            (product) =>
              product.price
          )

          .filter(
            (price) =>
              typeof price === 'number' &&
              Number.isFinite(price) &&
              price > 0
          );


      let min = null;
      let max = null;


      if (prices.length > 0) {

        min =
          Math.min(...prices);

        max =
          Math.max(...prices);

      }


      console.log(
        `✅ Found ${products.length} products`
      );


      return res.json({

        success: true,

        query: cleanQuery,

        products,

        priceRange: {

          min,

          max,

          currency: 'INR',

        },

        searchSource:
          'Google Shopping',

      });

    } catch (error) {

      console.error(
        '❌ Product search failed:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error instanceof Error
            ? error.message
            : 'Product search failed.',

      });

    }
  }
);


// ============================================================
// 404 HANDLER
// ============================================================

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        'API endpoint not found.',

      path:
        req.originalUrl,

    });

  }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (error, req, res, next) => {

    console.error(
      'Unhandled server error:',
      error
    );


    res.status(500).json({

      success: false,

      message:
        'Internal server error.',

    });

  }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log('');
    console.log(
      '=========================================='
    );

    console.log(
      '🚀 AI Object Scanner Server'
    );

    console.log(
      '=========================================='
    );

    console.log(
      `📡 Port: ${PORT}`
    );

    console.log(
      `🔗 Local: http://localhost:${PORT}`
    );

    console.log(
      `🔗 API: http://localhost:${PORT}/api`
    );

    console.log(
      `🤖 Vision: ${GROQ_VISION_MODEL}`
    );

    console.log(
      `🛒 Search: Google Shopping / SerpApi`
    );

    console.log(
      '=========================================='
    );

    console.log('');

  }
);