//import * as tf from '@tensorflow/tfjs';
//import '@tensorflow/tfjs-react-native';
import { decode } from 'base-64';
import { Stack } from "expo-router";
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>

      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="add-event" options={{ presentation: 'modal' }} />
        </Stack>

      </AuthProvider>

    </GestureHandlerRootView>
  );
}