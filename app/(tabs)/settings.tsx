import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

// Expo modules
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';

import { useAuth } from '../../context/AuthContext';
import FirebaseService, { PlannerEvent } from "../../services/FirebaseService";
import { GoogleService } from "../../services/GoogleService";

// ─── NOTIFICATION HELPERS ────────────────────────────────────────────────────

/**
 * Requests notification permissions from the OS.
 * Returns true if granted, false otherwise.
 */
async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules a local notification 15 minutes before each upcoming event.
 * Skips events that are already in the past.
 */
async function scheduleNotificationsForEvents(events: PlannerEvent[]) {
  // Cancel all existing event notifications before rescheduling
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  for (const event of events) {
    const eventStart = new Date(event.startTime);
    const triggerTime = new Date(eventStart.getTime() - 15 * 60 * 1000); // 15 min before

    if (triggerTime <= now) continue; // Skip past events

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🐼 Upcoming: ${event.title}`,
        body: event.location
          ? `Starting in 15 minutes at ${event.location}`
          : `Starting in 15 minutes`,
        sound: true,
        data: { eventId: event.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });
  }
}

// ─── ICS EXPORT HELPER ───────────────────────────────────────────────────────

/** Formats a Date into the ICS UTC timestamp format: 20240101T120000Z */
function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Escapes special characters required by RFC 5545 */
function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Builds a valid .ics file string from an array of PlannerEvents */
function buildICSString(events: PlannerEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PandaPlanner//PandaPlanner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const uid = event.id ?? `${Date.now()}-${Math.random()}`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}@pandaplanner`);
    lines.push(`DTSTAMP:${toICSDate(new Date())}`);
    lines.push(`DTSTART:${toICSDate(new Date(event.startTime))}`);
    lines.push(`DTEND:${toICSDate(new Date(event.endTime))}`);
    lines.push(`SUMMARY:${escapeICS(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
    if (event.category) lines.push(`CATEGORIES:${escapeICS(event.category)}`);
    lines.push('DESCRIPTION:Exported from PandaPlanner 🐼');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ─── GOOGLE SYNC HELPER ──────────────────────────────────────────────────────

/**
 * Pulls upcoming events from Google Calendar and upserts them into
 * Firestore under the current user's `schedules` collection.
 * Returns the count of newly imported events.
 */
async function importGoogleEvents(accessToken: string): Promise<number> {
  const googleEvents = await GoogleService.fetchUpcomingEvents(accessToken);
  if (!googleEvents || googleEvents.length === 0) return 0;

  const existingEvents = await FirebaseService.getUserEvents();
  const existingGoogleIds = new Set(
    existingEvents
      .filter(e => e.googleEventId)
      .map(e => e.googleEventId)
  );

  let imported = 0;

  for (const gEvent of googleEvents) {
    // Skip events already imported
    if (existingGoogleIds.has(gEvent.id)) continue;

    // Skip events without a valid time (e.g. all-day events with only 'date')
    if (!gEvent.start?.dateTime || !gEvent.end?.dateTime) continue;

    const eventData: PlannerEvent = {
      title: gEvent.summary ?? 'Untitled Event',
      startTime: new Date(gEvent.start.dateTime),
      endTime: new Date(gEvent.end.dateTime),
      location: gEvent.location ?? '',
      source: 'Google_Sync',
      googleEventId: gEvent.id,
      isSyncedWithGoogle: true,
    };

    await FirebaseService.addEvent(eventData, false); // already from Google, no need to push back
    imported++;
  }

  return imported;
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { setAccessToken, setUser, user, accessToken, googleSyncEnabled, setGoogleSyncEnabled } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // On mount: check if notification permissions are already granted
  // so the toggle reflects actual state, not just local state
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === 'granted');
    });
  }, []);

  // ─── NOTIFICATION TOGGLE ───────────────────────────────────────────────────

  const handleNotificationsToggle = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications for Panda Planner in your device Settings to receive event reminders."
        );
        return; // Don't flip the toggle if denied
      }

      // Schedule notifications for all existing events
      try {
        const events = await FirebaseService.getUserEvents();
        await scheduleNotificationsForEvents(events);
        setNotificationsEnabled(true);
        Alert.alert("🐼 Notifications On", `You'll be reminded 15 minutes before each event.`);
      } catch (e) {
        Alert.alert("Error", "Could not schedule notifications.");
      }

    } else {
      // Cancel everything
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotificationsEnabled(false);
    }
  };

  // ─── GOOGLE SYNC TOGGLE ────────────────────────────────────────────────────

  const handleGoogleSyncToggle = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (val) {
      // Can't sync without a Google access token
      if (!accessToken) {
        Alert.alert(
          "Google Account Required",
          "Please sign in with Google to enable Calendar sync."
        );
        return;
      }
      setGoogleSyncEnabled(true);
    } else {
      setGoogleSyncEnabled(false);
      Alert.alert("Sync Off", "New events won't be synced with Google Calendar.");
    }
  };

  // ─── SYNC DATA ─────────────────────────────────────────────────────────────

  const handleSyncData = async () => {
    if (!googleSyncEnabled) {
      Alert.alert("Sync Disabled", "Enable Google Calendar Sync first.");
      return;
    }
    if (!accessToken) {
      Alert.alert("Not Connected", "Please sign in with Google to sync your calendar.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSyncing(true);

    try {
      const count = await importGoogleEvents(accessToken);

      // If notifications are on, reschedule with newly imported events
      if (notificationsEnabled) {
        const allEvents = await FirebaseService.getUserEvents();
        await scheduleNotificationsForEvents(allEvents);
      }

      setLastSynced(new Date());
      Alert.alert(
        "🐼 Sync Complete",
        count > 0
          ? `${count} new event${count > 1 ? 's' : ''} imported from Google Calendar.`
          : "Everything is up to date — no new events found."
      );
    } catch (e) {
      console.error("Sync error:", e);
      Alert.alert("Sync Failed", "Could not fetch events from Google Calendar. Check your connection and try again.");
    } finally {
      setSyncing(false);
    }
  };

  // ─── EXPORT DATA ───────────────────────────────────────────────────────────

  const handleExportData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(true);

    try {
      const events = await FirebaseService.getUserEvents();

      if (events.length === 0) {
        Alert.alert("Nothing to Export", "You have no events saved yet.");
        setExporting(false);
        return;
      }

      const icsContent = buildICSString(events);
      const fileName = `panda-planner-${new Date().toISOString().split('T')[0]}.ics`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, icsContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing Unavailable", "Your device doesn't support file sharing.");
        return;
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'text/calendar',
        dialogTitle: 'Export Panda Planner Calendar',
        UTI: 'public.calendar-event', // iOS
      });

    } catch (e) {
      console.error("Export error:", e);
      Alert.alert("Export Failed", "Could not export your calendar. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // ─── LOGOUT ────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLogoutModalVisible(false);
    try {
      // Cancel all notifications on logout
      await Notifications.cancelAllScheduledNotificationsAsync();
      await FirebaseService.logOut();
      setAccessToken(null);
      setUser(null);
      router.replace("/login");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("🐼 Error", "Failed to log out properly.");
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  const syncDescription = syncing
    ? "Syncing..."
    : lastSynced
    ? `Last synced: ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : "Fetch from Google Calendar";

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Profile Section */}
        <View style={styles.profileCard}>
          <LinearGradient colors={['#FF8787', '#FF9F9F']} style={styles.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.avatarContainer}>
              <Ionicons name="paw-outline" size={48} color="#FFFFFF" />
            </View>
          </LinearGradient>

          <Text style={styles.name}>{user?.displayName || "Panda Enthusiast"}</Text>
          <Text style={styles.email}>{user?.email || "user@pandaplanner.com"}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{googleSyncEnabled ? "On" : "Off"}</Text>
              <Text style={styles.statLabel}>Google Sync</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>1.0</Text>
              <Text style={styles.statLabel}>Version</Text>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={20} color="#FF8787" />
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>

          <SettingItem
            icon="notifications"
            title="Notifications"
            description="Get reminded 15 min before events"
            type="toggle"
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
          />

          <SettingItem
            icon="calendar"
            title="Google Calendar Sync"
            description={googleSyncEnabled && accessToken ? "Syncing with Google Calendar" : "Sign in with Google to enable"}
            type="toggle"
            value={googleSyncEnabled}
            onValueChange={handleGoogleSyncToggle}
          />

          <SettingItem
            icon="moon"
            title="Dark Mode"
            description="Easy on the eyes"
            type="toggle"
            value={darkModeEnabled}
            onValueChange={(val: boolean) => {
              setDarkModeEnabled(val);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert("🌙 Coming Soon", "Dark mode is still being polished by the pandas!");
            }}
          />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-outline" size={20} color="#FF8787" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <SettingItem
            icon={syncing ? "sync" : "sync"}
            title="Sync Data"
            description={syncDescription}
            type="action"
            loading={syncing}
            onPress={handleSyncData}
          />

          <SettingItem
            icon="download"
            title="Export Calendar"
            description={exporting ? "Preparing file..." : "Export as .ics (Google, Apple, Outlook)"}
            type="action"
            loading={exporting}
            onPress={handleExportData}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#FF8787" />
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <SettingItem icon="heart" title="Rate Panda Planner" description="Love us? Leave a review!" type="action" onPress={() => Alert.alert("🐼❤️", "Thanks for your support!")} />
          <SettingItem icon="help-circle" title="Help & Support" description="FAQs and contact us" type="action" onPress={() => Alert.alert("🐼 Help", "Email support@pandaplanner.com")} />
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#FF8787" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>Panda Planner v1.0.0</Text>
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={logoutModalVisible} transparent={true} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setLogoutModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}><Ionicons name="paw" size={48} color="#FF8787" /></View>
            <Text style={styles.modalTitle}>Log Out?</Text>
            <Text style={styles.modalMessage}>Are you sure you want to leave? Your panda will miss you!</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.modalButtonTextCancel}>Stay</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonConfirm]} onPress={confirmLogout}>
                <Text style={styles.modalButtonTextConfirm}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

// ─── SETTING ITEM COMPONENT ──────────────────────────────────────────────────

function SettingItem({ icon, title, description, type = "action", value, onValueChange, onPress, loading }: {
  icon: string;
  title: string;
  description?: string;
  type?: "action" | "toggle";
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  onPress?: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable style={styles.item} onPress={type === "action" && !loading ? onPress : undefined}>
      <View style={styles.itemIcon}>
        <Ionicons name={icon as any} size={22} color="#FF8787" />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {description && <Text style={styles.itemDescription}>{description}</Text>}
      </View>
      {type === "toggle" ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#E5E5EA", true: "#FF8787" }}
          thumbColor="#FFFFFF"
        />
      ) : loading ? (
        <Ionicons name="ellipsis-horizontal" size={20} color="#FF8787" />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#C7C7C7" />
      )}
    </Pressable>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  decorativeCircle1: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: '#9BD8EC', opacity: 0.1 },
  decorativeCircle2: { position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF7B2', opacity: 0.2 },
  scrollContent: { paddingBottom: 40 },
  profileCard: { alignItems: 'center', marginTop: 20, marginHorizontal: 20, marginBottom: 24, paddingVertical: 32, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 28, elevation: 3, shadowColor: '#9BD8EC', shadowOpacity: 0.08, shadowRadius: 12 },
  avatarGradient: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  avatarContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '700', color: '#3A3A3A', marginBottom: 4 },
  email: { fontSize: 14, color: '#9B9B9B', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700', color: '#FF8787' },
  statLabel: { fontSize: 12, color: '#9B9B9B', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#F0F0F0' },
  section: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#FF8787', textTransform: 'uppercase' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '500', color: '#3A3A3A' },
  itemDescription: { fontSize: 12, color: '#9B9B9B' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginHorizontal: 20, marginTop: 8, paddingVertical: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#FFE5E5' },
  logoutText: { fontSize: 16, fontWeight: '500', color: '#FF8787' },
  version: { textAlign: 'center', fontSize: 12, color: '#C7C7C7', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24, width: '80%', alignItems: 'center' },
  modalIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#3A3A3A' },
  modalMessage: { fontSize: 14, color: '#9B9B9B', textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#F5F5F5' },
  modalButtonConfirm: { backgroundColor: '#FF8787' },
  modalButtonTextCancel: { color: '#5C5C5C' },
  modalButtonTextConfirm: { color: '#FFFFFF', fontWeight: '500' },
});