import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { login } from '../services/api';
import { sanitizeInput, isValidEmail } from '../utils/sanitize';

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    const cleanEmail = sanitizeInput(email.trim().toLowerCase(), 254);
    const cleanSenha = sanitizeInput(senha, 128);

    if (!cleanEmail || !cleanSenha) {
      setError('Preencha e-mail e senha.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('E-mail inválido.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(cleanEmail, cleanSenha);
      navigation.replace('MainTabs');
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>FORD</Text>
          <Text style={styles.subtitle}>Análise Competitiva de Catálogos</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Acesso</Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@ford.com.br"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              maxLength={255}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              maxLength={128}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#f2f2f2" />
            ) : (
              <Text style={styles.btnText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Ford — POC Catálogos v1.0</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.xl,
  },
  header: { alignItems: 'center', gap: Spacing.xs },
  brand: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize['4xl'],
    color: colors.accentBlue,
    letterSpacing: 8,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    gap: Spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  field: { gap: Spacing.xs },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.md,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.cardLight,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.base,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.md,
    color: '#ff4e4e',
    textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.accentBlue,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.base,
    color: '#f2f2f2',
  },
  footer: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
