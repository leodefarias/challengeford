import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../theme';

interface Props {
  header?: string;
  body: string;
  highlight?: boolean;
}

export default function InsightCard({ header, body, highlight = false }: Props) {
  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      {header ? <Text style={styles.header}>{header}</Text> : null}
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  cardHighlight: {
    borderColor: Colors.accentBlue + '60',
  },
  header: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: Colors.accentBlue,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
