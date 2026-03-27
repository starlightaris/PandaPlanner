import { Ionicons } from "@expo/vector-icons";
import { decode } from 'base-64';
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Colors } from "../theme/colors";

if (typeof atob === 'undefined') {
  global.atob = decode;
}

export default function TabsLayout() {
  const router = useRouter();

  return (
    <>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,

          tabBarStyle: styles.tabBar,

          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: "#999",

          tabBarIcon: ({ color, size }) => {
            let iconName: any;

            if (route.name === "index") {
              iconName = "home";
            } else if (route.name === "calendar") {
              iconName = "calendar";
            } else if (route.name === "todo") {
              iconName = "checkmark-circle";
            } else if (route.name === "settings") {
              iconName = "settings";
            }

            return (
              <Ionicons
                name={iconName}
                size={size}
                color={color}
              />
            );
          },
        })}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />

        <Tabs.Screen
          name="calendar"
          options={{ title: "Calendar" }}
        />

        <Tabs.Screen name="todo" options={{ title: "Todo" }} />

        <Tabs.Screen
          name="settings"
          options={{ title: "Settings" }}
        />
      </Tabs>

      {/* Floating Button */}
      <View style={styles.fabContainer}>
        <Pressable
          style={styles.fab}
          onPress={() => router.push("/chat-import")}
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 8,
  },

  fabContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
  },

  fab: {
    backgroundColor: Colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",

    elevation: 5,
  },
});