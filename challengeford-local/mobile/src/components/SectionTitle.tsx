import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontFamily, FontSize, Spacing, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  title: string;
}

export default function SectionTitle({ title }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
      <View style={styles.divider} />
    </View>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  text: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: colors.textMuted,
    marginBottom: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
});
