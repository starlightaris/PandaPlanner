import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";
import { Swipeable } from "react-native-gesture-handler";

import EventCard from "../(components)/EventCard";
import { useAuth } from '../../context/AuthContext';
import FirebaseService, { PlannerReminder } from "../../services/FirebaseService";

// REMINDER CARD

function ReminderCard({
  reminder,
  onToggle,
  onDelete,
}: {
  reminder: PlannerReminder & { id: string };
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const categoryColors: Record<string, string> = {
    General: '#9BD8EC',
    Home: '#A8D5A2',
    Work: '#FF8787',
    Personal: '#FFF7B2',
  };
  const color = categoryColors[reminder.category] ?? '#9BD8EC';
  const time = new Date(reminder.triggerTime).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const date = new Date(reminder.triggerTime).toLocaleDateString([], {
    month: 'short', day: 'numeric',
  });

  const renderRight = () => (
    <Pressable
      style={styles.reminderDeleteBtn}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete(reminder.id);
      }}
    >
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRight}>
      <View style={[styles.reminderCard, reminder.isNotified && styles.reminderCardDone]}>
        {/* Radio button */}
        <Pressable
          style={styles.radioWrapper}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle(reminder.id, reminder.isNotified);
          }}
        >
          <View style={[styles.radioOuter, { borderColor: color }]}>
            {reminder.isNotified && <View style={[styles.radioInner, { backgroundColor: color }]} />}
          </View>
        </Pressable>

        <View style={styles.reminderContent}>
          <Text style={[styles.reminderTitle, reminder.isNotified && styles.reminderTitleDone]}>
            {reminder.title}
          </Text>
          <View style={styles.reminderMeta}>
            <View style={[styles.reminderTag, { backgroundColor: color + '30' }]}>
              <Text style={[styles.reminderTagText, { color }]}>{reminder.category}</Text>
            </View>
            <Text style={styles.reminderTime}>{date} · {time}</Text>
            {reminder.repeat && reminder.repeat !== 'None' && (
              <Ionicons name="repeat" size={12} color="#9B9B9B" />
            )}
          </View>
        </View>
      </View>
    </Swipeable>
  );
}

// MAIN SCREEN

export default function CalendarScreen() {
  const router = useRouter();
  const { accessToken, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, isLoading]);

  const [events, setEvents] = useState<any[]>([]);
  const [reminders, setReminders] = useState<(PlannerReminder & { id: string })[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // FETCH

  const fetchAllEvents = useCallback(async () => {
    try {
      let googleEvents: any[] = [];

      if (accessToken) {
        const calRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const calData = await calRes.json();
        googleEvents = calData.items?.map((item: any) => ({
          id: item.id,
          title: `📅 ${item.summary}`,
          location: item.location || "No Location",
          date: item.start?.dateTime?.split('T')[0] || item.start?.date,
          startTime: item.start?.dateTime
            ? new Date(item.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : "00:00",
          endTime: item.end?.dateTime
            ? new Date(item.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : "23:59",
          source: "Google",
        })) ?? [];
      }

      const firestoreEvents = await FirebaseService.getUserEvents();
      const formattedFirebase = firestoreEvents.map((event: any) => ({
        id: event.id,
        title: event.title,
        location: event.location,
        date: new Date(event.startTime).toISOString().split('T')[0],
        startTime: new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTime: new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        source: "App",
      }));

      setEvents([...googleEvents, ...formattedFirebase]);
    } catch (error) {
      console.error("Calendar Fetch Error:", error);
    }
  }, [accessToken]);

  const fetchReminders = useCallback(async () => {
    try {
      const data = await FirebaseService.getUserReminders();
      setReminders(data as (PlannerReminder & { id: string })[]);
    } catch (e) {
      console.error("Reminder Fetch Error:", e);
    }
  }, []);

  useEffect(() => {
    fetchAllEvents();
    fetchReminders();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fetchAllEvents, fetchReminders]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Promise.all([fetchAllEvents(), fetchReminders()]).finally(() => setRefreshing(false));
  };

  // CONFLICT LOGIC

  const getConflictedIds = useCallback(() => {
    const conflicted = new Set<string>();
    const eventsByDate: { [key: string]: any[] } = {};
    events.forEach(e => {
      if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
      eventsByDate[e.date].push(e);
    });
    Object.values(eventsByDate).forEach(dayEvents => {
      for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
          const e1 = dayEvents[i], e2 = dayEvents[j];
          if (e1.startTime < e2.endTime && e2.startTime < e1.endTime) {
            conflicted.add(e1.id);
            conflicted.add(e2.id);
          }
        }
      }
    });
    return conflicted;
  }, [events]);

  const conflicts = getConflictedIds();

  // EVENT ACTIONS

  const handleEventPress = (event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasConflict = conflicts.has(event.id);
    const isAppEvent = event.source === "App";

    if (hasConflict) {
      // Conflict resolution sheet
      Alert.alert(
        "⚠️ Schedule Conflict",
        `"${event.title}" overlaps with another event.`,
        [
          { text: "Keep Both", style: "cancel" },
          ...(isAppEvent
            ? [
                {
                  text: "Reschedule",
                  onPress: () =>
                    router.push({
                      pathname: "/add-event",
                      params: { id: event.id, edit: "true" } as any,
                    }),
                },
                {
                  text: "Remove Event",
                  style: "destructive" as const,
                  onPress: async () => {
                    await FirebaseService.deleteEvent(event.id);
                    onRefresh();
                  },
                },
              ]
            : [
                {
                  text: "Manage in Google",
                  onPress: () =>
                    Alert.alert("Note", "Please manage Google Calendar events in the Google Calendar app."),
                },
              ]),
        ]
      );
    } else {
      // Normal event detail view
      Alert.alert(
        event.title,
        `📍 ${event.location || "No location"}\n🕐 ${event.startTime} – ${event.endTime}`
      );
    }
  };

  const handleDeleteEvent = async (id: string) => {
    Alert.alert("Delete Event", "Remove this event from your schedule?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await FirebaseService.deleteEvent(id);
          setEvents(prev => prev.filter(e => e.id !== id));
        },
      },
    ]);
  };

  const handleEditEvent = (event: any) => {
    router.push({
      pathname: "/add-event",
      params: { id: event.id, edit: "true" } as any,
    });
  };

  // REMINDER ACTIONS

  const handleReminderToggle = async (id: string, current: boolean) => {
    try {
      await FirebaseService.updateReminderStatus(id, !current);
      setReminders(prev =>
        prev.map(r => r.id === id ? { ...r, isNotified: !current } : r)
      );
    } catch {
      Alert.alert("Error", "Could not update reminder.");
    }
  };

  const handleReminderDelete = async (id: string) => {
    try {
      await FirebaseService.deleteItem(id, 'reminders');
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch {
      Alert.alert("Error", "Could not delete reminder.");
    }
  };

  // VIEW HELPERS

  const getWeekDays = (dateString: string) => {
    const refDate = new Date(dateString);
    const sunday = new Date(refDate);
    sunday.setDate(refDate.getDate() - refDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  const getMarkedDates = () => {
    const marked: any = {
      [selectedDate]: { selected: true, selectedColor: "#FF8787" },
    };
    events.forEach(event => {
      const hasConflict = conflicts.has(event.id);
      const existing = marked[event.date] || {};
      marked[event.date] = {
        ...existing,
        marked: true,
        dotColor: hasConflict || existing.dotColor === '#FF5252' ? '#FF5252' : '#FF8787',
      };
    });
    return marked;
  };

  // SWIPEABLE EVENT ROW

  const renderEventWithSwipe = (event: any) => {
    const isAppEvent = event.source === "App";

    const renderRight = () => (
      <View style={styles.swipeActions}>
        {isAppEvent && (
          <Pressable
            style={styles.swipeEditBtn}
            onPress={() => handleEditEvent(event)}
          >
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          </Pressable>
        )}
        {isAppEvent && (
          <Pressable
            style={styles.swipeDeleteBtn}
            onPress={() => handleDeleteEvent(event.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    );

    return (
      <Swipeable key={event.id} renderRightActions={isAppEvent ? renderRight : undefined}>
        <EventCard
          {...event}
          hasConflict={conflicts.has(event.id)}
          onPress={() => handleEventPress(event)}
        />
      </Swipeable>
    );
  };

  // REMINDERS SECTION

  // Show reminders due on or before selectedDate
  const dayReminders = reminders.filter(r => {
    const rDate = new Date(r.triggerTime).toISOString().split('T')[0];
    return rDate === selectedDate;
  });

  // WEEK VIEW

  const renderWeekView = () => {
    const weekDays = getWeekDays(selectedDate);
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <View style={styles.weekViewContainer}>
        <View style={styles.weekHeader}>
          {weekDays.map((dateStr, index) => {
            const isSelected = dateStr === selectedDate;
            const dayEvents = events.filter(e => e.date === dateStr);
            const hasConflict = dayEvents.some(e => conflicts.has(e.id));
            return (
              <Pressable
                key={dateStr}
                style={[styles.weekDayItem, isSelected && styles.weekDaySelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDate(dateStr);
                }}
              >
                <Text style={[styles.weekDayName, isSelected && styles.weekDayNameSelected]}>
                  {dayLabels[index]}
                </Text>
                <Text style={[styles.weekDayDate, isSelected && styles.weekDayDateSelected]}>
                  {new Date(dateStr).getDate()}
                </Text>
                {dayEvents.length > 0 && (
                  <View style={[styles.weekDot, { backgroundColor: hasConflict ? '#FF5252' : '#FF8787' }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Events */}
        <View style={styles.eventsList}>
          {events.filter(e => e.date === selectedDate).map(renderEventWithSwipe)}
        </View>

        {/* Reminders */}
        {dayReminders.length > 0 && renderRemindersSection()}
      </View>
    );
  };

  const renderRemindersSection = () => (
    <View style={styles.remindersSection}>
      <View style={styles.remindersSectionHeader}>
        <Ionicons name="alarm-outline" size={16} color="#FF8787" />
        <Text style={styles.remindersSectionTitle}>Reminders</Text>
      </View>
      {dayReminders.map(r => (
        <ReminderCard
          key={r.id}
          reminder={r}
          onToggle={handleReminderToggle}
          onDelete={handleReminderDelete}
        />
      ))}
    </View>
  );

  // RENDER

  const dayEvents = events.filter(e => e.date === selectedDate);

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#5C5C5C" />
          </Pressable>
          <Text style={styles.headerTitle}>Calendar</Text>
          {/* FIX: pass selectedDate so add-event screen can pre-fill it */}
          <Pressable
            onPress={() => router.push({ pathname: "/add-event", params: { date: selectedDate } as any })}
            style={styles.headerButton}
          >
            <Ionicons name="add" size={28} color="#FF8787" />
          </Pressable>
        </View>

        <View style={styles.viewModeContainer}>
          {(['month', 'week', 'day'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8787" />}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {viewMode === 'month' && (
            <View style={styles.calendarCard}>
              <Calendar
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markedDates={getMarkedDates()}
                theme={{
                  todayTextColor: '#FF8787',
                  arrowColor: '#FF8787',
                  selectedDayBackgroundColor: '#FF8787',
                }}
              />
            </View>
          )}

          {viewMode === 'week' ? renderWeekView() : (
            <View style={styles.eventsSection}>
              <Text style={styles.dayLabel}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
              </Text>

              {/* Events */}
              {dayEvents.length > 0
                ? dayEvents.map(renderEventWithSwipe)
                : <Text style={styles.emptyText}>No events for this day</Text>}

              {/* Reminders */}
              {dayReminders.length > 0 && renderRemindersSection()}
              {dayEvents.length === 0 && dayReminders.length === 0 && (
                <Text style={styles.emptyText}>Nothing scheduled — enjoy the free time! 🐼</Text>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

// STYLES

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 55, paddingBottom: 16,
  },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#3A3A3A" },
  viewModeContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 8 },
  viewModeButton: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', alignItems: 'center', elevation: 1,
  },
  viewModeButtonActive: { backgroundColor: '#FFF5F0', borderWidth: 1, borderColor: '#FFE5E5' },
  viewModeText: { fontSize: 13, color: '#9B9B9B', fontWeight: '500' },
  viewModeTextActive: { color: '#FF8787', fontWeight: '700' },
  calendarCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 24,
    padding: 16, elevation: 3, shadowColor: '#9BD8EC', shadowOpacity: 0.1, shadowRadius: 10,
  },
  weekViewContainer: { paddingHorizontal: 20 },
  weekHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, marginBottom: 20, elevation: 2,
  },
  weekDayItem: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, minWidth: 40 },
  weekDaySelected: { backgroundColor: '#FFF5F0', borderWidth: 1, borderColor: '#FFE5E5' },
  weekDayName: { fontSize: 11, color: '#9B9B9B', marginBottom: 4 },
  weekDayNameSelected: { color: '#FF8787', fontWeight: '700' },
  weekDayDate: { fontSize: 16, fontWeight: '600', color: '#3A3A3A' },
  weekDayDateSelected: { color: '#FF8787' },
  weekDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  eventsSection: { paddingHorizontal: 20 },
  eventsList: { gap: 12 },
  dayLabel: { fontSize: 14, fontWeight: '600', color: '#9B9B9B', marginBottom: 15, marginLeft: 4 },
  emptyText: { textAlign: 'center', color: '#9B9B9B', marginTop: 40, fontSize: 14 },

  // Swipe actions
  swipeActions: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  swipeEditBtn: {
    backgroundColor: '#FFF7B2', justifyContent: 'center', alignItems: 'center',
    width: 50, height: '100%', borderRadius: 12,
  },
  swipeDeleteBtn: {
    backgroundColor: '#FF8787', justifyContent: 'center', alignItems: 'center',
    width: 50, height: '100%', borderRadius: 12,
  },

  // Reminders section
  remindersSection: { marginTop: 24 },
  remindersSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  remindersSectionTitle: { fontSize: 14, fontWeight: '700', color: '#FF8787' },

  // Reminder card
  reminderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#9BD8EC', shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  reminderCardDone: { opacity: 0.55 },
  radioWrapper: { marginRight: 12 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  reminderContent: { flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: '600', color: '#3A3A3A', marginBottom: 6 },
  reminderTitleDone: { textDecorationLine: 'line-through', color: '#9B9B9B' },
  reminderMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reminderTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reminderTagText: { fontSize: 10, fontWeight: '700' },
  reminderTime: { fontSize: 11, color: '#9B9B9B' },
  reminderDeleteBtn: {
    backgroundColor: '#FF8787', justifyContent: 'center', alignItems: 'center',
    width: 56, borderRadius: 12, marginBottom: 10,
  },
});