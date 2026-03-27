import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Alert } from "react-native";
import { useState, useCallback, useEffect } from "react";
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
  const { accessToken, user } = useAuth(); // 1. Grab global state

  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // 2. Fetch Google Calendar Events
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

      // Transform Google format to your EventCard format
      const formattedEvents = data.items?.map((item: any) => ({
        id: item.id,
        title: item.summary,
        location: item.location || "No Location",
        date: item.start?.dateTime?.split('T') || item.start?.date,
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

  // 3. Filter Logic
  const filteredEvents = events.filter(event => {
    if (selectedFilter === 'all') return true;
    const today = new Date().toISOString().split('T');
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
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              {/* Greets user by name from Google Auth */}
              <Text style={styles.userName}>{user?.displayName?.split(' ') || "Panda"} Friend 🐼</Text>
            </View>
            <Pressable style={styles.addButton} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/add-event");
            }}>
              <LinearGradient colors={['#FF8787', '#FF9F9F']} style={styles.addButtonGradient}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
          <Text style={styles.dateText}>{getDateString()}</Text>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <StatCard icon="calendar" color="#FF8787" value={events.length} label="Total" />
            <StatCard icon="time" color="#9BD8EC" value={events.filter(e => e.date === new Date().toISOString().split('T')).length} label="Today" />
            <StatCard icon="checkmark-circle" color="#FFF7B2" value="Live" label="Sync" />
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
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Events List */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Schedule</Text>
          </View>

          {filteredEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {filteredEvents.map((event: any) => (
                <EventCard
                  key={event.id}
                  {...event}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Open in Google Calendar or show details
                    Alert.alert(event.title, `Location: ${event.location}`);
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#FF8787" />
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptyText}>Tap + to add one or pull down to sync with Google!</Text>
            </View>
          )}
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