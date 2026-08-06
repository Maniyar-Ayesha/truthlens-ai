import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../config/apiClient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { ArrowLeft, Send } from 'lucide-react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'Chat'>;

export default function ChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<{id: string, text: string, isUser: boolean}[]>([
    { id: '1', text: 'Hello! I am TruthLens AI. How can I assist you with verifying information today?', isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now().toString(), text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Calling a hypothetical chat backend endpoint
      const response = await apiClient.post('/api/chat', { message: userMessage.text });
      const aiMessage = { 
        id: (Date.now() + 1).toString(), 
        text: response.data.reply || 'I am processing your request. Please hold on.', 
        isUser: false 
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.log('Chat failed, using mock response');
      const aiMessage = { 
        id: (Date.now() + 1).toString(), 
        text: 'I apologize, but I am having trouble connecting to my knowledge base right now.', 
        isUser: false 
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={globalStyles.container}>
        
        <View style={[styles.header, { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.text.primary} size={24} />
          </TouchableOpacity>
          <Text style={typography.h2}>AI Assistant</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.chatContainer}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageWrapper, msg.isUser ? styles.messageWrapperUser : styles.messageWrapperAI]}>
              <View style={[styles.messageBubble, msg.isUser ? styles.messageBubbleUser : styles.messageBubbleAI]}>
                <Text style={msg.isUser ? styles.messageTextUser : styles.messageTextAI}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={[styles.messageWrapper, styles.messageWrapperAI]}>
              <View style={[styles.messageBubble, styles.messageBubbleAI]}>
                <Text style={styles.messageTextAI}>Typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.text.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!input.trim()}>
            <Send color={input.trim() ? colors.text.primary : colors.text.muted} size={24} />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.dark,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 50,
  },
  chatContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperAI: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 15,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleAI: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageTextUser: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'System',
  },
  messageTextAI: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'System',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: colors.background.dark,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'System',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    padding: 12,
    marginLeft: 10,
    backgroundColor: colors.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
