import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontFamily, FontSize, Spacing, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { navigationRef } from '../navigation/navigationRef';

interface Props {
  userName?: string;
  avatarUri?: string;
}

export default function Navbar({ userName, avatarUri }: Props) {
  const { colors } = useTheme();
  const [resolvedName, setResolvedName] = useState(userName ?? '');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (!userName) {
      AsyncStorage.getItem('user_name').then(name => {
        if (name) setResolvedName(name);
      });
    } else {
      setResolvedName(userName);
    }
  }, [userName]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const styles = makeStyles(colors);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
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

      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => navigationRef.current?.navigate('DrawerMenu' as never)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
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
    backgroundColor: colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.lg,
    color: '#f2f2f2',
  },
  greeting: {
    gap: 2,
  },
  greetingText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.md,
    color: colors.textPrimary,
  },
  userName: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.lg,
    color: colors.textPrimary,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 18,
    color: colors.textPrimary,
  },
});
