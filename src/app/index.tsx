import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeIn, PopIn, Pulse, Ripple, TypingDots } from '@/components/motion';
import { colors, gradients, radius, shadow } from '@/constants/theme';
import { getApiBaseUrl, getHealth, sendChat, type ChatMessage, type HealthStatus } from '@/services/scannerApi';

type Message = ChatMessage & { id: string; isError?: boolean };

type ServerState = { kind: 'checking' } | { kind: 'online'; health: HealthStatus } | { kind: 'offline' };

const MAX_LENGTH = 4000;

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi! 👋 I’m your scanner assistant. Scan an object to identify it and compare prices, or ask me anything.',
};

const SUGGESTIONS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'sunny-outline', text: 'How do I get the best scan results?' },
  { icon: 'shield-checkmark-outline', text: 'How can I tell if a product is genuine?' },
  { icon: 'phone-portrait-outline', text: 'What should I check before buying a used phone?' },
];

let nextId = 0;
const newId = (suffix: string) => `${Date.now()}-${nextId++}-${suffix}`;

function BotAvatar({ size = 30 }: { size?: number }) {
  return (
    <LinearGradient
      colors={gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name="sparkles" size={size * 0.5} color="#FFFFFF" />
    </LinearGradient>
  );
}

export default function HomeScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [server, setServer] = useState<ServerState>({ kind: 'checking' });
  const scrollRef = useRef<ScrollViewInstance>(null);

  const checkServer = useCallback(() => {
    let cancelled = false;
    setServer({ kind: 'checking' });
    getHealth()
      .then((health) => !cancelled && setServer({ kind: 'online', health }))
      .catch(() => !cancelled && setServer({ kind: 'offline' }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-check the backend each time the screen is shown.
  useFocusEffect(checkServer);

  const chatReady = server.kind === 'online' && server.health.features.chat;

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading || !chatReady) return;

    const userMessage: Message = { id: newId('user'), role: 'user', content: text };
    // Only real turns go to the model: skip the canned welcome and error bubbles.
    const history = [...messages, userMessage]
      .filter((m) => m.id !== WELCOME.id && !m.isError)
      .map(({ role, content }) => ({ role, content }));

    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendChat(history);
      setMessages((previous) => [...previous, { id: newId('assistant'), role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: newId('error'),
          role: 'assistant',
          isError: true,
          content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([WELCOME]);

  const status =
    server.kind === 'checking'
      ? { label: 'Connecting', color: '#CBD5E1' }
      : server.kind === 'offline'
        ? { label: 'Offline', color: '#F87171' }
        : server.health.features.vision
          ? { label: 'Online', color: '#4ADE80' }
          : { label: 'Setup needed', color: '#FBBF24' };

  const showSuggestions = messages.length === 1 && !loading && chatReady;
  const canSend = chatReady && !loading && input.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ---------- Hero ---------- */}
        <LinearGradient colors={gradients.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroTop}>
              <View style={styles.logoWrap}>
                <Ripple size={44} color={colors.cyan} />
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
                  <Ionicons name="scan" size={22} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.heroTitles}>
                <Text style={styles.title}>AI Object Scanner</Text>
                <Text style={styles.subtitle}>Identify anything · Compare prices</Text>
              </View>
              <Pressable
                style={styles.statusPill}
                onPress={checkServer}
                accessibilityLabel={`Server ${status.label}. Tap to re-check.`}
              >
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={styles.statusText}>{status.label}</Text>
              </Pressable>
            </View>

            <FadeIn delay={80}>
              <Pressable
                onPress={() => router.push('/scanner')}
                accessibilityRole="button"
                accessibilityLabel="Scan an object"
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scanCard}>
                  <Pulse max={1.08}>
                    <View style={styles.scanIcon}>
                      <Ionicons name="camera" size={26} color={colors.accent} />
                    </View>
                  </Pulse>
                  <View style={styles.scanText}>
                    <Text style={styles.scanTitle}>Scan an Object</Text>
                    <Text style={styles.scanSubtitle}>Photo → name, details & live prices</Text>
                  </View>
                  <View style={styles.scanArrow}>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </Pressable>
            </FadeIn>
          </SafeAreaView>
        </LinearGradient>

        {/* ---------- Chat ---------- */}
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderLeft}>
            <Ionicons name="chatbubbles" size={16} color={colors.accent} />
            <Text style={styles.chatHeaderTitle}>AI Assistant</Text>
          </View>
          {messages.length > 1 ? (
            <Pressable onPress={clearChat} hitSlop={10} accessibilityLabel="Clear chat" style={styles.clearButton}>
              <Ionicons name="refresh" size={14} color={colors.accent} />
              <Text style={styles.clearText}>New chat</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {server.kind === 'offline' ? (
            <FadeIn>
              <View style={[styles.setupCard, styles.setupCardDanger]}>
                <View style={styles.setupHeader}>
                  <Ionicons name="cloud-offline" size={20} color={colors.danger} />
                  <Text style={styles.setupTitle}>Can’t reach the server</Text>
                </View>
                <Text style={styles.setupText}>
                  Start the backend with <Text style={styles.code}>npm run server</Text> and make sure this device can
                  open <Text style={styles.code}>{getApiBaseUrl()}</Text>.
                </Text>
                <Pressable style={styles.setupButton} onPress={checkServer}>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.setupButtonText}>Try again</Text>
                </Pressable>
              </View>
            </FadeIn>
          ) : null}

          {server.kind === 'online' && !server.health.features.chat ? (
            <FadeIn>
              <View style={styles.setupCard}>
                <View style={styles.setupHeader}>
                  <Ionicons name="key" size={20} color={colors.warning} />
                  <Text style={styles.setupTitle}>Add your Groq API key to turn on AI</Text>
                </View>
                <Text style={styles.setupStep}>1. Get a free key at console.groq.com/keys</Text>
                <Text style={styles.setupStep}>
                  2. Copy <Text style={styles.code}>server/.env.example</Text> to{' '}
                  <Text style={styles.code}>server/.env</Text>
                </Text>
                <Text style={styles.setupStep}>
                  3. Set <Text style={styles.code}>GROQ_API_KEY=your_key</Text> and restart the server
                </Text>
                <Pressable style={styles.setupButton} onPress={checkServer}>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.setupButtonText}>I’ve added it, check again</Text>
                </Pressable>
              </View>
            </FadeIn>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <PopIn key={message.id} style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
                {!isUser ? (
                  message.isError ? (
                    <View style={styles.avatarError}>
                      <Ionicons name="alert" size={16} color={colors.danger} />
                    </View>
                  ) : (
                    <BotAvatar />
                  )
                ) : null}

                {isUser ? (
                  <LinearGradient
                    colors={gradients.user}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, styles.bubbleUser]}
                  >
                    <Text style={[styles.messageText, styles.textUser]} selectable>
                      {message.content}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.bubble, styles.bubbleAssistant, message.isError && styles.bubbleError]}>
                    <Text
                      style={[styles.messageText, message.isError ? styles.textError : styles.textAssistant]}
                      selectable
                    >
                      {message.content}
                    </Text>
                  </View>
                )}
              </PopIn>
            );
          })}

          {loading ? (
            <PopIn style={[styles.row, styles.rowAssistant]}>
              <BotAvatar />
              <View style={[styles.bubble, styles.bubbleAssistant, styles.typing]}>
                <TypingDots color={colors.accent} />
              </View>
            </PopIn>
          ) : null}

          {showSuggestions ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((suggestion, index) => (
                <FadeIn key={suggestion.text} delay={150 + index * 90}>
                  <Pressable
                    style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                    onPress={() => send(suggestion.text)}
                    accessibilityRole="button"
                  >
                    <Ionicons name={suggestion.icon} size={16} color={colors.accent} />
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                  </Pressable>
                </FadeIn>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* ---------- Input ---------- */}
        <View style={styles.inputArea}>
          <View style={[styles.inputBox, !chatReady && styles.inputDisabled]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={chatReady ? 'Ask anything…' : 'AI chat turns on once the server is ready'}
              placeholderTextColor={colors.textSubtle}
              multiline
              maxLength={MAX_LENGTH}
              style={styles.input}
              editable={chatReady && !loading}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => send()}
              onKeyPress={(event) => {
                // On web a multiline input never fires onSubmitEditing: Enter sends, Shift+Enter adds a line.
                const native = event.nativeEvent as { key: string; shiftKey?: boolean };
                if (Platform.OS === 'web' && native.key === 'Enter' && !native.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              accessibilityLabel="Message"
            />
            <Pressable onPress={() => send()} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send message">
              <LinearGradient
                colors={gradients.user}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.sendButton, !canSend && styles.sendDisabled]}
              >
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
          <Text style={styles.footerText}>AI can make mistakes. Check important information.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, backgroundColor: colors.background },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  hero: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, marginBottom: 16 },
  logoWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logo: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroTitles: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#A5B4FC' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, color: '#E2E8F0', fontWeight: '700' },

  scanCard: { padding: 16, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center' },
  scanIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scanText: { flex: 1 },
  scanTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  scanSubtitle: { marginTop: 3, color: '#E0E7FF', fontSize: 12 },
  scanArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 2,
  },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatHeaderTitle: { fontSize: 13, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText: { fontSize: 13, fontWeight: '700', color: colors.accent },

  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, flexGrow: 1 },

  setupCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...shadow,
  },
  setupCardDanger: { borderColor: '#FECACA' },
  setupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setupTitle: { fontSize: 15, fontWeight: '800', color: colors.text, flexShrink: 1 },
  setupText: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  setupStep: { fontSize: 13, color: colors.textMuted, lineHeight: 21 },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: colors.accent,
    fontSize: 12,
  },
  setupButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  setupButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  row: { width: '100%', marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  avatarError: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { maxWidth: '80%', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11 },
  bubbleUser: { borderBottomRightRadius: 6 },
  bubbleAssistant: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, ...shadow },
  bubbleError: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FECACA' },
  messageText: { fontSize: 15, lineHeight: 22 },
  textUser: { color: '#FFFFFF' },
  textAssistant: { color: '#1E293B' },
  textError: { color: '#991B1B' },
  typing: { paddingVertical: 14 },

  suggestions: { marginTop: 4, marginLeft: 38, gap: 8 },
  suggestion: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  suggestionPressed: { backgroundColor: '#E0E7FF' },
  suggestionText: { fontSize: 13, color: '#3730A3', fontWeight: '600' },

  inputArea: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputBox: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 5,
  },
  inputDisabled: { borderColor: colors.border, opacity: 0.7 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 15,
    color: colors.text,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 8,
    textAlignVertical: 'top',
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
  footerText: { marginTop: 6, fontSize: 10, color: colors.textSubtle, textAlign: 'center' },
});
