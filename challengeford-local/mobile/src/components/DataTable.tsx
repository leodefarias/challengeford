import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '../theme';
import SectionTitle from './SectionTitle';

export interface DataRow {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface Props {
  title: string;
  rows: DataRow[];
  columns?: 2;
}

export default function DataTable({ title, rows, columns = 2 }: Props) {
  const col1 = rows.filter((_, i) => i % 2 === 0);
  const col2 = rows.filter((_, i) => i % 2 !== 0);

  return (
    <View style={styles.container}>
      <SectionTitle title={title} />
      <View style={styles.table}>
        {col1.map((row, idx) => (
          <View key={idx} style={styles.tableRow}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>{col1[idx]?.label}</Text>
              <Text style={[styles.cellValue, col1[idx]?.highlight && styles.highlight]}>
                {col1[idx]?.value}
              </Text>
            </View>
            <View style={[styles.cell, styles.cellRight]}>
              <Text style={styles.cellLabel}>{col2[idx]?.label}</Text>
              <Text style={[styles.cellValue, col2[idx]?.highlight && styles.highlight]}>
                {col2[idx]?.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  table: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
  },
  cellRight: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderLight,
  },
  cellLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
  cellValue: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  highlight: {
    color: Colors.accentGreen,
  },
});
