import { Tabs, router } from "expo-router";
import { Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";

export default function TabsLayout() {

  return (

    <View style={{ flex: 1 }}>

      {/* Tabs with NO default header */}
      <Tabs
        screenOptions={{
          headerShown: false
        }}
      >

        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="calendar"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="todo"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkbox-outline" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" color={color} size={size} />
            ),
          }}
        />

      </Tabs>


      {/* Floating chatbot button */}
      <Pressable
        style={styles.chatbot}
        onPress={() => router.push("/chat-import")}
      >

        <Ionicons
          name="chatbubble-ellipses"
          size={26}
          color="white"
        />

      </Pressable>


    </View>

  );

}


const styles = StyleSheet.create({

  chatbot: {

    position: "absolute",

    bottom: 90,

    right: 20,

    backgroundColor: Colors.primary,

    width: 56,

    height: 56,

    borderRadius: 28,

    justifyContent: "center",

    alignItems: "center",

    elevation: 5,

  },

});