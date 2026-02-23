import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐼 PandaPlanner</Text>
      <Text style={styles.subtitle}>
        Your smart schedule companion
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.cardText}>
          No events yet — enjoy your free time ✨
        </Text>
      </View>
    </View>
  );
}

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
});