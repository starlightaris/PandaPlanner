import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Project Services
import AIService from "../services/AIService";
import FirebaseService, { PlannerEvent } from "../services/FirebaseService";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatImport() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "👋 Hi there! I'm Panda, your smart scheduling assistant. Tell me about your schedule naturally, and I'll organize it for you.",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<PlannerEvent[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    const userText = message.trim();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setMessage("");
    setIsProcessing(true);

    try {
      const extracted = await AIService.parseSchedule(userText);

      // 2. Check if we actually got data
      if (extracted && extracted.length > 0) {
        setExtractedEvents(extracted);

        const eventSummary = extracted
          .map(e => {
            // e.startTime is now a Date object
            const timeStr = e.startTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });
            return `• ${e.title} (${timeStr})`;
          })
          .join('\n');

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: `🐼 I found ${extracted.length} event${extracted.length > 1 ? 's' : ''}!\n\n${eventSummary}\n\nShall I add these to your Panda Planner?`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        // 3. Fallback if no events found
        const failMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: "🤔 I couldn't find any specific times or titles. Could you try being more specific? (e.g., 'Lunch tomorrow at 1pm')",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, failMsg]);
      }
    } catch (error) {
      console.error("Chat UI Error:", error);
      Alert.alert("Panda Error", "I lost my connection to the bamboo forest.");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmImport = async () => {
    if (extractedEvents.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    try {
      // 3. Save each extracted event to Firestore
      for (const event of extractedEvents) {
        await FirebaseService.saveEvent({
          ...event,
          source: "AI_Scan" // Or "Chat_Import" if you prefer
        });
      }

      const confirmMsg: Message = {
        id: Date.now().toString(),
        text: `🎉 Success! I've synced ${extractedEvents.length} event${extractedEvents.length > 1 ? 's' : ''} to your calendar.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMsg]);
      setExtractedEvents([]);

      // Auto-exit after success
      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (error) {
      Alert.alert("Save Failed", "I couldn't save those events to your account.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages([{
      id: "welcome",
      text: "👋 Hi there! I'm Panda. Tell me about your schedule!",
      isUser: false,
      timestamp: new Date(),
    }]);
    setExtractedEvents([]);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      {!item.isUser && (
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>🐼</Text>
        </View>
      )}
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userText : styles.botText
        ]}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LinearGradient
        colors={['#FFFFFF', '#FFFBF5']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#5C5C5C" />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.pandaIconContainer}>
              <Text style={styles.pandaIcon}>🐼</Text>
            </View>
            <View>
              <Text style={styles.title}>Panda Bot</Text>
              <Text style={styles.subtitle}>AI Chat Assistant</Text>
            </View>
          </View>
          <Pressable style={styles.clearButton} onPress={clearChat}>
            <Ionicons name="refresh-outline" size={20} color="#FF8787" />
          </Pressable>
        </View>

        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
        />

        {/* Import Confirmation Bar */}
        {extractedEvents.length > 0 && !isProcessing && (
          <View style={styles.confirmBar}>
            <View style={styles.confirmInfo}>
              <Ionicons name="calendar-outline" size={18} color="#FF8787" />
              <Text style={styles.confirmText}>
                {extractedEvents.length} event{extractedEvents.length > 1 ? 's' : ''} detected
              </Text>
            </View>
            <Pressable style={styles.confirmButton} onPress={confirmImport}>
              <Text style={styles.confirmButtonText}>Add to Calendar</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </Pressable>
          </View>
        )}

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Type your schedule naturally..."
                placeholderTextColor="#C7C7C7"
                value={message}
                onChangeText={setMessage}
                onSubmitEditing={sendMessage}
                editable={!isProcessing}
                multiline
                maxHeight={100}
              />
              <Pressable
                style={[styles.sendButton, (!message.trim() || isProcessing) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!message.trim() || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pandaIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center' },
  pandaIcon: { fontSize: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#3A3A3A' },
  subtitle: { fontSize: 11, color: '#9B9B9B', marginTop: 2 },
  clearButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center' },
  chatList: { flex: 1 },
  chatContent: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 16 },
  messageContainer: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  userMessage: { justifyContent: 'flex-end' },
  botMessage: { justifyContent: 'flex-start' },
  botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF7B2', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  botAvatarText: { fontSize: 18 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
  userBubble: { backgroundColor: '#FF8787', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 20 },
  userText: { color: '#FFFFFF' },
  botText: { color: '#3A3A3A' },
  timestamp: { fontSize: 10, color: '#9B9B9B', marginTop: 4, alignSelf: 'flex-end' },
  confirmBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  confirmInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmText: { fontSize: 14, fontWeight: '500', color: '#FF8787' },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF8787',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  confirmButtonText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  keyboardAvoidingView: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  inputWrapper: { paddingHorizontal: 20, paddingVertical: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    fontSize: 15,
    maxHeight: 100,
    color: '#3A3A3A',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF8787',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#E5E5EA' },
});