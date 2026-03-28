import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../theme/colors";

type Props = {
  id: string;
  title: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
  hasConflict?: boolean;
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
      style={[
        styles.card, 
        hasConflict && styles.conflictCard
      ]} 
      onPress={onPress}
    >
      <View style={styles.timeContainer}>
        <Text style={[styles.time, hasConflict && { color: '#FF5252' }]}>{startTime}</Text>
        <View style={[styles.line, hasConflict && { backgroundColor: '#FF5252' }]} />
        <Text style={[styles.time, hasConflict && { color: '#FF5252' }]}>{endTime}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {hasConflict && (
            <View style={styles.badge}>
              <Ionicons name="warning" size={14} color="#FF5252" />
              <Text style={styles.badgeText}>Overlap</Text>
            </View>
          )}
        </View>

        {location && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>{location}</Text>
          </View>
        )}
        <Text style={styles.date}>{date}</Text>
        
        {hasConflict && (
          <Text style={styles.resolvePrompt}>Tap to resolve conflict</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", backgroundColor: Colors.card, padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2 },
  conflictCard: { borderColor: '#FF5252', borderWidth: 1, backgroundColor: '#FFF5F5' },
  timeContainer: { alignItems: "center", marginRight: 16, minWidth: 50 },
  time: { fontWeight: "700", fontSize: 13, color: '#3A3A3A' },
  line: { width: 2, height: 20, backgroundColor: Colors.primary, marginVertical: 4, borderRadius: 1 },
  info: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: "600", color: '#3A3A3A', flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE5E5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#FF5252', fontSize: 10, fontWeight: '700', marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  location: { marginLeft: 4, color: Colors.textSecondary, fontSize: 13 },
  date: { marginTop: 4, color: Colors.textSecondary, fontSize: 12 },
  resolvePrompt: { marginTop: 8, color: '#FF5252', fontSize: 11, fontWeight: '600', fontStyle: 'italic' }
});