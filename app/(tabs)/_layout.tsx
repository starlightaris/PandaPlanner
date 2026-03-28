import { Ionicons } from "@expo/vector-icons";
import { decode } from 'base-64';
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View, Animated, Dimensions } from "react-native";
import { useState, useRef, useEffect } from "react";
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from "../theme/colors";
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

if (typeof atob === 'undefined') {
  global.atob = decode;
}

export default function TabsLayout() {
  const router = useRouter();
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;

  // Pulse animation for the FAB
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Rotate animation
    Animated.sequence([
      Animated.timing(fabRotate, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fabRotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    router.push("/chat-import");
  };

  const rotateInterpolate = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: "#999",
          tabBarIcon: ({ color, size, focused }) => {
            let iconName: any;

            if (route.name === "index") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "calendar") {
              iconName = focused ? "calendar" : "calendar-outline";
            } else if (route.name === "todo") {
              iconName = focused ? "checkmark-circle" : "checkmark-circle-outline";
            } else if (route.name === "settings") {
              iconName = focused ? "settings" : "settings-outline";
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
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        />
        <Tabs.Screen
          name="todo"
          options={{
            title: "Todo",
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        />
      </Tabs>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <Animated.View
          style={[
            styles.fabWrapper,
            {
              transform: [{ scale: fabScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FF8787', '#FF9F9F']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Pressable
              style={styles.fab}
              onPress={handleFabPress}
              android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true, radius: 30 }}
            >
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
              </Animated.View>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* Label for the FAB */}
        <View style={styles.fabLabelContainer}>
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
            style={styles.fabLabel}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.fabLabelText}>Chat with Panda</Text>
          </LinearGradient>
        </View>
      </View>
    </>
  );
}

// Add Text import
import { Text } from "react-native";

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  fabContainer: {
    position: "absolute",
    bottom: 85,
    right: 20,
    alignItems: "flex-end",
  },
  fabWrapper: {
    shadowColor: '#FF8787',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  fabLabelContainer: {
    position: 'absolute',
    right: 70,
    top: 18,
    opacity: 0.9,
  },
  fabLabel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fabLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});