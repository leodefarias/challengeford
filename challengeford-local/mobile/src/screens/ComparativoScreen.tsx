import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, Shadow, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import Navbar from '../components/Navbar';
import { getCatalogos, comparar, CatalogoResumo, Comparativo } from '../services/api';
import { isDemoMode } from '../utils/demo';

function formatVal(val: any): string {
  if (val === null || val === undefined) return '—';
  if (val === true) return '✓';
  if (val === false) return '—';
  if (typeof val === 'number') return Number.isInteger(val) ? String(val) : val.toFixed(1);
  return String(val);
}

function toLabel(attr: string): string {
  const LABELS: Record<string, string> = {
    potencia_cv: 'Potência (cv)', torque_nm: 'Torque (Nm)', preco_tabela_brl: 'Preço (R$)',
    camera_360: 'Câmera 360°', frenagem_autonoma: 'Frenagem Aut.', profundidade_vadeo_mm: 'Vadeo (mm)',
    angulo_ataque_graus: 'Ângulo At. (°)', tracao: 'Tração', airbags_quantidade: 'Airbags',
    cambio_marchas: 'Marchas', capacidade_reboque_kg: 'Reboque (kg)', capacidade_carga_kg: 'Carga (kg)',
    controle_descida: 'Controle Descida', conexao_sem_fio: 'CarPlay sem fio',
  };
  return LABELS[attr] ?? attr.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function vehicleShortName(full: string): string {
  const parts = full.split(' ');
  return parts.slice(0, 2).join('\n').toUpperCase();
}

export default function ComparativoScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [catalogos, setCatalogos] = useState<CatalogoResumo[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [comparativo, setComparativo] = useState<Comparativo | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingComp, setLoadingComp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demoStarted = useRef(false);

  const loadCatalogos = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await getCatalogos();
      setCatalogos(list);
      if (isDemoMode() && !demoStarted.current) {
        const raptor = list.find(c => /raptor/i.test(`${c.marca} ${c.modelo} ${c.versao}`));
        const hilux = list.find(c => /hilux/i.test(`${c.marca} ${c.modelo}`));
        const ids = [raptor?.id, hilux?.id].filter((id): id is number => typeof id === 'number');
        const fallback = ids.length >= 2 ? ids : list.slice(0, 2).map(c => c.id);
        if (fallback.length >= 2) {
          demoStarted.current = true;
          setSelected(fallback);
          setLoadingComp(true);
          try {
            setComparativo(await comparar(fallback));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setLoadingComp(false);
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadCatalogos(); }, [loadCatalogos]);

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
    setComparativo(null);
  };

  const runComparativo = async () => {
    if (selected.length < 2) return;
    setLoadingComp(true);
    setError(null);
    try {
      const result = await comparar(selected);
      setComparativo(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingComp(false);
    }
  };

  const veiculos = comparativo?.veiculos ?? [];
  const atributos = comparativo?.atributosComparados ?? [];
  const tabela = comparativo?.tabela ?? {};
  const destaques = comparativo?.destaques ?? {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        <View style={styles.section}>
          <Text style={styles.title}>Comparativo Competitivo</Text>
          <Text style={styles.subtitle}>
            {selected.length === 0
              ? 'Selecione ao menos 2 veículos para comparar'
              : selected.length === 1
              ? 'Selecione mais 1 veículo para comparar'
              : `${selected.length} veículos selecionados`}
          </Text>
        </View>

        {loadingList ? (
          <ActivityIndicator color={colors.accentBlue} />
        ) : (
          <View style={styles.selectorGrid}>
            {catalogos.map(c => {
              const isSelected = selected.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                  onPress={() => toggleSelect(c.id)}
                >
                  <Text style={[styles.selectorText, isSelected && styles.selectorTextActive]}>
                    {c.marca.toUpperCase()} {c.modelo}
                  </Text>
                  <Text style={[styles.selectorSub, isSelected && styles.selectorTextActive]}>
                    {c.versao}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selected.length >= 2 && (
          <TouchableOpacity
            style={[styles.compareBtn, loadingComp && styles.compareBtnDisabled]}
            onPress={runComparativo}
            disabled={loadingComp}
          >
            {loadingComp
              ? <ActivityIndicator color="#f2f2f2" />
              : <Text style={styles.compareBtnText}>Comparar {selected.length} veículos</Text>
            }
          </TouchableOpacity>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {comparativo && veiculos.length > 0 && (
          <>
            <View style={styles.section}>
              <Text style={styles.title}>Atributos normalizados</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.headerCell, { width: 130 }]}>ATRIBUTO</Text>
                  {veiculos.map((v, i) => (
                    <Text key={i} style={[styles.headerCell, { width: 90, color: i === 0 ? colors.accentBlue : colors.textPrimary }]}>
                      {vehicleShortName(v)}
                    </Text>
                  ))}
                </View>

                {atributos
                  .filter(attr => veiculos.some(v => tabela[v]?.[attr] !== null && tabela[v]?.[attr] !== undefined))
                  .slice(0, 20)
                  .map((attr, i) => (
                    <View key={attr} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={[styles.cellLabel, { width: 130 }]}>{toLabel(attr)}</Text>
                      {veiculos.map((v, j) => {
                        const isWinner = destaques[attr] === v;
                        return (
                          <Text key={j} style={[styles.cellValue, { width: 90 }, isWinner && { color: colors.accentGreen }]}>
                            {formatVal(tabela[v]?.[attr])}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
              </View>
            </ScrollView>
          </>
        )}

        {!loadingList && catalogos.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum catálogo disponível.</Text>
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
  section: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  title: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.sm, color: colors.textMuted },
  selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  selectorChip: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.card,
    minWidth: 120,
  },
  selectorChipActive: { borderColor: colors.accentBlue, backgroundColor: colors.accentBlue + '22' },
  selectorText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textMuted },
  selectorSub: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm - 1, color: colors.textMuted, marginTop: 2 },
  selectorTextActive: { color: colors.accentBlue },
  compareBtn: {
    backgroundColor: colors.accentBlue,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  compareBtnDisabled: { opacity: 0.6 },
  compareBtnText: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: '#f2f2f2' },
  errorBox: {
    backgroundColor: '#ea454522',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#ea4545',
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  errorText: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: '#ea4545' },
  table: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  tableHeader: { backgroundColor: colors.cardLight },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableRowAlt: { backgroundColor: colors.card + '80' },
  headerCell: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: colors.textPrimary,
    padding: Spacing.sm,
    textAlign: 'center',
  },
  cellLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.sm,
    color: colors.textMuted,
    padding: Spacing.sm,
    paddingLeft: Spacing.base,
  },
  cellValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.md,
    color: colors.textPrimary,
    padding: Spacing.sm,
    textAlign: 'center',
  },
  emptyBox: { marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.xl },
  emptyText: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: colors.textPrimary },
});
