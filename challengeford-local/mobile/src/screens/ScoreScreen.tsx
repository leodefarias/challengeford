import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import Navbar from '../components/Navbar';
import CircularProgress from '../components/CircularProgress';
import { getRanking, RankingResponse, RankingItem } from '../services/api';

const PERFIS = [
  { key: 'desempenho', label: 'Desempenho' },
  { key: 'offroad', label: 'Off-Road' },
  { key: 'familia', label: 'Família' },
  { key: 'custo_beneficio', label: 'Custo-Benefício' },
];

// Colors that don't need to change with theme
const CARD_COLORS = [Colors.accentBlue, '#46db96', '#8446db', '#ed9f33', '#ea4545', '#a0a0a0'];

function scoreColor(value: number): string {
  if (value >= 80) return Colors.accentGreen;
  if (value >= 60) return Colors.accentBlue;
  if (value >= 40) return '#ed9f33';
  return '#ea4545';
}

function vehicleShort(v: string): string {
  const parts = v.split(' ');
  return `${parts[0].toUpperCase()} ${parts[1] ?? ''}`.trim();
}

function toLabel(key: string): string {
  const MAP: Record<string, string> = {
    potencia_cv: 'Motorização', torque_nm: 'Torque', profundidade_vadeo_mm: 'Off-Road',
    angulo_ataque_graus: 'Ângulo Ataque', angulo_saida_graus: 'Ângulo Saída',
    capacidade_reboque_kg: 'Reboque', capacidade_carga_kg: 'Carga',
    preco_tabela_brl: 'Custo-Benefício', airbags_quantidade: 'Segurança',
    frenagem_autonoma: 'Frenagem', tela_central_pol: 'Conectividade',
    emplacamentos_mes_atual: 'Emplacamentos',
  };
  return MAP[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function radarPoints(data: number[], cx: number, cy: number, maxR: number, total: number): string {
  return data
    .map((v, i) => {
      const angle = ((2 * Math.PI) / total) * i - Math.PI / 2;
      const r = v * maxR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');
}

function gridPoints(pct: number, cx: number, cy: number, maxR: number, total: number): string {
  return Array.from({ length: total })
    .map((_, i) => {
      const angle = ((2 * Math.PI) / total) * i - Math.PI / 2;
      const r = pct * maxR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');
}

function RadarChart({ items, criterios, gridColor, labelColor }: {
  items: RankingItem[];
  criterios: string[];
  gridColor: string;
  labelColor: string;
}) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 90;
  const n = criterios.length;
  const rings = [0.25, 0.5, 0.75, 1.0];

  if (n < 3) return null;

  return (
    <Svg width={size} height={size}>
      {rings.map((r, i) => (
        <Polygon key={i} points={gridPoints(r, cx, cy, maxR, n)} fill="none" stroke={gridColor} strokeWidth={1} />
      ))}
      {criterios.map((_, i) => {
        const angle = ((2 * Math.PI) / n) * i - Math.PI / 2;
        return <Line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke={gridColor} strokeWidth={1} />;
      })}
      {items.slice(0, 2).map((item, idx) => {
        const data = criterios.map(c => item.breakdown[c]?.score_normalizado ?? 0);
        const color = CARD_COLORS[idx];
        return (
          <Polygon
            key={idx}
            points={radarPoints(data, cx, cy, maxR, n)}
            fill={color + '44'}
            stroke={color}
            strokeWidth={2}
          />
        );
      })}
      {criterios.map((c, i) => {
        const angle = ((2 * Math.PI) / n) * i - Math.PI / 2;
        const labelR = maxR + 18;
        return (
          <SvgText key={i} x={cx + labelR * Math.cos(angle)} y={cy + labelR * Math.sin(angle)}
            fill={labelColor} fontSize={8} fontFamily={FontFamily.mono} textAnchor="middle" alignmentBaseline="middle">
            {toLabel(c)}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export default function ScoreScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [perfil, setPerfil] = useState('desempenho');
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRanking = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRanking(p);
      setRanking(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRanking(perfil); }, [perfil]);

  const items = ranking?.ranking ?? [];
  const criterios = ranking ? Object.keys(ranking.criterios_aplicados) : [];
  const top1 = items[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={styles.tabsContent}>
          {PERFIS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.tab, perfil === p.key && styles.tabActive]}
              onPress={() => setPerfil(p.key)}
            >
              <Text style={[styles.tabText, perfil === p.key && styles.tabTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <Text style={styles.title}>Score Competitivo</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Carregando ranking...' : items.length > 0
              ? `${items.length} veículos classificados — perfil: ${perfil}`
              : 'Nenhum dado disponível'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accentBlue} style={{ marginTop: Spacing.xl }} />
        ) : error ? (
          <TouchableOpacity style={styles.errorBox} onPress={() => loadRanking(perfil)}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        ) : (
          <>
            {items.map((item, i) => {
              const score = Math.round(item.pontuacao_total * 100);
              const color = CARD_COLORS[i] ?? colors.textMuted;
              return (
                <View key={item.veiculo} style={styles.card}>
                  <Text style={styles.cardBrand}>{item.posicao}º — {item.veiculo.toUpperCase()}</Text>
                  <View style={styles.cardBody}>
                    <CircularProgress value={score} size={65} strokeWidth={5} color={color} labelSize={24} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardLabel}>Score</Text>
                      <Text style={styles.cardSubLabel}>
                        Pontuação: <Text style={{ color }}>{item.pontuacao_total.toFixed(3)}</Text>
                      </Text>
                      {i === 0 && (
                        <View style={[styles.tag, { borderColor: color, backgroundColor: color + '33' }]}>
                          <Text style={[styles.tagText, { color }]}>#1 {perfil.replace('_', '-')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.vehicleImgPlaceholder, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                      <Text style={[styles.vehicleImgLabel, { color }]}>
                        {vehicleShort(item.veiculo)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {top1 && criterios.length > 0 && (
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Score por critério — {vehicleShort(top1.veiculo)}</Text>
                {criterios.map((c) => {
                  const bd = top1.breakdown[c];
                  const pct = Math.round((bd?.score_normalizado ?? 0) * 100);
                  const col = scoreColor(pct);
                  return (
                    <View key={c} style={styles.catRow}>
                      <View style={styles.catHeader}>
                        <Text style={styles.catLabel}>
                          {toLabel(c)} <Text style={styles.catWeight}>({((bd?.peso ?? 0) * 100).toFixed(0)}%)</Text>
                        </Text>
                        <Text style={[styles.catValue, { color: col }]}>{pct}</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: col }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {items.length >= 2 && criterios.length >= 3 && (
              <View style={styles.radarCard}>
                <Text style={styles.radarTitle}>Radar Competitivo</Text>
                <View style={styles.radarContainer}>
                  <RadarChart
                    items={items}
                    criterios={criterios}
                    gridColor={colors.borderLight}
                    labelColor={colors.textMuted}
                  />
                </View>
                <View style={styles.legend}>
                  {items.slice(0, 3).map((item, i) => (
                    <View key={item.veiculo} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: CARD_COLORS[i] }]} />
                      <Text style={styles.legendText}>{vehicleShort(item.veiculo)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {ranking?.justificativa ? (
              <View style={styles.justCard}>
                <Text style={styles.justHeader}>ANÁLISE DO SISTEMA</Text>
                <Text style={styles.justBody}>{ranking.justificativa}</Text>
              </View>
            ) : null}

            {items.length === 0 && !loading && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Nenhum catálogo para classificar.</Text>
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
  tabsRow: { marginTop: Spacing.md },
  tabsContent: { gap: Spacing.sm, paddingRight: Spacing.md },
  tab: { borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: colors.card },
  tabActive: { borderColor: colors.accentBlue, backgroundColor: colors.accentBlue + '22' },
  tabText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textMuted },
  tabTextActive: { color: colors.accentBlue },
  section: { marginTop: Spacing.xl, marginBottom: Spacing.base },
  title: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.sm, color: colors.textMuted },
  errorBox: { marginTop: Spacing.md, backgroundColor: '#ea454522', borderRadius: Radius.md, borderWidth: 1, borderColor: '#ea4545', padding: Spacing.base, alignItems: 'center' },
  errorText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, color: '#ea4545', marginBottom: 4 },
  retryText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.accentBlue },
  card: { backgroundColor: colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.card },
  cardBrand: { fontFamily: FontFamily.mono, fontSize: FontSize.md, color: colors.textMuted, marginBottom: Spacing.sm },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardInfo: { flex: 1, gap: 4 },
  cardLabel: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: colors.textPrimary },
  cardSubLabel: { fontFamily: FontFamily.sansBold, fontSize: FontSize.sm, color: colors.textMuted },
  tag: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  tagText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm },
  vehicleImgPlaceholder: { width: 90, height: 60, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  vehicleImgLabel: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, textAlign: 'center' },
  breakdownCard: { backgroundColor: colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, padding: Spacing.base, marginBottom: Spacing.xl, ...Shadow.card },
  breakdownTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.md, color: colors.textPrimary, marginBottom: Spacing.base },
  catRow: { marginBottom: Spacing.md },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catLabel: { fontFamily: FontFamily.sansBold, fontSize: FontSize.sm, color: colors.textMuted },
  catWeight: { fontFamily: FontFamily.sansBold, fontSize: FontSize.sm, color: colors.textMuted },
  catValue: { fontFamily: FontFamily.sansBold, fontSize: FontSize.sm },
  progressTrack: { height: 4, backgroundColor: colors.borderLight, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  radarCard: { backgroundColor: colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, padding: Spacing.base, marginBottom: Spacing.xl, alignItems: 'center', ...Shadow.card },
  radarTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.md, color: colors.textPrimary, alignSelf: 'flex-start', marginBottom: Spacing.base },
  radarContainer: { alignItems: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xl, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: colors.textMuted },
  justCard: { backgroundColor: colors.accentBlue + '1A', borderRadius: Radius.md, borderWidth: 1, borderColor: colors.accentBlue, padding: Spacing.base, marginBottom: Spacing.xl },
  justHeader: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textMuted, marginBottom: Spacing.sm },
  justBody: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textPrimary, lineHeight: 18 },
  emptyBox: { marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.xl },
  emptyText: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: colors.textPrimary },
});
