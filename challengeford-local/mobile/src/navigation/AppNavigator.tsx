import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { navigationRef } from './navigationRef';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';
import { getItem } from '../utils/storage';
import { FontFamily, FontSize } from '../theme';
import { useTheme } from '../theme/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import ComparativoScreen from '../screens/ComparativoScreen';
import ScoreScreen from '../screens/ScoreScreen';
import GapsScreen from '../screens/GapsScreen';
import ChatScreen from '../screens/ChatScreen';
import TimelineScreen from '../screens/TimelineScreen';
import PendingItemsScreen from '../screens/PendingItemsScreen';
import StatusAgentScreen from '../screens/StatusAgentScreen';
import ScoreSettingsScreen from '../screens/ScoreSettingsScreen';
import DrawerMenuScreen from '../screens/DrawerMenuScreen';
import LoginScreen from '../screens/LoginScreen';
import SecurityEventsScreen from '../screens/SecurityEventsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Comparativo: '📊',
  Score: '🎯',
  Gaps: '⚡',
  Chat: '💬',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{TAB_ICONS[name]}</Text>
    </View>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 60,
        },
        tabBarActiveTintColor: colors.accentBlue,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: FontFamily.sansSemiBold,
          fontSize: FontSize.sm,
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Comparativo"
        component={ComparativoScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Comparativo" focused={focused} /> }}
      />
      <Tab.Screen
        name="Score"
        component={ScoreScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Score" focused={focused} /> }}
      />
      <Tab.Screen
        name="Gaps"
        component={GapsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Gaps" focused={focused} /> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Chat" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    getItem('jwt_token')
      .then(token => setInitialRoute(token ? 'MainTabs' : 'Login'))
      .catch(() => setInitialRoute('Login'));
  }, []);

  if (!initialRoute) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accentBlue} />
    </View>
  );

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background },
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
          transitionSpec: {
            open: { animation: 'timing', config: { duration: 250 } },
            close: { animation: 'timing', config: { duration: 200 } },
          },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Timeline" component={TimelineScreen} />
        <Stack.Screen name="PendingItems" component={PendingItemsScreen} />
        <Stack.Screen name="StatusAgent" component={StatusAgentScreen} />
        <Stack.Screen name="SecurityEvents" component={SecurityEventsScreen} />
        <Stack.Screen
          name="ScoreSettings"
          component={ScoreSettingsScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="DrawerMenu"
          component={DrawerMenuScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
