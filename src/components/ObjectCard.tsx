import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FadeIn, ProgressBar } from '@/components/motion';
import { colors, radius, shadow } from '@/constants/theme';
import type { ObjectAnalysis } from '@/services/scannerApi';
import { confidenceInfo, type ConfidenceLevel } from '@/services/utils';

const CONFIDENCE_COLORS: Record<ConfidenceLevel, { bg: string; fg: string }> = {
  high: { bg: colors.successSoft, fg: colors.success },
  medium: { bg: colors.warningSoft, fg: colors.warning },
  low: { bg: colors.dangerSoft, fg: colors.danger },
};

type IconName = keyof typeof Ionicons.glyphMap;

export default function ObjectCard({ object }: { object: ObjectAnalysis }) {
  const confidence = confidenceInfo(object.confidence);
  const badge = CONFIDENCE_COLORS[confidence.level];
  const features = Array.isArray(object.features) ? object.features.filter((f) => typeof f === 'string' && f.trim()) : [];

  // Only show rows that have a real value, so the card is not full of "Unknown".
  const details: { label: string; value: string | null; icon: IconName }[] = [
    { label: 'Brand', value: object.brand, icon: 'ribbon-outline' },
    { label: 'Model', value: object.model, icon: 'barcode-outline' },
    { label: 'Type', value: object.type !== 'Unknown' ? object.type : null, icon: 'cube-outline' },
    { label: 'Color', value: object.color, icon: 'color-palette-outline' },
    { label: 'Material', value: object.material, icon: 'layers-outline' },
  ].filter((row): row is { label: string; value: string; icon: IconName } => typeof row.value === 'string' && row.value.trim().length > 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {object.category && object.category !== 'Unknown' ? (
            <View style={styles.categoryPill}>
              <Ionicons name="pricetag" size={11} color={colors.accent} />
              <Text style={styles.category}>{object.category}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={3}>
            {object.name || 'Unknown Object'}
          </Text>
        </View>
      </View>

      <View style={styles.confidence}>
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>{confidence.label}</Text>
          <Text style={[styles.confidenceValue, { color: badge.fg }]}>{confidence.percent}%</Text>
        </View>
        <ProgressBar value={confidence.percent / 100} color={badge.fg} track={badge.bg} />
      </View>

      {confidence.level === 'low' ? (
        <View style={styles.lowConfidence}>
          <Ionicons name="camera-outline" size={16} color="#991B1B" />
          <Text style={styles.lowConfidenceText}>
            The AI isn’t sure about this one. Try a closer, well-lit photo for a better match.
          </Text>
        </View>
      ) : null}

      {object.description ? <Text style={styles.description}>{object.description}</Text> : null}

      {details.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.grid}>
            {details.map((row, index) => (
              <FadeIn key={row.label} delay={250 + index * 60} style={styles.gridItem}>
                <View style={styles.gridIcon}>
                  <Ionicons name={row.icon} size={17} color={colors.accent} />
                </View>
                <View style={styles.gridText}>
                  <Text style={styles.gridLabel}>{row.label}</Text>
                  <Text style={styles.gridValue} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              </FadeIn>
            ))}
          </View>
        </View>
      ) : null}

      {features.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.chips}>
            {features.map((feature, index) => (
              <FadeIn key={`${feature}-${index}`} delay={400 + index * 60} from={8}>
                <View style={styles.chip}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                  <Text style={styles.chipText}>{feature}</Text>
                </View>
              </FadeIn>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, minWidth: 0 },
  categoryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    marginBottom: 8,
  },
  category: { fontSize: 11, color: colors.accent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, lineHeight: 30 },

  confidence: { marginTop: 16 },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  confidenceLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  confidenceValue: { fontSize: 13, fontWeight: '900' },

  lowConfidence: {
    marginTop: 12,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  lowConfidenceText: { flex: 1, color: '#991B1B', fontSize: 13, lineHeight: 18 },
  description: { marginTop: 16, fontSize: 15, lineHeight: 23, color: '#334155' },

  section: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  gridItem: { width: '50%', paddingHorizontal: 5, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  gridIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  gridText: { flex: 1, minWidth: 0 },
  gridLabel: { fontSize: 11, color: colors.textSubtle, fontWeight: '700', marginBottom: 1 },
  gridValue: { fontSize: 14, color: '#1E293B', fontWeight: '800' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    maxWidth: '100%',
  },
  chipText: { fontSize: 13, color: '#14532D', fontWeight: '700', flexShrink: 1 },
});
