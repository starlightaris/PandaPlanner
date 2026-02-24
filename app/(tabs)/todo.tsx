import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { useState } from "react";

export default function TodoScreen() {

const [todos, setTodos] = useState([
  { id: "1", title: "Finish Assignment", done: false },
  { id: "2", title: "Gym Workout", done: true },
]);

const [adding, setAdding] = useState(false);

const [newTodo, setNewTodo] = useState("");


function addTodo(){

if(!newTodo.trim()) return;

setTodos(prev => [
  {
    id: Date.now().toString(),
    title: newTodo,
    done: false
  },
  ...prev
]);

setNewTodo("");

setAdding(false);

}


return (
<View style={styles.container}>


{/* HEADER */}

<View style={styles.header}>

<Text style={styles.title}>
Todo List
</Text>


<Pressable
onPress={() => setAdding(true)}
>

<Ionicons
name="add-circle"
size={28}
color={Colors.primary}
/>

</Pressable>


</View>



{/* INPUT */}

{adding && (

<TextInput

style={styles.input}

placeholder="Enter new task..."

value={newTodo}

onChangeText={setNewTodo}

autoFocus

onSubmitEditing={addTodo}

/>

)}



{/* LIST */}

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


</View>

);
}


const styles = StyleSheet.create({

container: {
flex: 1,
backgroundColor: Colors.background,
padding: 20,
},

header:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginBottom:16
},

title: {
fontSize: 26,
fontWeight: "700",
},

input:{
backgroundColor:"white",
padding:14,
borderRadius:14,
marginBottom:16
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

});