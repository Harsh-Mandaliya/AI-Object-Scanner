import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow } from '@/constants/theme';
import type { ObjectAnalysis } from '@/services/scannerApi';
import { confidenceInfo, type ConfidenceLevel } from '@/services/utils';

const CONFIDENCE_COLORS: Record<ConfidenceLevel, { bg: string; fg: string }> = {
  high: { bg: colors.successSoft, fg: colors.success },
  medium: { bg: colors.warningSoft, fg: colors.warning },
  low: { bg: colors.dangerSoft, fg: colors.danger },
};

export default function ObjectCard({ object }: { object: ObjectAnalysis }) {
  const confidence = confidenceInfo(object.confidence);
  const badge = CONFIDENCE_COLORS[confidence.level];
  const features = Array.isArray(object.features) ? object.features.filter((f) => typeof f === 'string' && f.trim()) : [];

  // Only show rows that have a real value, so the card is not full of "Unknown".
  const details: { label: string; value: string | null; icon: string }[] = [
    { label: 'Brand', value: object.brand, icon: '🏷️' },
    { label: 'Model', value: object.model, icon: '🔢' },
    { label: 'Type', value: object.type !== 'Unknown' ? object.type : null, icon: '📦' },
    { label: 'Color', value: object.color, icon: '🎨' },
    { label: 'Material', value: object.material, icon: '🧱' },
  ].filter((row) => typeof row.value === 'string' && row.value.trim().length > 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={3}>
            {object.name || 'Unknown Object'}
          </Text>
          {object.category && object.category !== 'Unknown' ? (
            <Text style={styles.category}>{object.category}</Text>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeValue, { color: badge.fg }]}>{confidence.percent}%</Text>
          <Text style={[styles.badgeLabel, { color: badge.fg }]}>{confidence.level}</Text>
        </View>
      </View>

      {confidence.level === 'low' ? (
        <Text style={styles.lowConfidence}>
          The AI is not sure about this one. Try a closer, well-lit photo for a better match.
        </Text>
      ) : null}

      {object.description ? <Text style={styles.description}>{object.description}</Text> : null}

      {details.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.grid}>
            {details.map((row) => (
              <View key={row.label} style={styles.gridItem}>
                <Text style={styles.gridIcon}>{row.icon}</Text>
                <View style={styles.gridText}>
                  <Text style={styles.gridLabel}>{row.label}</Text>
                  <Text style={styles.gridValue} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {features.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.chips}>
            {features.map((feature, index) => (
              <View key={`${feature}-${index}`} style={styles.chip}>
                <Text style={styles.chipCheck}>✓</Text>
                <Text style={styles.chipText}>{feature}</Text>
              </View>
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
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 28 },
  category: { marginTop: 4, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  badge: { marginLeft: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, alignItems: 'center' },
  badgeValue: { fontSize: 15, fontWeight: '800' },
  badgeLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  lowConfidence: {
    marginTop: 12,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 18,
  },
  description: { marginTop: 14, fontSize: 15, lineHeight: 22, color: '#374151' },

  section: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  gridItem: { width: '50%', paddingHorizontal: 5, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  gridIcon: { fontSize: 18, marginRight: 8 },
  gridText: { flex: 1, minWidth: 0 },
  gridLabel: { fontSize: 11, color: colors.textSubtle, fontWeight: '600', marginBottom: 2 },
  gridValue: { fontSize: 14, color: '#1F2937', fontWeight: '700' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: '100%',
  },
  chipCheck: { color: colors.success, fontSize: 12, fontWeight: '800', marginRight: 6 },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '600', flexShrink: 1 },
});
