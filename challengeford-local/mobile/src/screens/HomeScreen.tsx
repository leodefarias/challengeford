import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../theme';
import Navbar from '../components/Navbar';
import CircularProgress from '../components/CircularProgress';
import MetricCard from '../components/MetricCard';
import DataTable from '../components/DataTable';
import { DataRow } from '../components/DataTable';

const motorizationRows: DataRow[] = [
  { label: 'Combustível', value: 'Gasolina' },
  { label: 'Configuração', value: 'V6' },
  { label: 'Cilindrada', value: '3.0L' },
  { label: 'Indução', value: 'Biturbo', highlight: true },
  { label: 'Potência', value: '397 cv', highlight: true },
  { label: 'Torque', value: '583 Nm', highlight: true },
  { label: 'Câmbio', value: 'Automático' },
  { label: 'Marchas', value: '10' },
];

const tractionRows: DataRow[] = [
  { label: 'Tração', value: '4x4' },
  { label: 'Redução', value: '✓ Sim', highlight: true },
  { label: 'Dif. Bloqueio', value: '✓ Sim', highlight: true },
  { label: 'Trail Control', value: '✓ Sim', highlight: true },
];

const segurancaRows: DataRow[] = [
  { label: 'Airbags', value: '7 unid.' },
  { label: 'Frenagem auton.', value: '✓ Sim', highlight: true },
  { label: 'Aviso Colisão', value: '✓ Sim', highlight: true },
  { label: 'Manuten. Faixa', value: '✓ Sim', highlight: true },
  { label: 'Ponto Cego', value: '✓ Sim', highlight: true },
  { label: 'Câmera 360°', value: '✓ Sim', highlight: true },
  { label: 'Cruise Adaptativo', value: '✓ Sim', highlight: true },
  { label: 'Marchas', value: '10' },
];

const offRoadRows: DataRow[] = [
  { label: 'Modos de Condução', value: '7' },
  { label: 'Controle Descida', value: '✓ Sim', highlight: true },
  { label: 'Ângulo ataque', value: '32.5°', highlight: true },
  { label: 'Ângulo saída', value: '23.5°' },
  { label: 'Vadeo', value: '32.5°', highlight: true },
  { label: 'Ângulo rampa', value: '22.0°' },
];

export default function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Navbar />

        {/* Agent Monitor Card */}
        <View style={styles.agentCard}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentTitle}>Monitor de Agente</Text>
            <View style={styles.agentToolRow}>
              <Text style={styles.agentToolText}>Tool Ativa: site_scraper →</Text>
              <Text style={[styles.agentToolText, { color: Colors.accentBlue }]}>
                {' nissan.com.br'}
              </Text>
            </View>
            <View style={styles.agentStatusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.agentStatusText}>Aguardando Resposta</Text>
            </View>
          </View>
          <CircularProgress value={75} size={70} showPercent />
        </View>

        {/* Vehicle Section Title */}
        <View style={styles.vehicleHeader}>
          <Text style={styles.vehicleName}>Ford Ranger Raptor</Text>
          <View style={styles.vehicleSubRow}>
            <Text style={styles.vehicleSub}>Versão topo de linha</Text>
            <View style={styles.dot} />
            <Text style={styles.vehicleSub}>Segmento: Performance Off-Road</Text>
          </View>
        </View>

        {/* 2×2 Metric Cards */}
        <View style={styles.cardsGrid}>
          <View style={styles.cardRow}>
            <MetricCard
              label="POTÊNCIA"
              value="397"
              unit="CV"
              source="PDF Oficial"
            />
            <MetricCard
              label="TORQUE"
              value="583"
              unit="Nm"
              source="PDF Oficial"
            />
          </View>
          <View style={styles.cardRow}>
            <MetricCard
              label="PREÇO TABELA"
              value="R$470"
              unit="k"
              source="API FIPE"
            />
            <MetricCard
              label="SCORE COMPETITIVO"
              scoreValue={82}
              scoreLabel="Técnico"
              scoreSubLabel="Valor: 64.6"
            />
          </View>
        </View>

        {/* Data Tables */}
        <DataTable title="MOTORIZAÇÃO" rows={motorizationRows} />
        <DataTable title="TRANSMISSÃO E TRAÇÃO" rows={tractionRows} />
        <DataTable title="SEGURANÇA E ADAS" rows={segurancaRows} />
        <DataTable title="OFF-ROAD" rows={offRoadRows} />
      </ScrollView>

      {/* FAB Menu Button */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation?.navigate('DrawerMenu')}>
        <Text style={styles.fabIcon}>☰</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  agentInfo: {
    flex: 1,
    gap: 4,
  },
  agentTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  agentToolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  agentToolText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
  agentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accentGreen,
  },
  agentStatusText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.xs - 2,
    color: Colors.textPrimary,
  },
  vehicleHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.base,
  },
  vehicleName: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  vehicleSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  vehicleSub: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.textMuted,
  },
  cardsGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  fabIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
});
