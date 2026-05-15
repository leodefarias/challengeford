import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../theme';
import Navbar from '../components/Navbar';
import CircularProgress from '../components/CircularProgress';

interface ScoreCard {
  brand: string;
  score: number;
  label: string;
  subLabel: string;
  color: string;
  tag?: { text: string; color: string };
}

const SCORE_CARDS: ScoreCard[] = [
  {
    brand: 'FORD RANGER RAPTOR',
    score: 82,
    label: 'Técnico',
    subLabel: '64.6',
    color: Colors.accentBlue,
    tag: { text: '#1 performance', color: Colors.accentBlue },
  },
  {
    brand: 'TOYOTA  HILUX GR-S',
    score: 75,
    label: 'Técnico',
    subLabel: '81.5',
    color: '#46db96',
    tag: { text: 'custo-benefício', color: '#46db96' },
  },
  {
    brand: 'VOLKSWAGEN AMAROK V6',
    score: 67,
    label: 'Técnico',
    subLabel: '81.5',
    color: '#8446db',
  },
];

interface CategoryScore {
  label: string;
  weight: string;
  value: number;
  color: string;
}

const CATEGORY_SCORES: CategoryScore[] = [
  { label: 'Motorização', weight: '(25%)', value: 100, color: '#46db96' },
  { label: 'Off-Road', weight: '(15% * 2.0)', value: 95, color: '#46db96' },
  { label: 'Segurança & ADAS', weight: '(20%)', value: 78, color: Colors.accentBlue },
  { label: 'Transmissão e Tração', weight: '(10%)', value: 88, color: Colors.accentBlue },
  { label: 'Conforto & Conectividade', weight: '(15% * 0.5)', value: 61, color: '#ed9f33' },
  { label: 'Conforto & Conectividade', weight: '(15% * 0.5)', value: 42, color: '#ea4545' },
];

// Radar chart: 6 axes (hexagonal)
const RADAR_AXES = ['Motorização', 'Off-Road', 'Preço', 'Tração', 'ADAS', 'Conforto'];
const RAPTOR_DATA = [100, 95, 60, 88, 78, 61];
const HILUX_DATA  = [70,  65, 85, 70, 75, 70];

function radarPoints(data: number[], cx: number, cy: number, maxR: number): string {
  return data
    .map((v, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const r = (v / 100) * maxR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');
}

function gridPoints(pct: number, cx: number, cy: number, maxR: number): string {
  return Array.from({ length: 6 })
    .map((_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const r = pct * maxR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');
}

function RadarChart() {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 100;
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <Svg width={size} height={size}>
      {/* Grid rings */}
      {rings.map((r, i) => (
        <Polygon
          key={i}
          points={gridPoints(r, cx, cy, maxR)}
          fill="none"
          stroke={Colors.borderLight}
          strokeWidth={1}
        />
      ))}
      {/* Axis lines */}
      {RADAR_AXES.map((_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return (
          <Line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + maxR * Math.cos(angle)}
            y2={cy + maxR * Math.sin(angle)}
            stroke={Colors.borderLight}
            strokeWidth={1}
          />
        );
      })}
      {/* Raptor polygon */}
      <Polygon
        points={radarPoints(RAPTOR_DATA, cx, cy, maxR)}
        fill={Colors.accentBlue + '44'}
        stroke={Colors.accentBlue}
        strokeWidth={2}
      />
      {/* Hilux polygon */}
      <Polygon
        points={radarPoints(HILUX_DATA, cx, cy, maxR)}
        fill={'#46db9644'}
        stroke={'#46db96'}
        strokeWidth={2}
      />
      {/* Axis labels */}
      {RADAR_AXES.map((label, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const labelR = maxR + 18;
        const x = cx + labelR * Math.cos(angle);
        const y = cy + labelR * Math.sin(angle);
        return (
          <SvgText
            key={i}
            x={x}
            y={y}
            fill={Colors.textMuted}
            fontSize={9}
            fontFamily={FontFamily.mono}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export default function ScoreScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        <View style={styles.section}>
          <Text style={styles.title}>Score Competitivo</Text>
          <Text style={styles.subtitle}>Score calculado sobre 9 de 11 features. 2 excluídas por dados incompletos</Text>
        </View>

        {/* Score Cards */}
        {SCORE_CARDS.map((card, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardBrand}>{card.brand}</Text>
            <View style={styles.cardBody}>
              <CircularProgress value={card.score} size={65} strokeWidth={5} color={card.color} labelSize={24} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text style={styles.cardSubLabel}>
                  Valor: <Text style={{ color: card.color }}>{card.subLabel}</Text>
                </Text>
                {card.tag && (
                  <View style={[styles.tag, { borderColor: card.tag.color, backgroundColor: card.tag.color + '33' }]}>
                    <Text style={[styles.tagText, { color: card.tag.color }]}>{card.tag.text}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.vehicleImgPlaceholder, { backgroundColor: card.color + '22', borderColor: card.color + '55' }]}>
                <Text style={[styles.vehicleImgLabel, { color: card.color }]}>
                  {card.brand.split(' ')[0]}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Category Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Score por grupo — Ranger Raptor</Text>
          {CATEGORY_SCORES.map((cat, i) => (
            <View key={i} style={styles.catRow}>
              <View style={styles.catHeader}>
                <Text style={styles.catLabel}>
                  {cat.label} <Text style={styles.catWeight}>{cat.weight}</Text>
                </Text>
                <Text style={[styles.catValue, { color: cat.color }]}>{cat.value}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${cat.value}%`, backgroundColor: cat.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Radar Chart */}
        <View style={styles.radarCard}>
          <Text style={styles.radarTitle}>Radar Competitivo</Text>
          <View style={styles.radarContainer}>
            <RadarChart />
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.accentBlue }]} />
              <Text style={styles.legendText}>Ranger Raptor</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#46db96' }]} />
              <Text style={styles.legendText}>Hilux GR-S</Text>
            </View>
          </View>
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  cardBrand: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardInfo: { flex: 1, gap: 4 },
  cardLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  cardSubLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  tag: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tagText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
  },
  vehicleImgPlaceholder: {
    width: 100,
    height: 68,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleImgLabel: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    ...Shadow.card,
  },
  breakdownTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  catRow: { marginBottom: Spacing.md },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  catWeight: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.sm,
    color: '#5c606e',
  },
  catValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#4b4d55',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  radarCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    ...Shadow.card,
  },
  radarTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: Spacing.base,
  },
  radarContainer: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
