import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Animated } from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { logout } from '../services/api';

const BADGE_SCREENS: Record<string, string> = {
  SecurityEvents: '2',
};

const TAB_SCREENS = new Set(['Home', 'Comparativo', 'Score', 'Gaps', 'Chat']);

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

const ALL_ITEMS = [
  ...MENU_ITEMS,
  { label: 'Tema', screen: '__theme__', icon: '🌓' },
  { label: 'Sair', screen: '__logout__', icon: '🚪' },
];

export default function DrawerMenuScreen({ navigation }: any) {
  const { colors, mode, toggle } = useTheme();
  const styles = makeStyles(colors);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;

  const itemAnims = useRef(
    ALL_ITEMS.map(() => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(-32),
    }))
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    Animated.stagger(
      40,
      itemAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(a.translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
        ])
      )
    ).start();
  }, []);

  const handlePress = (item: (typeof ALL_ITEMS)[number]) => {
    if (item.screen === '__logout__') {
      Alert.alert('Sair', 'Deseja encerrar a sessão?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try { await logout(); } catch (_) {}
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]);
      return;
    }
    if (item.screen === '__theme__') {
      toggle();
      return;
    }
    if (TAB_SCREENS.has(item.screen)) {
      navigation.navigate('MainTabs', { screen: item.screen });
    } else {
      navigation.navigate(item.screen);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View
          style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}
        >
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>

        {ALL_ITEMS.map((item, index) => (
          <Animated.View
            key={item.screen}
            style={{
              opacity: itemAnims[index].opacity,
              transform: [{ translateX: itemAnims[index].translateX }],
            }}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handlePress(item)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[
                styles.menuLabel,
                item.screen === '__logout__' && { color: '#ea4545' },
              ]}>
                {item.screen === '__theme__'
                  ? (mode === 'dark' ? 'Modo Claro' : 'Modo Escuro')
                  : item.label}
              </Text>
              {BADGE_SCREENS[item.screen] ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{BADGE_SCREENS[item.screen]}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
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
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: FontSize.base,
    color: colors.textMuted,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: colors.textPrimary,
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
    color: '#f2f2f2',
  },
});
