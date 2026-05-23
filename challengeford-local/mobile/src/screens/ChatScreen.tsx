import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontFamily, FontSize, Spacing, Radius, ColorScheme } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import Navbar from '../components/Navbar';
import { chat } from '../services/api';
import { sanitizeInput } from '../utils/sanitize';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    text: 'Olá! Sou o assistente de análise de catálogos. Posso responder perguntas sobre specs técnicos, comparativos e posicionamento competitivo das pickups do mercado brasileiro. O que você quer saber?',
  },
  {
    id: '2',
    role: 'user',
    text: 'Qual pickup tem melhor capacidade de vadeo?',
  },
  {
    id: '3',
    role: 'assistant',
    text: 'A Ford Ranger Raptor lidera com 850 mm de profundidade de vadeo, seguida pela Mitsubishi Nova Triton com 800 mm. A Toyota Hilux GR-S oferece 700 mm e a Nissan Frontier 600 mm. O Amarok V6 tem o menor índice com 500 mm.\n\nPara o perfil de uso off-road extremo, Raptor e Nova Triton se destacam significativamente.',
  },
  {
    id: '4',
    role: 'user',
    text: 'Qual é o preço da Ranger Raptor e o IPVA anual?',
  },
  {
    id: '5',
    role: 'assistant',
    text: 'O preço de tabela da Ranger Raptor é R$ 470.000 (referência FIPE mar/2026).\n\nIPVA e custos de propriedade não fazem parte dos catálogos analisados. Recomendo consultar a SEFAZ do seu estado para o cálculo de IPVA.',
  },
];

function MessageBubble({ message, colors }: { message: Message; colors: ColorScheme }) {
  const styles = makeStyles(colors);
  const isUser = message.role === 'user';
  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>IA</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{message.text}</Text>
      </View>
      {isUser && (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>L</Text>
        </View>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    const safe = sanitizeInput(input);
    if (!safe) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: safe };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const data = await chat(safe);
      const reply = typeof data?.resposta === 'string' ? data.resposta : 'Sem resposta do servidor.';
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', text: reply },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', text: err?.message ?? 'Erro de comunicação.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar />
      <View style={styles.titleRow}>
        <Text style={styles.title}>Chat RAG</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
        {loading && (
          <Text style={styles.loadingText}>IA está digitando...</Text>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Pergunte sobre specs, comparativos ou posicionamento..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Text style={styles.sendText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorScheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  titleRow: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.lg,
    color: colors.accentBlue,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize['2xl'],
    color: colors.textMuted,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 14,
    padding: Spacing.sm,
  },
  bubbleAI: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bubbleUser: {
    backgroundColor: colors.accentBlue,
    borderRadius: 12,
  },
  bubbleText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.sm,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  bubbleTextUser: {
    color: '#f2f2f2',
  },
  loadingText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: FontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.cardLight,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.sm,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.accentBlue,
    borderRadius: 11,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: '#f2f2f2',
  },
});
