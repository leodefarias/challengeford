import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../theme';

const BADGE_SCREENS: Record<string, string> = {
  SecurityEvents: '2',
};

interface MenuItem {
  label: string;
  screen: string;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Home / Ficha Técnica', screen: 'Home', icon: '🏠' },
  { label: 'Comparativo', screen: 'Comparativo', icon: '📊' },
  { label: 'Score Competitivo', screen: 'Score', icon: '🎯' },
  { label: 'Gaps Acionáveis', screen: 'Gaps', icon: '⚡' },
  { label: 'Chat RAG', screen: 'Chat', icon: '💬' },
  { label: 'Timeline', screen: 'Timeline', icon: '📅' },
  { label: 'Itens Pendentes', screen: 'PendingItems', icon: '📋' },
  { label: 'Status Agente', screen: 'StatusAgent', icon: '🤖' },
  { label: 'Config. Score', screen: 'ScoreSettings', icon: '⚙️' },
  { label: 'Alertas de Segurança', screen: 'SecurityEvents', icon: '🛡️' },
];

export default function DrawerMenuScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => navigation?.navigate(item.screen)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {BADGE_SCREENS[item.screen] ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{BADGE_SCREENS[item.screen]}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.base },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.base,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: '#ff4e4e',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
});
