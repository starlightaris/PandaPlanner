import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import FirebaseService from "../../services/FirebaseService";

export default function TodoScreen() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => { if (user) fetchUserTodos(); }, [user]);

  const fetchUserTodos = async () => {
    try {
      const data = await FirebaseService.getTodos(user.uid);
      setTodos(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim() || !user) return;
    const todoData = { title: newTodo, done: false, category: "General", priority: "Medium", dueDate: new Date().toISOString() };
    try {
      const docRef = await FirebaseService.saveTodo(user.uid, todoData);
      setTodos([{ id: docRef.id, ...todoData }, ...todos]);
      setNewTodo("");
      setAdding(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) { Alert.alert("Error", "Could not save task."); }
  };

  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    try {
      await FirebaseService.updateTodoStatus(user.uid, id, !currentStatus);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !currentStatus } : t));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) { Alert.alert("Error", "Update failed."); }
  };

  const handleDeleteTodo = (id: string) => {
    Alert.alert("Delete", "Remove this task?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await FirebaseService.removeTodo(user.uid, id);
          setTodos(prev => prev.filter(t => t.id !== id));
      }}
    ]);
  };

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color="#FF8787" />
    </View>
  );

  return (
    <LinearGradient colors={["#FFFFFF", "#F9FCFF"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panda Tasks 🐼</Text>
        <Pressable style={styles.addButton} onPress={() => setAdding(true)}>
          <Ionicons name="add" size={30} color="#FFF" />
        </Pressable>
      </View>

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={60} color="#E0E0E0" />
            <Text style={styles.emptyText}>Your list is empty!</Text>
            <Text style={styles.emptySubtext}>Add a task to start your panda day.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.todoCard, item.done && styles.todoDone]}>
            <Pressable onPress={() => handleToggleTodo(item.id, item.done)} style={styles.checkArea}>
              <Ionicons name={item.done ? "checkbox" : "square-outline"} size={24} color={item.done ? "#FF8787" : "#DDD"} />
            </Pressable>
            <View style={styles.todoInfo}>
              <Text style={[styles.todoText, item.done && styles.textDone]}>{item.title}</Text>
            </View>
            <Pressable onPress={() => handleDeleteTodo(item.id)}><Ionicons name="trash-outline" size={20} color="#FFDADA" /></Pressable>
          </View>
        )}
      />

      {adding && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputModal}>
          <TextInput placeholder="What's the plan, Panda?" style={styles.input} value={newTodo} onChangeText={setNewTodo} autoFocus />
          <View style={styles.modalActions}>
            <Pressable onPress={() => setAdding(false)}><Text style={styles.cancelBtn}>Cancel</Text></Pressable>
            <Pressable style={styles.saveBtn} onPress={handleAddTodo}><Text style={styles.saveBtnText}>Save</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#3A3A3A' },
  addButton: { backgroundColor: '#FF8787', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 100, flexGrow: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#3A3A3A', marginTop: 10 },
  emptySubtext: { fontSize: 14, color: '#9B9B9B', marginTop: 4 },
  todoCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  todoDone: { opacity: 0.6 },
  checkArea: { marginRight: 12 },
  todoInfo: { flex: 1 },
  todoText: { fontSize: 16, fontWeight: '600', color: '#3A3A3A' },
  textDone: { textDecorationLine: 'line-through', color: '#9B9B9B' },
  inputModal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, elevation: 20 },
  input: { fontSize: 18, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingVertical: 10, marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  cancelBtn: { color: '#9B9B9B', fontWeight: '600' },
  saveBtn: { backgroundColor: '#FF8787', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { color: '#FFF', fontWeight: '700' }
});