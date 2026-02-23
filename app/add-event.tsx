import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Colors } from "./theme/colors";
import AppInput from "./(components)/AppInput";
import PrimaryButton from "./(components)/PrimaryButton";
import { useState } from "react";

export default function AddEvent() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Add Event</Text>

      <AppInput
        placeholder="Event title"
        value={title}
        onChangeText={setTitle}
      />

      <AppInput
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />

      <AppInput
        placeholder="Start Time"
        value={startTime}
        onChangeText={setStartTime}
      />

      <AppInput
        placeholder="End Time"
        value={endTime}
        onChangeText={setEndTime}
      />

      <PrimaryButton title="Save Event" onPress={() => {}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
});