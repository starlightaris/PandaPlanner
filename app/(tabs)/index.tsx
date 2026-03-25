import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors } from "../theme/colors";
import EventCard from "../(components)/EventCard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Home() {
  return (
    <View style={styles.container}>

      {/* Custom Header */}
      <View style={styles.header}>

        <View>
          <Text style={styles.logo}>
            🐼 PandaPlanner
          </Text>

          <Text style={styles.tagline}>
            Your smart schedule companion
          </Text>
        </View>

        <Pressable onPress={() => router.push("/add-event")}>
          <Ionicons
            name="add"
            size={28}
            color={Colors.primary}
          />
        </Pressable>

      </View>


      {/* Event Card */}
      <EventCard
        title="Team Meeting"
        location="Office"
        date="2026-02-23"
        startTime="09:00"
        endTime="10:00"
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  tagline: {
    color: Colors.textSecondary,
  },

});