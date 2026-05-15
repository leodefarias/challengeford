import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize } from '../theme';

type Status = 'Completo' | 'Incompleto' | 'Revisão' | 'Mapeado' | string;

interface Props {
  status: Status;
}

function getStatusColor(status: Status): string {
  switch (status) {
    case 'Completo':
    case 'Mapeado':
      return Colors.accentGreen;
    case 'Incompleto':
      return '#ff4e4e';
    case 'Revisão':
      return '#f6a02d';
    default:
      return Colors.textMuted;
  }
}

export default function StatusBadge({ status }: Props) {
  const color = getStatusColor(status);
  return (
    <View style={[styles.badge, { borderColor: color + '40', backgroundColor: color + '18' }]}>
      <Text style={[styles.text, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
  },
});
