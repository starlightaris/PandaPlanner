import { decode } from 'base-64';
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

if (typeof atob === 'undefined') {
  global.atob = decode;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}