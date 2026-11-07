import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow } from '@/constants/theme';
import type { ProductResult } from '@/services/scannerApi';
import { formatPrice } from '@/services/utils';

type Props = {
  product: ProductResult;
  onPress?: () => void;
};

export default function ProductCard({ product, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={`${product.name}, ${formatPrice(product.price, product.currency)}`}
    >
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderIcon}>🛍️</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.source} numberOfLines={1}>
          {product.source || 'Shopping listing'}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={product.price !== null ? styles.price : styles.unavailable}>
            {formatPrice(product.price, product.currency)}
          </Text>
          {product.rating !== null ? (
            <Text style={styles.rating}>
              ★ {product.rating.toFixed(1)}
              {product.reviews ? ` (${product.reviews.toLocaleString('en-IN')})` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow,
  },
  pressed: { opacity: 0.7 },
  image: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: '#FFFFFF' },
  placeholder: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 26 },
  content: { flex: 1, marginLeft: 12, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 19 },
  source: { marginTop: 3, fontSize: 12, color: colors.textMuted },
  bottomRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  price: { fontSize: 16, fontWeight: '800', color: colors.success },
  unavailable: { fontSize: 13, color: colors.textSubtle },
  rating: { fontSize: 12, color: colors.warning, fontWeight: '600' },
  chevron: { marginLeft: 8, fontSize: 26, color: colors.textSubtle },
});
