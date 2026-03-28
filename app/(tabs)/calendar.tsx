import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";

// --- PROJECT IMPORTS ---
import EventCard from "../(components)/EventCard";
import { useAuth } from '../context/AuthContext';
import FirebaseService from "../services/FirebaseService";

export default function CalendarScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  // State
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // --- DATA FETCHING ---
  const fetchAllEvents = useCallback(async () => {
    try {
      let googleEvents = [];
      if (accessToken) {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await response.json();
        googleEvents = data.items?.map((item: any) => ({
          id: item.id,
          title: item.summary,
          location: item.location || "No Location",
          date: item.start?.dateTime?.split('T')[0] || item.start?.date,
          startTime: item.start?.dateTime ? new Date(item.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "00:00",
          endTime: item.end?.dateTime ? new Date(item.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "23:59",
          source: "Google"
        })) || [];
      }

      // Fetch from Firebase (Gracefully handles empty/no data)
      const firestoreEvents = await FirebaseService.getUserEvents();
      const formattedFirebase = firestoreEvents.map((event: any) => {
        const start = event.startTime?.seconds ? new Date(event.startTime.seconds * 1000) : new Date(event.startTime);
        const end = event.endTime?.seconds ? new Date(event.endTime.seconds * 1000) : new Date(event.endTime);
        return {
          id: event.id,
          title: event.title,
          location: event.location,
          date: start.toISOString().split('T')[0],
          startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          source: "App"
        };
      });

      setEvents([...googleEvents, ...formattedFirebase]);
    } catch (error) {
      console.error("Calendar Fetch Error:", error);
    }
  }, [accessToken]);

  // --- CONFLICT DETECTION ---
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
          const e1 = dayEvents[i];
          const e2 = dayEvents[j];
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

  useEffect(() => {
    fetchAllEvents();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fetchAllEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchAllEvents().finally(() => setRefreshing(false));
  };

  // --- HELPERS ---
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
    const marked: any = { [selectedDate]: { selected: true, selectedColor: "#FF8787" } };
    events.forEach(event => {
      const hasConflict = conflicts.has(event.id);
      marked[event.date] = {
        ...marked[event.date],
        marked: true,
        dotColor: hasConflict ? '#FF5252' : '#FF8787',
      };
    });
    return marked;
  };

  // --- RENDER METHODS ---
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
                <Text style={[styles.weekDayName, isSelected && styles.weekDayNameSelected]}>{dayLabels[index]}</Text>
                <Text style={[styles.weekDayDate, isSelected && styles.weekDayDateSelected]}>{new Date(dateStr).getDate()}</Text>
                {dayEvents.length > 0 && (
                  <View style={[styles.weekDot, { backgroundColor: hasConflict ? '#FF5252' : '#9BD8EC' }]} />
                )}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.eventsList}>
          {events.filter(e => e.date === selectedDate).map(event => (
            <EventCard key={event.id} {...event} hasConflict={conflicts.has(event.id)} />
          ))}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#5C5C5C" />
          </Pressable>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Pressable onPress={() => router.push("/add-event")} style={styles.headerButton}>
            <Ionicons name="add" size={28} color="#FF8787" />
          </Pressable>
        </View>

        {/* Mode Toggle */}
        <View style={styles.viewModeContainer}>
          {['month', 'week', 'day'].map((mode) => (
            <Pressable
              key={mode}
              style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
              onPress={() => setViewMode(mode as any)}
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
                  calendarBackground: 'transparent',
                }}
              />
            </View>
          )}

          {viewMode === 'week' ? renderWeekView() : (
            <View style={styles.eventsSection}>
              <Text style={styles.dayLabel}>
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              {events.filter(e => e.date === selectedDate).map(event => (
                <EventCard key={event.id} {...event} hasConflict={conflicts.has(event.id)} />
              ))}
              {events.filter(e => e.date === selectedDate).length === 0 && (
                <Text style={styles.emptyText}>No events for this day</Text>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 55, paddingBottom: 16 },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#3A3A3A" },
  viewModeContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 8 },
  viewModeButton: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', elevation: 1 },
  viewModeButtonActive: { backgroundColor: '#FFF5F0', borderWidth: 1, borderColor: '#FFE5E5' },
  viewModeText: { fontSize: 13, color: '#9B9B9B', fontWeight: '500' },
  viewModeTextActive: { color: '#FF8787', fontWeight: '700' },
  calendarCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 24, padding: 16, elevation: 3, shadowColor: '#9BD8EC', shadowOpacity: 0.1, shadowRadius: 10 },
  weekViewContainer: { paddingHorizontal: 20 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, marginBottom: 20, elevation: 2 },
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
  emptyText: { textAlign: 'center', color: '#9B9B9B', marginTop: 40, fontSize: 14 }
});