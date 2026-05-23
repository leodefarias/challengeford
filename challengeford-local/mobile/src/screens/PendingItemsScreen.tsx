import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, Shadow, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import BackHeader from '../components/BackHeader';
import { getTermosPendentes, updateTermoPendente, TermoPendente } from '../services/api';

function statusColor(s: string, colors: ColorScheme): string {
  switch (s) {
    case 'mapeado': return colors.accentGreen;
    case 'descartado': return colors.textMuted;
    default: return '#ed9f33';
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case 'mapeado': return 'Mapeado';
    case 'descartado': return 'Descartado';
    default: return 'Pendente';
  }
}

export default function PendingItemsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [terms, setTerms] = useState<TermoPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendentes, mapeados] = await Promise.all([
        getTermosPendentes('pendente'),
        getTermosPendentes('mapeado'),
      ]);
      setTerms([...pendentes, ...mapeados]);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Acesso negado')) {
        setError('Apenas administradores podem visualizar termos pendentes.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const confirm = async (id: number) => {
    setConfirming(id);
    try {
      await updateTermoPendente(id, 'mapeado');
      setTerms(prev => prev.map(t => t.id === id ? { ...t, status: 'mapeado' } : t));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConfirming(null);
    }
  };

  const pendingCount = terms.filter(t => t.status === 'pendente').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackHeader navigation={navigation} title="Termos Pendentes" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Termos desconhecidos</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount} Termos</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>Detectados automaticamente pelo sistema.</Text>

        {loading ? (
          <ActivityIndicator color={colors.accentBlue} style={{ marginTop: Spacing.xl }} />
        ) : error ? (
          <TouchableOpacity style={styles.errorBox} onPress={load}>
            <Text style={styles.errorText}>{error}</Text>
            {!error.includes('administradores') && <Text style={styles.retryText}>Tentar novamente</Text>}
          </TouchableOpacity>
        ) : terms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum termo detectado.</Text>
            <Text style={styles.emptySub}>Os termos aparecem após extração de catálogos.</Text>
          </View>
        ) : (
          terms.map((item) => {
            const sc = statusColor(item.status, colors);
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.termName}>"{item.termo}"</Text>
                  <View style={[styles.statusBadge, { borderColor: sc, backgroundColor: sc + '22' }]}>
                    <Text style={[styles.statusText, { color: sc }]}>{statusLabel(item.status)}</Text>
                  </View>
                </View>

                {item.contexto ? (
                  <Text style={styles.context} numberOfLines={3}>{item.contexto}</Text>
                ) : null}

                {item.atributoSugerido ? (
                  <View style={styles.suggestionRow}>
                    <Text style={styles.suggestionLabel}>Sugestão do sistema:</Text>
                    <View style={styles.suggestionChip}>
                      <Text style={styles.suggestionChipText}>{item.atributoSugerido}</Text>
                    </View>
                  </View>
                ) : null}

                {item.status === 'pendente' && (
                  <View style={styles.actions}>
                    <View style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Editar</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.confirmBtn, confirming === item.id && styles.confirmBtnDisabled]}
                      onPress={() => confirm(item.id)}
                      disabled={confirming === item.id}
                    >
                      {confirming === item.id
                        ? <ActivityIndicator color="#f2f2f2" size="small" />
                        : <Text style={styles.confirmBtnText}>Confirmar</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === 'mapeado' && item.atributoSugerido ? (
                  <View style={styles.mappedRow}>
                    <Text style={styles.mappedLabel}>Mapeado para:</Text>
                    <View style={styles.mappedChip}>
                      <Text style={styles.mappedChipText}>{item.atributoSugerido}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  title: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: colors.textPrimary },
  badge: { backgroundColor: '#ed9f3333', borderRadius: 10, borderWidth: 1, borderColor: '#ed9f33', paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: '#ed9f33' },
  subtitle: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: colors.textMuted, marginTop: 4, marginBottom: Spacing.base },
  card: { backgroundColor: colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  termName: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: colors.textPrimary, flex: 1, marginRight: Spacing.sm },
  statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  statusText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm },
  context: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: colors.textMuted, lineHeight: 18, marginBottom: Spacing.sm },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  suggestionLabel: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: colors.textMuted },
  suggestionChip: { backgroundColor: colors.accentBlue + '33', borderRadius: 8, borderWidth: 1, borderColor: colors.accentBlue, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  suggestionChipText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.accentBlue },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  editBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  editBtnText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.base, color: colors.textPrimary },
  confirmBtn: { flex: 1, backgroundColor: colors.accentBlue, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.base, color: '#f2f2f2' },
  mappedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  mappedLabel: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: colors.textMuted },
  mappedChip: { backgroundColor: colors.accentGreen + '22', borderRadius: 8, borderWidth: 1, borderColor: colors.accentGreen, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  mappedChipText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.accentGreen },
  errorBox: { marginTop: Spacing.md, backgroundColor: '#ea454522', borderRadius: Radius.md, borderWidth: 1, borderColor: '#ea4545', padding: Spacing.base, alignItems: 'center' },
  errorText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, color: '#ea4545', marginBottom: 4, textAlign: 'center' },
  retryText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.accentBlue },
  emptyBox: { marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.xl },
  emptyText: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: colors.textPrimary, marginBottom: 4 },
  emptySub: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
