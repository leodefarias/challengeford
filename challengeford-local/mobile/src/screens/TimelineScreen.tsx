import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import BackHeader from '../components/BackHeader';

interface NewsItem {
  date: string;
  title: string;
  body: string;
  isNew?: boolean;
}

const NEWS: NewsItem[] = [
  {
    date: 'Mar. 2026',
    title: 'Nissan Frontier PRO-4x — Safety Shield 360° de série',
    body: 'Nissan adicionou o pacote completo de assistência ao motorista (frenagem, ponto cego, câmera 360°) como equipamento de série na versão PRO-3x',
    isNew: true,
  },
  {
    date: 'Jan. 2026',
    title: 'Chevrolet S10 High Country — Potência atualizada',
    body: 'S10 passou de 200 cv para 207 cv com atualização MY2026. Torque mantido em 500 Nm.',
  },
  {
    date: 'Out. 2025',
    title: 'Toyota Hilux GR-S — Câmera 360° incluída',
    body: 'Atualização de meio de ano adicionou câmera 360° de série, elevando o nível de visibilidade traseira de nível 1 para nível 2.',
  },
  {
    date: 'Jul. 2025',
    title: 'Mitsubishi Nova Triton — Substitui L200 Triton Sport',
    body: 'Nova geração com motor 2.4L biturbo 205 cv (vs. 190 cv da geração anterior).',
  },
];

export default function TimelineScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackHeader navigation={navigation} title="Timeline de Mudanças" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Atualizações detectadas automaticamente</Text>
          <Text style={styles.subtitle}>6 catálogos monitorados</Text>
        </View>

        <View style={styles.trendCard}>
          <Text style={styles.trendLabel}>TENDÊNCIA DETECTADA</Text>
          <Text style={styles.trendBody}>
            4 de 6 marcas agora oferecem frenagem autônoma de série.{'\n'}
            ADAS está convergindo no segmento de pickups topo de linha.
          </Text>
        </View>

        <View style={styles.timeline}>
          {NEWS.map((item, i) => (
            <View key={i} style={styles.newsItem}>
              <View style={styles.dotColumn}>
                <View style={[styles.timelineDot, item.isNew && styles.timelineDotNew]} />
                {i < NEWS.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.newsContent}>
                <Text style={styles.newsDate}>{item.date}</Text>
                <Text style={styles.newsTitle}>{item.title}</Text>
                <Text style={styles.newsBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  section: { marginTop: Spacing.xl, marginBottom: Spacing.base },
  subtitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.sm,
    color: colors.textMuted,
  },
  trendCard: {
    backgroundColor: colors.accentBlue + '33',
    borderRadius: 13,
    borderWidth: 0.5,
    borderColor: colors.accentBlue,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  trendLabel: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: colors.accentBlue,
    marginBottom: Spacing.sm,
  },
  trendBody: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  timeline: { gap: 0 },
  newsItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dotColumn: {
    alignItems: 'center',
    width: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.textMuted,
  },
  timelineDotNew: {
    backgroundColor: colors.accentGreen,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginTop: 4,
    minHeight: 40,
  },
  newsContent: { flex: 1, paddingBottom: Spacing.base },
  newsDate: {
    fontFamily: FontFamily.mono,
    fontSize: 7,
    color: colors.textMuted,
    marginBottom: 4,
  },
  newsTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  newsBody: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.md,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
