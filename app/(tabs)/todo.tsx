import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Animated,
  Modal,
  Alert,
  ScrollView
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from 'expo-haptics';
import DateTimePicker from "@react-native-community/datetimepicker";

interface Todo {
  id: string;
  title: string;
  done: boolean;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: Date;
  createdAt: Date;
}

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: "1", title: "Finish Assignment", done: false, category: "Work", priority: "high", createdAt: new Date() },
    { id: "2", title: "Gym Workout", done: true, category: "Health", priority: "medium", createdAt: new Date() },
    { id: "3", title: "Buy groceries", done: false, category: "Personal", priority: "low", createdAt: new Date() },
  ]);

  const [adding, setAdding] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Personal");
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const categories = ["Personal", "Work", "Health", "Shopping", "Study", "Other"];
  const priorities = [
    { label: "High", value: "high", color: "#FF8787", icon: "alert-circle" },
    { label: "Medium", value: "medium", color: "#FFF7B2", icon: "time" },
    { label: "Low", value: "low", color: "#9BD8EC", icon: "checkmark-circle" }
  ];

  const addTodo = () => {
    if (!newTodo.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("🐼 Oops!", "Please enter a task title!");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setTodos(prev => [
      {
        id: Date.now().toString(),
        title: newTodo,
        done: false,
        category: selectedCategory,
        priority: selectedPriority,
        dueDate: dueDate,
        createdAt: new Date()
      },
      ...prev
    ]);

    setNewTodo("");
    setAdding(false);
    setSelectedCategory("Personal");
    setSelectedPriority("medium");
    setDueDate(new Date());
  };

  const toggleTodo = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id
          ? { ...todo, done: !todo.done }
          : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setTodos(prev => prev.filter(todo => todo.id !== id));
          }
        }
      ]
    );
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingText(todo.title);
  };

  const saveEdit = () => {
    if (!editingText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTodos(prev =>
      prev.map(todo =>
        todo.id === editingId
          ? { ...todo, title: editingText }
          : todo
      )
    );
    setEditingId(null);
  };

  const getPriorityIcon = (priority?: string) => {
    switch(priority) {
      case 'high': return "alert-circle";
      case 'medium': return "time";
      case 'low': return "checkmark-circle";
      default: return "ellipse-outline";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch(priority) {
      case 'high': return "#FF8787";
      case 'medium': return "#FFF7B2";
      case 'low': return "#9BD8EC";
      default: return "#E5E5EA";
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch(category) {
      case 'Work': return "briefcase";
      case 'Health': return "fitness";
      case 'Shopping': return "cart";
      case 'Study': return "school";
      case 'Personal': return "person";
      default: return "apps";
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.done;
    if (filter === 'completed') return todo.done;
    return true;
  });

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.done).length,
    active: todos.filter(t => !t.done).length,
    completionRate: todos.length > 0 ? Math.round((todos.filter(t => t.done).length / todos.length) * 100) : 0
  };

  const renderRightActions = (todo: Todo) => {
    return (
      <View style={styles.actions}>
        <Pressable
          style={styles.editBtn}
          onPress={() => startEdit(todo)}
        >
          <Ionicons name="create-outline" size={22} color="white" />
        </Pressable>
        <Pressable
          style={styles.deleteBtn}
          onPress={() => deleteTodo(todo.id)}
        >
          <Ionicons name="trash-outline" size={22} color="white" />
        </Pressable>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFBF5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.statsButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStatsModalVisible(true);
              }}
            >
              <Ionicons name="stats-chart" size={24} color="#FF8787" />
            </Pressable>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Todo List</Text>
            <View style={styles.pandaBadge}>
              <Text style={styles.pandaEmoji}>🐼</Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAdding(true);
            }}
            style={styles.addButton}
          >
            <LinearGradient
              colors={['#FF8787', '#FF9F9F']}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <Pressable
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('all');
            }}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({stats.total})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('active');
            }}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Active ({stats.active})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('completed');
            }}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              Done ({stats.completed})
            </Text>
          </Pressable>
        </View>

        {/* Add Todo Input */}
        {adding && (
          <View style={styles.addContainer}>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              placeholderTextColor="#C7C7C7"
              value={newTodo}
              onChangeText={setNewTodo}
              autoFocus
              onSubmitEditing={addTodo}
            />

            <View style={styles.optionsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryPicker}>
                  <Text style={styles.optionLabel}>Category:</Text>
                  {categories.map(cat => (
                    <Pressable
                      key={cat}
                      style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.priorityPicker}>
                <Text style={styles.optionLabel}>Priority:</Text>
                {priorities.map(priority => (
                  <Pressable
                    key={priority.value}
                    style={[styles.priorityChip, { backgroundColor: selectedPriority === priority.value ? priority.color : '#F5F5F5' }]}
                    onPress={() => setSelectedPriority(priority.value as any)}
                  >
                    <Ionicons name={priority.icon as any} size={14} color={selectedPriority === priority.value ? '#FFFFFF' : '#9B9B9B'} />
                    <Text style={[styles.priorityChipText, { color: selectedPriority === priority.value ? '#FFFFFF' : '#9B9B9B' }]}>
                      {priority.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color="#FF8787" />
                <Text style={styles.dateButtonText}>
                  {dueDate.toLocaleDateString()}
                </Text>
              </Pressable>
            </View>

            <View style={styles.addActions}>
              <Pressable style={styles.cancelButton} onPress={() => setAdding(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={addTodo}>
                <Text style={styles.confirmButtonText}>Add Task</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Todo List */}
        {filteredTodos.length > 0 ? (
          <FlatList
            data={filteredTodos}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Swipeable renderRightActions={() => renderRightActions(item)}>
                <View style={styles.todoItem}>
                  <Pressable onPress={() => toggleTodo(item.id)} style={styles.checkbox}>
                    <Ionicons
                      name={item.done ? "checkbox" : "square-outline"}
                      size={24}
                      color={item.done ? "#FF8787" : "#C7C7C7"}
                    />
                  </Pressable>

                  <View style={styles.todoContent}>
                    {editingId === item.id ? (
                      <TextInput
                        style={styles.editInput}
                        value={editingText}
                        onChangeText={setEditingText}
                        onSubmitEditing={saveEdit}
                        autoFocus
                      />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.todoText,
                            item.done && styles.doneText
                          ]}
                        >
                          {item.title}
                        </Text>
                        <View style={styles.todoMeta}>
                          <View style={[styles.metaBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
                            <Ionicons name={getPriorityIcon(item.priority) as any} size={12} color={getPriorityColor(item.priority)} />
                            <Text style={[styles.metaText, { color: getPriorityColor(item.priority) }]}>
                              {item.priority?.toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.metaBadge}>
                            <Ionicons name={getCategoryIcon(item.category) as any} size={12} color="#FF8787" />
                            <Text style={styles.metaText}>{item.category}</Text>
                          </View>
                          {item.dueDate && (
                            <View style={styles.metaBadge}>
                              <Ionicons name="calendar-outline" size={12} color="#9B9B9B" />
                              <Text style={styles.metaText}>
                                {new Date(item.dueDate).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </Swipeable>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="checkbox-outline" size={48} color="#FF8787" />
            </View>
            <Text style={styles.emptyTitle}>No tasks here</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' ? "Add your first task to get started!" :
               filter === 'active' ? "All tasks completed! Great job! 🎉" :
               "No completed tasks yet. Start checking them off!"}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Stats Modal */}
      <Modal
        visible={statsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStatsModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="stats-chart" size={28} color="#FF8787" />
              <Text style={styles.modalTitle}>Your Progress</Text>
              <Pressable onPress={() => setStatsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9B9B9B" />
              </Pressable>
            </View>

            <View style={styles.progressCircle}>
              <Text style={styles.progressPercentage}>{stats.completionRate}%</Text>
              <Text style={styles.progressLabel}>Completion Rate</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total Tasks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.active}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
            </View>

            <Text style={styles.modalTip}>
              🐼 Tip: Break down large tasks into smaller ones to stay motivated!
            </Text>
          </View>
        </Pressable>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={dueDate}
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) setDueDate(selected);
          }}
          display="spinner"
          themeVariant="light"
          accentColor="#FF8787"
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#9BD8EC',
    opacity: 0.1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF7B2',
    opacity: 0.2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 20,
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3A3A3A",
    letterSpacing: -0.5,
  },
  pandaBadge: {
    backgroundColor: '#FFF7B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pandaEmoji: {
    fontSize: 14,
  },
  statsButton: {
    padding: 8,
  },
  addButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FF8787',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabActive: {
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9B9B9B',
  },
  filterTextActive: {
    color: '#FF8787',
  },
  addContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
    color: '#3A3A3A',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  categoryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9B9B9B',
    marginRight: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
  },
  categoryChipActive: {
    backgroundColor: '#FF8787',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#9B9B9B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  priorityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dateButtonText: {
    fontSize: 13,
    color: '#FF8787',
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#9B9B9B',
    fontWeight: '500',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FF8787',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  checkbox: {
    marginRight: 12,
  },
  todoContent: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    color: '#3A3A3A',
    marginBottom: 6,
  },
  doneText: {
    textDecorationLine: "line-through",
    opacity: 0.5,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  metaText: {
    fontSize: 10,
    color: '#9B9B9B',
    fontWeight: '500',
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  editBtn: {
    backgroundColor: "#FFF7B2",
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  deleteBtn: {
    backgroundColor: "#FF8787",
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    height: 50,
    borderRadius: 12,
    marginLeft: 8,
  },
  editInput: {
    fontSize: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#FF8787',
    color: '#3A3A3A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A3A3A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9B9B9B',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A3A3A',
  },
  progressCircle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressPercentage: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF8787',
  },
  progressLabel: {
    fontSize: 14,
    color: '#9B9B9B',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3A3A3A',
  },
  statLabel: {
    fontSize: 12,
    color: '#9B9B9B',
    marginTop: 4,
  },
  modalTip: {
    fontSize: 13,
    color: '#8B6B4D',
    textAlign: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
});