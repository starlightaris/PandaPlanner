import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";

const todos = [
  { id: "1", title: "Finish Assignment", done: false },
  { id: "2", title: "Gym Workout", done: true },
];

export default function TodoScreen() {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>Todo List</Text>

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>

            <Ionicons
              name={
                item.done
                  ? "checkbox"
                  : "square-outline"
              }
              size={24}
              color={Colors.primary}
            />

            <Text style={styles.todoText}>
              {item.title}
            </Text>

          </View>
        )}
      />

      <Pressable style={styles.fab}>
        <Ionicons name="add" size={28} color="white" />
      </Pressable>

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
fontSize: 26,
fontWeight: "700",
marginBottom: 20,
},

todoItem: {
flexDirection: "row",
alignItems: "center",
padding: 16,
backgroundColor: Colors.card,
borderRadius: 16,
marginBottom: 10,
},

todoText: {
marginLeft: 12,
fontSize: 16,
},

fab: {
position: "absolute",
right: 20,
bottom: 20,
backgroundColor: Colors.primary,
padding: 16,
borderRadius: 50,
},

});