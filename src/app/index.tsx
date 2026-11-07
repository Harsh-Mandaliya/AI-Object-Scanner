import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { colors, radius, shadow } from '@/constants/theme';
import { getApiBaseUrl, getHealth, sendChat, type ChatMessage, type HealthStatus } from '@/services/scannerApi';

type Message = ChatMessage & { id: string; isError?: boolean };

type ServerState = { kind: 'checking' } | { kind: 'online'; health: HealthStatus } | { kind: 'offline' };

const MAX_LENGTH = 4000;

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi! 👋 Scan an object to identify it and compare prices, or ask me anything here.',
};

const SUGGESTIONS = [
  'How do I get the best scan results?',
  'How can I tell if a product is genuine?',
  'What should I check before buying a used phone?',
];

let nextId = 0;
const newId = (suffix: string) => `${Date.now()}-${nextId++}-${suffix}`;

export default function HomeScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [server, setServer] = useState<ServerState>({ kind: 'checking' });
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Re-check the backend each time the screen is shown.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setServer({ kind: 'checking' });
      getHealth()
        .then((health) => !cancelled && setServer({ kind: 'online', health }))
        .catch(() => !cancelled && setServer({ kind: 'offline' }));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

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

  const statusLabel =
    server.kind === 'checking'
      ? 'Connecting…'
      : server.kind === 'offline'
        ? 'Server offline'
        : server.health.features.vision
          ? 'Online'
          : 'Missing API key';
  const statusColor =
    server.kind === 'online' && server.health.features.vision
      ? colors.success
      : server.kind === 'checking'
        ? colors.textSubtle
        : server.kind === 'offline'
          ? colors.danger
          : colors.warning;

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>AI Object Scanner</Text>
            <Text style={styles.subtitle}>Identify anything · Compare prices · Ask questions</Text>
          </View>
          <View style={styles.status} accessibilityLabel={`Server status: ${statusLabel}`}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {server.kind === 'offline' ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Can’t reach the backend</Text>
            <Text style={styles.bannerText}>
              Start it with “npm run server” and make sure this device can reach {getApiBaseUrl()}.
            </Text>
          </View>
        ) : null}
        {server.kind === 'online' && !server.health.features.vision ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>GROQ_API_KEY is not set</Text>
            <Text style={styles.bannerText}>Add your Groq key to server/.env and restart the server.</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.scanCard, pressed && styles.pressed]}
          onPress={() => router.push('/scanner')}
          accessibilityRole="button"
          accessibilityLabel="Scan an object"
        >
          <View style={styles.scanIcon}>
            <Text style={styles.scanIconText}>📷</Text>
          </View>
          <View style={styles.scanText}>
            <Text style={styles.scanTitle}>Scan an Object</Text>
            <Text style={styles.scanSubtitle}>Camera or photo library → name, details & prices</Text>
          </View>
          <Text style={styles.scanArrow}>›</Text>
        </Pressable>

        <View style={styles.chatHeader}>
          <Text style={styles.chatHeaderTitle}>Assistant</Text>
          {messages.length > 1 ? (
            <Pressable onPress={clearChat} hitSlop={10} accessibilityLabel="Clear chat">
              <Text style={styles.clearText}>Clear</Text>
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
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <View key={message.id} style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleAssistant,
                    message.isError && styles.bubbleError,
                  ]}
                >
                  <Text style={[styles.messageText, isUser ? styles.textUser : styles.textAssistant]} selectable>
                    {message.content}
                  </Text>
                </View>
              </View>
            );
          })}

          {loading ? (
            <View style={[styles.row, styles.rowAssistant]}>
              <View style={[styles.bubble, styles.bubbleAssistant, styles.thinking]}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.thinkingText}>Thinking…</Text>
              </View>
            </View>
          ) : null}

          {showSuggestions ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <Pressable key={suggestion} style={styles.suggestion} onPress={() => send(suggestion)}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputBox}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything…"
              placeholderTextColor={colors.textSubtle}
              multiline
              maxLength={MAX_LENGTH}
              style={styles.input}
              editable={!loading}
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
            <Pressable
              style={[styles.sendButton, (!input.trim() || loading) && styles.sendDisabled]}
              onPress={() => send()}
              disabled={!input.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.sendText}>➤</Text>}
            </Pressable>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>AI can make mistakes. Check important information.</Text>
            {input.length > MAX_LENGTH * 0.8 ? (
              <Text style={styles.footerText}>
                {input.length}/{MAX_LENGTH}
              </Text>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, backgroundColor: colors.background },
  pressed: { opacity: 0.85 },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: { flex: 1, minWidth: 0 },
  title: { fontSize: 21, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 3, fontSize: 12, color: colors.textMuted },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  bannerTitle: { color: '#92400E', fontWeight: '700', fontSize: 13 },
  bannerText: { color: '#92400E', fontSize: 12, marginTop: 3, lineHeight: 17 },

  scanCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  scanIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scanIconText: { fontSize: 26 },
  scanText: { flex: 1 },
  scanTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  scanSubtitle: { marginTop: 3, color: '#C7CBD1', fontSize: 12 },
  scanArrow: { color: '#FFFFFF', fontSize: 32, fontWeight: '300', marginLeft: 8 },

  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 4,
  },
  chatHeaderTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  clearText: { fontSize: 13, fontWeight: '700', color: colors.accent },

  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexGrow: 1 },
  row: { width: '100%', marginBottom: 10 },
  rowUser: { alignItems: 'flex-end' },
  rowAssistant: { alignItems: 'flex-start' },
  bubble: { maxWidth: '86%', borderRadius: radius.lg, paddingHorizontal: 15, paddingVertical: 11 },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleError: { backgroundColor: colors.dangerSoft, borderColor: '#FECACA' },
  messageText: { fontSize: 15, lineHeight: 22 },
  textUser: { color: '#FFFFFF' },
  textAssistant: { color: '#1F2937' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 13, color: colors.textMuted },

  suggestions: { marginTop: 6, gap: 8 },
  suggestion: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  suggestionText: { fontSize: 13, color: colors.text, fontWeight: '500' },

  inputArea: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputBox: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    fontSize: 15,
    color: colors.text,
    paddingTop: 9,
    paddingBottom: 9,
    paddingRight: 8,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.35 },
  sendText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7, paddingHorizontal: 2 },
  footerText: { fontSize: 10, color: colors.textSubtle },
});
