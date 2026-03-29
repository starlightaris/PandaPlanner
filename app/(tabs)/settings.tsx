import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useAuth } from '../../context/AuthContext';
import FirebaseService from "../../services/FirebaseService";

export default function SettingsScreen() {
  const router = useRouter();
  const { setAccessToken, setUser, user } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLogoutModalVisible(false);
    try {
      await FirebaseService.logOut();
      setAccessToken(null);
      setUser(null);
      router.replace("/login");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("🐼 Error", "Failed to log out properly.");
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      {/* Restored Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Section - DYNAMIC */}
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
              <Text style={styles.statNumber}>Live</Text>
              <Text style={styles.statLabel}>Syncing</Text>
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
          <SettingItem icon="notifications" title="Notifications" description="Get panda reminders" type="toggle" value={notificationsEnabled} onValueChange={(val: any) => { setNotificationsEnabled(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
          <SettingItem icon="calendar" title="Google Calendar Sync" description="Sync with your Google Calendar" type="toggle" value={googleSyncEnabled} onValueChange={(val: any) => { setGoogleSyncEnabled(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
          <SettingItem icon="moon" title="Dark Mode" description="Easy on the eyes" type="toggle" value={darkModeEnabled} onValueChange={(val: any) => { setDarkModeEnabled(val); Alert.alert("🌙 Coming Soon", "Dark mode is still being polished!"); }} />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-outline" size={20} color="#FF8787" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <SettingItem icon="sync" title="Sync Data" description="Last synced: Just now" type="action" onPress={() => Alert.alert("🔄 Refreshing", "Panda is checking your data...")} />
          <SettingItem icon="download" title="Export Data" description="Backup your panda plans" type="action" onPress={() => Alert.alert("📦 Export", "Preparing summary...")} />
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
              <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setLogoutModalVisible(false)}><Text style={styles.modalButtonTextCancel}>Stay</Text></Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonConfirm]} onPress={confirmLogout}><Text style={styles.modalButtonTextConfirm}>Log Out</Text></Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

function SettingItem({ icon, title, description, type = "action", value, onValueChange, onPress }: any) {
  return (
    <Pressable style={styles.item} onPress={type === "action" ? onPress : undefined}>
      <View style={styles.itemIcon}><Ionicons name={icon} size={22} color="#FF8787" /></View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {description && <Text style={styles.itemDescription}>{description}</Text>}
      </View>
      {type === "toggle" ? (
        <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#E5E5EA", true: "#FF8787" }} thumbColor="#FFFFFF" />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#C7C7C7" />
      )}
    </Pressable>
  );
}

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