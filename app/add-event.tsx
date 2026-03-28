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

        <View style={styles.toggleContainer}>
          <View style={styles.toggleBackground}>
            <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: togglePosition }] }]} />
            <Pressable style={styles.toggleOption} onPress={() => setIsReminder(false)}>
              <Text style={[styles.toggleText, !isReminder && styles.toggleTextActive]}>📅 Event</Text>
            </Pressable>
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
                value={pickerMode.field === 'date' ? date : (pickerMode.field === 'start' ? startTime : (pickerMode.field === 'end' ? endTime : reminderTime))}
                mode={pickerMode.type}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickerChange}
              />
            </View>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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