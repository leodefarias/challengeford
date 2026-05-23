import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { FontFamily, FontSize, Spacing, Radius, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import BackHeader from '../components/BackHeader';

interface Weight {
  key: string;
  label: string;
  value: number;
}

const INITIAL_WEIGHTS: Weight[] = [
  { key: 'motorizacao', label: 'Motorização', value: 40 },
  { key: 'seguranca', label: 'Segurança & ADAS', value: 20 },
  { key: 'offroad', label: 'Off-Road', value: 15 },
  { key: 'conforto', label: 'Conforto & Conect.', value: 10 },
  { key: 'tracao', label: 'Transmissão & Tração', value: 5 },
  { key: 'preco', label: 'Preço', value: 5 },
  { key: 'dimensoes', label: 'Dimensões', value: 5 },
];

export default function ScoreSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [weights, setWeights] = useState<Weight[]>(INITIAL_WEIGHTS);

  const update = (key: string, val: number) => {
    setWeights((prev) => prev.map((w) => (w.key === key ? { ...w, value: Math.round(val) } : w)));
  };

  const total = weights.reduce((sum, w) => sum + w.value, 0);
  const valid = total === 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackHeader navigation={navigation} title="Config. Score" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Configuração de Score</Text>
        <Text style={styles.subtitle}>Ajuste os pesos por grupo e perfis de competição por catálogo Ford.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Peso por categoria</Text>

          {weights.map((w) => (
            <View key={w.key} style={styles.row}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{w.label}</Text>
                <Text style={[styles.pct, valid && { color: colors.accentGreen }]}>{w.value}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={w.value}
                onValueChange={(v) => update(w.key, v)}
                minimumTrackTintColor={colors.accentBlue}
                maximumTrackTintColor={colors.borderLight}
                thumbTintColor={colors.accentBlue}
              />
            </View>
          ))}

          <View style={[styles.totalRow, { borderTopColor: valid ? colors.accentGreen : '#ea4545' }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, { color: valid ? colors.accentGreen : '#ea4545' }]}>{total}%</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !valid && { opacity: 0.4 }]}
            disabled={!valid}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.saveBtnText}>Salvar Configurações</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 60 },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: colors.textMuted,
    marginBottom: Spacing.base,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: colors.textMuted,
    marginBottom: Spacing.base,
  },
  row: {
    marginBottom: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.sm,
    color: colors.textPrimary,
  },
  pct: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: colors.textMuted,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.base,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.base,
  },
  saveBtn: {
    backgroundColor: colors.accentBlue,
    borderRadius: Radius.sm,
    padding: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  saveBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.base,
    color: '#f2f2f2',
  },
});
