import React, { useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';

// ============================================================
// GROQ CONFIGURATION
// ============================================================

// ⚠️ TESTING ONLY
// Use a NEW Groq API key.
// Do NOT commit your API key to GitHub.
//
// Example:
// const GROQ_API_KEY = 'gsk_xxxxxxxxxxxxxxxxx';

const GROQ_API_KEY = 'GROQ_API_KEY';

const GROQ_API_URL =
  'https://api.groq.com/openai/v1/chat/completions';

// ============================================================
// MESSAGE TYPE
// ============================================================

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

// ============================================================
// HOME SCREEN
// ============================================================

export default function HomeScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! 👋 I am your AI Text Assistant. Ask me anything.',
    },
  ]);

  // ==========================================================
  // SEND MESSAGE TO GROQ
  // ==========================================================

  const sendMessage = async () => {
    const text = input.trim();

    // Don't send empty message
    if (!text) {
      return;
    }

    // Don't send while AI is responding
    if (loading) {
      return;
    }

    // Create user message
    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: text,
    };

    // Add user message immediately
    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    // Clear input
    setInput('');

    // Start loading
    setLoading(true);

    try {
      // ------------------------------------------------------
      // CONVERSATION HISTORY
      // ------------------------------------------------------

      const conversation = [
        ...messages,
        userMessage,
      ].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      // ------------------------------------------------------
      // GROQ API REQUEST
      // ------------------------------------------------------

      const response = await fetch(
        GROQ_API_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },

          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',

            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful AI text assistant. Give clear, accurate, useful, and concise answers.',
              },

              ...conversation,
            ],

            temperature: 0.7,

            max_completion_tokens: 1024,
          }),
        }
      );

      const data = await response.json();

      console.log(
        'Groq response:',
        data
      );

      // ------------------------------------------------------
      // ERROR HANDLING
      // ------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            `Groq API error: ${response.status}`
        );
      }

      // ------------------------------------------------------
      // EXTRACT AI RESPONSE
      // ------------------------------------------------------

      const assistantContent =
        data?.choices?.[0]?.message?.content;

      if (!assistantContent) {
        throw new Error(
          'No response was returned by Groq.'
        );
      }

      // Create assistant message
      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantContent,
      };

      // Add AI response
      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(
        'Groq API error:',
        error
      );

      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content:
          error instanceof Error
            ? `❌ ${error.message}`
            : '❌ Something went wrong. Please try again.',
      };

      setMessages((previous) => [
        ...previous,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // ENTER / KEYBOARD SEND
  // ==========================================================

  const handleSubmitEditing = () => {
    if (!loading && input.trim()) {
      sendMessage();
    }
  };

  // ==========================================================
  // OPEN OBJECT SCANNER
  // ==========================================================

  const openScanner = () => {
    router.push('/scanner');
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        {/* ====================================================
            HEADER
        ===================================================== */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>
              AI Text Assistant
            </Text>

            <Text style={styles.subtitle}>
              Powered by Groq ⚡
            </Text>
          </View>

          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              Online
            </Text>
          </View>
        </View>

        {/* ====================================================
            CHAT
        ===================================================== */}

        <ScrollView
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => {
            const isUser =
              message.role === 'user';

            return (
              <View
                key={message.id}
                style={[
                  styles.messageRow,

                  isUser
                    ? styles.userMessageRow
                    : styles.assistantMessageRow,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,

                    isUser
                      ? styles.userBubble
                      : styles.assistantBubble,
                  ]}
                >
                  {!isUser && (
                    <Text style={styles.aiLabel}>
                      AI Assistant
                    </Text>
                  )}

                  <Text
                    style={[
                      styles.messageText,

                      isUser
                        ? styles.userMessageText
                        : styles.assistantMessageText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* ==================================================
              THINKING
          =================================================== */}

          {loading && (
            <View
              style={
                styles.assistantMessageRow
              }
            >
              <View
                style={[
                  styles.messageBubble,
                  styles.assistantBubble,
                  styles.loadingBubble,
                ]}
              >
                <Text style={styles.aiLabel}>
                  AI Assistant
                </Text>

                <View
                  style={
                    styles.loadingContainer
                  }
                >
                  <ActivityIndicator
                    size="small"
                  />

                  <Text
                    style={
                      styles.loadingText
                    }
                  >
                    Thinking...
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ====================================================
            OBJECT SCANNER BUTTON
        ===================================================== */}

        <TouchableOpacity
          style={styles.scannerButton}
          onPress={openScanner}
          activeOpacity={0.8}
        >
          <View
            style={styles.scannerIconContainer}
          >
            <Text
              style={
                styles.scannerButtonIcon
              }
            >
              📷
            </Text>
          </View>

          <View
            style={styles.scannerTextContainer}
          >
            <Text
              style={
                styles.scannerButtonTitle
              }
            >
              Scan an Object
            </Text>

            <Text
              style={
                styles.scannerButtonSubtitle
              }
            >
              Identify, search & find price
            </Text>
          </View>

          <Text
            style={
              styles.scannerArrow
            }
          >
            ›
          </Text>
        </TouchableOpacity>

        {/* ====================================================
            INPUT AREA
        ===================================================== */}

        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything..."
              placeholderTextColor="#8A8A8A"

              multiline
              maxLength={4000}

              style={styles.input}

              editable={!loading}

              returnKeyType="send"

              onSubmitEditing={
                handleSubmitEditing
              }

              submitBehavior="submit"
            />

            {/* SEND BUTTON */}

            <TouchableOpacity
              style={[
                styles.sendButton,

                (!input.trim() ||
                  loading) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={
                !input.trim() ||
                loading
              }
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.sendButtonText
                  }
                >
                  ➤
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ==================================================
              FOOTER
          =================================================== */}

          <View style={styles.bottomRow}>
            <Text style={styles.footerText}>
              AI can make mistakes. Check
              important information.
            </Text>

            <Text
              style={
                styles.characterCount
              }
            >
              {input.length}/4000
            </Text>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // MAIN
  // ==========================================================

  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#F7F7F8',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    minHeight: 72,

    paddingHorizontal: 20,

    backgroundColor: '#FFFFFF',

    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  headerLeft: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: 20,

    fontWeight: '700',

    color: '#171717',
  },

  subtitle: {
    marginTop: 3,

    fontSize: 12,

    color: '#777777',
  },

  statusContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    marginLeft: 10,
  },

  statusDot: {
    width: 8,

    height: 8,

    borderRadius: 4,

    backgroundColor: '#22C55E',
  },

  statusText: {
    fontSize: 12,

    color: '#555555',

    fontWeight: '500',
  },

  // ==========================================================
  // CHAT
  // ==========================================================

  chatContainer: {
    flex: 1,
  },

  chatContent: {
    paddingHorizontal: 16,

    paddingTop: 20,

    paddingBottom: 15,

    flexGrow: 1,
  },

  messageRow: {
    width: '100%',

    marginBottom: 14,
  },

  userMessageRow: {
    alignItems: 'flex-end',
  },

  assistantMessageRow: {
    alignItems: 'flex-start',
  },

  messageBubble: {
    maxWidth: '86%',

    borderRadius: 18,

    paddingHorizontal: 16,

    paddingVertical: 12,
  },

  userBubble: {
    backgroundColor: '#111827',

    borderBottomRightRadius: 5,
  },

  assistantBubble: {
    backgroundColor: '#FFFFFF',

    borderBottomLeftRadius: 5,

    borderWidth: 1,

    borderColor: '#E5E5E5',
  },

  aiLabel: {
    fontSize: 11,

    fontWeight: '700',

    color: '#666666',

    marginBottom: 5,
  },

  messageText: {
    fontSize: 15,

    lineHeight: 22,
  },

  userMessageText: {
    color: '#FFFFFF',
  },

  assistantMessageText: {
    color: '#222222',
  },

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingBubble: {
    minWidth: 130,
  },

  loadingContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,
  },

  loadingText: {
    fontSize: 13,

    color: '#777777',
  },

  // ==========================================================
  // OBJECT SCANNER BUTTON
  // ==========================================================

  scannerButton: {
    marginHorizontal: 16,

    marginBottom: 10,

    padding: 15,

    borderRadius: 18,

    backgroundColor: '#111827',

    flexDirection: 'row',

    alignItems: 'center',

    elevation: 3,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.12,

    shadowRadius: 4,
  },

  scannerIconContainer: {
    width: 48,

    height: 48,

    borderRadius: 14,

    backgroundColor: '#FFFFFF',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 13,
  },

  scannerButtonIcon: {
    fontSize: 25,
  },

  scannerTextContainer: {
    flex: 1,
  },

  scannerButtonTitle: {
    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '700',
  },

  scannerButtonSubtitle: {
    marginTop: 3,

    color: '#B8B8B8',

    fontSize: 12,
  },

  scannerArrow: {
    color: '#FFFFFF',

    fontSize: 30,

    fontWeight: '300',

    marginLeft: 8,
  },

  // ==========================================================
  // INPUT
  // ==========================================================

  inputArea: {
    backgroundColor: '#FFFFFF',

    paddingHorizontal: 14,

    paddingTop: 10,

    paddingBottom:
      Platform.OS === 'ios'
        ? 10
        : 12,

    borderTopWidth: 1,

    borderTopColor: '#E5E5E5',
  },

  inputContainer: {
    minHeight: 52,

    maxHeight: 140,

    borderWidth: 1,

    borderColor: '#D8D8D8',

    borderRadius: 16,

    backgroundColor: '#FAFAFA',

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

    color: '#171717',

    paddingTop: 9,

    paddingBottom: 9,

    paddingRight: 8,

    textAlignVertical: 'top',
  },

  // ==========================================================
  // SEND
  // ==========================================================

  sendButton: {
    width: 40,

    height: 40,

    borderRadius: 12,

    backgroundColor: '#111827',

    alignItems: 'center',

    justifyContent: 'center',
  },

  sendButtonDisabled: {
    opacity: 0.35,
  },

  sendButtonText: {
    color: '#FFFFFF',

    fontSize: 21,

    fontWeight: '700',
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  bottomRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: 7,

    paddingHorizontal: 2,
  },

  footerText: {
    flex: 1,

    fontSize: 10,

    color: '#999999',
  },

  characterCount: {
    marginLeft: 8,

    fontSize: 10,

    color: '#999999',
  },
});