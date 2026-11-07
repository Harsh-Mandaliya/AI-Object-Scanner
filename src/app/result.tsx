import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeIn, Pulse, ScanLine, Skeleton } from '@/components/motion';
import ObjectCard from '@/components/ObjectCard';
import ProductCard from '@/components/ProductCard';
import { colors, gradients, radius, shadow } from '@/constants/theme';
import { scanObject, type ScannerResult } from '@/services/scannerApi';
import { getCapturedImage } from '@/services/scannerSession';
import { formatPrice, formatPriceRange, googleShoppingUrl } from '@/services/utils';

type Status = 'analyzing' | 'done' | 'error';

const IMAGE_HEIGHT = 260;

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
        <FadeIn style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="image-outline" size={40} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No image yet</Text>
          <Text style={styles.emptyText}>Take a photo or choose one from your library first.</Text>
          <Pressable onPress={scanAgain}>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
              <Ionicons name="scan" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Scan an Object</Text>
            </LinearGradient>
          </Pressable>
        </FadeIn>
      </SafeAreaView>
    );
  }

  const currency = result?.priceRange.currency ?? 'INR';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Result</Text>
        <Pressable style={styles.newScan} onPress={scanAgain} accessibilityLabel="Scan another object">
          <Ionicons name="scan" size={16} color={colors.accent} />
          <Text style={styles.newScanText}>New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ---------- Photo ---------- */}
        <FadeIn from={0}>
          <View style={styles.imageCard}>
            <Image source={{ uri: image.uri }} style={styles.image} resizeMode="cover" />
            {status === 'analyzing' ? (
              <View style={styles.imageOverlay}>
                <ScanLine height={IMAGE_HEIGHT} color={colors.cyan} />
                <View style={styles.analyzingPill}>
                  <Pulse max={1.2}>
                    <Ionicons name="sparkles" size={14} color={colors.cyan} />
                  </Pulse>
                  <Text style={styles.analyzingText}>AI is analysing…</Text>
                </View>
              </View>
            ) : null}
            {status === 'done' ? (
              <View style={styles.doneBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.doneText}>Identified</Text>
              </View>
            ) : null}
          </View>
        </FadeIn>

        {/* ---------- Loading skeleton ---------- */}
        {status === 'analyzing' ? (
          <FadeIn delay={100}>
            <View style={styles.card}>
              <View style={styles.steps}>
                <Step icon="eye-outline" label="Recognising the object" active />
                <Step icon="pricetags-outline" label="Looking up prices" />
              </View>
              <Skeleton width="70%" height={22} style={styles.skeletonGap} />
              <Skeleton width="40%" height={12} style={styles.skeletonGap} />
              <Skeleton width="100%" height={12} style={styles.skeletonGap} />
              <Skeleton width="90%" height={12} />
            </View>
          </FadeIn>
        ) : null}

        {/* ---------- Error ---------- */}
        {status === 'error' ? (
          <FadeIn>
            <View style={[styles.card, styles.errorCard]}>
              <View style={styles.errorIcon}>
                <Ionicons name="alert-circle" size={34} color={colors.danger} />
              </View>
              <Text style={styles.statusTitle}>Analysis failed</Text>
              <Text style={styles.statusText}>{error}</Text>
              <View style={styles.buttonRow}>
                <Pressable style={styles.flex} onPress={retry}>
                  <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
                    <Ionicons name="refresh" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Try again</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={[styles.secondaryButton, styles.flex]} onPress={scanAgain}>
                  <Ionicons name="camera-outline" size={18} color={colors.text} />
                  <Text style={styles.secondaryButtonText}>New photo</Text>
                </Pressable>
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* ---------- Result ---------- */}
        {status === 'done' && result ? (
          <>
            <FadeIn delay={50}>
              <ObjectCard object={result.object} />
            </FadeIn>

            <FadeIn delay={180}>
              <LinearGradient colors={gradients.price} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.priceCard}>
                <View style={styles.priceTop}>
                  <View style={styles.priceIcon}>
                    <Ionicons name="pricetags" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.priceLabel}>Market price</Text>
                </View>
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
              </LinearGradient>
            </FadeIn>

            {result.shoppingError ? (
              <FadeIn delay={240}>
                <View style={styles.noticeCard}>
                  <Ionicons name="information-circle" size={20} color="#92400E" />
                  <View style={styles.flex}>
                    <Text style={styles.noticeTitle}>
                      {result.shoppingDisabled ? 'Price search is turned off' : 'Price search failed'}
                    </Text>
                    <Text style={styles.noticeText}>
                      {result.shoppingDisabled
                        ? 'Add SERPAPI_KEY to server/.env to show live product listings and prices.'
                        : result.shoppingError}
                    </Text>
                  </View>
                </View>
              </FadeIn>
            ) : null}

            {result.products.length > 0 ? (
              <View style={styles.section}>
                <FadeIn delay={260}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="bag-handle" size={18} color={colors.accent} />
                    <Text style={styles.sectionTitle}>Matching products</Text>
                  </View>
                </FadeIn>
                {result.products.map((product, index) => (
                  <FadeIn key={`${product.productUrl ?? product.name}-${index}`} delay={300 + index * 70}>
                    <ProductCard
                      product={product}
                      onPress={product.productUrl ? () => openUrl(product.productUrl as string) : undefined}
                    />
                  </FadeIn>
                ))}
              </View>
            ) : null}

            <FadeIn delay={400}>
              <Pressable
                style={styles.searchLink}
                onPress={() => openUrl(googleShoppingUrl(result.object.searchQuery || result.object.name))}
              >
                <Ionicons name="search" size={16} color={colors.accent} />
                <Text style={styles.searchLinkText}>Search “{result.object.searchQuery}” on Google Shopping</Text>
              </Pressable>
            </FadeIn>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ icon, label, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean }) {
  return (
    <View style={styles.step}>
      {active ? (
        <Pulse max={1.15}>
          <View style={[styles.stepIcon, styles.stepIconActive]}>
            <Ionicons name={icon} size={14} color="#FFFFFF" />
          </View>
        </Pulse>
      ) : (
        <View style={styles.stepIcon}>
          <Ionicons name={icon} size={14} color={colors.textSubtle} />
        </View>
      )}
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  newScan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  newScanText: { color: colors.accent, fontWeight: '800', fontSize: 13 },

  scrollContent: { paddingBottom: 40 },

  imageCard: {
    margin: 16,
    marginBottom: 0,
    height: IMAGE_HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    ...shadow,
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15,23,42,0.35)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 14,
  },
  analyzingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  analyzingText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  doneBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(22,163,74,0.9)',
  },
  doneText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow,
  },
  steps: { gap: 10, marginBottom: 18 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconActive: { backgroundColor: colors.accent },
  stepLabel: { fontSize: 14, color: colors.textSubtle, fontWeight: '600' },
  stepLabelActive: { color: colors.text },
  skeletonGap: { marginBottom: 10 },

  errorCard: { alignItems: 'center', borderWidth: 1, borderColor: colors.dangerSoft },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  statusText: { marginTop: 6, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' },

  priceCard: { marginHorizontal: 16, marginBottom: 12, padding: 20, borderRadius: radius.xl, ...shadow },
  priceTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceLabel: { color: '#C7D2FE', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  priceValue: { marginTop: 10, color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  priceMedian: { marginTop: 4, color: '#A5F3FC', fontSize: 14, fontWeight: '700' },
  priceSource: { marginTop: 8, color: '#A5B4FC', fontSize: 12 },

  noticeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    flexDirection: 'row',
    gap: 10,
  },
  noticeTitle: { color: '#92400E', fontWeight: '800', fontSize: 14 },
  noticeText: { color: '#92400E', fontSize: 13, lineHeight: 19, marginTop: 3 },

  section: { marginHorizontal: 16, marginTop: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

  searchLink: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  searchLinkText: { color: colors.accent, fontWeight: '700', fontSize: 14, textAlign: 'center', flexShrink: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 16, fontSize: 22, fontWeight: '800', color: colors.text },
  emptyText: { marginTop: 8, marginBottom: 20, fontSize: 15, color: colors.textMuted, textAlign: 'center' },

  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '700' },
});
