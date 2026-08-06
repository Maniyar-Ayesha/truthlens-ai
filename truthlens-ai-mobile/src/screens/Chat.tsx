import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import apiClient, { getStoredUser } from "../config/apiClient";
import { Send, Bot } from "lucide-react-native";

interface Message {
  sender: "user" | "ai";
  text: string;
}

export default function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hello 👋 I am TruthLens AI Assistant. Ask me about fake news, deepfakes, suspicious URLs, or AI-generated images.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const currentMessage = message.trim();
    if (!currentMessage) return;

    const userMessage: Message = { sender: "user", text: currentMessage };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const user = await getStoredUser();
      const history = messages.slice(-10).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const response = await apiClient.post("/api/chat", {
        message: currentMessage,
        history,
        email: user.email || null,
      });

      const aiReply: Message = {
        sender: "ai",
        text: response.data.reply || "No reply received.",
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (error: any) {
      console.log("Chat error:", error.message);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            error.response?.data?.reply ||
            error.response?.data?.message ||
            "Sorry, AI chat failed. Please make sure backend is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Chat Assistant</Text>
          <Text style={styles.headerSubtitle}>Ask questions about deepfakes & misinformation</Text>
        </View>

        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          ref={(ref) => ref?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, idx) => (
            <View
              key={idx}
              style={[
                styles.messageBubble,
                msg.sender === "user" ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {msg.sender === "ai" && (
                <View style={styles.botIconWrapper}>
                  <Bot size={16} color="#06b6d4" />
                </View>
              )}
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))}

          {loading && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <ActivityIndicator color="#06b6d4" style={{ marginRight: 8 }} />
              <Text style={[styles.messageText, { color: "#06b6d4" }]}>
                TruthLens AI is thinking...
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask something..."
            placeholderTextColor="#64748b"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity style={styles.sendButtonWrapper} onPress={handleSend} disabled={loading}>
            <LinearGradient colors={["#06b6d4", "#2563eb"]} style={styles.sendButton}>
              <Send size={18} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 14,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  userBubble: {
    backgroundColor: "#06b6d4",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  botIconWrapper: {
    marginRight: 8,
    marginTop: 2,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "rgba(2, 6, 23, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 15,
  },
  sendButtonWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
});
