import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Radius, Spacing, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';

function SkeletonLine({ width, height = 12, colors }: { width: number | string; height?: number; colors: ColorScheme }) {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as any, height, opacity: pulse, backgroundColor: colors.cardLight, borderRadius: 6 }]}
    />
  );
}

export default function SkeletonCard() {
  const { colors } = useTheme();

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
      minHeight: 113,
      gap: Spacing.sm,
      justifyContent: 'space-between',
    }}>
      <SkeletonLine width="40%" height={10} colors={colors} />
      <SkeletonLine width="60%" height={36} colors={colors} />
      <SkeletonLine width="50%" height={10} colors={colors} />
    </View>
  );
}
