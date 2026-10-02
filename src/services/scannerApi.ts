// src/services/scannerApi.ts

// ============================================================
// AI OBJECT SCANNER API
// ============================================================
//
// Expo App
//    ↓
// scannerApi.ts
//    ↓
// Node.js Backend
//    ↓
// Groq Vision
//    ↓
// Object Information
//    ↓
// Google Shopping / SerpApi
//    ↓
// Products + Prices
//
// IMPORTANT:
// API keys stay on the Node.js backend.
// NEVER put GROQ_API_KEY or SERPAPI_KEY here.
// ============================================================

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://#IPCONFIG(IPv4):4000/api';


// ============================================================
// TYPES
// ============================================================

export type ObjectAnalysis = {
  name: string;

  brand: string | null;

  model: string | null;

  category: string;

  type: string;

  color: string | null;

  material: string | null;

  description: string;

  features: string[];

  confidence: number;

  searchQuery: string;
};


export type ProductResult = {
  name: string;

  brand: string | null;

  price: number | null;

  currency: string;

  imageUrl: string | null;

  productUrl: string | null;

  source: string | null;

  // These may be returned by the backend
  // when available from the shopping provider.
  rating?: number | null;

  reviews?: number | null;
};


export type PriceRange = {
  min: number | null;

  max: number | null;

  currency: string;
};


export type ScannerResult = {
  object: ObjectAnalysis;

  products: ProductResult[];

  priceRange: PriceRange;
};


// ============================================================
// API RESPONSE HELPER
// ============================================================

async function parseResponse(
  response: Response
): Promise<any> {

  const contentType =
    response.headers.get(
      'content-type'
    ) || '';

  if (
    contentType.includes(
      'application/json'
    )
  ) {
    return response.json();
  }

  const text =
    await response.text();

  return {
    message:
      text || 'Server returned an invalid response.',
  };
}


// ============================================================
// ANALYZE OBJECT
// ============================================================

export async function analyzeObject(
  imageBase64: string
): Promise<ObjectAnalysis> {

  if (
    !imageBase64 ||
    typeof imageBase64 !== 'string'
  ) {
    throw new Error(
      'No image was provided.'
    );
  }


  try {

    console.log(
      '🔍 Sending image for object analysis...'
    );


    const response =
      await fetch(
        `${API_BASE_URL}/scanner/analyze`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            imageBase64,
          }),
        }
      );


    const data =
      await parseResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data?.message ||
        data?.error ||
        `Scanner API error: ${response.status}`
      );

    }


    if (!data?.object) {

      throw new Error(
        'Object information was not returned by the server.'
      );

    }


    console.log(
      '✅ Object identified:',
      data.object.name
    );


    return data.object;

  } catch (error) {

    console.error(
      '❌ Object analysis error:',
      error
    );


    if (
      error instanceof Error
    ) {
      throw error;
    }


    throw new Error(
      'Unable to analyze the object.'
    );

  }
}


// ============================================================
// SEARCH PRODUCTS
// ============================================================

export async function searchProducts(
  searchQuery: string
): Promise<ProductResult[]> {

  if (
    !searchQuery ||
    !searchQuery.trim()
  ) {
    return [];
  }


  try {

    console.log(
      '🛒 Searching products:',
      searchQuery
    );


    const response =
      await fetch(
        `${API_BASE_URL}/scanner/search`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            query:
              searchQuery.trim(),
          }),
        }
      );


    const data =
      await parseResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data?.message ||
        data?.error ||
        `Product search error: ${response.status}`
      );

    }


    const products =
      Array.isArray(
        data?.products
      )
        ? data.products
        : [];


    console.log(
      `✅ Products found: ${products.length}`
    );


    return products;

  } catch (error) {

    console.error(
      '❌ Product search error:',
      error
    );


    if (
      error instanceof Error
    ) {
      throw error;
    }


    throw new Error(
      'Unable to search products.'
    );

  }
}


// ============================================================
// COMPLETE SCAN
// ============================================================
//
// This performs:
//
// 1. Groq Vision object identification
// 2. Product search
// 3. Gets price range
//
// ============================================================

export async function scanObject(
  imageBase64: string
): Promise<ScannerResult> {

  if (
    !imageBase64 ||
    typeof imageBase64 !== 'string'
  ) {
    throw new Error(
      'Image is required.'
    );
  }


  try {

    // --------------------------------------------------------
    // STEP 1
    // Identify object
    // --------------------------------------------------------

    console.log(
      '1️⃣ Identifying object...'
    );


    const object =
      await analyzeObject(
        imageBase64
      );


    // --------------------------------------------------------
    // STEP 2
    // Search products
    // --------------------------------------------------------

    console.log(
      '2️⃣ Searching products...'
    );


    const searchQuery =
      object.searchQuery ||
      object.name;


    const products =
      await searchProducts(
        searchQuery
      );


    // --------------------------------------------------------
    // STEP 3
    // Calculate fallback price range
    // --------------------------------------------------------
    //
    // The backend already calculates this.
    // We use the backend result when available.
    // If it isn't returned, calculate it locally.
    // --------------------------------------------------------

    const prices =
      products

        .map(
          product =>
            product.price
        )

        .filter(
          (
            price
          ): price is number =>
            typeof price === 'number' &&
            Number.isFinite(price) &&
            price > 0
        );


    let min:
      number | null = null;

    let max:
      number | null = null;


    if (
      prices.length > 0
    ) {

      min =
        Math.min(...prices);

      max =
        Math.max(...prices);

    }


    // --------------------------------------------------------
    // STEP 4
    // Return complete result
    // --------------------------------------------------------

    console.log(
      '3️⃣ Scan completed.'
    );


    return {

      object,

      products,

      priceRange: {

        min,

        max,

        currency: 'INR',

      },

    };

  } catch (error) {

    console.error(
      '❌ Complete scanner error:',
      error
    );


    if (
      error instanceof Error
    ) {
      throw error;
    }


    throw new Error(
      'Object scanning failed.'
    );

  }
}


// ============================================================
// FORMAT PRICE
// ============================================================

export function formatPrice(
  price: number | null
): string {

  if (
    price === null ||
    !Number.isFinite(price)
  ) {

    return 'Price unavailable';

  }


  return `₹${price.toLocaleString(
    'en-IN'
  )}`;
}


// ============================================================
// FORMAT PRICE RANGE
// ============================================================

export function formatPriceRange(
  min: number | null,
  max: number | null
): string {

  if (
    min === null &&
    max === null
  ) {

    return 'Price unavailable';

  }


  if (
    min !== null &&
    max !== null &&
    min === max
  ) {

    return formatPrice(min);

  }


  if (
    min !== null &&
    max !== null
  ) {

    return `${formatPrice(
      min
    )} - ${formatPrice(max)}`;

  }


  if (
    min !== null
  ) {

    return `From ${formatPrice(
      min
    )}`;

  }


  if (
    max !== null
  ) {

    return `Up to ${formatPrice(
      max
    )}`;

  }


  return 'Price unavailable';
}


// ============================================================
// API BASE URL
// ============================================================

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}