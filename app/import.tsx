import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Modal, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useRef, useEffect } from "react";
import * as Haptics from 'expo-haptics';

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import * as FileSystem from "expo-file-system";
import GoogleService from "./services/GoogleService";

const { width, height } = Dimensions.get('window');

interface ImportScreenProps {
  visible?: boolean;
  onClose?: () => void;
  onImportComplete?: () => void;
}

export default function ImportScreen({ visible = true, onClose, onImportComplete }: ImportScreenProps) {
  const router = useRouter();
  const [importing, setImporting] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const processImportedEvents = async (events: any[], source: string) => {
    const accessToken = "YOUR_GOOGLE_ACCESS_TOKEN"; // Get from auth context
    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        // Map CSV/Excel columns to event format
        const eventData = {
          title: event.title || event.name || event.event || "Imported Event",
          location: event.location || event.place || "",
          startTime: event.start || event.start_time || event.date,
          endTime: event.end || event.end_time || "",
        };

        await GoogleService.saveEvent(eventData, accessToken);
        successCount++;
      } catch (error) {
        console.error("Failed to import event:", error);
        errorCount++;
      }
    }

    return { successCount, errorCount };
  };

  async function importImage() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setImporting('image');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "🐼 Image Ready!",
          "Your image has been selected. Panda will analyze it for schedule data.",
          [{ text: "Great!", onPress: () => {
            onImportComplete?.();
            handleClose();
          }}]
        );
        console.log("Image selected:", uri);
        // later send to ML model
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Oops!", "Failed to select image. Please try again.");
    } finally {
      setImporting(null);
    }
  }

  async function importCSV() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setImporting('csv');

      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/vnd.ms-excel"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(uri);
      const parsed = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.data && parsed.data.length > 0) {
        const { successCount, errorCount } = await processImportedEvents(parsed.data, 'csv');

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "📊 CSV Imported!",
          `Successfully imported ${successCount} events${errorCount > 0 ? `, ${errorCount} failed.` : '. Panda has added them to your Google Calendar!'}`,
          [{ text: "Awesome!", onPress: () => {
            onImportComplete?.();
            handleClose();
          }}]
        );
        console.log("CSV Data:", parsed.data);
      } else {
        Alert.alert("No Data", "The CSV file appears to be empty.");
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Import Failed", "Could not read CSV file. Please check the format.");
    } finally {
      setImporting(null);
    }
  }

  async function importExcel() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setImporting('excel');

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel"
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      const wb = XLSX.read(b64, { type: "base64" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      if (data && data.length > 0) {
        const { successCount, errorCount } = await processImportedEvents(data, 'excel');

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "📈 Excel Imported!",
          `Successfully imported ${successCount} events${errorCount > 0 ? `, ${errorCount} failed.` : '. Panda has added them to your Google Calendar!'}`,
          [{ text: "Amazing!", onPress: () => {
            onImportComplete?.();
            handleClose();
          }}]
        );
        console.log("Excel Data:", data);
      } else {
        Alert.alert("No Data", "The Excel file appears to be empty.");
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Import Failed", "Could not read Excel file. Please check the format.");
    } finally {
      setImporting(null);
    }
  }

  const importOptions = [
    {
      id: 'image',
      title: 'Import Image',
      description: 'Scan schedule from photo',
      icon: 'image-outline',
      gradient: ['#9BD8EC', '#7BC5DC'],
      onPress: importImage,
    },
    {
      id: 'csv',
      title: 'Import CSV',
      description: 'Add events from spreadsheet',
      icon: 'document-text-outline',
      gradient: ['#FFF7B2', '#F5E8A0'],
      onPress: importCSV,
    },
    {
      id: 'excel',
      title: 'Import Excel',
      description: 'Import XLS or XLSX files',
      icon: 'grid-outline',
      gradient: ['#FF8787', '#FF9F9F'],
      onPress: importExcel,
    },
  ];

  // Custom ActivityIndicator component
  const ActivityIndicatorComponent = ({ size, color }: { size: "small" | "large", color: string }) => {
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }, []);

    const spin = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
    });

    return (
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="refresh-outline" size={size === "small" ? 20 : 28} color={color} />
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#FFFBF5']}
            style={styles.modalContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Decorative Elements */}
            <View style={styles.decorativeDot1} />
            <View style={styles.decorativeDot2} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="cloud-upload-outline" size={28} color="#FF8787" />
              </View>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color="#9B9B9B" />
              </Pressable>
            </View>

            <Text style={styles.title}>Import Schedule</Text>
            <Text style={styles.subtitle}>
              Let Panda help you bring your schedule to life
            </Text>

            {/* Import Options */}
            <View style={styles.optionsContainer}>
              {importOptions.map((option) => (
                <Pressable
                  key={option.id}
                  style={styles.option}
                  onPress={option.onPress}
                  disabled={importing !== null}
                >
                  <LinearGradient
                    colors={option.gradient as any}
                    style={styles.optionIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {importing === option.id ? (
                      <ActivityIndicatorComponent size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name={option.icon as any} size={28} color="#FFFFFF" />
                    )}
                  </LinearGradient>

                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#C7C7C7" />
                </Pressable>
              ))}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="information-circle" size={20} color="#FF8787" />
              </View>
              <Text style={styles.infoText}>
                Supported formats: JPG, PNG (for image scanning), CSV, and Excel files.
                Panda will automatically detect and organize your events into Google Calendar!
              </Text>
            </View>

            {/* Footer */}
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    position: 'relative',
  },
  decorativeDot1: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#9BD8EC',
    opacity: 0.1,
  },
  decorativeDot2: {
    position: 'absolute',
    bottom: 80,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7B2',
    opacity: 0.2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3A3A3A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#9B9B9B',
    marginBottom: 28,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A3A3A',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: '#9B9B9B',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F0',
    padding: 14,
    borderRadius: 16,
    gap: 12,
    marginBottom: 24,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#8B6B4D',
    lineHeight: 18,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9B9B9B',
  },
});