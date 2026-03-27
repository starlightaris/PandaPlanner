import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { Colors } from "./theme/colors";

const { width, height } = Dimensions.get('window');

interface ChatImportProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete?: (events: any[]) => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatImport({ visible, onClose, onImportComplete }: ChatImportProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "👋 Hi there! I'm Panda, your smart scheduling assistant. Tell me about your events naturally, like:\n\n• 'Meeting with Sarah tomorrow at 2pm'\n• 'Dentist appointment on Friday at 10am'\n• 'Gym every Monday and Wednesday at 6pm'",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Natural language processing simulation
  const parseMessage = (text: string) => {
    // This is a simplified NLP simulation
    // In production, you'd want to use a proper NLP library or API
    const events = [];

    // Check for date patterns
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const patterns = [
      { regex: /tomorrow/i, getDate: () => tomorrow },
      { regex: /today/i, getDate: () => today },
      { regex: /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, getDay: (match: string) => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = match.toLowerCase();
        const currentDay = today.getDay();
        let daysToAdd = days.indexOf(targetDay) - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        const date = new Date(today);
        date.setDate(date.getDate() + daysToAdd);
        return date;
      }},
      { regex: /at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i, extractTime: true }
    ];

    // Extract title (remove date/time patterns)
    let title = text
      .replace(/\b(tomorrow|today|next \w+day)\b/gi, '')
      .replace(/\bat \d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, '')
      .replace(/\b(at|on|for)\b/gi, '')
      .trim();

    if (title.length > 0) {
      events.push({
        title: title.charAt(0).toUpperCase() + title.slice(1),
        date: tomorrow.toISOString().split('T')[0],
        startTime: "14:00",
        endTime: "15:00",
        source: "Chat Import",
      });
    }

    return events;
  };

  const sendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setMessage("");
    setIsProcessing(true);

    // Simulate typing delay
    setTimeout(() => {
      // Parse the message
      const extracted = parseMessage(message);

      if (extracted.length > 0) {
        setExtractedEvents(prev => [...prev, ...extracted]);

        // Add bot response
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: `🐼 I found ${extracted.length} event${extracted.length > 1 ? 's' : ''} in your message!\n\n${extracted.map(e => `• ${e.title} on ${new Date(e.date).toLocaleDateString()} at ${e.startTime}`).join('\n')}\n\nWould you like me to add ${extracted.length > 1 ? 'these' : 'this'} to your calendar?`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        // Add helpful response when no event detected
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: "🤔 Hmm, I couldn't find any event details in that message. Try something like:\n\n• 'Meeting with John tomorrow at 3pm'\n• 'Lunch on Friday at 12:30'\n• 'Gym session every Tuesday and Thursday'",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMsg]);
      }

      setIsProcessing(false);
    }, 1000);
  };

  const confirmImport = async () => {
    if (extractedEvents.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    // Add confirmation message
    const confirmMsg: Message = {
      id: Date.now().toString(),
      text: `🎉 Great! I've added ${extractedEvents.length} event${extractedEvents.length > 1 ? 's' : ''} to your schedule. Panda will keep you organized!`,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMsg]);

    // Simulate processing
    setTimeout(() => {
      onImportComplete?.(extractedEvents);
      setIsProcessing(false);

      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 1500);
  };

  const clearChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages([{
      id: "welcome",
      text: "👋 Hi there! I'm Panda, your smart scheduling assistant. Tell me about your events naturally, like:\n\n• 'Meeting with Sarah tomorrow at 2pm'\n• 'Dentist appointment on Friday at 10am'\n• 'Gym every Monday and Wednesday at 6pm'",
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
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#FFFBF5']}
            style={styles.modalContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.pandaIconContainer}>
                  <Text style={styles.pandaIcon}>🐼</Text>
                </View>
                <View>
                  <Text style={styles.title}>Smart Import</Text>
                  <Text style={styles.subtitle}>Chat with Panda</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  style={styles.clearButton}
                  onPress={clearChat}
                >
                  <Ionicons name="refresh-outline" size={20} color="#FF8787" />
                </Pressable>
                <Pressable
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color="#9B9B9B" />
                </Pressable>
              </View>
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
            />

            {/* Import Confirmation Bar */}
            {extractedEvents.length > 0 && (
              <View style={styles.confirmBar}>
                <View style={styles.confirmInfo}>
                  <Ionicons name="calendar-outline" size={18} color="#FF8787" />
                  <Text style={styles.confirmText}>
                    {extractedEvents.length} event{extractedEvents.length > 1 ? 's' : ''} ready
                  </Text>
                </View>
                <Pressable
                  style={styles.confirmButton}
                  onPress={confirmImport}
                  disabled={isProcessing}
                >
                  <Text style={styles.confirmButtonText}>Add to Calendar</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </Pressable>
              </View>
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Type your schedule naturally..."
                  placeholderTextColor="#C7C7C7"
                  value={message}
                  onChangeText={setMessage}
                  onSubmitEditing={sendMessage}
                  editable={!isProcessing}
                  multiline
                />
                <Pressable
                  style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
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
            </KeyboardAvoidingView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    height: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pandaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pandaIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A3A3A',
  },
  subtitle: {
    fontSize: 12,
    color: '#9B9B9B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  botMessage: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  botAvatarText: {
    fontSize: 18,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#FF8787',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#3A3A3A',
  },
  timestamp: {
    fontSize: 10,
    color: '#9B9B9B',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  confirmBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  confirmInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF8787',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF8787',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
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
    shadowColor: '#FF8787',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5EA',
    shadowOpacity: 0,
  },
});