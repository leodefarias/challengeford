import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { FontFamily, FontSize, Spacing, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  label: string;
  url?: string;
}

export default function SourceBadge({ label, url }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.container, !url && styles.disabled]}
      onPress={() => url && Linking.openURL(url)}
      activeOpacity={url ? 0.7 : 1}
      disabled={!url}
    >
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.icon}>↗</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 4,
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.35,
  },
  text: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: colors.textMuted,
  },
  icon: {
    fontSize: FontSize.sm,
    color: colors.textMuted,
  },
});
