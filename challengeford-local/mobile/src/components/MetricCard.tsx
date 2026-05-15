import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../theme';
import SourceBadge from './SourceBadge';
import CircularProgress from './CircularProgress';

interface Props {
  label: string;
  value?: string | number;
  unit?: string;
  source?: string;
  scoreValue?: number;
  scoreLabel?: string;
  scoreSubLabel?: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  source,
  scoreValue,
  scoreLabel,
  scoreSubLabel,
}: Props) {
  const isScore = scoreValue !== undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {isScore ? (
        <View style={styles.scoreContent}>
          <CircularProgress value={scoreValue!} size={65} strokeWidth={5} />
          <View style={styles.scoreText}>
            <Text style={styles.scoreLabel}>{scoreLabel}</Text>
            <Text style={styles.scoreSubLabel}>{scoreSubLabel}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.valueRow}>
            <Text style={styles.currencyPrefix}>
              {typeof value === 'string' && value.startsWith('R$') ? 'R$' : ''}
            </Text>
            <Text style={[styles.value, { color: getValueColor(label) }]}>
              {typeof value === 'string' && value.startsWith('R$')
                ? value.replace('R$', '')
                : value}
            </Text>
            {unit ? <Text style={styles.unit}>{unit}</Text> : null}
          </View>
          {source ? <SourceBadge label={source} /> : null}
        </View>
      )}
    </View>
  );
}

function getValueColor(label: string): string {
  return Colors.textPrimary;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 113,
    ...Shadow.card,
  },
  label: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginTop: Spacing.xs,
  },
  currencyPrefix: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.lg,
    color: Colors.textMuted,
    paddingBottom: 6,
  },
  value: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize['4xl'],
    color: Colors.textPrimary,
    lineHeight: 48,
  },
  unit: {
    fontFamily: FontFamily.displayMedium,
    fontSize: FontSize.lg,
    color: Colors.textMuted,
    paddingBottom: 8,
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  scoreText: {
    flex: 1,
  },
  scoreLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  scoreSubLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
