import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, Shadow, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import SourceBadge from './SourceBadge';
import CircularProgress from './CircularProgress';

interface Props {
  label: string;
  value?: string | number;
  unit?: string;
  source?: string;
  sourceUrl?: string;
  scoreValue?: number;
  scoreLabel?: string;
  scoreSubLabel?: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  source,
  sourceUrl,
  scoreValue,
  scoreLabel,
  scoreSubLabel,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
            <Text style={styles.value}>
              {typeof value === 'string' && value.startsWith('R$')
                ? value.replace('R$', '')
                : value}
            </Text>
            {unit ? <Text style={styles.unit}>{unit}</Text> : null}
          </View>
          {source ? <SourceBadge label={source} url={sourceUrl} /> : null}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.md,
    minHeight: 113,
    ...Shadow.card,
  },
  label: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: colors.textMuted,
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
    color: colors.textMuted,
    paddingBottom: 6,
  },
  value: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize['4xl'],
    color: colors.textPrimary,
    lineHeight: 48,
  },
  unit: {
    fontFamily: FontFamily.displayMedium,
    fontSize: FontSize.lg,
    color: colors.textMuted,
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
    color: colors.textPrimary,
  },
  scoreSubLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
});
