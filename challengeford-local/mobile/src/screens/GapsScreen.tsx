import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import Navbar from '../components/Navbar';
import { getCatalogos, getCatalogo, getRanking, CatalogoResumo, CatalogoDetalhe, CapabilityScore } from '../services/api';

type Relevance = 'Alta relevância' | 'Média relevância' | 'Baixa relevância';

function relevanceColor(r: Relevance): string {
  switch (r) {
    case 'Alta relevância': return '#ea4545';
    case 'Média relevância': return '#ed9f33';
    default: return Colors.accentBlue;
  }
}

function gapRelevance(gap: number): Relevance {
  if (gap >= 2) return 'Alta relevância';
  if (gap >= 1) return 'Média relevância';
  return 'Baixa relevância';
}

function capLabel(key: string): string {
  const MAP: Record<string, string> = {
    potencia_cv: 'Potência do motor',
    torque_nm: 'Torque',
    cambio_marchas: 'Câmbio (marchas)',
    profundidade_vadeo_mm: 'Profundidade de vau',
    angulo_ataque_graus: 'Ângulo de ataque',
    angulo_saida_graus: 'Ângulo de saída',
    angulo_rampa_graus: 'Ângulo de rampa',
    capacidade_reboque_kg: 'Capacidade de reboque',
    capacidade_carga_kg: 'Capacidade de carga',
    airbags_quantidade: 'Quantidade de airbags',
    preco_tabela_brl: 'Preço de tabela',
    emplacamentos_mes_atual: 'Emplacamentos (mês)',
    emplacamentos_acum_ano: 'Emplacamentos (ano)',
    posicao_ranking_segmento: 'Posição no ranking',
    consumo_cidade_km_l: 'Consumo cidade',
    consumo_estrada_km_l: 'Consumo estrada',
    painel_digital_pol: 'Painel digital',
    tela_central_pol: 'Tela central',
    frenagem_autonoma: 'Frenagem autônoma',
    aviso_colisao_frontal: 'Aviso de colisão frontal',
    manutencao_faixa: 'Manutenção de faixa',
    monitoramento_ponto_cego: 'Ponto cego',
    controle_cruzeiro_adaptativo: 'Cruise control adaptativo',
    controle_descida: 'Controle de descida',
    reducao: 'Redução',
    diferencial_bloqueio: 'Diferencial blocante',
    camera_re: 'Câmera de ré',
    camera_360: 'Câmera 360°',
    estacionamento_automatico: 'Estacionamento automático',
    conexao_sem_fio: 'Conectividade sem fio',
    carplay: 'CarPlay / Android Auto',
    android_auto: 'Android Auto',
    carregador_wireless: 'Carregador wireless',
    bancos_ventilados: 'Bancos ventilados',
    bancos_aquecidos: 'Bancos aquecidos',
    bancos_eletricos: 'Bancos elétricos',
  };
  return MAP[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface GapItem {
  num: string;
  title: string;
  description: string;
  relevance: Relevance;
  impact: string;
}

function buildGaps(caps: CapabilityScore[], vehicleName: string): GapItem[] {
  return caps
    .filter(c => c.nivel < c.nivelMaximoCluster)
    .sort((a, b) => (b.nivelMaximoCluster - b.nivel) - (a.nivelMaximoCluster - a.nivel))
    .map((c, i) => {
      const gap = c.nivelMaximoCluster - c.nivel;
      const rel = gapRelevance(gap);
      const leader = c.liderMarca ? c.liderMarca.charAt(0).toUpperCase() + c.liderMarca.slice(1) : 'Concorrente';
      return {
        num: String(i + 1).padStart(2, '0'),
        title: capLabel(c.capability),
        description: `Capability: ${capLabel(c.capability)}. Líder: ${leader} (nível ${c.nivelMaximoCluster}). ${vehicleName}: nível ${c.nivel}`,
        relevance: rel,
        impact: `-${(gap * 2.5).toFixed(1)}pts`,
      };
    });
}

export default function GapsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [catalogos, setCatalogos] = useState<CatalogoResumo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<CatalogoDetalhe | null>(null);
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [vehicleName, setVehicleName] = useState('Ford Ranger Raptor');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getCatalogos();
      setCatalogos(list);
      const ford = list.find(c => c.marca.toLowerCase() === 'ford') ?? list[0];
      if (!ford) { setLoading(false); return; }
      setSelectedId(ford.id);
      let det = await getCatalogo(ford.id);
      if (!(det.capabilities?.length)) {
        await getRanking('custo_beneficio');
        det = await getCatalogo(ford.id);
      }
      const name = `${ford.marca.charAt(0).toUpperCase() + ford.marca.slice(1)} ${ford.modelo} ${ford.versao}`;
      setDetalhe(det);
      setVehicleName(name);
      setGaps(buildGaps(det.capabilities ?? [], name));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGaps(); }, []);

  const switchVehicle = async (id: number) => {
    if (id === selectedId) return;
    setSelectedId(id);
    setLoading(true);
    try {
      const det = await getCatalogo(id);
      const c = catalogos.find(x => x.id === id)!;
      const name = `${c.marca.charAt(0).toUpperCase() + c.marca.slice(1)} ${c.modelo} ${c.versao}`;
      setDetalhe(det);
      setVehicleName(name);
      setGaps(buildGaps(det.capabilities ?? [], name));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const biggestGap = gaps[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        <View style={styles.section}>
          <Text style={styles.title}>Gaps Acionáveis</Text>
          <Text style={styles.subtitle}>{vehicleName}</Text>
          <Text style={styles.subtitle}>Impacto ajustado pelo perfil de competição</Text>
        </View>

        {catalogos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow} contentContainerStyle={styles.pickerContent}>
            {catalogos.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, c.id === selectedId && styles.chipActive]}
                onPress={() => switchVehicle(c.id)}
              >
                <Text style={[styles.chipText, c.id === selectedId && styles.chipTextActive]}>
                  {c.marca.toUpperCase()} {c.modelo}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator color={colors.accentBlue} style={{ marginTop: Spacing.xl }} />
        ) : error ? (
          <TouchableOpacity style={styles.errorBox} onPress={loadGaps}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        ) : (
          <>
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

            {gaps.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Nenhum gap detectado.</Text>
                <Text style={styles.emptySub}>
                  {(detalhe?.capabilities?.length ?? 0) === 0
                    ? 'Visite a aba Score para calcular o ranking e gerar capabilities.'
                    : 'Este veículo lidera em todas as capabilities do cluster.'}
                </Text>
              </View>
            ) : (
              gaps.map((gap, i) => {
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
              })
            )}

            {biggestGap && (
              <View style={styles.insightCard}>
                <Text style={styles.insightHeader}>INSIGHT GERADO PELO SISTEMA</Text>
                <Text style={styles.insightBody}>
                  {vehicleName} possui <Text style={{ color: colors.accentBlue }}>{gaps.length} gap(s) identificado(s)</Text> em relação ao cluster de competidores.
                  {' '}O gap mais impactante é{' '}
                  <Text style={{ color: colors.accentBlue }}>{biggestGap.title.toLowerCase()}</Text>
                  {biggestGap.description.includes('Líder:') ? ` — ${biggestGap.description.split('Líder: ')[1]?.split('.')[0] ?? ''}` : ''}.
                </Text>
              </View>
            )}
          </>
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
  title: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.sm, color: colors.textMuted },
  pickerRow: { marginBottom: Spacing.md },
  pickerContent: { gap: Spacing.sm, paddingRight: Spacing.md },
  chip: { borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: colors.card },
  chipActive: { borderColor: colors.accentBlue, backgroundColor: colors.accentBlue + '22' },
  chipText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textMuted },
  chipTextActive: { color: colors.accentBlue },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  legendBadge: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  legendText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm },
  card: { backgroundColor: colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.card },
  cardTop: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 4 },
  cardNum: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textMuted },
  cardTitle: { flex: 1, fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textPrimary },
  cardDesc: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, color: colors.textMuted, marginBottom: Spacing.sm },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  impact: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm },
  badge: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm },
  insightCard: { backgroundColor: colors.accentBlue + '1A', borderRadius: Radius.md, borderWidth: 1, borderColor: colors.accentBlue, padding: Spacing.base, marginBottom: Spacing.xl },
  insightHeader: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textMuted, marginBottom: Spacing.sm },
  insightBody: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textPrimary, lineHeight: 18 },
  errorBox: { marginTop: Spacing.md, backgroundColor: '#ea454522', borderRadius: Radius.md, borderWidth: 1, borderColor: '#ea4545', padding: Spacing.base, alignItems: 'center' },
  errorText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, color: '#ea4545', marginBottom: 4 },
  retryText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.accentBlue },
  emptyBox: { marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.xl },
  emptyText: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: colors.textPrimary, marginBottom: 4 },
  emptySub: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
