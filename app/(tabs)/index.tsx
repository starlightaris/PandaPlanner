import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, Animated, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

// --- PROJECT IMPORTS ---
import EventCard from "../(components)/EventCard";
import { useAuth } from '../../context/AuthContext';
import FirebaseService from "../../services/FirebaseService";
import MLService, { Suggestion } from "../../services/MLService";

// ── CONFLICT MODAL ────────────────────────────────────────────────────────────
const ConflictModal = ({
  visible,
  eventTitle,
  conflictTitles,
  onAction,
}: {
  visible: boolean;
  eventTitle: string;
  conflictTitles: string;
  onAction: (action: 'cancel' | 'keep' | 'replace') => void;
}) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={conflictStyles.overlay}>
      <View style={conflictStyles.box}>
        <Text style={conflictStyles.title}>Schedule Conflict 🐼</Text>
        <Text style={conflictStyles.body}>
          <Text style={{ fontWeight: '700' }}>"{eventTitle}"</Text> overlaps with:{'\n\n'}{conflictTitles}
        </Text>
        <Text style={conflictStyles.question}>What would you like to do?</Text>
        <Pressable style={conflictStyles.btnKeep} onPress={() => onAction('keep')}>
          <Text style={conflictStyles.btnKeepText}>Keep Both</Text>
        </Pressable>
        <Pressable style={conflictStyles.btnReplace} onPress={() => onAction('replace')}>
          <Text style={conflictStyles.btnReplaceText}>Replace Existing</Text>
        </Pressable>
        <Pressable style={conflictStyles.btnCancel} onPress={() => onAction('cancel')}>
          <Text style={conflictStyles.btnCancelText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const conflictStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginHorizontal: 32, width: '85%', maxWidth: 360 },
  title: { fontSize: 18, fontWeight: '700', color: '#3A3A3A', marginBottom: 12 },
  body: { fontSize: 14, color: '#5C5C5C', lineHeight: 20, marginBottom: 8 },
  question: { fontSize: 13, color: '#9B9B9B', marginBottom: 16 },
  btnKeep: { backgroundColor: '#FFF5F0', borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#FFE5E5' },
  btnKeepText: { color: '#FF8787', fontWeight: '600', fontSize: 14 },
  btnReplace: { backgroundColor: '#FF8787', borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  btnReplaceText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  btnCancel: { paddingVertical: 10, alignItems: 'center' },
  btnCancelText: { color: '#9B9B9B', fontSize: 13 },
});

export default function Home() {
  const router = useRouter();
  const { accessToken, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, isLoading]);

  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // 'recents' | 'today' | 'upcoming' — time filter
  const [selectedFilter, setSelectedFilter] = useState('recents');
  // null means no category filter active
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── CONFLICT MODAL STATE ──────────────────────────────────────────────────
  // Stores the tapped event + its conflicting peers directly in state.
  // Modal action handlers read from this — no Promise-in-state needed.
  const [conflictModal, setConflictModal] = useState<{
    visible: boolean;
    tappedEvent: any | null;
    conflictingEvents: any[];
  }>({ visible: false, tappedEvent: null, conflictingEvents: [] });

  // ── CONFLICT MODAL STATE ──────────────────────────────────────────────────
  const [conflictModal, setConflictModal] = useState<{
    visible: boolean;
    eventTitle: string;
    conflictTitles: string;
    conflictIds: string[];
    resolve: ((action: 'cancel' | 'keep' | 'replace') => void) | null;
  }>({ visible: false, eventTitle: '', conflictTitles: '', conflictIds: [], resolve: null });

  const showConflictModal = (eventTitle: string, conflictTitles: string, conflictIds: string[]) => {
    return new Promise<'cancel' | 'keep' | 'replace'>((resolve) => {
      setConflictModal({ visible: true, eventTitle, conflictTitles, conflictIds, resolve });
    });
  };

  const addButtonScale = useRef(new Animated.Value(1)).current;
  const addButtonRotate = useRef(new Animated.Value(0)).current;

  const fetchAllEvents = useCallback(async () => {
    try {
      let googleEvents: any[] = [];
      if (accessToken) {
        const response = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=" + new Date().toISOString(),
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await response.json();
        googleEvents = data.items?.map((item: any) => ({
          id: item.id,
          title: item.summary,
          location: item.location || "No Location",
          date: item.start?.dateTime?.split('T')[0] || item.start?.date,
          startTime: item.start?.dateTime
            ? new Date(item.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : "00:00",
          endTime: item.end?.dateTime
            ? new Date(item.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : "23:59",
          category: "Google Sync",
          source: "Google",
        })) ?? [];
      }

      const firestoreEvents = await FirebaseService.getUserEvents();
      const formattedFirebase = firestoreEvents.map((event: any) => {
        const start = event.startTime?.seconds
          ? new Date(event.startTime.seconds * 1000)
          : new Date(event.startTime);
        const end = event.endTime?.seconds
          ? new Date(event.endTime.seconds * 1000)
          : new Date(event.endTime);
        return {
          id: event.id,
          title: event.title,
          location: event.location,
          date: start.toISOString().split('T')[0],
          startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          category: event.category || "General",
          source: "App",
          googleEventId: event.googleEventId ?? null,
        };
      });

      // Deduplicate: Firestore events synced FROM Google have a googleEventId.
      // The live Google fetch returns those same events again — filter them out.
      const firestoreGoogleIds = new Set(
        formattedFirebase
          .filter((e: any) => e.googleEventId)
          .map((e: any) => e.googleEventId)
      );
      const deduplicatedGoogle = googleEvents.filter(e => !firestoreGoogleIds.has(e.id));

      // Also deduplicate by id in case fetch runs twice (StrictMode / focus)
      const seen = new Set<string>();
      const allEvents = [...deduplicatedGoogle, ...formattedFirebase].filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      const combined = allEvents.sort(
        (a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
      );

      setEvents(combined);

      if (combined.length > 0) {
        const mlSuggestions = await MLService.getPredictiveSuggestions(combined);
        setSuggestions(mlSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchAllEvents();
    }, [fetchAllEvents])
  );

  const getConflictedIds = () => {
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
  };

  const conflicts = getConflictedIds();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchAllEvents().finally(() => setRefreshing(false));
  }, [accessToken]);

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(addButtonScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(addButtonRotate, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(addButtonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(addButtonRotate, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    router.push("/add-event");
  };

  const rotateInterpolate = addButtonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const today = new Date().toISOString().split('T')[0];

  // TIME FILTER

  const timeFilteredEvents = events.filter(event => {
    if (selectedFilter === 'recents') {
      // Last 7 days + today
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const eventDate = new Date(event.date);
      return eventDate >= sevenDaysAgo;
    }
    if (selectedFilter === 'today') return event.date === today;
    if (selectedFilter === 'upcoming') return event.date > today;
    return true;
  });

  // CATEGORY FILTER (applied on top of time filter)

  const filteredEvents = selectedCategory
    ? timeFilteredEvents.filter(e => e.category === selectedCategory)
    : timeFilteredEvents;

  // Only show category tags that actually have events in the current time filter
  const activeCategoriesInView = Array.from(
    new Set(timeFilteredEvents.map((e: any) => e.category as string).filter(Boolean))
  );

  // STATS

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const eventsThisMonth = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const todayCount = events.filter(e => e.date === today).length;

  // HELPERS

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getSuggestionStyle = (type: Suggestion['type']) => {
    switch (type) {
      case 'DEEP_WORK': return { tag: '#FF8787', card: '#FF878715', border: '#FF878730' };
      case 'ACADEMIC': return { tag: '#9BD8EC', card: '#9BD8EC15', border: '#9BD8EC30' };
      case 'REST': return { tag: '#A8D5A2', card: '#A8D5A215', border: '#A8D5A230' };
      case 'RECURRING': return { tag: '#FFB347', card: '#FFB34715', border: '#FFB34730' };
    }
  };

  // ── CONFLICT PRESS HANDLER ────────────────────────────────────────────────
  const handleEventPress = async (event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (conflicts.has(event.id) && event.source === 'App') {
      // Find all events that overlap with this one on the same day
      const conflictingEvents = filteredEvents.filter(e =>
        e.id !== event.id &&
        e.date === event.date &&
        e.startTime < event.endTime &&
        event.startTime < e.endTime
      );
      const conflictTitles = conflictingEvents.map(e => `• ${e.title}`).join('\n');
      const conflictIds = conflictingEvents.map(e => e.id);

      const action = await showConflictModal(event.title, conflictTitles, conflictIds);

      if (action === 'replace') {
        // Only delete App events — Google events can't be deleted from here
        for (const e of conflictingEvents) {
          if (e.source === 'App' && e.id) {
            await FirebaseService.deleteEvent(e.id);
          }
        }
        await fetchAllEvents();
      }
      // 'keep' and 'cancel' dismiss the modal with no further action
    } else {
      // Non-conflicting or Google event — show basic info
      Alert.alert(
        event.title,
        `${conflicts.has(event.id) ? "⚠️ CONFLICT DETECTED\n" : ""}Location: ${event.location}\nTime: ${event.startTime} - ${event.endTime}`
      );
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container}>
      <View style={styles.decorativeBlob1} />
      <View style={styles.decorativeBlob2} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8787" />}
      >
        {/* ── HEADER ── */}
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.pandaIconContainer}>
                <Text style={styles.pandaIcon}>🐼</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Panda Planner</Text>
                <Text style={styles.subtitle}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Scale and rotate must be on separate Animated.Views on iOS */}
            <Animated.View style={[styles.addButtonWrapper, { transform: [{ scale: addButtonScale }] }]}>
              <Pressable onPress={handleAddPress} style={styles.addButton}>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                  <Ionicons name="add" size={28} color="#FF8787" />
                </Animated.View>
              </Pressable>
            </Animated.View>
          </View>

          <Text style={styles.welcomeText}>
            {getGreeting()}, {user?.displayName?.split(' ')[0] || "Panda"}! 🐼
          </Text>

          {/* ── STATS — "Total Events This Month" ── */}
          <View style={styles.statsContainer}>
            <StatCard
              icon="calendar"
              color="#FF8787"
              value={eventsThisMonth}
              label="This Month"
            />
            <StatCard
              icon="time"
              color="#9BD8EC"
              value={todayCount}
              label="Today"
            />
            <StatCard
              icon="warning"
              color="#FFB347"
              value={conflicts.size > 0 ? conflicts.size : "✓"}
              label="Conflicts"
            />
          </View>
        </View>

        {/* ── SMART SUGGESTIONS ── */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="sparkles" size={20} color="#9BD8EC" />
                <Text style={styles.sectionTitle}>Smart Suggestions</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionScroll}
            >
              {suggestions.map((item) => {
                const s = getSuggestionStyle(item.type);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.suggestionCard, { backgroundColor: s.card, borderColor: s.border }]}
                    onPress={() =>
                      Alert.alert(
                        "ML Insight",
                        `This slot has a ${(item.confidenceScore * 100).toFixed(0)}% productivity rating based on your current schedule.`
                      )
                    }
                  >
                    <View style={[styles.suggestionTag, { backgroundColor: s.tag }]}>
                      <Text style={styles.suggestionTagText}>{item.type.replace('_', ' ')}</Text>
                    </View>
                    <Text style={styles.suggestionTitle}>{item.title}</Text>
                    <Text style={styles.suggestionTime}>{item.startTime} - {item.endTime}</Text>
                    <Text style={styles.suggestionDesc} numberOfLines={2}>{item.description}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── TIME FILTERS: Recents / Today / Upcoming ── */}
        <View style={styles.filterContainer}>
          {[
            { id: 'recents', label: 'Recents' },
            { id: 'today', label: 'Today' },
            { id: 'upcoming', label: 'Upcoming' },
          ].map(({ id, label }) => (
            <Pressable
              key={id}
              style={[styles.filterTab, selectedFilter === id && styles.filterTabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFilter(id);
                setSelectedCategory(null); // reset category when time filter changes
              }}
            >
              <Text style={[styles.filterText, selectedFilter === id && styles.filterTextActive]}>
                {label.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── CATEGORY TAG FILTERS ── */}
        {activeCategoriesInView.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {/* "All" chip to clear category filter */}
            <Pressable
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
                !selectedCategory && { borderColor: '#FF8787' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(null);
              }}
            >
              <Text style={[styles.categoryChipText, !selectedCategory && { color: '#FF8787', fontWeight: '700' }]}>
                All
              </Text>
            </Pressable>

            {activeCategoriesInView.map(cat => {
              const color = getCategoryColor(cat);
              const active = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                    active && { borderColor: color, backgroundColor: color + '18' },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(active ? null : cat);
                  }}
                >
                  <View style={[styles.categoryDot, { backgroundColor: color }]} />
                  <Text style={[styles.categoryChipText, active && { color, fontWeight: '700' }]}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── EVENTS LIST ── */}
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
                  hasConflict={conflicts.has(event.id)}
                  onPress={() => handleEventPress(event)}
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
                {selectedFilter === 'recents'
                  ? "No recent activity. Tap + to add an event!"
                  : selectedFilter === 'today'
                    ? "Nothing today. Enjoy the free time! 🐼"
                    : "Nothing coming up. Plan something!"}
              </Text>
            </View>
          )}
        </View>

        {/* ── PANDA TIP ── */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconContainer}>
            <Ionicons name="bulb-outline" size={24} color="#8B6B4D" />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>🐼 Panda Tip</Text>
            <Text style={styles.tipText}>
              {conflicts.size > 0
                ? "You have overlapping events. Check the items highlighted in red!"
                : "Your schedule looks clean! Use the + button to add new events."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── CONFLICT MODAL ── */}
      <ConflictModal
        visible={conflictModal.visible}
        eventTitle={conflictModal.eventTitle}
        conflictTitles={conflictModal.conflictTitles}
        onAction={(action) => {
          setConflictModal(prev => ({ ...prev, visible: false }));
          conflictModal.resolve?.(action);
        }}
      />
    </LinearGradient>
  );
}

// STAT CARD

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

// STYLES

const styles = StyleSheet.create({
  container: { flex: 1 },
  decorativeBlob1: { position: 'absolute', top: -80, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: '#9BD8EC', opacity: 0.05 },
  decorativeBlob2: { position: 'absolute', bottom: -40, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFF7B2', opacity: 0.1 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pandaIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center' },
  pandaIcon: { fontSize: 28 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#3A3A3A", letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: "#9B9B9B", marginTop: 2 },
  addButtonWrapper: {},
  addButton: { padding: 8, marginRight: -4 },
  welcomeText: { fontSize: 14, color: '#9B9B9B', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 2 },
  statIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#3A3A3A', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#9B9B9B', textAlign: 'center' },
  suggestionSection: { marginBottom: 24 },
  suggestionScroll: { paddingLeft: 20, paddingRight: 10, gap: 12 },
  suggestionCard: { width: 220, borderRadius: 24, padding: 18, borderWidth: 1 },
  suggestionTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  suggestionTagText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase' },
  suggestionTitle: { fontSize: 16, fontWeight: '700', color: '#3A3A3A', marginBottom: 4 },
  suggestionTime: { fontSize: 12, color: '#5C5C5C', fontWeight: '600', marginBottom: 8 },
  suggestionDesc: { fontSize: 12, color: '#7A7A7A', lineHeight: 18 },

  // Time filters
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  filterTab: { flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', elevation: 1 },
  filterTabActive: { backgroundColor: '#FFF5F0', borderWidth: 1, borderColor: '#FFE5E5' },
  filterText: { fontSize: 12, color: '#9B9B9B', fontWeight: '700' },
  filterTextActive: { color: '#FF8787' },

  // Category chips
  categoryScroll: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#E5E5EA', backgroundColor: '#FFFFFF',
  },
  categoryChipActive: { backgroundColor: '#FFF5F0' },
  categoryChipText: { fontSize: 12, color: '#9B9B9B', fontWeight: '500' },
  categoryDot: { width: 7, height: 7, borderRadius: 4 },

  eventsSection: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#3A3A3A' },
  eventsList: { gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, backgroundColor: '#FFFFFF', borderRadius: 20 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#3A3A3A', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9B9B9B', textAlign: 'center', lineHeight: 20 },
  tipCard: { flexDirection: 'row', backgroundColor: '#FFF7B2', marginHorizontal: 20, marginTop: 24, padding: 16, borderRadius: 24, gap: 12, elevation: 1 },
  tipIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#8B6B4D', marginBottom: 4 },
  tipText: { fontSize: 13, color: '#8B6B4D', lineHeight: 20 },
});