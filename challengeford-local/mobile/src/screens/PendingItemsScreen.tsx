import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../theme';
import Navbar from '../components/Navbar';

type TermStatus = 'Pendente' | 'Mapeado';

interface UnknownTerm {
  id: string;
  term: string;
  status: TermStatus;
  context: string;
  suggestion: string;
}

const INITIAL_TERMS: UnknownTerm[] = [
  {
    id: '1',
    term: 'S-Flow',
    status: 'Pendente',
    context: '...com sistema S-Flow de distribuição de ar condicionado para todas as fileiras...',
    suggestion: 'ar_condicionado',
  },
  {
    id: '2',
    term: 'My mode Raptor',
    status: 'Pendente',
    context: '...modo personalizável MyMode Raptor que permite ajuste individual dos parâmetros..',
    suggestion: 'modos_conducao',
  },
  {
    id: '3',
    term: 'DAC',
    status: 'Mapeado',
    context: '...equipado com DAC (Downhill Assist Control)...',
    suggestion: 'modos_conducao',
  },
];

function statusColor(s: TermStatus) {
  return s === 'Mapeado' ? Colors.accentGreen : '#ed9f33';
}

export default function PendingItemsScreen() {
  const [terms, setTerms] = useState<UnknownTerm[]>(INITIAL_TERMS);

  const pendingCount = terms.filter((t) => t.status === 'Pendente').length;

  const confirm = (id: string) => {
    setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Mapeado' } : t)));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        <View style={styles.titleRow}>
          <Text style={styles.title}>Termos desconhecidos</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount} Termos</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>Detectados automaticamente pelo sistema.</Text>

        {terms.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.termName}>"{item.term}"</Text>
              <View style={[styles.statusBadge, { borderColor: statusColor(item.status), backgroundColor: statusColor(item.status) + '22' }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.context}>{item.context}</Text>

            <View style={styles.suggestionRow}>
              <Text style={styles.suggestionLabel}>Sugestão do sistema:</Text>
              <View style={styles.suggestionChip}>
                <Text style={styles.suggestionChipText}>{item.suggestion}</Text>
              </View>
            </View>

            {item.status === 'Pendente' && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => confirm(item.id)}>
                  <Text style={styles.confirmBtnText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            )}

            {item.status === 'Mapeado' && (
              <View style={styles.mappedRow}>
                <Text style={styles.mappedLabel}>Mapeado para:</Text>
                <View style={styles.mappedChip}>
                  <Text style={styles.mappedChipText}>{item.suggestion}</Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: '#ed9f3333',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ed9f33',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: '#ed9f33',
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: Spacing.base,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  termName: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
  },
  context: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  suggestionLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  suggestionChip: {
    backgroundColor: Colors.accentBlue + '33',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accentBlue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  suggestionChipText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.accentBlue,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.accentBlue,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  mappedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  mappedLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  mappedChip: {
    backgroundColor: Colors.accentGreen + '22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accentGreen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  mappedChipText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.accentGreen,
  },
});
