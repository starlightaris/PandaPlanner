import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../theme/colors";

type Props = {
  title: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
  hasConflict?: boolean; // Added to match index.tsx logic
  onPress?: () => void;
};

export default function EventCard({
  title,
  location,
  date,
  startTime,
  endTime,
  hasConflict,
  onPress,
}: Props) {
  return (
    <Pressable 
      // Apply conditional border color if there is a conflict
      style={[
        styles.card, 
        hasConflict && { borderColor: '#FF8787', borderWidth: 1.5, shadowColor: '#FF8787', shadowOpacity: 0.1 }
      ]} 
      onPress={onPress}
    >
      {/* Time Column */}
      <View style={styles.timeContainer}>
        <Text style={[styles.time, hasConflict && { color: '#FF8787' }]}>
          {startTime}
        </Text>

        <View style={[styles.line, hasConflict && { backgroundColor: '#FF8787' }]} />

        <Text style={[styles.time, hasConflict && { color: '#FF8787' }]}>
          {endTime}
        </Text>
      </View>

      {/* Event Info */}
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {/* Show warning icon if there is a conflict */}
          {hasConflict && (
            <Ionicons name="warning" size={18} color="#FF8787" style={{ marginLeft: 4 }} />
          )}
        </View>

        {location && (
          <View style={styles.row}>
            <Ionicons
              name="location-outline"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}

        <Text style={styles.date}>
          {date}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  timeContainer: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 50,
  },
  time: {
    fontWeight: "700",
    fontSize: 13,
    color: '#3A3A3A',
  },
  line: {
    width: 2,
    height: 20,
    backgroundColor: Colors.primary,
    marginVertical: 4,
    borderRadius: 1,
  },
  info: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: '#3A3A3A',
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  location: {
    marginLeft: 4,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  date: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
  },
});