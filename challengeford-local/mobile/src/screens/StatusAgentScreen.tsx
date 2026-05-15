import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../theme';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';

interface AgentRow {
  brand: string;
  status: string;
  atributos: number;
}

const AGENT_ROWS: AgentRow[] = [
  { brand: 'Ford Ranger Raptor', status: 'Completo', atributos: 95 },
  { brand: 'Toyota Hilux GR-S', status: 'Completo', atributos: 75 },
  { brand: 'VW Amarok V6', status: 'Revisão', atributos: 75 },
  { brand: 'Chevrolet S10 High Country', status: 'Incompleto', atributos: 42 },
];

function progressColor(pct: number) {
  if (pct >= 90) return Colors.accentGreen;
  if (pct >= 70) return Colors.accentBlue;
  if (pct >= 40) return '#ed9f33';
  return '#ea4545';
}

export default function StatusAgentScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        <View style={styles.section}>
          <Text style={styles.title}>Status do Agente</Text>
          <Text style={styles.subtitle}>Progresso de extração por catálogo</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.headerCell, { flex: 2 }]}>CATÁLOGO</Text>
            <Text style={styles.headerCell}>STATUS</Text>
            <Text style={[styles.headerCell, { flex: 1.5 }]}>ATRIBUTOS</Text>
          </View>
          {AGENT_ROWS.map((row, i) => (
            <View key={i} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
              <Text style={[styles.brandCell, { flex: 2 }]}>{row.brand}</Text>
              <View style={styles.statusCol}>
                <StatusBadge status={row.status} />
              </View>
              <View style={[styles.progressCol, { flex: 1.5 }]}>
                <Text style={styles.progressText}>{row.atributos}%</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${row.atributos}%`, backgroundColor: progressColor(row.atributos) }]} />
                </View>
              </View>
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
  section: { marginTop: Spacing.xl, marginBottom: Spacing.base },
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
    ...Shadow.card,
  },
  headerRow: {
    backgroundColor: '#30343d',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowAlt: { backgroundColor: Colors.card + '80' },
  headerCell: {
    flex: 1,
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: Spacing.sm,
  },
  brandCell: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    paddingLeft: Spacing.sm,
    flexShrink: 1,
  },
  progressCol: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  progressText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#4b4d55',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.accentBlue,
    borderRadius: 2,
  },
  statusCol: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: Spacing.sm,
  },
});
