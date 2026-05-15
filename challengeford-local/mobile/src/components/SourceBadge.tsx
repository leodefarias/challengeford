import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '../theme';

interface Props {
  label: string;
}

export default function SourceBadge({ label }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.icon}>↗</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardLight,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  icon: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
