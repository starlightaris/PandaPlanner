import { View, Text, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";

import { useState } from "react";

import { Colors } from "../theme/colors";

import EventCard from "../(components)/EventCard";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] =
    useState("2026-02-23");

  return (
    <View style={styles.container}>
      {/* Calendar */}

      <Calendar
        onDayPress={(day) =>
          setSelectedDate(day.dateString)
        }

        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: Colors.primary,
          },
        }}

        theme={{
          todayTextColor: Colors.primary,
          arrowColor: Colors.primary,
        }}
      />

      {/* Event List */}

      <View style={styles.events}>
        <Text style={styles.title}>
          Events on {selectedDate}
        </Text>

        {/* Example event */}

        <EventCard
          title="Team Meeting"
          location="Office"
          date={selectedDate}
          startTime="09:00"
          endTime="10:00"
        />

        <EventCard
          title="Lunch"
          location="Cafe"
          date={selectedDate}
          startTime="12:00"
          endTime="13:00"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  events: {
    padding: 16,
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

});