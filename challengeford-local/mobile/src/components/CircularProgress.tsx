import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontFamily, FontSize } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  labelSize?: number;
  showPercent?: boolean;
}

export default function CircularProgress({
  value,
  max = 100,
  size = 70,
  strokeWidth = 6,
  color,
  labelSize = FontSize.xl,
  showPercent = false,
}: Props) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.accentBlue;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontFamily: FontFamily.sansBold, fontSize: labelSize, color: resolvedColor }}>
          {value}
        </Text>
        {showPercent && (
          <Text style={{ fontFamily: FontFamily.sansBold, fontSize: FontSize.md, color: resolvedColor }}>
            %
          </Text>
        )}
      </View>
    </View>
  );
}
