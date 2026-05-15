import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../theme';

type Severity = 'critical' | 'warning' | 'success' | 'info';

interface SecurityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: Severity;
  detail?: string;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#ff4e4e',
  warning:  '#f6a02d',
  success:  '#63ff4e',
  info:     '#2d6ef6',
};

const SEVERITY_ICON: Record<Severity, string> = {
  critical: '🛡️',
  warning:  '⚠️',
  success:  '✅',
  info:     'ℹ️',
};

const EVENTS: SecurityEvent[] = [
  {
    id: '1',
    type: 'BRUTE_FORCE',
    message: 'Tentativa de brute force bloqueada',
    detail: 'IP: 203.45.12.87 — 6 tentativas em 60s',
    timestamp: 'Hoje 14:32',
    severity: 'critical',
  },
  {
    id: '2',
    type: 'RATE_LIMIT',
    message: 'Rate limit atingido — /api/chat',
    detail: '21 requisições em 60s (limite: 20)',
    timestamp: 'Hoje 13:15',
    severity: 'warning',
  },
  {
    id: '3',
    type: 'AUTH_SUCCESS',
    message: 'Login bem-sucedido',
    detail: 'admin@ford.com.br — IP: 192.168.1.4',
    timestamp: 'Hoje 09:01',
    severity: 'success',
  },
  {
    id: '4',
    type: 'RATE_LIMIT',
    message: 'Rate limit atingido — /api/catalogos/extrair',
    detail: '11 requisições em 60s (limite: 10)',
    timestamp: 'Ontem 18:47',
    severity: 'warning',
  },
  {
    id: '5',
    type: 'ADMIN_ACTION',
    message: 'Novo usuário criado pelo admin',
    detail: 'analista2@ford.com.br — role: analista',
    timestamp: 'Ontem 10:20',
    severity: 'info',
  },
  {
    id: '6',
    type: 'DUPLICATE_REQUEST',
    message: 'Requisição duplicada bloqueada',
    detail: 'Idempotency-Key já utilizada — /api/catalogos/extrair',
    timestamp: 'Ontem 09:55',
    severity: 'info',
  },
  {
    id: '7',
    type: 'AUTH_SUCCESS',
    message: 'Login bem-sucedido',
    detail: 'analista@ford.com.br — IP: 192.168.1.11',
    timestamp: '12/05 08:30',
    severity: 'success',
  },
];

function EventCard({ item }: { item: SecurityEvent }) {
  const color = SEVERITY_COLOR[item.severity];
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.icon}>{SEVERITY_ICON[item.severity]}</Text>
        <View style={styles.cardContent}>
          <Text style={styles.message}>{item.message}</Text>
          {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
        </View>
        <Text style={[styles.badge, { backgroundColor: color + '22', color }]}>
          {item.type.replace('_', ' ')}
        </Text>
      </View>
      <Text style={styles.timestamp}>{item.timestamp}</Text>
    </View>
  );
}

export default function SecurityEventsScreen({ navigation }: any) {
  const criticalCount = EVENTS.filter(e => e.severity === 'critical').length;
  const warningCount  = EVENTS.filter(e => e.severity === 'warning').length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Alertas de Segurança</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.summary}>
        <View style={[styles.summaryCard, { borderColor: '#ff4e4e' }]}>
          <Text style={[styles.summaryCount, { color: '#ff4e4e' }]}>{criticalCount}</Text>
          <Text style={styles.summaryLabel}>Críticos</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#f6a02d' }]}>
          <Text style={[styles.summaryCount, { color: '#f6a02d' }]}>{warningCount}</Text>
          <Text style={styles.summaryLabel}>Avisos</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.accentGreen }]}>
          <Text style={[styles.summaryCount, { color: Colors.accentGreen }]}>
            {EVENTS.filter(e => e.severity === 'success').length}
          </Text>
          <Text style={styles.summaryLabel}>OK</Text>
        </View>
      </View>

      <FlatList
        data={EVENTS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <EventCard item={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  placeholder: { width: 36 },
  summary: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  summaryCount: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize['2xl'],
  },
  summaryLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderLeftWidth: 3,
    gap: Spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  icon: { fontSize: 18, marginTop: 2 },
  cardContent: { flex: 1, gap: 2 },
  message: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  detail: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  badge: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  timestamp: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'right',
  },
});
