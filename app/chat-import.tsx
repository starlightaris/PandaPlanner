import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { Colors } from "./theme/colors";


export default function ChatImport() {

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<
    { id: string; text: string }[]
  >([]);


  function sendMessage() {

    if (!message.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      text: message,
    };

    setMessages((prev) => [...prev, newMsg]);

    setMessage("");

  }


  return (

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >

      <View style={styles.container}>


        <Text style={styles.title}>
          Smart Import
        </Text>


        <Text style={styles.subtitle}>
          Type your schedule naturally
        </Text>



        <FlatList

          data={messages}

          keyExtractor={(item) => item.id}

          style={{ flex: 1 }}

          contentContainerStyle={{
            paddingBottom: 20
          }}

          renderItem={({ item }) => (

            <View style={styles.message}>

              <Text style={styles.messageText}>
                {item.text}
              </Text>

            </View>

          )}

        />




        <View style={styles.inputContainer}>


          <TextInput

            style={styles.input}

            placeholder="Visit grandma tomorrow 5pm"

            value={message}

            onChangeText={setMessage}

          />



          <Pressable
            style={styles.send}
            onPress={sendMessage}
          >

            <Ionicons
              name="send-outline"
              size={22}
              color="white"
            />

          </Pressable>



        </View>


      </View>

    </KeyboardAvoidingView>

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
  },

  subtitle: {
    color: Colors.textSecondary,
    marginBottom: 10,
  },

  message: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    alignSelf: "flex-end",
    maxWidth: "80%",
  },

  messageText: {
    color: "white",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
  },

  send: {
    backgroundColor: Colors.primary,
    padding: 14,
    marginLeft: 10,
    borderRadius: 20,
  },

});