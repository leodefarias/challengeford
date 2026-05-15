import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontFamily, FontSize, Spacing } from '../theme';

interface Props {
  userName?: string;
  avatarUri?: string;
  onNotificationPress?: () => void;
}

export default function Navbar({ userName, avatarUri, onNotificationPress }: Props) {
  const [resolvedName, setResolvedName] = useState(userName ?? '');

  useEffect(() => {
    if (!userName) {
      AsyncStorage.getItem('user_name').then(name => {
        if (name) setResolvedName(name);
      });
    } else {
      setResolvedName(userName);
    }
  }, [userName]);
  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{resolvedName?.[0] ?? '?'}</Text>
            </View>
          )}
        </View>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Bem Vindo de volta,</Text>
          <Text style={styles.userName}>{resolvedName || '...'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.notificationBtn} onPress={onNotificationPress}>
        <Text style={styles.bellIcon}>🔔</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  greeting: {
    gap: 2,
  },
  greetingText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  userName: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 18,
  },
});
