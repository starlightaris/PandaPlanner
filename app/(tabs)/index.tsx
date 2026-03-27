import { View, Text, StyleSheet, Pressable, ScrollView, FlatList, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from "../theme/colors";
import EventCard from "../(components)/EventCard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from 'expo-haptics';

// Mock data for demonstration
const mockEvents = [
  {
    id: '1',
    title: "Team Sync",
    location: "Conference Room",
    date: "2026-03-28",
    startTime: "10:00",
    endTime: "11:00",
    category: "Work"
  },
  {
    id: '2',
    title: "Lunch with Panda",
    location: "Bamboo Garden",
    date: "2026-03-28",
    startTime: "12:30",
    endTime: "13:30",
    category: "Personal"
  },
  {
    id: '3',
    title: "Design Review",
    location: "Zoom",
    date: "2026-03-29",
    startTime: "15:00",
    endTime: "16:30",
    category: "Work"
  }
];

export default function Home() {
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState(mockEvents);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleAddEvent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-event");
  };

  const filters = [
    { id: 'all', label: 'All', icon: 'calendar-outline' },
    { id: 'today', label: 'Today', icon: 'today-outline' },
    { id: 'upcoming', label: 'Upcoming', icon: 'time-outline' }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getDateString = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFBF5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Decorative Elements */}
      <View style={styles.decorativeBlob1} />
      <View style={styles.decorativeBlob2} />

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
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>Panda Friend 🐼</Text>
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
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.dateText}>{getDateString()}</Text>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar" size={20} color="#FF8787" />
              </View>
              <Text style={styles.statNumber}>{events.length}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time" size={20} color="#9BD8EC" />
              </View>
              <Text style={styles.statNumber}>
                {events.filter(e => e.date === new Date().toISOString().split('T')[0]).length}
              </Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF7B2" />
              </View>
              <Text style={styles.statNumber}>85%</Text>
              <Text style={styles.statLabel}>Productivity</Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              style={[
                styles.filterTab,
                selectedFilter === filter.id && styles.filterTabActive
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFilter(filter.id);
              }}
            >
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={selectedFilter === filter.id ? "#FF8787" : "#9B9B9B"}
              />
              <Text style={[
                styles.filterText,
                selectedFilter === filter.id && styles.filterTextActive
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Events Section */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Schedule</Text>
            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/calendar");
            }}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>

          {events.length > 0 ? (
            <View style={styles.eventsList}>
              {events.map((event) => (
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
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-outline" size={48} color="#FF8787" />
              </View>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyText}>
                Tap the + button to add your first event and let Panda help you stay organized!
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={handleAddEvent}
              >
                <Text style={styles.emptyButtonText}>Create Event</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Productivity Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconContainer}>
            <Ionicons name="bulb-outline" size={24} color="#FFF7B2" />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Panda Tip</Text>
            <Text style={styles.tipText}>
              Plan your week ahead! Studies show that planning reduces stress by 40%.
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeBlob1: {
    position: 'absolute',
    top: -80,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#9BD8EC',
    opacity: 0.05,
  },
  decorativeBlob2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFF7B2',
    opacity: 0.1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#9B9B9B',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3A3A3A',
    letterSpacing: -0.5,
  },
  addButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FF8787',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#FF8787',
    fontWeight: '500',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3A3A3A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9B9B9B',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  filterTabActive: {
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  filterText: {
    fontSize: 14,
    color: '#9B9B9B',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FF8787',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A3A3A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF8787',
    fontWeight: '500',
  },
  eventsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
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