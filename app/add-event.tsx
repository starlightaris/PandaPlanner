import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Modal, Animated, Dimensions, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import AppInput from "./(components)/AppInput";
import FirebaseService from "./services/FirebaseService";

const { width } = Dimensions.get('window');

export default function AddEvent() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

  const [isReminder, setIsReminder] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [reminderTime, setReminderTime] = useState(new Date());

  const [isLoading, setIsLoading] = useState(false);
  const [pickerMode, setPickerMode] = useState<{visible: boolean, type: 'date' | 'time', field: string}>({
    visible: false,
    type: 'date',
    field: ''
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isReminder ? 1 : 0,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [isReminder, toggleAnim]);

  const combineDateAndTime = (baseDate: Date, timeValue: Date) => {
    const combined = new Date(baseDate);
    combined.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
    return combined;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("🐼 Oops!", "Please give your panda a title!");
      return;
    }

    setIsLoading(true);
    try {
      if (isReminder) {
        const finalReminderTime = combineDateAndTime(date, reminderTime);
        await FirebaseService.saveReminder({
          title,
          location: location || "No Location",
          reminderTime: finalReminderTime,
          isCompleted: false,
          category
        });
      } else {
        const finalStart = combineDateAndTime(date, startTime);
        const finalEnd = combineDateAndTime(date, endTime);

        if (finalEnd <= finalStart) {
          Alert.alert("🐼 Time Trouble!", "End time must be after start time");
          setIsLoading(false);
          return;
        }

        await FirebaseService.saveEvent({
          title,
          location: location || "No Location",
          startTime: finalStart,
          endTime: finalEnd,
          source: "Manual",
          category
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("🐼 Error", "Failed to save. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const showPicker = (type: 'date' | 'time', field: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerMode({ visible: true, type, field });
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setPickerMode({ ...pickerMode, visible: false });
    if (!selectedDate) return;

    if (pickerMode.field === 'date') setDate(selectedDate);
    else if (pickerMode.field === 'start') setStartTime(selectedDate);
    else if (pickerMode.field === 'end') setEndTime(selectedDate);
    else if (pickerMode.field === 'reminder') setReminderTime(selectedDate);
  };

  const togglePosition = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, (width * 0.9) * 0.5],
  });

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container}>
      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#5C5C5C" />
          </Pressable>
          <Text style={styles.headerTitle}>{isReminder ? "New Reminder" : "New Event"}</Text>
          <View style={{ width: 40 }} /> 
        </View>

        {/* Custom iOS Toggle */}
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
              onPress={() => isReminder && toggleSwitch()}
            >
              <Text style={[styles.toggleText, !isReminder && styles.toggleTextActive]}>
                📅 Event
              </Text>
            <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: togglePosition }] }]} />
            <Pressable style={styles.toggleOption} onPress={() => setIsReminder(false)}>
              <Text style={[styles.toggleText, !isReminder && styles.toggleTextActive]}>📅 Event</Text>
            </Pressable>
            <Pressable
              style={styles.toggleOption}
              onPress={() => !isReminder && toggleSwitch()}
            >
              <Text style={[styles.toggleText, isReminder && styles.toggleTextActive]}>
                ⏰ Reminder
              </Text>
            <Pressable style={styles.toggleOption} onPress={() => setIsReminder(true)}>
              <Text style={[styles.toggleText, isReminder && styles.toggleTextActive]}>⏰ Reminder</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TITLE</Text>
            <AppInput 
              placeholder={isReminder ? "Remind me to..." : "Event name"} 
              value={title} 
              onChangeText={setTitle} 
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>LOCATION</Text>
            <AppInput 
              placeholder="Add location" 
              value={location} 
              onChangeText={setLocation} 
              style={styles.input}
            />
          </View>

          <View style={styles.dateTimeRow}>
            <Pressable style={[styles.card, { flex: 1 }]} onPress={() => showPicker('date', 'date')}>
              <Text style={styles.cardTitle}>DATE</Text>
              <Text style={styles.valueText}>{date.toLocaleDateString()}</Text>
            </Pressable>
          </View>

          {!isReminder ? (
            <View style={styles.dateTimeRow}>
              <Pressable style={[styles.card, { flex: 1, marginRight: 6 }]} onPress={() => showPicker('time', 'start')}>
                <Text style={styles.cardTitle}>START</Text>
                <Text style={styles.valueText}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </Pressable>
              <Pressable style={[styles.card, { flex: 1, marginLeft: 6 }]} onPress={() => showPicker('time', 'end')}>
                <Text style={styles.cardTitle}>END</Text>
                <Text style={styles.valueText}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.card} onPress={() => showPicker('time', 'reminder')}>
              <Text style={styles.cardTitle}>REMINDER TIME</Text>
              <Text style={styles.valueText}>{reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </Pressable>
          )}

          <View style={styles.buttonWrapper}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#FF8787" />
            ) : (
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <LinearGradient colors={['#FF8787', '#FF9F9F']} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>Create {isReminder ? 'Reminder' : 'Event'}</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {pickerMode.visible && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Pressable onPress={() => setPickerMode({ ...pickerMode, visible: false })}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode="date"
                value={date}
                onChange={(_, d) => d && setDate(d)}
                display="spinner"
                textColor="#000"
              />
            )}
            {showStart && (
              <DateTimePicker
                mode="time"
                value={startTime}
                onChange={(_, d) => d && setStartTime(d)}
                display="spinner"
                textColor="#000"
              />
            )}
            {showEnd && (
              <DateTimePicker
                mode="time"
                value={endTime}
                onChange={(_, d) => d && setEndTime(d)}
                display="spinner"
                textColor="#000"
              />
            )}
            {showReminderTime && (
              <DateTimePicker
                mode="time"
                value={reminderTime}
                onChange={(_, d) => d && setReminderTime(d)}
                display="spinner"
                textColor="#000"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Menu Modal - Added Import Option */}
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
                value={pickerMode.field === 'date' ? date : (pickerMode.field === 'start' ? startTime : (pickerMode.field === 'end' ? endTime : reminderTime))}
                mode={pickerMode.type}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickerChange}
              />
            </View>

            {/* Import Schedule Option */}
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
        </Modal>
      )}
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
  toggleOptionActive: {
    backgroundColor: 'transparent',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A3A3A',
  },
  doneText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF8787',
    paddingHorizontal: 10,
  },
  container: { flex: 1 },
  contentWrapper: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 55, paddingBottom: 16 },
  headerButton: { padding: 8, borderRadius: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: "700", color: '#3A3A3A' },
  toggleContainer: { paddingHorizontal: 20, marginBottom: 20 },
  toggleBackground: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 25, padding: 4, position: 'relative', height: 50 },
  toggleThumb: { position: 'absolute', width: '48%', height: 42, backgroundColor: '#FFF', borderRadius: 22, top: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleOption: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#8E8E93' },
  toggleTextActive: { color: '#FF8787', fontWeight: '700' },
  scrollContent: { paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 20, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#BDBDBD', marginBottom: 8, letterSpacing: 1 },
  input: { fontSize: 16, color: '#3A3A3A', paddingVertical: 4, borderWidth: 0, backgroundColor: 'transparent', marginBottom: 0 },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  valueText: { fontSize: 16, color: '#3A3A3A', fontWeight: '600' },
  buttonWrapper: { marginHorizontal: 20, marginTop: 20 },
  saveButton: { borderRadius: 25, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  pickerHeader: { alignItems: 'flex-end', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  doneText: { color: '#FF8787', fontWeight: '700', fontSize: 16 }
});