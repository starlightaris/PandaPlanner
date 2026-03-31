import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import FirebaseService from "../services/FirebaseService";
import { GoogleService } from "../services/GoogleService";
import AppInput from "./(components)/AppInput";

// Only import DateTimePicker on native — web uses plain HTML inputs
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'General',  label: 'General',  color: '#FF8787', icon: 'apps-outline' },
  { id: 'Home',     label: 'Home',     color: '#9BD8EC', icon: 'home-outline' },
  { id: 'Work',     label: 'Work',     color: '#FFF7B2', icon: 'briefcase-outline' },
  { id: 'Personal', label: 'Personal', color: '#C5EBAA', icon: 'person-outline' },
];

// ─── CROSS-PLATFORM DATE/TIME FIELD ──────────────────────────────────────────

/**
 * Renders a tappable field that opens:
 *   iOS     → bottom-sheet spinner (Modal)
 *   Android → native dialog (no modal needed)
 *   Web     → <input type="date"> or <input type="time">
 */
function DateTimeField({
  label,
  value,
  mode,
  onChange,
}: {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const displayValue =
    mode === 'date'
      ? value.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── WEB ──────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    const isoValue =
      mode === 'date'
        ? value.toISOString().split('T')[0]
        : `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

    return (
      <View style={fieldStyles.webWrapper}>
        <Text style={fieldStyles.cardTitle}>{label}</Text>
        {/* @ts-ignore — web-only */}
        <input
          type={mode}
          value={isoValue}
          onChange={(e: any) => {
            const raw = e.target.value;
            if (!raw) return;
            if (mode === 'date') {
              const [y, m, d] = raw.split('-').map(Number);
              const next = new Date(value);
              next.setFullYear(y, m - 1, d);
              onChange(next);
            } else {
              const [h, min] = raw.split(':').map(Number);
              const next = new Date(value);
              next.setHours(h, min, 0, 0);
              onChange(next);
            }
          }}
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#3A3A3A',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        />
      </View>
    );
  }

  // ── ANDROID — native dialog, no wrapper modal ─────────────────────────────
  if (Platform.OS === 'android') {
    return (
      <Pressable
        style={fieldStyles.nativeWrapper}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowPicker(true);
        }}
      >
        <Text style={fieldStyles.cardTitle}>{label}</Text>
        <Text style={fieldStyles.valueText}>{displayValue}</Text>
        {showPicker && (
          <DateTimePicker
            value={value}
            mode={mode}
            display="default"
            onChange={(_: any, selected?: Date) => {
              setShowPicker(false);
              if (selected) onChange(selected);
            }}
          />
        )}
      </Pressable>
    );
  }

  // ── iOS — bottom-sheet spinner ─────────────────────────────────────────────
  return (
    <>
      <Pressable
        style={fieldStyles.nativeWrapper}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowPicker(true);
        }}
      >
        <Text style={fieldStyles.cardTitle}>{label}</Text>
        <Text style={fieldStyles.valueText}>{displayValue}</Text>
      </Pressable>

      <Modal transparent animationType="slide" visible={showPicker}>
        <View style={fieldStyles.modalOverlay}>
          <View style={fieldStyles.pickerSheet}>
            <View style={fieldStyles.pickerHeader}>
              <Pressable onPress={() => setShowPicker(false)}>
                <Text style={fieldStyles.doneText}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={value}
              mode={mode}
              display="spinner"
              onChange={(_: any, selected?: Date) => {
                if (selected) onChange(selected);
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const fieldStyles = StyleSheet.create({
  webWrapper: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 20,
    marginBottom: 12, padding: 16, elevation: 1,
  },
  nativeWrapper: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 20,
    marginBottom: 12, padding: 16, elevation: 1,
  },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#BDBDBD', marginBottom: 8, letterSpacing: 1 },
  valueText: { fontSize: 16, color: '#3A3A3A', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  pickerHeader: { alignItems: 'flex-end', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  doneText: { color: '#FF8787', fontWeight: '700', fontSize: 16 },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function AddEvent() {
  const router = useRouter();
  const { accessToken, googleSyncEnabled } = useAuth();

  // edit mode: params contain { id, edit: "true" } or { date: "YYYY-MM-DD" }
  const params = useLocalSearchParams<{ id?: string; edit?: string; date?: string }>();
  const isEditMode = params.edit === 'true' && !!params.id;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [isReminder, setIsReminder] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('General');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditMode); // loading spinner while we fetch event

  // Date/time — seed from params.date if provided by calendar
  const seedDate = params.date ? new Date(params.date + 'T00:00:00') : new Date();
  const [date, setDate] = useState(seedDate);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [reminderTime, setReminderTime] = useState(new Date());

  // ── Entrance animation ────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Toggle animation ─────────────────────────────────────────────────────
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isReminder ? 1 : 0,
      tension: 300, friction: 20, useNativeDriver: true,
    }).start();
  }, [isReminder]);

  // ── Auto end-time ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode && endTime <= startTime) {
      setEndTime(new Date(startTime.getTime() + 60 * 60 * 1000));
    }
  }, [startTime]);

  // ── Edit mode: fetch and autofill ────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;

    const load = async () => {
      try {
        const event = await FirebaseService.getEventById(params.id!);
        if (!event) {
          Alert.alert('Error', 'Event not found.');
          router.back();
          return;
        }
        setTitle(event.title);
        setLocation(event.location ?? '');
        setCategory(event.category ?? 'General');

        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        setDate(start);
        setStartTime(start);
        setEndTime(end);
      } catch (e) {
        Alert.alert('Error', 'Could not load event details.');
        router.back();
      } finally {
        setIsFetching(false);
      }
    };

    load();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const combineDateAndTime = (baseDate: Date, timeValue: Date) => {
    const combined = new Date(baseDate);
    combined.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
    return combined;
  };

  // ── Save / Update ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('🐼 Oops!', 'Please give your event a title!');
      return;
    }

    setIsLoading(true);
    try {
      if (isReminder) {
        const finalReminderTime = combineDateAndTime(date, reminderTime);
        await FirebaseService.addReminder({
          title,
          triggerTime: finalReminderTime,
          isNotified: false,
          category: category as any,
        });
      } else {
        const finalStart = combineDateAndTime(date, startTime);
        const finalEnd = combineDateAndTime(date, endTime);

        if (finalEnd <= finalStart) {
          Alert.alert('🐼 Time Trouble!', 'End time must be after start time');
          setIsLoading(false);
          return;
        }

        if (isEditMode) {
          // ── UPDATE existing event ──────────────────────────────────────
          await FirebaseService.updateEvent(params.id!, {
            title,
            location: location || 'No Location',
            startTime: finalStart,
            endTime: finalEnd,
            category,
          });
        } else {
          // ── CREATE new event ───────────────────────────────────────────
          const eventId = await FirebaseService.addEvent({
            title,
            location: location || 'No Location',
            startTime: finalStart,
            endTime: finalEnd,
            source: 'Manual',
            category,
            isSyncedWithGoogle: false,
          });

          // Sync to Google if enabled
          if (googleSyncEnabled && accessToken && eventId) {
            try {
              const googleResult = await GoogleService.saveEvent(
                { title, location, startTime: finalStart.toISOString(), endTime: finalEnd.toISOString() },
                accessToken
              );
              if (googleResult.id) {
                await FirebaseService.updateEventSyncStatus(eventId, googleResult.id);
              }
            } catch {
              console.warn('Google Sync failed, event saved locally.');
            }
          }
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error('Save Failed:', err);
      Alert.alert('🐼 Error', 'Could not save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTranslate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.45],
  });

  // ── Loading state while fetching event for edit ───────────────────────────
  if (isFetching) {
    return (
      <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8787" />
      </LinearGradient>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container}>
      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#5C5C5C" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Event' : isReminder ? 'New Reminder' : 'New Event'}
          </Text>
          {/* Spacer to keep title centred */}
          <View style={styles.headerButton} />
        </View>

        {/* Event / Reminder toggle — only shown when creating */}
        {!isEditMode && (
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
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Title */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TITLE</Text>
            <AppInput
              placeholder={isReminder ? 'Remind me to...' : 'Event name'}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />
          </View>

          {/* Category */}
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
                    category === cat.id && { backgroundColor: cat.color + '40', borderColor: cat.color },
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

          {/* Location (events only) */}
          {!isReminder && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>LOCATION</Text>
              <AppInput
                placeholder="Add location"
                value={location}
                onChangeText={setLocation}
                style={styles.input}
              />
            </View>
          )}

          {/* Date — cross-platform */}
          <DateTimeField
            label="DATE"
            value={date}
            mode="date"
            onChange={setDate}
          />

          {/* Start / End or Reminder time — cross-platform */}
          {!isReminder ? (
            <View style={styles.dateTimeRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <DateTimeField
                  label="START"
                  value={startTime}
                  mode="time"
                  onChange={(d) => {
                    setStartTime(d);
                    if (endTime <= d) setEndTime(new Date(d.getTime() + 60 * 60 * 1000));
                  }}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <DateTimeField
                  label="END"
                  value={endTime}
                  mode="time"
                  onChange={setEndTime}
                />
              </View>
            </View>
          ) : (
            <DateTimeField
              label="REMINDER TIME"
              value={reminderTime}
              mode="time"
              onChange={setReminderTime}
            />
          )}

          {/* Save button */}
          <View style={styles.buttonWrapper}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#FF8787" />
            ) : (
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <LinearGradient colors={['#FF8787', '#FF9F9F']} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Save Changes' : isReminder ? 'Create Reminder' : 'Create Event'}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>

        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 55, paddingBottom: 16,
  },
  headerButton: { padding: 8, borderRadius: 20, backgroundColor: '#FFF', width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#3A3A3A' },
  toggleContainer: { paddingHorizontal: 20, marginBottom: 20 },
  toggleBackground: {
    flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 25,
    padding: 4, height: 50, width: width * 0.9,
  },
  toggleThumb: {
    position: 'absolute', width: '48%', height: 42,
    backgroundColor: '#FFF', borderRadius: 22, top: 4,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  toggleOption: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#8E8E93' },
  toggleTextActive: { color: '#FF8787', fontWeight: '700' },
  scrollContent: { paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 20,
    marginBottom: 12, padding: 16, elevation: 1,
  },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#BDBDBD', marginBottom: 8, letterSpacing: 1 },
  dateTimeRow: { flexDirection: 'row', paddingHorizontal: 20 },
  input: {},
  buttonWrapper: { marginHorizontal: 20, marginTop: 20 },
  saveButton: { borderRadius: 25, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  categoryScroll: { marginTop: 8, flexDirection: 'row' },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', marginRight: 10, gap: 6, backgroundColor: '#FAFAFA',
  },
  categoryText: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  categoryTextActive: { color: '#3A3A3A' },
});