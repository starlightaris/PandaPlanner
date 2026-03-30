import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

// Project Services
import AIService from "../services/AIService";
import FirebaseService from "../services/FirebaseService";

const { height } = Dimensions.get('window');

interface ImportScreenProps {
  visible?: boolean;
  onClose?: () => void;
  onImportComplete?: () => void;
}

// ── LOADING ICON (moved outside component to prevent remounting) ──────────────
function LoadingIcon({ color }: { color: string }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    ).start();
  }, []);
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Ionicons name="refresh-outline" size={28} color={color} />
    </Animated.View>
  );
}

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
  onAction: (action: 'skip' | 'add') => void;
}) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={conflictStyles.overlay}>
      <View style={conflictStyles.box}>
        <Text style={conflictStyles.title}>Schedule Conflict 🐼</Text>
        <Text style={conflictStyles.body}>
          <Text style={{ fontWeight: '700' }}>"{eventTitle}"</Text> overlaps with:{'\n\n'}{conflictTitles}
        </Text>
        <Text style={conflictStyles.question}>What should Panda do?</Text>
        <Pressable style={conflictStyles.btnAdd} onPress={() => onAction('add')}>
          <Text style={conflictStyles.btnAddText}>Add Anyway</Text>
        </Pressable>
        <Pressable style={conflictStyles.btnSkip} onPress={() => onAction('skip')}>
          <Text style={conflictStyles.btnSkipText}>Skip This Event</Text>
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
  btnAdd: { backgroundColor: '#FF8787', borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  btnAddText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  btnSkip: { paddingVertical: 10, alignItems: 'center' },
  btnSkipText: { color: '#9B9B9B', fontSize: 13 },
});

export default function ImportScreen({ visible = true, onClose, onImportComplete }: ImportScreenProps) {
  const router = useRouter();
  const [importing, setImporting] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  // ── CONFLICT MODAL STATE ──────────────────────────────────────────────────
  const [conflictModal, setConflictModal] = useState<{
    visible: boolean;
    eventTitle: string;
    conflictTitles: string;
    resolve: ((action: 'skip' | 'add') => void) | null;
  }>({ visible: false, eventTitle: '', conflictTitles: '', resolve: null });

  const showConflictModal = (eventTitle: string, conflictTitles: string) => {
    return new Promise<'skip' | 'add'>((resolve) => {
      setConflictModal({ visible: true, eventTitle, conflictTitles, resolve });
    });
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose ? onClose() : router.back();
  };

  /**
   * Universal AI Processing Logic
   * Sends base64 data to Gemini and saves resulting events to Firestore.
   * Uses ConflictModal for web-compatible conflict resolution.
   */
  const handleAIProcessing = async (base64: string, mimeType: string, label: string) => {
    try {
      setImporting(label.toLowerCase());

      const parsedEvents = await AIService.parseSchedule("Extract all events", {
        base64,
        mimeType
      });

      if (!parsedEvents || parsedEvents.length === 0) {
        throw new Error("Panda couldn't find any schedule data in this file.");
      }

      let successCount = 0;
      let skippedCount = 0;

      for (const event of parsedEvents) {
        // --- CONFLICT CHECK ---
        const conflicting = await FirebaseService.getConflictingEvents(
          event.startTime,
          event.endTime
        );

        if (conflicting.length > 0) {
          const conflictTitles = conflicting.map(e => `• ${e.title}`).join('\n');
          const userChoice = await showConflictModal(event.title, conflictTitles);

          if (userChoice === 'skip') {
            skippedCount++;
            continue;
          }
          // 'add' falls through and saves normally
        }

        await FirebaseService.saveEvent(event);
        successCount++;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const statusMsg = skippedCount > 0
        ? `Successfully imported ${successCount} events. ${skippedCount} were skipped due to conflicts.`
        : `Successfully imported ${successCount} events from your ${label}.`;

      Alert.alert(
        "🐼 Panda Success!",
        statusMsg,
        [{ text: "Great!", onPress: () => {
          onImportComplete?.();
          handleClose();
        }}]
      );

    } catch (error: any) {
      console.error("AI Import Error:", error);
      Alert.alert("Import Failed", error.message || "Something went wrong.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setImporting(null);
    }
  };

  async function importImage() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const asset = result.assets[0];
      await handleAIProcessing(asset.base64!, asset.mimeType || "image/jpeg", "Image");
    }
  }

  async function importFile(type: string[], label: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await DocumentPicker.getDocumentAsync({ type, copyToCacheDirectory: true });

    if (!result.canceled) {
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const mimeType = label === "CSV"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      await handleAIProcessing(base64, mimeType, label);
    }
  }

  const importOptions = [
    { id: 'image', title: 'Import Image', description: 'Scan schedule from photo', icon: 'image-outline', gradient: ['#9BD8EC', '#7BC5DC'], onPress: importImage },
    { id: 'csv', title: 'Import CSV', description: 'Add events from spreadsheet', icon: 'document-text-outline', gradient: ['#FFF7B2', '#F5E8A0'], onPress: () => importFile(["text/csv"], "CSV") },
    { id: 'excel', title: 'Import Excel', description: 'Import XLS or XLSX files', icon: 'grid-outline', gradient: ['#FF8787', '#FF9F9F'], onPress: () => importFile(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"], "Excel") },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#FFFFFF', '#FFFBF5']} style={styles.modalContent}>

            <View style={styles.header}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="cloud-upload-outline" size={28} color="#FF8787" />
              </View>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color="#9B9B9B" />
              </Pressable>
            </View>

            <Text style={styles.title}>Import Schedule</Text>
            <Text style={styles.subtitle}>Panda AI will automatically detect and organize your events.</Text>

            <View style={styles.optionsContainer}>
              {importOptions.map((option) => (
                <Pressable key={option.id} style={styles.option} onPress={option.onPress} disabled={importing !== null}>
                  <LinearGradient colors={option.gradient as any} style={styles.optionIconContainer}>
                    {importing === option.id
                      ? <LoadingIcon color="#FFFFFF" />
                      : <Ionicons name={option.icon as any} size={28} color="#FFFFFF" />
                    }
                  </LinearGradient>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7C7" />
                </Pressable>
              ))}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Panda checks for conflicts automatically. If an overlap is found, you'll be asked whether to skip or add anyway.
              </Text>
            </View>

            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Animated.View>

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  modalContainer: { width: '100%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  modalContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center' },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#3A3A3A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9B9B9B', marginBottom: 28, lineHeight: 20 },
  optionsContainer: { gap: 12, marginBottom: 24 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, elevation: 2 },
  optionIconContainer: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#3A3A3A' },
  optionDescription: { fontSize: 12, color: '#9B9B9B' },
  infoCard: { backgroundColor: '#FFF5F0', padding: 14, borderRadius: 16, marginBottom: 24 },
  infoText: { fontSize: 12, color: '#8B6B4D', lineHeight: 18 },
  cancelButton: { paddingVertical: 14, alignItems: 'center', borderRadius: 30, backgroundColor: '#F5F5F5' },
  cancelButtonText: { fontSize: 15, fontWeight: '500', color: '#9B9B9B' },
});