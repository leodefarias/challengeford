import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  header?: string;
  body: string;
  highlight?: boolean;
}

export default function InsightCard({ header, body, highlight = false }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      {header ? <Text style={styles.header}>{header}</Text> : null}
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  cardHighlight: {
    borderColor: colors.accentBlue + '60',
  },
  header: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: colors.accentBlue,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
