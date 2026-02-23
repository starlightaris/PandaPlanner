import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";

type Props = {
  title: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
  onPress?: () => void;
};

export default function EventCard({
  title,
  location,
  date,
  startTime,
  endTime,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Time Column */}

      <View style={styles.timeContainer}>
        <Text style={styles.time}>
          {startTime}
        </Text>

        <View style={styles.line} />

        <Text style={styles.time}>
          {endTime}
        </Text>
      </View>

      {/* Event Info */}

      <View style={styles.info}>
        <Text style={styles.title}>
          {title}
        </Text>

        {location && (
          <View style={styles.row}>
            <Ionicons
              name="location-outline"
              size={14}
              color={Colors.textSecondary}
            />

            <Text style={styles.location}>
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
  },

  timeContainer: {
    alignItems: "center",
    marginRight: 16,
  },

  time: {
    fontWeight: "600",
  },

  line: {
    width: 2,
    height: 20,
    backgroundColor: Colors.primary,
    marginVertical: 4,
  },

  info: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  location: {
    marginLeft: 4,
    color: Colors.textSecondary,
  },

  date: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
  },

});