import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import BackHeader from '../components/BackHeader';
import StatusBadge from '../components/StatusBadge';
import { getCatalogos, CatalogoResumo, extrairCatalogo } from '../services/api';

function progressColor(pct: number): string {
  if (pct >= 90) return Colors.accentGreen;
  if (pct >= 70) return Colors.accentBlue;
  if (pct >= 40) return '#ed9f33';
  return '#ea4545';
}

function mapStatus(status: string): string {
  switch (status) {
    case 'completo': return 'Completo';
    case 'parcial': return 'Revisão';
    case 'pendente_revisao': return 'Incompleto';
    default: return status;
  }
}

export default function StatusAgentScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [catalogos, setCatalogos] = useState<CatalogoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getCatalogos();
      setCatalogos(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const atualizarUm = async (c: CatalogoResumo) => {
    setUpdatingId(c.id);
    setError(null);
    try {
      await extrairCatalogo(c.marca, c.modelo, c.versao, true);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const atualizarTodos = async () => {
    setUpdatingAll(true);
    setError(null);
    try {
      for (const c of catalogos) {
        setUpdatingId(c.id);
        await extrairCatalogo(c.marca, c.modelo, c.versao, true);
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpdatingId(null);
      setUpdatingAll(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackHeader navigation={navigation} title="Status do Agente" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Progresso de extração por catálogo</Text>
          <TouchableOpacity
            style={[styles.updateAllBtn, updatingAll && { opacity: 0.5 }]}
            onPress={atualizarTodos}
            disabled={updatingAll || catalogos.length === 0}
          >
            <Text style={styles.updateAllText}>
              {updatingAll ? 'Atualizando fontes…' : 'Atualizar todos das fontes'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accentBlue} />
        ) : error ? (
          <TouchableOpacity style={styles.errorBox} onPress={load}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        ) : catalogos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum catálogo processado.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.headerCell, { flex: 2 }]}>CATÁLOGO</Text>
              <Text style={styles.headerCell}>STATUS</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>COBERTURA</Text>
            </View>
            {catalogos.map((c, i) => {
              const pct = Math.round(c.coberturaPct ?? 0);
              const statusStr = mapStatus(c.status);
              const brand = `${c.marca.charAt(0).toUpperCase() + c.marca.slice(1)} ${c.modelo} ${c.versao}`;
              const live = c.coberturaLivePct != null ? Math.round(c.coberturaLivePct) : null;
              return (
                <View key={c.id} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                  <Text style={[styles.brandCell, { flex: 2 }]} numberOfLines={2}>{brand}</Text>
                  <View style={styles.statusCol}>
                    <StatusBadge status={statusStr} />
                  </View>
                  <View style={[styles.progressCol, { flex: 1.5 }]}>
                    <Text style={styles.progressText}>
                      {pct}%{live != null ? ` · vivo ${live}%` : ' · seed'}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: progressColor(pct) }]} />
                    </View>
                    <TouchableOpacity
                      style={styles.refreshBtn}
                      onPress={() => atualizarUm(c)}
                      disabled={updatingAll || updatingId === c.id}
                    >
                      <Text style={styles.refreshText}>
                        {updatingId === c.id ? 'Extraindo…' : 'Atualizar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  section: { marginTop: Spacing.xl, marginBottom: Spacing.base },
  subtitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.sm, color: colors.textMuted },
  table: { borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...Shadow.card },
  headerRow: { backgroundColor: colors.cardLight },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowAlt: { backgroundColor: colors.card + '80' },
  headerCell: { flex: 1, fontFamily: FontFamily.mono, fontSize: FontSize.md, color: colors.textPrimary, padding: Spacing.sm },
  brandCell: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textPrimary, paddingLeft: Spacing.sm, flexShrink: 1 },
  progressCol: { flex: 1, paddingHorizontal: Spacing.sm },
  progressText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textPrimary, marginBottom: 4 },
  progressTrack: { height: 4, backgroundColor: colors.borderLight, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  statusCol: { flex: 1, alignItems: 'flex-end', paddingRight: Spacing.sm },
  errorBox: { marginTop: Spacing.md, backgroundColor: '#ea454522', borderRadius: Radius.md, borderWidth: 1, borderColor: '#ea4545', padding: Spacing.base, alignItems: 'center' },
  errorText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, color: '#ea4545', marginBottom: 4 },
  retryText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.accentBlue },
  updateAllBtn: {
    marginTop: Spacing.sm,
    backgroundColor: colors.accentBlue + '22',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  updateAllText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, color: colors.accentBlue },
  refreshBtn: { marginTop: 6 },
  refreshText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.accentBlue },
  emptyBox: { marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.xl },
  emptyText: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: colors.textPrimary },
});
