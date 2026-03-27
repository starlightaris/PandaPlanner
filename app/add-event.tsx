import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";

import { Colors } from "./theme/colors";
import AppInput from "./(components)/AppInput";
import PrimaryButton from "./(components)/PrimaryButton";
import FirebaseService from "./services/FirebaseService"; // Import our service

export default function AddEvent() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const [isLoading, setIsLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Helper to combine the selected Date with the selected Time
  const combineDateAndTime = (baseDate: Date, timeValue: Date) => {
    const combined = new Date(baseDate);
    combined.setHours(timeValue.getHours());
    combined.setMinutes(timeValue.getMinutes());
    return combined;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for the event");
      return;
    }

    const finalStart = combineDateAndTime(date, startTime);
    const finalEnd = combineDateAndTime(date, endTime);

    if (finalEnd <= finalStart) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    setIsLoading(true);
    try {
      await FirebaseService.saveEvent({
        title,
        location,
        startTime: finalStart.toISOString(),
        endTime: finalEnd.toISOString(),
        source: "Manual",
        category: "General"
      });

      Alert.alert("Success", "Panda Planner has secured your slot!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: Date) => d.toISOString().split("T");
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={styles.container}>
      {/* Header remain same... */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>New Event</Text>
        <Pressable onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-vertical" size={22} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>Title</Text>
        <AppInput placeholder="Meeting" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Location</Text>
        <AppInput placeholder="Office" value={location} onChangeText={setLocation} />

        {/* Pickers code remains visually same, just uses the state above */}
        <Text style={styles.label}>Date</Text>
        <Pressable style={styles.picker} onPress={() => setShowDate(true)}>
          <Text>{formatDate(date)}</Text>
        </Pressable>

        {showDate && (
          <DateTimePicker
            mode="date"
            value={date}
            onChange={(_, selected) => { setShowDate(false); if (selected) setDate(selected); }}
          />
        )}

        <Text style={styles.label}>Start Time</Text>
        <Pressable style={styles.picker} onPress={() => setShowStart(true)}>
          <Text>{formatTime(startTime)}</Text>
        </Pressable>

        {showStart && (
          <DateTimePicker
            mode="time"
            value={startTime}
            onChange={(_, selected) => { setShowStart(false); if (selected) setStartTime(selected); }}
          />
        )}

        <Text style={styles.label}>End Time</Text>
        <Pressable style={styles.picker} onPress={() => setShowEnd(true)}>
          <Text>{formatTime(endTime)}</Text>
        </Pressable>

        {showEnd && (
          <DateTimePicker
            mode="time"
            value={endTime}
            onChange={(_, selected) => { setShowEnd(false); if (selected) setEndTime(selected); }}
          />
        )}

        <View style={{ marginTop: 30 }}>
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <PrimaryButton title="Save Event" onPress={handleSave} />
          )}
        </View>
      </ScrollView>

      {/* Modal code remains same... */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  content: {
    padding: 20,
  },

  label: {
    marginTop: 16,
    marginBottom: 6,
  },

  picker: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  overlay:{
  flex:1,
  backgroundColor:"rgba(0,0,0,0.2)",
  alignItems:"flex-end",
  paddingTop:60,
  paddingRight:16
  },

  menu:{
  backgroundColor:"white",
  borderRadius:12,
  padding:10,
  width:180
  },

  menuItem:{
  flexDirection:"row",
  alignItems:"center",
  padding:10
  },

  menuText:{
  marginLeft:10,
  fontSize:16
  },
});