import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Modal, Animated, Dimensions, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState, useRef, useEffect } from "react";
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Colors } from "./theme/colors";
import AppInput from "./(components)/AppInput";
import PrimaryButton from "./(components)/PrimaryButton";
import FirebaseService from "./services/FirebaseService";
import GoogleService from "./services/GoogleService"; // Add this import

const { width } = Dimensions.get('window');

export default function AddEvent() {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

  // State for Event / Reminder Toggle
  const [isReminder, setIsReminder] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [reminderTime, setReminderTime] = useState(new Date());

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [showReminderTime, setShowReminderTime] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Toggle animation
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isReminder ? 1 : 0,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [isReminder]);

  const combineDateAndTime = (baseDate: Date, timeValue: Date) => {
    const combined = new Date(baseDate);
    combined.setHours(timeValue.getHours());
    combined.setMinutes(timeValue.getMinutes());
    return combined;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("🐼 Oops!", "Please give your panda a title!");
      return;
    }

    // You'll need to pass your Google Access Token here.
    // For now, let's assume you're getting it from your Auth context/state.
    const accessToken = "YOUR_GOOGLE_ACCESS_TOKEN";

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      if (isReminder) {
        const finalReminderTime = combineDateAndTime(date, reminderTime).toISOString();

        // 1. Save to Google Tasks API
        await GoogleService.saveReminder({
          title,
          location: location || "Panda Reminder",
          reminderTime: finalReminderTime,
        }, accessToken);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("🎋 Panda Reminder Set!", "I've added this to your Google Tasks!", [
          { text: "Yay!", onPress: () => router.back() }
        ]);

      } else {
        const finalStart = combineDateAndTime(date, startTime);
        const finalEnd = combineDateAndTime(date, endTime);

        if (finalEnd <= finalStart) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("🐼 Time Trouble!", "End time must be after start time");
          setIsLoading(false);
          return;
        }

        // 2. Save to Google Calendar API
        await GoogleService.saveEvent({
          title,
          location,
          startTime: finalStart.toISOString(),
          endTime: finalEnd.toISOString(),
        }, accessToken);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("🎋 Event Synced!", "Panda Planner added this to your Google Calendar!", [
          { text: "Awesome!", onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error("Sync Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("🐼 Oops!", "I couldn't talk to Google. Is your internet on?");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: Date) => d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleFieldPress = (field: string, setter: () => void) => {
    setActiveField(field);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter();
  };

  const toggleSwitch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsReminder(!isReminder);
  };

  const togglePosition = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, width * 0.4 - 4],
  });

  // For iOS native date picker
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDate(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStart(false);
    }
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEnd(false);
    }
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  const onReminderTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowReminderTime(false);
    }
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFBF5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Decorative Panda Ears */}
      <View style={styles.decorativeEarLeft} />
      <View style={styles.decorativeEarRight} />

      <Animated.View
        style={[
          styles.contentWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color="#5C5C5C" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Panda Planner</Text>
            <View style={styles.headerPanda}>
              <Text style={styles.headerEmoji}>🐼</Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMenuVisible(true);
            }}
            style={styles.headerButton}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#5C5C5C" />
          </Pressable>
        </View>

        {/* Custom iOS Toggle - FIXED LOGIC */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleBackground}>
            <Animated.View
              style={[
                styles.toggleThumb,
                {
                  transform: [{ translateX: togglePosition }]
                }
              ]}
            />
            <Pressable
              style={styles.toggleOption}
              onPress={() => isReminder && toggleSwitch()} // Switch to Event if currently Reminder
            >
              <Text style={[styles.toggleText, !isReminder && styles.toggleTextActive]}>
                📅 Event
              </Text>
            </Pressable>
            <Pressable
              style={styles.toggleOption}
              onPress={() => !isReminder && toggleSwitch()} // Switch to Reminder if currently Event
            >
              <Text style={[styles.toggleText, isReminder && styles.toggleTextActive]}>
                ⏰ Reminder
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Title Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>📝</Text>
              <Text style={styles.cardTitle}>What's happening?</Text>
            </View>
            <AppInput
              placeholder={isReminder ? "Feed the pandas..." : "Team sync, coffee chat..."}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholderTextColor="#C7C7C7"
            />
          </View>

          {/* Location Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>📍</Text>
              <Text style={styles.cardTitle}>Location</Text>
            </View>
            <AppInput
              placeholder={isReminder ? "Anywhere (pandas are flexible!)" : "Add a place"}
              value={location}
              onChangeText={setLocation}
              style={styles.input}
              placeholderTextColor="#C7C7C7"
            />
          </View>

          {/* Date Card */}
          <Pressable
            style={styles.card}
            onPress={() => handleFieldPress('date', () => setShowDate(true))}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>📅</Text>
              <Text style={styles.cardTitle}>Date</Text>
            </View>
            <View style={styles.cardValue}>
              <Text style={styles.valueText}>{formatDate(date)}</Text>
              <Ionicons name="chevron-forward" size={20} color="#FF8787" />
            </View>
          </Pressable>

          {/* Time Cards based on mode */}
          {!isReminder ? (
            <>
              <Pressable
                style={styles.card}
                onPress={() => handleFieldPress('start', () => setShowStart(true))}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>⏰</Text>
                  <Text style={styles.cardTitle}>Start Time</Text>
                </View>
                <View style={styles.cardValue}>
                  <Text style={styles.valueText}>{formatTime(startTime)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FF8787" />
                </View>
              </Pressable>

              <Pressable
                style={styles.card}
                onPress={() => handleFieldPress('end', () => setShowEnd(true))}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>🔚</Text>
                  <Text style={styles.cardTitle}>End Time</Text>
                </View>
                <View style={styles.cardValue}>
                  <Text style={styles.valueText}>{formatTime(endTime)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FF8787" />
                </View>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.card}
              onPress={() => handleFieldPress('reminder', () => setShowReminderTime(true))}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>🔔</Text>
                <Text style={styles.cardTitle}>Remind Me</Text>
              </View>
              <View style={styles.cardValue}>
                <Text style={styles.valueText}>{formatTime(reminderTime)}</Text>
                <Ionicons name="chevron-forward" size={20} color="#FF8787" />
              </View>
            </Pressable>
          )}

          {/* Panda Tip */}
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>🐼💡</Text>
            <Text style={styles.tipText}>
              {isReminder
                ? "Pandas never forget! I'll remind you at the perfect time."
                : "Add all your plans and let Panda keep you organized!"}
            </Text>
          </View>

          {/* Save Button */}
          <View style={styles.buttonWrapper}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#FF8787" />
            ) : (
              <Pressable
                style={styles.saveButton}
                onPress={handleSave}
                android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: false }}
              >
                <LinearGradient
                  colors={['#FF8787', '#FF9F9F']}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.saveButtonText}>
                    {isReminder ? "🐼 Set Reminder" : "🎋 Save Event"}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Date Time Pickers - Fixed for both iOS and Android */}
      {showDate && (
        <DateTimePicker
          mode="date"
          value={date}
          onChange={onDateChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}
      {showStart && (
        <DateTimePicker
          mode="time"
          value={startTime}
          onChange={onStartTimeChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}
      {showEnd && (
        <DateTimePicker
          mode="time"
          value={endTime}
          onChange={onEndTimeChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}
      {showReminderTime && (
        <DateTimePicker
          mode="time"
          value={reminderTime}
          onChange={onReminderTimeChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderText}>🐼 Panda Menu</Text>
            </View>

            {/* Import Option */}
            <Pressable style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/import");
            }}>
              <Ionicons name="cloud-upload-outline" size={20} color="#FF8787" />
              <Text style={styles.menuText}>Import Schedule</Text>
            </Pressable>

            {/* Help & Tips Option */}
            <Pressable style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert("🐼 Panda Help", "Add events or reminders and I'll keep you organized! Double tap any field to edit.");
            }}>
              <Ionicons name="help-circle-outline" size={20} color="#FF8787" />
              <Text style={styles.menuText}>Help & Tips</Text>
            </Pressable>

            {/* Cancel Option */}
            <Pressable style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}>
              <Ionicons name="close-circle-outline" size={20} color="#FF8787" />
              <Text style={styles.menuText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeEarLeft: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9BD8EC',
    opacity: 0.3,
    transform: [{ rotate: '-15deg' }],
  },
  decorativeEarRight: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9BD8EC',
    opacity: 0.3,
    transform: [{ rotate: '15deg' }],
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  headerButton: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: '#3A3A3A',
    letterSpacing: -0.3,
  },
  headerPanda: {
    backgroundColor: '#FFF7B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerEmoji: {
    fontSize: 14,
  },
  toggleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  toggleBackground: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 100,
    padding: 4,
    width: '100%',
    position: 'relative',
    height: 50,
  },
  toggleThumb: {
    position: 'absolute',
    width: '48%',
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    top: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    zIndex: 1,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  toggleTextActive: {
    color: '#FF8787',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9B9B9B',
    letterSpacing: -0.2,
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#3A3A3A',
  },
  cardValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  valueText: {
    fontSize: 16,
    color: '#5C5C5C',
    fontWeight: '500',
  },
  tipCard: {
    backgroundColor: '#FFF7B2',
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipEmoji: {
    fontSize: 28,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#8B6B4D',
    lineHeight: 18,
  },
  buttonWrapper: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FF8787',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 20,
  },
  menu: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 8,
    width: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  menuHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8787',
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#5C5C5C',
  },
});