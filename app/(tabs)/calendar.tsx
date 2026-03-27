import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Animated } from "react-native";
import { Calendar } from "react-native-calendars";
import { useState, useEffect, useRef } from "react";
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from "../theme/colors";
import EventCard from "../(components)/EventCard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from 'expo-haptics';

// Mock events data - replace with actual data from Firebase
const mockEvents = [
  {
    id: '1',
    title: "Team Meeting",
    location: "Conference Room",
    date: "2026-03-28",
    startTime: "09:00",
    endTime: "10:00",
    category: "Work",
    color: "#FF8787"
  },
  {
    id: '2',
    title: "Lunch with Panda",
    location: "Bamboo Garden",
    date: "2026-03-28",
    startTime: "12:00",
    endTime: "13:00",
    category: "Personal",
    color: "#FFF7B2"
  },
  {
    id: '3',
    title: "Design Review",
    location: "Zoom",
    date: "2026-03-29",
    startTime: "14:00",
    endTime: "15:30",
    category: "Work",
    color: "#9BD8EC"
  },
  {
    id: '4',
    title: "Gym Session",
    location: "Fitness Center",
    date: "2026-03-30",
    startTime: "17:00",
    endTime: "18:00",
    category: "Health",
    color: "#FF8787"
  },
  {
    id: '5',
    title: "Weekly Review",
    location: "Home Office",
    date: "2026-03-31",
    startTime: "10:00",
    endTime: "11:00",
    category: "Work",
    color: "#FFF7B2"
  }
];

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const handleAddEvent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-event");
  };

  const getEventsForDate = (date: string) => {
    return mockEvents.filter(event => event.date === date);
  };

  const getMarkedDates = () => {
    const marked: any = {
      [selectedDate]: {
        selected: true,
        selectedColor: "#FF8787",
        selectedTextColor: "#FFFFFF",
      }
    };

    // Mark dates with events
    mockEvents.forEach(event => {
      if (!marked[event.date]) {
        marked[event.date] = {
          marked: true,
          dotColor: event.color,
        };
      } else {
        marked[event.date] = {
          ...marked[event.date],
          marked: true,
          dotColor: event.color,
        };
      }
    });

    return marked;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const selectedEvents = getEventsForDate(selectedDate);
  const hasEvents = selectedEvents.length > 0;

  const viewModeOptions = [
    { id: 'month', label: 'Month', icon: 'calendar-outline' },
    { id: 'week', label: 'Week', icon: 'grid-outline' },
    { id: 'day', label: 'Day', icon: 'today-outline' }
  ];

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFBF5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#5C5C5C" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Calendar</Text>
            <View style={styles.pandaBadge}>
              <Text style={styles.pandaEmoji}>🐼</Text>
            </View>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={handleAddEvent}
          >
            <LinearGradient
              colors={['#FF8787', '#FF9F9F']}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewModeContainer}>
          {viewModeOptions.map((mode) => (
            <Pressable
              key={mode.id}
              style={[
                styles.viewModeButton,
                viewMode === mode.id && styles.viewModeButtonActive
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode(mode.id as any);
              }}
            >
              <Ionicons
                name={mode.icon as any}
                size={16}
                color={viewMode === mode.id ? "#FF8787" : "#9B9B9B"}
              />
              <Text style={[
                styles.viewModeText,
                viewMode === mode.id && styles.viewModeTextActive
              ]}>
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF8787"
              colors={['#FF8787']}
            />
          }
        >
          {/* Calendar */}
          <View style={styles.calendarCard}>
            <Calendar
              onDayPress={(day) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDate(day.dateString);
              }}
              onMonthChange={(month) => {
                setCurrentMonth(`${month.year}-${String(month.month).padStart(2, '0')}`);
              }}
              markedDates={getMarkedDates()}
              theme={{
                calendarBackground: 'transparent',
                todayTextColor: '#FF8787',
                arrowColor: '#FF8787',
                monthTextColor: '#3A3A3A',
                textMonthFontWeight: '600',
                textDayFontWeight: '500',
                textDayHeaderFontWeight: '500',
                textDayHeaderFontSize: 12,
                textDayFontSize: 14,
                'stylesheet.calendar.header': {
                  dayTextAtIndex0: {
                    color: '#FF8787',
                  },
                  dayTextAtIndex6: {
                    color: '#FF8787',
                  },
                },
              }}
              style={styles.calendar}
            />
          </View>

          {/* Stats Summary */}
          <View style={styles.statsCard}>
            <View style={styles.statsItem}>
              <Text style={styles.statsNumber}>{mockEvents.length}</Text>
              <Text style={styles.statsLabel}>Total Events</Text>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsItem}>
              <Text style={styles.statsNumber}>
                {mockEvents.filter(e => e.date === selectedDate).length}
              </Text>
              <Text style={styles.statsLabel}>Today's Events</Text>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsItem}>
              <Text style={styles.statsNumber}>
                {mockEvents.filter(e => new Date(e.date) > new Date()).length}
              </Text>
              <Text style={styles.statsLabel}>Upcoming</Text>
            </View>
          </View>

          {/* Events Section */}
          <View style={styles.eventsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="calendar" size={20} color="#FF8787" />
                <Text style={styles.sectionTitle}>
                  {formatDate(selectedDate)}
                </Text>
              </View>
              {hasEvents && (
                <Text style={styles.eventCount}>{selectedEvents.length} events</Text>
              )}
            </View>

            {hasEvents ? (
              <View style={styles.eventsList}>
                {selectedEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    title={event.title}
                    location={event.location}
                    date={event.date}
                    startTime={event.startTime}
                    endTime={event.endTime}
                    category={event.category}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/event/${event.id}`);
                    }}
                    style={styles.eventCard}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#FF8787" />
                </View>
                <Text style={styles.emptyTitle}>No events planned</Text>
                <Text style={styles.emptyText}>
                  Tap the + button to add an event and make this day productive!
                </Text>
                <Pressable
                  style={styles.emptyButton}
                  onPress={handleAddEvent}
                >
                  <Text style={styles.emptyButtonText}>Add Event</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Panda Tip */}
          <View style={styles.tipCard}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="calendar-clear" size={24} color="#FFF7B2" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>🐼 Panda Tip</Text>
              <Text style={styles.tipText}>
                {hasEvents
                  ? `You have ${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''} today. Stay focused and take breaks!`
                  : "No events today? Perfect time to plan ahead or enjoy some self-care!"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#9BD8EC',
    opacity: 0.1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF7B2',
    opacity: 0.2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
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
    fontSize: 24,
    fontWeight: "700",
    color: "#3A3A3A",
    letterSpacing: -0.5,
  },
  pandaBadge: {
    backgroundColor: '#FFF7B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pandaEmoji: {
    fontSize: 14,
  },
  addButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FF8787',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  viewModeButtonActive: {
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9B9B9B',
  },
  viewModeTextActive: {
    color: '#FF8787',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  calendar: {
    borderRadius: 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF8787',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#9B9B9B',
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },
  eventsSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A3A3A',
  },
  eventCount: {
    fontSize: 13,
    color: '#FF8787',
    fontWeight: '500',
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    marginBottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 8,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A3A3A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9B9B9B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#FF8787',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF7B2',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6B4D',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#8B6B4D',
    lineHeight: 18,
  },
});