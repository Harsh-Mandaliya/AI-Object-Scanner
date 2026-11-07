import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ObjectCard from '@/components/ObjectCard';
import ProductCard from '@/components/ProductCard';
import { colors, radius, shadow } from '@/constants/theme';
import { scanObject, type ScannerResult } from '@/services/scannerApi';
import { getCapturedImage } from '@/services/scannerSession';
import { formatPrice, formatPriceRange, googleShoppingUrl } from '@/services/utils';

type Status = 'analyzing' | 'done' | 'error';

export default function ResultScreen() {
  // Read synchronously so there is no "no image" flash on the first render.
  const [image] = useState(getCapturedImage);
  const [status, setStatus] = useState<Status>('analyzing');
  const [result, setResult] = useState<ScannerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!image) return;
    let cancelled = false;

    scanObject(image.dataUrl)
      .then((scan) => {
        if (cancelled) return;
        setResult(scan);
        setStatus('done');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to analyse the image.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [image, attempt]);

  const retry = useCallback(() => {
    setStatus('analyzing');
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const scanAgain = useCallback(() => router.replace('/scanner'), []);
  const openUrl = useCallback((url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => undefined);
  }, []);

  if (!image) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No image yet</Text>
          <Text style={styles.emptyText}>Take a photo or choose one from your library first.</Text>
          <Pressable style={styles.primaryButton} onPress={scanAgain}>
            <Text style={styles.primaryButtonText}>Scan an Object</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currency = result?.priceRange.currency ?? 'INR';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Scan Result</Text>
        <Pressable style={styles.headerAction} onPress={scanAgain} accessibilityLabel="Scan another object">
          <Text style={styles.headerActionText}>New scan</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.imageCard}>
          <Image source={{ uri: image.uri }} style={styles.image} resizeMode="cover" />
          {status === 'analyzing' ? (
            <View style={styles.imageOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        {status === 'analyzing' ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Analysing object…</Text>
            <Text style={styles.statusText}>Identifying the object with AI, then looking up shopping listings.</Text>
          </View>
        ) : null}

        {status === 'error' ? (
          <View style={[styles.statusCard, styles.errorCard]}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.statusTitle}>Analysis failed</Text>
            <Text style={styles.statusText}>{error}</Text>
            <View style={styles.buttonRow}>
              <Pressable style={[styles.primaryButton, styles.flexButton]} onPress={retry}>
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, styles.flexButton]} onPress={scanAgain}>
                <Text style={styles.secondaryButtonText}>New photo</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {status === 'done' && result ? (
          <>
            <ObjectCard object={result.object} />

            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Market price</Text>
              <Text style={styles.priceValue}>
                {formatPriceRange(result.priceRange.min, result.priceRange.max, currency)}
              </Text>
              {result.priceRange.median !== null && result.products.length > 2 ? (
                <Text style={styles.priceMedian}>Typical price {formatPrice(result.priceRange.median, currency)}</Text>
              ) : null}
              <Text style={styles.priceSource}>
                {result.products.length > 0
                  ? `From ${result.products.length} Google Shopping listing${result.products.length === 1 ? '' : 's'}`
                  : 'No live listings available'}
              </Text>
            </View>

            {result.shoppingError ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeTitle}>
                  {result.shoppingDisabled ? 'Price search is turned off' : 'Price search failed'}
                </Text>
                <Text style={styles.noticeText}>
                  {result.shoppingDisabled
                    ? 'Add SERPAPI_KEY to server/.env to show live product listings and prices.'
                    : result.shoppingError}
                </Text>
              </View>
            ) : null}

            {result.products.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Matching products</Text>
                {result.products.map((product, index) => (
                  <ProductCard
                    key={`${product.productUrl ?? product.name}-${index}`}
                    product={product}
                    onPress={product.productUrl ? () => openUrl(product.productUrl as string) : undefined}
                  />
                ))}
              </View>
            ) : null}

            <Pressable
              style={styles.searchLink}
              onPress={() => openUrl(googleShoppingUrl(result.object.searchQuery || result.object.name))}
            >
              <Text style={styles.searchLinkText}>Search “{result.object.searchQuery}” on Google Shopping ›</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 34, color: colors.text, marginTop: -4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerAction: { paddingHorizontal: 10, paddingVertical: 8 },
  headerActionText: { color: colors.accent, fontWeight: '700', fontSize: 14 },

  scrollContent: { paddingBottom: 36 },

  imageCard: {
    margin: 16,
    marginBottom: 0,
    height: 260,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17,24,39,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 22,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    ...shadow,
  },
  errorCard: { borderWidth: 1, borderColor: colors.dangerSoft },
  errorIcon: { fontSize: 36, marginBottom: 6 },
  statusTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  statusText: { marginTop: 6, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' },
  flexButton: { flex: 1, marginTop: 0, minWidth: 0 },

  priceCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  priceLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  priceValue: { marginTop: 6, color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  priceMedian: { marginTop: 4, color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
  priceSource: { marginTop: 8, color: '#9CA3AF', fontSize: 12 },

  noticeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  noticeTitle: { color: '#92400E', fontWeight: '700', fontSize: 14 },
  noticeText: { color: '#92400E', fontSize: 13, lineHeight: 19, marginTop: 4 },

  section: { marginHorizontal: 16, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10 },

  searchLink: { marginHorizontal: 16, marginTop: 10, padding: 14, alignItems: 'center' },
  searchLinkText: { color: colors.accent, fontWeight: '600', fontSize: 14, textAlign: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { marginTop: 12, fontSize: 22, fontWeight: '700', color: colors.text },
  emptyText: { marginTop: 8, fontSize: 15, color: colors.textMuted, textAlign: 'center' },

  primaryButton: {
    marginTop: 22,
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
