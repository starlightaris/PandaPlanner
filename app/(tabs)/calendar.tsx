import { View, Text, StyleSheet, Pressable } from "react-native";
import { Calendar } from "react-native-calendars";
import { useState } from "react";
import { Colors } from "../theme/colors";
import EventCard from "../(components)/EventCard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function CalendarScreen() {

  const [selectedDate, setSelectedDate] = useState("2026-02-23");

  return (

    <View style={styles.container}>

      {/* Header */}

      <View style={styles.header}>

        {/* Empty space for centering */}
        <View style={{ width: 28 }} />

        <Text style={styles.headerTitle}>
          Calendar
        </Text>

        <Pressable onPress={() => router.push("/add-event")}>

          <Ionicons
            name="add"
            size={28}
            color={Colors.primary}
          />

        </Pressable>

      </View>


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


      {/* Events */}

      <View style={styles.events}>

        <Text style={styles.sectionTitle}>
          Events on {selectedDate}
        </Text>

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


  header: {

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,

  },


  headerTitle: {

    fontSize: 24,
    fontWeight: "700",

  },


  events: {

    padding: 20,

  },


  sectionTitle: {

    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,

  },

});