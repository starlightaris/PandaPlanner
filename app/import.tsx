import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "./theme/colors";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import * as FileSystem from "expo-file-system";

export default function ImportScreen(){

async function importImage(){

const result =
await ImagePicker.launchImageLibraryAsync({
mediaTypes:ImagePicker.MediaTypeOptions.Images,
quality:1,
});

if(!result.canceled){

const uri=result.assets[0].uri;

Alert.alert("Image selected",uri);

// later send to ML model

}

}


async function importCSV(){

const result =
await DocumentPicker.getDocumentAsync({
type:"text/csv"
});

if(result.canceled)return;

const uri=result.assets[0].uri;

const content=
await FileSystem.readAsStringAsync(uri);

const parsed=
Papa.parse(content,{
header:true
});

console.log(parsed.data);

Alert.alert("CSV Imported");

}


async function importExcel(){

const result=
await DocumentPicker.getDocumentAsync({
type:
"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
});

if(result.canceled)return;

const uri=result.assets[0].uri;

const b64=
await FileSystem.readAsStringAsync(uri,{
encoding:FileSystem.EncodingType.Base64
});

const wb=
XLSX.read(b64,{type:"base64"});

const sheet=
wb.Sheets[wb.SheetNames[0]];

const data=
XLSX.utils.sheet_to_json(sheet);

console.log(data);

Alert.alert("Excel Imported");

}



return(

<View style={styles.container}>

<Text style={styles.title}>
Import Schedule
</Text>


<Pressable
style={styles.option}
onPress={importImage}
>

<Ionicons name="image-outline" size={26} color={Colors.primary}/>

<Text style={styles.text}>
Import Image
</Text>

</Pressable>



<Pressable
style={styles.option}
onPress={importCSV}
>

<Ionicons name="document-text-outline" size={26} color={Colors.primary}/>

<Text style={styles.text}>
Import CSV
</Text>

</Pressable>



<Pressable
style={styles.option}
onPress={importExcel}
>

<Ionicons name="grid-outline" size={26} color={Colors.primary}/>

<Text style={styles.text}>
Import Excel
</Text>

</Pressable>



</View>

);

}



const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:Colors.background,
padding:20
},

title:{
fontSize:26,
fontWeight:"700",
marginBottom:20
},

option:{
backgroundColor:Colors.card,
padding:20,
borderRadius:18,
flexDirection:"row",
alignItems:"center",
marginBottom:16
},

text:{
marginLeft:14,
fontSize:16,
fontWeight:"600"
}

});