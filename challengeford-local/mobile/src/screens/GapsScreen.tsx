import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../theme';
import Navbar from '../components/Navbar';

type Relevance = 'Alta relevância' | 'Média relevância' | 'Baixa relevância';

function relevanceColor(r: Relevance): string {
  switch (r) {
    case 'Alta relevância': return '#ea4545';
    case 'Média relevância': return '#ed9f33';
    default: return Colors.accentBlue;
  }
}

interface GapItem {
  num: string;
  title: string;
  description: string;
  relevance: Relevance;
  impact: string;
}

const GAPS: GapItem[] = [
  {
    num: '01',
    title: 'Conectividade sem fio — Carplay & Android Auto',
    description: 'Capability: Sistema Multimídia. Líder: Hilux GR-S (nível 3) - Raptor: nível 1',
    relevance: 'Alta relevância',
    impact: '-8.4pts',
  },
  {
    num: '02',
    title: 'Estacionamento automático',
    description: 'Capability: Estacionamento. Líder Amarok V6 (nível 2). Raptor (nível 0)',
    relevance: 'Média relevância',
    impact: '-5.1pts',
  },
  {
    num: '03',
    title: 'Bancos ventilados',
    description: 'Capability: Bancos. Líder S10 High Country (nível 3). Raptor (nível 1)',
    relevance: 'Baixa relevância',
    impact: '-5.1pts',
  },
  {
    num: '04',
    title: 'Teto solar panorâmico',
    description: 'Capability: Conforto. Líder Amarok V6 (sim). Raptor: Não disponível',
    relevance: 'Baixa relevância',
    impact: '-5.1pts',
  },
];

export default function GapsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        <View style={styles.section}>
          <Text style={styles.title}>Gaps Acionáveis</Text>
          <Text style={styles.subtitle}>Perfil: Performance Off-Road</Text>
          <Text style={styles.subtitle}>Impacto ajustado pelo perfil de competição</Text>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          {(['Alta relevância', 'Média relevância', 'Baixa relevância'] as Relevance[]).map((r) => {
            const c = relevanceColor(r);
            return (
              <View key={r} style={[styles.legendBadge, { borderColor: c, backgroundColor: c + '33' }]}>
                <Text style={[styles.legendText, { color: c }]}>{r}</Text>
              </View>
            );
          })}
        </View>

        {/* Gap Cards */}
        {GAPS.map((gap, i) => {
          const c = relevanceColor(gap.relevance);
          return (
            <View key={i} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardNum}>{gap.num}</Text>
                <Text style={styles.cardTitle}>{gap.title}</Text>
              </View>
              <Text style={styles.cardDesc}>{gap.description}</Text>
              <View style={styles.cardBottom}>
                <Text style={[styles.impact, { color: c }]}>{gap.impact}</Text>
                <View style={[styles.badge, { borderColor: c, backgroundColor: c + '33' }]}>
                  <Text style={[styles.badgeText, { color: c }]}>{gap.relevance}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Insight Card */}
        <View style={styles.insightCard}>
          <Text style={styles.insightHeader}>INSIGHT GERADO PELO SISTEMA</Text>
          <Text style={styles.insightBody}>
            A Raptor <Text style={{ color: Colors.accentBlue }}>lidera em specs absolutos</Text> (potência, off-road){' '}
            mas perde em custo-benefício. O gap mais impactante no perfil de competição é conectividade sem fio —
            presente em 4 de 5 concorrentes.
          </Text>
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
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  legendBadge: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  legendText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  cardNum: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  cardTitle: {
    flex: 1,
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impact: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
  },
  badge: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
  },
  insightCard: {
    backgroundColor: Colors.accentBlue + '1A',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accentBlue,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  insightHeader: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  insightBody: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
});
