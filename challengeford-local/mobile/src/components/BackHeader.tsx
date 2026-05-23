import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontFamily, FontSize, Spacing, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  navigation: any;
  title: string;
}

export default function BackHeader({ navigation, title }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.lg,
    color: colors.textPrimary,
  },
  spacer: { width: 40 },
});
