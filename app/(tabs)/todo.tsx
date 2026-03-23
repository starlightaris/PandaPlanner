import React, { useState } from "react";

import {
View,
Text,
StyleSheet,
FlatList,
Pressable,
TextInput
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../theme/colors";

import { Swipeable } from "react-native-gesture-handler";


export default function TodoScreen(){

const [todos,setTodos]=useState([
{ id:"1", title:"Finish Assignment", done:false },
{ id:"2", title:"Gym Workout", done:true },
]);

const [adding,setAdding]=useState(false);

const [newTodo,setNewTodo]=useState("");

const [editingId,setEditingId]=useState<string|null>(null);

const [editingText,setEditingText]=useState("");


function addTodo(){

if(!newTodo.trim()) return;

setTodos(prev=>[
{ id:Date.now().toString(), title:newTodo, done:false },
...prev
]);

setNewTodo("");
setAdding(false);

}


function toggleTodo(id:string){

setTodos(prev=>
prev.map(todo=>
todo.id===id
? { ...todo, done:!todo.done }
: todo
)
);

}


function deleteTodo(id:string){

setTodos(prev=>prev.filter(todo=>todo.id!==id));

}


function startEdit(todo:any){

setEditingId(todo.id);

setEditingText(todo.title);

}


function saveEdit(){

setTodos(prev=>
prev.map(todo=>
todo.id===editingId
? { ...todo, title:editingText }
: todo
)
);

setEditingId(null);

}



function renderRightActions(todo:any){

return(

<View style={styles.actions}>


<Pressable
style={styles.editBtn}
onPress={()=>startEdit(todo)}
>

<Ionicons name="create-outline" size={22} color="white"/>

</Pressable>


<Pressable
style={styles.deleteBtn}
onPress={()=>deleteTodo(todo.id)}
>

<Ionicons name="trash-outline" size={22} color="white"/>

</Pressable>


</View>

);

}



return(

<View style={styles.container}>


{/* HEADER like Calendar */}

<View style={styles.header}>

<View style={{ width:28 }}/>

<Text style={styles.title}>
Todo List
</Text>


<Pressable onPress={()=>setAdding(true)}>

<Ionicons
name="add"
size={28}
color={Colors.primary}
/>

</Pressable>


</View>



{/* Add Input */}

{adding && (

<TextInput
style={styles.input}
placeholder="Enter new task"
value={newTodo}
onChangeText={setNewTodo}
autoFocus
onSubmitEditing={addTodo}
/>

)}



{/* Todo List */}

<FlatList

data={todos}

keyExtractor={(item)=>item.id}

renderItem={({item})=>(

<Swipeable
renderRightActions={()=>renderRightActions(item)}
>


<View style={styles.todoItem}>


<Pressable onPress={()=>toggleTodo(item.id)}>

<Ionicons
name={item.done?"checkbox":"square-outline"}
size={24}
color={Colors.primary}
/>

</Pressable>



{editingId===item.id? (

<TextInput
style={styles.editInput}
value={editingText}
onChangeText={setEditingText}
onSubmitEditing={saveEdit}
autoFocus
/>

):(


<Text
style={[
styles.todoText,
item.done && styles.doneText
]}
>

{item.title}

</Text>

)}



</View>


</Swipeable>

)}

/>


</View>

);

}



const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:Colors.background,
padding:20
},

header:{
flexDirection:"row",
alignItems:"center",
justifyContent:"space-between",
marginBottom:20
},

title:{
fontSize:24,
fontWeight:"700"
},

input:{
backgroundColor:"white",
padding:14,
borderRadius:14,
marginBottom:16
},

todoItem:{
flexDirection:"row",
alignItems:"center",
padding:16,
backgroundColor:Colors.card,
borderRadius:16,
marginBottom:10
},

todoText:{
marginLeft:12,
fontSize:16
},

doneText:{
textDecorationLine:"line-through",
opacity:0.5
},

actions:{
flexDirection:"row",
alignItems:"center"
},

editBtn:{
backgroundColor:"#4CAF50",
justifyContent:"center",
alignItems:"center",
width:60,
borderRadius:12,
marginBottom:10
},

deleteBtn:{
backgroundColor:"#F44336",
justifyContent:"center",
alignItems:"center",
width:60,
borderRadius:12,
marginBottom:10,
marginLeft:6
},

editInput:{
marginLeft:12,
fontSize:16,
flex:1
}

});