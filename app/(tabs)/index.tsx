import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Alert, Animated } from "react-native";
import { useState, useCallback, useEffect, useRef } from "react";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';

// --- YOUR IMPORTS ---
import { Colors } from "../theme/colors";
import EventCard from "../(components)/EventCard";
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { accessToken, user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Animation for the + button
  const addButtonScale = useRef(new Animated.Value(1)).current;
  const addButtonRotate = useRef(new Animated.Value(0)).current;

  const fetchGoogleEvents = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=" + new Date().toISOString(),
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();

      const formattedEvents = data.items?.map((item: any) => ({
        id: item.id,
        title: item.summary,
        location: item.location || "No Location",
        date: item.start?.dateTime?.split('T')[0] || item.start?.date,
        startTime: item.start?.dateTime ? new Date(item.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "All Day",
        endTime: item.end?.dateTime ? new Date(item.end.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "",
        category: "Google Sync"
      })) || [];

      setEvents(formattedEvents);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  useEffect(() => {
    fetchGoogleEvents();
  }, [accessToken]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchGoogleEvents().finally(() => setRefreshing(false));
  }, [accessToken]);

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate the + button
    Animated.sequence([
      Animated.timing(addButtonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(addButtonRotate, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(addButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(addButtonRotate, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    router.push("/add-event");
  };

  const rotateInterpolate = addButtonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  const filteredEvents = events.filter(event => {
    if (selectedFilter === 'all') return true;
    const today = new Date().toISOString().split('T')[0];
    if (selectedFilter === 'today') return event.date === today;
    if (selectedFilter === 'upcoming') return event.date > today;
    return true;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getDateString = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container}>
      <View style={styles.decorativeBlob1} />
      <View style={styles.decorativeBlob2} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8787" />
        }
      >
        {/* Header Section - Now matches Calendar/Todo */}
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.pandaIconContainer}>
                <Text style={styles.pandaIcon}>🐼</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Panda Planner</Text>
                <Text style={styles.subtitle}>{getDateString()}</Text>
              </View>
            </View>
            <Animated.View
              style={[
                styles.addButtonWrapper,
                {
                  transform: [{ scale: addButtonScale }]
                }
              ]}
            >
              <Pressable
                onPress={handleAddPress}
                style={styles.addButton}
              >
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                  <Ionicons name="add" size={28} color="#FF8787" />
                </Animated.View>
              </Pressable>
            </Animated.View>
          </View>

          {/* Welcome Message */}
          <Text style={styles.welcomeText}>
            {getGreeting()}, {user?.displayName?.split(' ')[0] || "Panda"}! 🐼
          </Text>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <StatCard icon="calendar" color="#FF8787" value={events.length} label="Total Events" />
            <StatCard icon="time" color="#9BD8EC" value={events.filter(e => e.date === new Date().toISOString().split('T')[0]).length} label="Today" />
            <StatCard icon="sync" color="#FFF7B2" value="Live" label="Google Sync" />
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {['all', 'today', 'upcoming'].map((id) => (
            <Pressable
              key={id}
              style={[styles.filterTab, selectedFilter === id && styles.filterTabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFilter(id);
              }}
            >
              <Text style={[styles.filterText, selectedFilter === id && styles.filterTextActive]}>
                {id === 'all' ? 'All Events' : id === 'today' ? 'Today' : 'Upcoming'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Events List */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="calendar" size={20} color="#FF8787" />
              <Text style={styles.sectionTitle}>Your Schedule</Text>
            </View>
          </View>

          {filteredEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {filteredEvents.map((event: any) => (
                <EventCard
                  key={event.id}
                  {...event}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(event.title, `Location: ${event.location}\nTime: ${event.startTime} - ${event.endTime}`);
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-outline" size={48} color="#FF8787" />
              </View>
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptyText}>
                {selectedFilter === 'all'
                  ? "Tap the + button to add an event or pull down to sync with Google!"
                  : selectedFilter === 'today'
                  ? "No events scheduled for today. Enjoy your free time! 🎉"
                  : "No upcoming events. Plan something fun!"}
              </Text>
            </View>
          )}
        </View>

        {/* Panda Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconContainer}>
            <Ionicons name="bulb-outline" size={24} color="#FFF7B2" />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>🐼 Panda Tip</Text>
            <Text style={styles.tipText}>
              Your Google Calendar is synced! Tap the + button to add new events.
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// Helper component for Stats
function StatCard({ icon, color, value, label }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3A3A3A",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#9B9B9B",
    marginTop: 2,
  },
  addButtonWrapper: {
    // No background, just wrapper for animation
  },
  addButton: {
    padding: 8,
    marginRight: -4,
  },
  welcomeText: {
    fontSize: 14,
    color: '#9B9B9B',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A3A3A',
  },
  eventsList: {
    gap: 12,
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