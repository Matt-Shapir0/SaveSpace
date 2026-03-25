import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/src/components/screen";
import { chatApi, type ChatMessage } from "@/src/lib/api";
import { getStoredFirstName } from "@/src/lib/storage";
import { colors } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  usedRag?: boolean;
};

const INITIAL_MESSAGE: Message = {
  id: "0",
  role: "assistant",
  content: "Hey, I'm here for you. Whatever's on your mind, let's talk it through.",
};

const SUGGESTIONS = [
  "I'm feeling overwhelmed today",
  "I had a small win I want to share",
  "Why do I keep doubting myself?",
  "I need some encouragement",
];

export default function ChatScreen() {
  const { userId } = useUser();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getStoredFirstName(userId).then(setFirstName);
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  async function handleSend(text: string) {
    if (!text.trim() || !userId || isTyping) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsTyping(true);

    try {
      const history: ChatMessage[] = nextMessages
        .slice(1)
        .map((message) => ({ role: message.role, content: message.content }));

      const { reply, used_rag } = await chatApi.send(history, userId);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: reply,
          usedRag: used_rag,
        },
      ]);
    } catch {
      setError("Could not reach the server. Try again.");
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Space</Text>
        <Text style={styles.subtitle}>
          {firstName ? `Echo knows what you've been saving, ${firstName}.` : "Powered by your saved content."}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageContent}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[styles.messageRow, message.role === "user" ? styles.messageRowUser : styles.messageRowAssistant]}
          >
            <View style={[styles.messageBubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.messageText, message.role === "user" && styles.userMessageText]}>{message.content}</Text>
            </View>
            {message.usedRag ? <Text style={styles.ragNote}>Referenced your saved videos</Text> : null}
          </View>
        ))}

        {isTyping ? (
          <View style={styles.messageRowAssistant}>
            <View style={styles.assistantBubble}>
              <ActivityIndicator color={colors.primary} />
            </View>
          </View>
        ) : null}

        {messages.length === 1 && !isTyping ? (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <Pressable key={suggestion} style={styles.suggestion} onPress={() => handleSend(suggestion)}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.inputRow}>
        <TextInput
          placeholder="What's on your mind?"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={input}
          onChangeText={setInput}
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={() => handleSend(input)}
          disabled={!input.trim() || isTyping}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  messageList: {
    flex: 1,
    marginTop: 8,
  },
  messageContent: {
    gap: 12,
    paddingBottom: 16,
  },
  messageRow: {
    gap: 6,
  },
  messageRowUser: {
    alignItems: "flex-end",
  },
  messageRowAssistant: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "84%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    color: colors.text,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#fff",
  },
  ragNote: {
    color: colors.primary,
    fontSize: 12,
  },
  suggestions: {
    gap: 10,
  },
  suggestion: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
  },
  suggestionText: {
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
