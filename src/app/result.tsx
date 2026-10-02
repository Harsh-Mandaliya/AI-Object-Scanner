// src/app/result.tsx

import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  File,
} from 'expo-file-system';

import {
  scanObject,
  formatPriceRange,
  type ScannerResult,
} from '@/services/scannerApi';

import ObjectCard from '@/components/ObjectCard';

import {
  getCapturedImageUri,
} from '@/services/scannerSession';

export default function ResultScreen() {

  // ============================================================
  // GET IMAGE URI FROM SESSION
  // ============================================================

  const [
    imageUri,
    setImageUri,
  ] = useState<string | null>(
    null
  );

  const [
    result,
    setResult,
  ] = useState<ScannerResult | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  // ============================================================
  // LOAD IMAGE URI
  // ============================================================

  useEffect(() => {
    const uri =
      getCapturedImageUri();

    console.log(
      '📷 Session Image URI:',
      uri
    );

    setImageUri(uri);
  }, []);

  // ============================================================
  // ANALYZE IMAGE
  // ============================================================

  useEffect(() => {

    if (!imageUri) {
      return;
    }

    let cancelled = false;

    const analyze = async () => {

      try {
        setLoading(true);
        setError(null);

        // ======================================================
        // ORIGINAL URI
        // ======================================================

        console.log(
          '📷 Using original camera URI:',
          imageUri
        );

        // ======================================================
        // CREATE FILE
        // ======================================================

        console.log(
          '📁 Creating File object...'
        );

        const imageFile =
          new File(imageUri);

        // ======================================================
        // CHECK FILE
        // ======================================================

        console.log(
          '📁 Image exists:',
          imageFile.exists
        );

        if (!imageFile.exists) {
          throw new Error(
            'Captured image file no longer exists.'
          );
        }

        console.log(
          '📏 Image size:',
          imageFile.size
        );

        if (
          !imageFile.size ||
          imageFile.size <= 0
        ) {
          throw new Error(
            'Captured image is empty.'
          );
        }

        // ======================================================
        // BASE64
        // ======================================================

        console.log(
          '🔄 Converting image to Base64...'
        );

        const imageBase64 =
          await imageFile.base64();

        if (!imageBase64) {
          throw new Error(
            'Unable to convert captured image to Base64.'
          );
        }

        console.log(
          '✅ Image converted to Base64'
        );

        console.log(
          '📦 Base64 length:',
          imageBase64.length
        );

        // ======================================================
        // BACKEND
        // ======================================================

        console.log(
          '🤖 Sending image to AI...'
        );

        const scannerResult =
          await scanObject(
            imageBase64
          );

        console.log(
          '✅ AI analysis completed'
        );

        // ======================================================
        // SAVE RESULT
        // ======================================================

        if (!cancelled) {
          setResult(
            scannerResult
          );
        }

      } catch (err) {

        console.error(
          '❌ Image analysis failed:',
          err
        );

        if (!cancelled) {

          const message =
            err instanceof Error
              ? err.message
              : 'Unable to analyze image.';

          setError(message);
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    analyze();

    return () => {
      cancelled = true;
    };

  }, [imageUri]);

  // ============================================================
  // NO IMAGE
  // ============================================================

  if (!imageUri) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={[
          'top',
          'bottom',
        ]}
      >
        <View
          style={styles.emptyContainer}
        >

          <Text
            style={styles.emptyIcon}
          >
            📷
          </Text>

          <Text
            style={styles.emptyTitle}
          >
            No Image Found
          </Text>

          <Text
            style={styles.emptyText}
          >
            Please capture an object first.
          </Text>

          <Pressable
            style={
              styles.primaryButton
            }
            onPress={() =>
              router.replace(
                '/scanner'
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Scan Object
            </Text>
          </Pressable>

        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // RESULT SCREEN
  // ============================================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        'top',
        'bottom',
      ]}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </Pressable>

        <Text
          style={styles.headerTitle}
        >
          Scan Result
        </Text>

        <View
          style={styles.headerSpacer}
        />

      </View>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ==================================================
            IMAGE
        ================================================== */}

        <View
          style={styles.imageCard}
        >
          <Image
            source={{
              uri: imageUri,
            }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >

            <ActivityIndicator
              size="large"
              color="#111827"
            />

            <Text
              style={
                styles.loadingTitle
              }
            >
              Analyzing Object...
            </Text>

            <Text
              style={
                styles.loadingText
              }
            >
              AI is identifying the object
              and searching products.
            </Text>

          </View>
        ) : null}

        {/* ==================================================
            ERROR
        ================================================== */}

        {!loading && error ? (
          <View
            style={styles.errorCard}
          >

            <Text
              style={styles.errorIcon}
            >
              ⚠️
            </Text>

            <Text
              style={styles.errorTitle}
            >
              Analysis Failed
            </Text>

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={() =>
                router.replace(
                  '/scanner'
                )
              }
            >
              <Text
                style={
                  styles.retryButtonText
                }
              >
                Scan Again
              </Text>
            </Pressable>

          </View>
        ) : null}

        {/* ==================================================
            RESULT
        ================================================== */}

        {!loading &&
        !error &&
        result ? (
          <>
            {/* OBJECT */}

            <ObjectCard
              object={result.object}
            />

            {/* PRICE */}

            <View
              style={styles.priceCard}
            >

              <Text
                style={styles.priceLabel}
              >
                Estimated Market Price
              </Text>

              <Text
                style={styles.priceValue}
              >
                {formatPriceRange(
                  result.priceRange.min,
                  result.priceRange.max
                )}
              </Text>

              <Text
                style={styles.priceSource}
              >
                Based on available shopping listings
              </Text>

            </View>

            {/* PRODUCTS */}

            {result.products.length >
            0 ? (
              <View
                style={
                  styles.productsSection
                }
              >

                <Text
                  style={
                    styles.productsTitle
                  }
                >
                  Matching Products
                </Text>

                {result.products.map(
                  (
                    product,
                    index
                  ) => (

                    <View
                      key={`${product.name}-${index}`}
                      style={
                        styles.productCard
                      }
                    >

                      {product.imageUrl ? (
                        <Image
                          source={{
                            uri:
                              product.imageUrl,
                          }}
                          style={
                            styles.productImage
                          }
                        />
                      ) : (
                        <View
                          style={
                            styles.productImagePlaceholder
                          }
                        >
                          <Text>
                            🛍️
                          </Text>
                        </View>
                      )}

                      <View
                        style={
                          styles.productContent
                        }
                      >

                        <Text
                          style={
                            styles.productName
                          }
                          numberOfLines={2}
                        >
                          {product.name}
                        </Text>

                        <Text
                          style={
                            styles.productSource
                          }
                        >
                          {product.source ||
                            'Shopping listing'}
                        </Text>

                        {product.price !==
                        null ? (
                          <Text
                            style={
                              styles.productPrice
                            }
                          >
                            ₹
                            {product.price.toLocaleString(
                              'en-IN'
                            )}
                          </Text>
                        ) : (
                          <Text
                            style={
                              styles.unavailablePrice
                            }
                          >
                            Price unavailable
                          </Text>
                        )}

                      </View>

                    </View>
                  )
                )}

              </View>
            ) : (
              <View
                style={
                  styles.noProductsCard
                }
              >

                <Text
                  style={
                    styles.noProductsIcon
                  }
                >
                  🔎
                </Text>

                <Text
                  style={
                    styles.noProductsTitle
                  }
                >
                  No Matching Products
                </Text>

                <Text
                  style={
                    styles.noProductsText
                  }
                >
                  We identified the object,
                  but could not find current
                  shopping listings.
                </Text>

              </View>
            )}

          </>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F7F7F8',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    fontSize: 36,
    lineHeight: 40,
    color: '#111827',
    fontWeight: '300',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  headerSpacer: {
    width: 42,
  },

  // ==========================================================
  // SCROLL
  // ==========================================================

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  // ==========================================================
  // IMAGE
  // ==========================================================

  imageCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },

  image: {
    width: '100%',
    height: 280,
  },

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },

  loadingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ==========================================================
  // ERROR
  // ==========================================================

  errorCard: {
    margin: 16,
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  errorIcon: {
    fontSize: 40,
  },

  errorTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  errorText: {
    marginTop: 8,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  retryButton: {
    marginTop: 20,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ==========================================================
  // EMPTY
  // ==========================================================

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyIcon: {
    fontSize: 60,
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  emptyText: {
    marginTop: 8,
    color: '#6B7280',
    textAlign: 'center',
  },

  primaryButton: {
    marginTop: 25,
    backgroundColor: '#111827',
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 13,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // ==========================================================
  // PRICE
  // ==========================================================

  priceCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#111827',
  },

  priceLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  priceValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  priceSource: {
    marginTop: 6,
    color: '#9CA3AF',
    fontSize: 11,
  },

  // ==========================================================
  // PRODUCTS
  // ==========================================================

  productsSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },

  productsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },

  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  productImage: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },

  productImagePlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    minWidth: 0,
  },

  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },

  productSource: {
    marginTop: 4,
    fontSize: 11,
    color: '#9CA3AF',
  },

  productPrice: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },

  unavailablePrice: {
    marginTop: 5,
    fontSize: 12,
    color: '#9CA3AF',
  },

  // ==========================================================
  // NO PRODUCTS
  // ==========================================================

  noProductsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  noProductsIcon: {
    fontSize: 32,
  },

  noProductsTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  noProductsText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
    textAlign: 'center',
  },
});