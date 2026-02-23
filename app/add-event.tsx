import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";

import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import DateTimePicker from "@react-native-community/datetimepicker";

import { useState } from "react";

import { Colors } from "./theme/colors";
import AppInput from "./(components)/AppInput";
import PrimaryButton from "./(components)/PrimaryButton";

export default function AddEvent() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const [date, setDate] = useState(new Date());

  const [startTime, setStartTime] = useState(new Date());

  const [endTime, setEndTime] = useState(new Date());

  const [showDate, setShowDate] = useState(false);

  const [showStart, setShowStart] = useState(false);

  const [showEnd, setShowEnd] = useState(false);

  const formatDate = (d: Date) =>
    d.toISOString().split("T")[0];

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <View style={styles.container}>
      {/* Header */}

      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </Pressable>

        <Text style={styles.headerTitle}>
          New Event
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>Title</Text>

        <AppInput
          placeholder="Meeting"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>
          Location
        </Text>

        <AppInput
          placeholder="Office"
          value={location}
          onChangeText={setLocation}
        />

        {/* Date */}

        <Text style={styles.label}>Date</Text>

        <Pressable
          style={styles.picker}
          onPress={() => setShowDate(true)}
        >
          <Text>{formatDate(date)}</Text>
        </Pressable>

        {showDate && (
          <DateTimePicker
            mode="date"
            value={date}
            onChange={(_, selected) => {
              setShowDate(false);
              if (selected) setDate(selected);
            }}
          />
        )}

        {/* Start */}

        <Text style={styles.label}>
          Start Time
        </Text>

        <Pressable
          style={styles.picker}
          onPress={() => setShowStart(true)}
        >
          <Text>
            {formatTime(startTime)}
          </Text>
        </Pressable>

        {showStart && (
          <DateTimePicker
            mode="time"
            value={startTime}
            onChange={(_, selected) => {
              setShowStart(false);
              if (selected)
                setStartTime(selected);
            }}
          />
        )}

        {/* End */}

        <Text style={styles.label}>
          End Time
        </Text>

        <Pressable
          style={styles.picker}
          onPress={() => setShowEnd(true)}
        >
          <Text>
            {formatTime(endTime)}
          </Text>
        </Pressable>

        {showEnd && (
          <DateTimePicker
            mode="time"
            value={endTime}
            onChange={(_, selected) => {
              setShowEnd(false);
              if (selected)
                setEndTime(selected);
            }}
          />
        )}

        <PrimaryButton
          title="Save Event"
          onPress={() => {}}
        />
      </ScrollView>
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
});