//import * as tf from '@tensorflow/tfjs';
//import '@tensorflow/tfjs-react-native';

import { decode } from 'base-64';
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from './context/AuthContext';

if (typeof atob === 'undefined') {
  global.atob = decode;
}

// Initialize TensorFlow.js
/*tf.ready().then(() => {
  console.log('TensorFlow.js initialized');
});*/

export default function RootLayout() {

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>

          {/* Index handles the initial routing logic */}
          <Stack.Screen name="index" />

          {/* Main App Groups */}
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />

          {/* Modals */}
          <Stack.Screen
            name="add-event"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom'
            }}
          />

          <Stack.Screen
            name="import"
            options={{
              presentation: 'transparentModal',
              animation: 'fade'
            }}
          />

        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}