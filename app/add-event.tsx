import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import AppInput from "./(components)/AppInput";
import { useAuth } from "./context/AuthContext";
import FirebaseService from "./services/FirebaseService";
import { GoogleService } from "./services/GoogleService";

const { width } = Dimensions.get('window');

export default function AddEvent() {
  const router = useRouter();

  // Get sync preference and tokens from global context
  const { accessToken, user, googleSyncEnabled } = useAuth();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

  // States
  const [isReminder, setIsReminder] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [reminderTime, setReminderTime] = useState(new Date());

  const [isLoading, setIsLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<{ visible: boolean, type: 'date' | 'time', field: string }>({
    visible: false,
    type: 'date',
    field: ''
  });

  const CATEGORIES = [
    { id: 'General', label: 'General', color: '#FF8787', icon: 'apps-outline' },
    { id: 'Home', label: 'Home', color: '#9BD8EC', icon: 'home-outline' },
    { id: 'Work', label: 'Work', color: '#FFF7B2', icon: 'briefcase-outline' },
    { id: 'Personal', label: 'Personal', color: '#C5EBAA', icon: 'person-outline' },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    // Only set default endTime if it's <= startTime (first initialization or invalid)
    if (endTime <= startTime) {
      const newEndTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
      setEndTime(newEndTime);
    }
  }, [startTime]);

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
      const finalStart = combineDateAndTime(date, startTime);
      const finalEnd = combineDateAndTime(date, endTime);

      if (isReminder) {
        const finalReminderTime = combineDateAndTime(date, reminderTime);
        await FirebaseService.addReminder({
          title,
          triggerTime: finalReminderTime,
          isNotified: false,
          category: category as any
        });
      } else {
        if (finalEnd <= finalStart) {
          Alert.alert("🐼 Time Trouble!", "End time must be after start time");
          setIsLoading(false);
          return;
        }

        // 1. Save to Firebase 
        const eventId = await FirebaseService.addEvent({
          title,
          location: location || "No Location",
          startTime: finalStart,
          endTime: finalEnd,
          source: "Manual",
          category,
          isSyncedWithGoogle: false
        });

        // 2. Sync to Google if enabled in Settings
        if (googleSyncEnabled && accessToken && eventId) {
          try {
            const googleResult = await GoogleService.saveEvent({
              title,
              location,
              startTime: finalStart.toISOString(),
              endTime: finalEnd.toISOString()
            }, accessToken);

            if (googleResult.id) {
              // Update the Firebase doc with the Google Event ID
              await FirebaseService.updateEventSyncStatus(eventId, googleResult.id);
            }
          } catch (e) {
            console.warn("Google Sync failed, but event saved locally.");
          }
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error("Save Failed:", err);
      Alert.alert("🐼 Error", "Could not save. Please try again.");
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
    else if (pickerMode.field === 'start') {
      setStartTime(selectedDate);

      // Auto-adjust end time if it's before new start
      if (endTime <= selectedDate) {
        setEndTime(new Date(selectedDate.getTime() + 60 * 60 * 1000));
      }
    }
  };

  const toggleTranslate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const currentPickerValue = () => {
    if (pickerMode.field === 'date') return date;
    if (pickerMode.field === 'start') return startTime;
    if (pickerMode.field === 'end') return endTime;
    return reminderTime;
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container}>
      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#5C5C5C" />
          </Pressable>
          <Text style={styles.headerTitle}>{isReminder ? "New Reminder" : "New Event"}</Text>
          <Pressable onPress={() => setMenuVisible(true)} style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#5C5C5C" />
          </Pressable>
        </View>

        <View style={styles.toggleContainer}>
          <View style={styles.toggleBackground}>
            <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: toggleTranslate }] }]} />
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
            <Text style={styles.cardTitle}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(cat.id);
                  }}
                  style={[
                    styles.categoryBadge,
                    category === cat.id && { backgroundColor: cat.color + '40', borderColor: cat.color }
                  ]}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={category === cat.id ? '#3A3A3A' : '#BDBDBD'}
                  />
                  <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
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
                value={currentPickerValue()}
                mode={pickerMode.type}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickerChange}
                textColor="#000"
              />
            </View>
          </View>
        </Modal>
      )}

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
            <Pressable style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/import");
            }}>
              <Ionicons name="cloud-upload-outline" size={20} color="#FF8787" />
              <Text style={styles.menuText}>Import Schedule</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert("🐼 Panda Help", "Add events or reminders and I'll keep you organized!");
            }}>
              <Ionicons name="help-circle-outline" size={20} color="#FF8787" />
              <Text style={styles.menuText}>Help & Tips</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  toggleBackground: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 25, padding: 4, position: 'relative', height: 50, width: width * 0.9 },
  toggleThumb: { position: 'absolute', width: '48%', height: 42, backgroundColor: '#FFF', borderRadius: 22, top: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleOption: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#8E8E93' },
  toggleTextActive: { color: '#FF8787', fontWeight: '700' },
  scrollContent: { paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 20, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#BDBDBD', marginBottom: 8, letterSpacing: 1 },
  input: { fontSize: 16, color: '#3A3A3A', paddingVertical: 4, borderWidth: 0, backgroundColor: 'transparent' },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  valueText: { fontSize: 16, color: '#3A3A3A', fontWeight: '600' },
  buttonWrapper: { marginHorizontal: 20, marginTop: 20 },
  saveButton: { borderRadius: 25, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  pickerHeader: { alignItems: 'flex-end', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  doneText: { color: '#FF8787', fontWeight: '700', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "flex-end", paddingTop: 100, paddingRight: 20 },
  menu: { backgroundColor: "white", borderRadius: 20, padding: 8, width: 180 },
  menuHeader: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuHeaderText: { fontSize: 13, fontWeight: '600', color: '#FF8787' },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12 },
  menuText: { marginLeft: 12, fontSize: 15, color: '#5C5C5C' },
  categoryScroll: { marginTop: 8, flexDirection: 'row' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', marginRight: 10, gap: 6, backgroundColor: '#FAFAFA' },
  categoryText: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  categoryTextActive: { color: '#3A3A3A' },
});