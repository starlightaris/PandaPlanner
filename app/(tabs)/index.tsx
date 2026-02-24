import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";
import EventCard from "../(components)/EventCard";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐼 PandaPlanner</Text>
      <Text style={styles.subtitle}>
        Your smart schedule companion
      </Text>

      <Pressable
              style={styles.importButton}
              onPress={() => router.push("/import")}
            >
              <Ionicons name="cloud-upload-outline" size={22} color="white" />
              <Text style={styles.importText}>
                Import Schedule
              </Text>
            </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.cardText}>
          No events yet — enjoy your free time ✨
        </Text>
      </View>

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
// hardcoded event card. fix later

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 18,
  },
  cardTitle: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 6,
  },
  cardText: {
    color: Colors.textSecondary,
  },
  importButton:{
  backgroundColor:Colors.primary,
  padding:16,
  borderRadius:16,
  flexDirection:"row",
  alignItems:"center",
  justifyContent:"center",
  marginBottom:20
  },
    importText:{
  color:"white",
  marginLeft:8,
  fontWeight:"600"
  },
});