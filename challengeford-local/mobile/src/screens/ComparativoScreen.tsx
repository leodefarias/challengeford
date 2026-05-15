import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../theme';
import Navbar from '../components/Navbar';

interface CompRow {
  label: string;
  ford: string;
  toyota: string;
  vw: string;
  fordHighlight?: boolean;
}

const ROWS: CompRow[] = [
  { label: 'Potência (cv)', ford: '397', toyota: '224', vw: '272', fordHighlight: true },
  { label: 'Torque (Nm)', ford: '583', toyota: '500', vw: '600', fordHighlight: true },
  { label: 'Preço (R$)', ford: '470k', toyota: '340k', vw: '415k' },
  { label: 'Câmera 360°', ford: '✓', toyota: '✓', vw: '—' },
  { label: 'Frenagem Aut.', ford: '✓', toyota: '✓', vw: '✓' },
  { label: 'Vadeo (mm)', ford: '850', toyota: '700', vw: '500', fordHighlight: true },
  { label: 'Ângulo At. (°)', ford: '32.5', toyota: '29.0', vw: '24.0', fordHighlight: true },
  { label: 'Tração', ford: '4x4', toyota: '4x4', vw: '4x4_int' },
];

interface CapabilityRow {
  label: string;
  fordLevel: number;
  toyotaLevel: number;
  maxLevel?: number;
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  { label: 'Visibilidade Traseira', fordLevel: 2, toyotaLevel: 2, maxLevel: 3 },
  { label: 'Performance Motor', fordLevel: 3, toyotaLevel: 3, maxLevel: 3 },
  { label: 'Capacidade Off-Road', fordLevel: 3, toyotaLevel: 3, maxLevel: 3 },
  { label: 'Frenagem Inteligente', fordLevel: 2, toyotaLevel: 2, maxLevel: 3 },
];

function LevelDots({ filled, total, color }: { filled: number; total: number; color: string }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i < filled ? color : '#505050' }]}
        />
      ))}
    </View>
  );
}

export default function ComparativoScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        <View style={styles.section}>
          <Text style={styles.title}>Comparativo Competitivo</Text>
          <Text style={styles.subtitle}>Atributos normalizados</Text>
        </View>

        {/* Specs Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.headerCell, { flex: 2 }]}>ATRIBUTO</Text>
            <Text style={[styles.headerCell, { color: Colors.accentBlue }]}>FORD{'\n'}RAPTOR</Text>
            <Text style={styles.headerCell}>TOYOTA{'\n'}HILUX GR-S</Text>
            <Text style={styles.headerCell}>VW{'\n'}ARAROK V6</Text>
          </View>
          {ROWS.map((row, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.cellLabel, { flex: 2 }]}>{row.label}</Text>
              <Text style={[styles.cellValue, row.fordHighlight && { color: Colors.accentGreen }]}>
                {row.ford}
              </Text>
              <Text style={styles.cellValue}>{row.toyota}</Text>
              <Text style={styles.cellValue}>{row.vw}</Text>
            </View>
          ))}
        </View>

        {/* Capability Areas */}
        <View style={styles.section}>
          <Text style={styles.title}>Capability Areas — Níveis de maturidade</Text>
        </View>

        <View style={[styles.table, { marginTop: 0 }]}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.headerCell, { flex: 2 }]}>ÁREA</Text>
            <Text style={[styles.headerCell, { color: Colors.accentBlue }]}>FORD{'\n'}RAPTOR</Text>
            <Text style={styles.headerCell}>HILUX{'\n'}GR-S</Text>
          </View>
          {CAPABILITY_ROWS.map((row, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.cellLabel, { flex: 2 }]}>{row.label}</Text>
              <LevelDots filled={row.fordLevel} total={row.maxLevel || 3} color={Colors.accentGreen} />
              <LevelDots filled={row.toyotaLevel} total={row.maxLevel || 3} color={Colors.accentBlue} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  section: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  table: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  tableHeader: {
    backgroundColor: '#30343d',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableRowAlt: {
    backgroundColor: Colors.card + '80',
  },
  headerCell: {
    flex: 1,
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: Spacing.sm,
    textAlign: 'center',
  },
  cellLabel: {
    flex: 1,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    padding: Spacing.sm,
    paddingLeft: Spacing.base,
  },
  cellValue: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: Spacing.sm,
    textAlign: 'center',
  },
  dotsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
