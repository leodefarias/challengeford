import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, Shadow, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import Navbar from '../components/Navbar';
import CircularProgress from '../components/CircularProgress';
import MetricCard from '../components/MetricCard';
import SkeletonCard from '../components/SkeletonCard';
import DataTable from '../components/DataTable';
import { DataRow } from '../components/DataTable';
import {
  getCatalogos,
  getCatalogo,
  CatalogoResumo,
  CatalogoDetalhe,
  Atributo,
} from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────

function toLabel(attr: string): string {
  const LABELS: Record<string, string> = {
    combustivel: 'Combustível', cilindrada_l: 'Cilindrada', configuracao_motor: 'Configuração',
    inducao: 'Indução', potencia_cv: 'Potência', torque_nm: 'Torque',
    cambio_tipo: 'Câmbio', cambio_marchas: 'Marchas', tracao: 'Tração',
    reducao: 'Redução', diferencial_bloqueio: 'Dif. Bloqueio', modos_conducao: 'Modos Condução',
    airbags_quantidade: 'Airbags', frenagem_autonoma: 'Frenagem Aut.', aviso_colisao_frontal: 'Aviso Colisão',
    manutencao_faixa: 'Manutenção Faixa', monitoramento_ponto_cego: 'Ponto Cego',
    camera_re: 'Câmera Ré', camera_360: 'Câmera 360°', controle_cruzeiro_adaptativo: 'Cruise Adaptativo',
    estacionamento_automatico: 'Estac. Automático', controle_descida: 'Controle Descida',
    angulo_ataque_graus: 'Ângulo Ataque', angulo_saida_graus: 'Ângulo Saída',
    angulo_rampa_graus: 'Ângulo Rampa', profundidade_vadeo_mm: 'Vadeo (mm)',
    carplay: 'CarPlay', android_auto: 'Android Auto', conexao_sem_fio: 'Sem Fio',
    bancos_material: 'Bancos', bancos_eletricos: 'Bancos Elétricos',
    bancos_aquecidos: 'Bancos Aquecidos', bancos_ventilados: 'Bancos Ventilados',
    ar_condicionado: 'Ar Condicionado', carregador_wireless: 'Wireless',
    tela_central_pol: 'Tela Central', painel_digital_pol: 'Painel Digital',
    preco_tabela_brl: 'Preço Tabela',
  };
  return LABELS[attr] ?? attr.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatVal(val: any): string {
  if (val === null || val === undefined) return '—';
  if (val === true) return '✓ Sim';
  if (val === false) return '✗ Não';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(1);
  }
  return String(val);
}

function attrToRow(a: Atributo): DataRow {
  const val = formatVal(a.valor);
  const highlight = a.valor === true || (typeof a.valor === 'number' && a.valor > 0);
  return { label: toLabel(a.atributo), value: val, highlight };
}

function filterGroup(atributos: Atributo[], keys: string[]): DataRow[] {
  return atributos.filter(a => keys.includes(a.atributo)).map(attrToRow);
}

function getNumericAttr(atributos: Atributo[], key: string): number | null {
  const a = atributos.find(x => x.atributo === key);
  if (!a || a.valor === null || a.valor === undefined) return null;
  return typeof a.valor === 'number' ? a.valor : parseFloat(String(a.valor)) || null;
}

const MOTOR_KEYS = ['combustivel', 'configuracao_motor', 'cilindrada_l', 'inducao', 'potencia_cv', 'torque_nm', 'cambio_tipo', 'cambio_marchas'];
const TRACAO_KEYS = ['tracao', 'reducao', 'diferencial_bloqueio'];
const SEGURANCA_KEYS = ['airbags_quantidade', 'frenagem_autonoma', 'aviso_colisao_frontal', 'manutencao_faixa', 'monitoramento_ponto_cego', 'camera_re', 'camera_360', 'controle_cruzeiro_adaptativo', 'estacionamento_automatico'];
const OFFROAD_KEYS = ['modos_conducao', 'controle_descida', 'angulo_ataque_graus', 'angulo_saida_graus', 'profundidade_vadeo_mm', 'angulo_rampa_graus'];

const PDF_URLS: Record<string, string> = {
  'ford_ranger_raptor': 'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2025/ranger-raptor/pdf/fbr-ranger-raptor-ficha-tecnica.pdf',
  'toyota_hilux_gr-s': 'https://www.toyotacomunica.com.br/wp-content/uploads/2020/10/Ficha-Tecnica-Hilux-2024.pdf',
};

function catalogKey(marca: string, modelo: string, versao: string): string {
  return `${marca}_${modelo}_${versao}`.toLowerCase().replace(/ /g, '_');
}

// ── Component ─────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [catalogos, setCatalogos] = useState<CatalogoResumo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<CatalogoDetalhe | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardAnims = useRef([0, 1, 2, 3].map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(24),
  }))).current;

  const loadCatalogos = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await getCatalogos();
      setCatalogos(list);
      if (list.length > 0) setSelectedId(list[0].id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadCatalogos(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingDetalhe(true);
    getCatalogo(selectedId)
      .then(d => { setDetalhe(d); setError(null); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoadingDetalhe(false));
  }, [selectedId]);

  useEffect(() => {
    if (!detalhe) return;
    cardAnims.forEach(a => { a.opacity.setValue(0); a.translateY.setValue(24); });
    Animated.stagger(80, cardAnims.map(a =>
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(a.translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ])
    )).start();
  }, [detalhe]);

  const selected = catalogos.find(c => c.id === selectedId);
  const pdfUrl = selected ? PDF_URLS[catalogKey(selected.marca, selected.modelo, selected.versao)] : undefined;
  const atributos = detalhe?.atributos ?? [];
  const potencia = getNumericAttr(atributos, 'potencia_cv');
  const torque = getNumericAttr(atributos, 'torque_nm');
  const preco = getNumericAttr(atributos, 'preco_tabela_brl');
  const cobertura = detalhe?.coberturaPct ?? 0;
  const scoreTecnico = detalhe?.scoreTecnico ?? 0;

  const motorRows = filterGroup(atributos, MOTOR_KEYS);
  const tracaoRows = filterGroup(atributos, TRACAO_KEYS);
  const segurancaRows = filterGroup(atributos, SEGURANCA_KEYS);
  const offroadRows = filterGroup(atributos, OFFROAD_KEYS);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Navbar />

        {/* Vehicle Picker */}
        {loadingList ? (
          <ActivityIndicator color={colors.accentBlue} style={{ marginTop: Spacing.xl }} />
        ) : error && catalogos.length === 0 ? (
          <TouchableOpacity style={styles.errorBox} onPress={loadCatalogos}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        ) : catalogos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow} contentContainerStyle={styles.pickerContent}>
            {catalogos.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.pickerChip, c.id === selectedId && styles.pickerChipActive]}
                onPress={() => setSelectedId(c.id)}
              >
                <Text style={[styles.pickerChipText, c.id === selectedId && styles.pickerChipTextActive]}>
                  {c.marca.toUpperCase()} {c.modelo} {c.versao}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {/* Agent Monitor Card */}
        <View style={styles.agentCard}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentTitle}>Monitor de Catálogo</Text>
            <View style={styles.agentToolRow}>
              <Text style={styles.agentToolText}>Status: </Text>
              <Text style={[styles.agentToolText, { color: colors.accentBlue }]}>
                {detalhe?.status ?? (loadingDetalhe ? 'Carregando...' : '—')}
              </Text>
            </View>
            <View style={styles.agentStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: detalhe?.status === 'completo' ? colors.accentGreen : '#ed9f33' }]} />
              <Text style={styles.agentStatusText}>
                Cobertura: {cobertura > 0 ? `${cobertura.toFixed(1)}%` : '—'}
              </Text>
            </View>
          </View>
          <CircularProgress value={Math.round(cobertura)} size={70} showPercent />
        </View>

        {loadingDetalhe ? (
          <ActivityIndicator color={colors.accentBlue} style={{ marginTop: Spacing.xl }} />
        ) : selected ? (
          <>
            {/* Vehicle Section Title */}
            <View style={styles.vehicleHeader}>
              <Text style={styles.vehicleName}>
                {selected.marca.charAt(0).toUpperCase() + selected.marca.slice(1)} {selected.modelo} {selected.versao}
              </Text>
              <View style={styles.vehicleSubRow}>
                <Text style={styles.vehicleSub}>
                  {selected.anoModelo ? `Ano ${selected.anoModelo}` : 'Ano —'}
                </Text>
                {selected.segmento ? (
                  <>
                    <View style={styles.dot} />
                    <Text style={styles.vehicleSub}>Segmento: {selected.segmento}</Text>
                  </>
                ) : null}
              </View>
            </View>

            {/* 2×2 Metric Cards */}
            <View style={styles.cardsGrid}>
              {loadingDetalhe ? (
                <>
                  <View style={styles.cardRow}>
                    <SkeletonCard />
                    <SkeletonCard />
                  </View>
                  <View style={styles.cardRow}>
                    <SkeletonCard />
                    <SkeletonCard />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.cardRow}>
                    <Animated.View style={[styles.cardFlex, { opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }] }]}>
                      <MetricCard
                        label="POTÊNCIA"
                        value={potencia !== null ? String(Math.round(potencia)) : '—'}
                        unit="CV"
                        source="PDF Oficial"
                        sourceUrl={pdfUrl}
                      />
                    </Animated.View>
                    <Animated.View style={[styles.cardFlex, { opacity: cardAnims[1].opacity, transform: [{ translateY: cardAnims[1].translateY }] }]}>
                      <MetricCard
                        label="TORQUE"
                        value={torque !== null ? String(Math.round(torque)) : '—'}
                        unit="Nm"
                        source="PDF Oficial"
                        sourceUrl={pdfUrl}
                      />
                    </Animated.View>
                  </View>
                  <View style={styles.cardRow}>
                    <Animated.View style={[styles.cardFlex, { opacity: cardAnims[2].opacity, transform: [{ translateY: cardAnims[2].translateY }] }]}>
                      <MetricCard
                        label="PREÇO TABELA"
                        value={preco !== null ? `R$${(preco / 1000).toFixed(0)}` : '—'}
                        unit="k"
                        source="API FIPE"
                        sourceUrl="https://veiculos.fipe.org.br/"
                      />
                    </Animated.View>
                    <Animated.View style={[styles.cardFlex, { opacity: cardAnims[3].opacity, transform: [{ translateY: cardAnims[3].translateY }] }]}>
                      <MetricCard
                        label="SCORE COMPETITIVO"
                        scoreValue={scoreTecnico > 0 ? Math.round(scoreTecnico) : 0}
                        scoreLabel="Técnico"
                        scoreSubLabel={detalhe?.scoreValor ? `Valor: ${detalhe.scoreValor.toFixed(1)}` : 'Valor: —'}
                      />
                    </Animated.View>
                  </View>
                </>
              )}
            </View>

            {motorRows.length > 0 && <DataTable title="MOTORIZAÇÃO" rows={motorRows} />}
            {tracaoRows.length > 0 && <DataTable title="TRANSMISSÃO E TRAÇÃO" rows={tracaoRows} />}
            {segurancaRows.length > 0 && <DataTable title="SEGURANÇA E ADAS" rows={segurancaRows} />}
            {offroadRows.length > 0 && <DataTable title="OFF-ROAD" rows={offroadRows} />}
          </>
        ) : !loadingList && !loadingDetalhe ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum catálogo disponível.</Text>
            <Text style={styles.emptySubText}>Execute a extração de veículos para começar.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  pickerRow: { marginTop: Spacing.md },
  pickerContent: { gap: Spacing.sm, paddingRight: Spacing.md },
  pickerChip: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.card,
  },
  pickerChipActive: { borderColor: colors.accentBlue, backgroundColor: colors.accentBlue + '22' },
  pickerChipText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.textMuted },
  pickerChipTextActive: { color: colors.accentBlue },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  agentInfo: { flex: 1, gap: 4 },
  agentTitle: { fontFamily: FontFamily.sansBold, fontSize: FontSize.lg, color: colors.textPrimary },
  agentToolRow: { flexDirection: 'row', flexWrap: 'wrap' },
  agentToolText: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.xs, color: colors.textPrimary },
  agentStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accentGreen },
  agentStatusText: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.xs - 2, color: colors.textPrimary },
  vehicleHeader: { marginTop: Spacing.xl, marginBottom: Spacing.base },
  vehicleName: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: colors.textPrimary, marginBottom: 4 },
  vehicleSubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  vehicleSub: { fontFamily: FontFamily.displayBold, fontSize: FontSize.sm, color: colors.textMuted },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.textMuted },
  cardsGrid: { gap: Spacing.sm, marginBottom: Spacing.xl },
  cardRow: { flexDirection: 'row', gap: Spacing.sm },
  cardFlex: { flex: 1 },
  errorBox: {
    marginTop: Spacing.xl,
    backgroundColor: '#ea454522',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#ea4545',
    padding: Spacing.base,
    alignItems: 'center',
  },
  errorText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, color: '#ea4545', marginBottom: 4 },
  retryText: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: colors.accentBlue },
  emptyBox: { marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.xl },
  emptyText: { fontFamily: FontFamily.sansBold, fontSize: FontSize.base, color: colors.textPrimary, marginBottom: 4 },
  emptySubText: { fontFamily: FontFamily.sansRegular, fontSize: FontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
