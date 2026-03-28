import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

import AppInput from "../(components)/AppInput";
import PrimaryButton from "../(components)/PrimaryButton";
import { Colors } from "../theme/colors";
import FirebaseService from "../services/FirebaseService";
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();

  // 1. Hook into the Global State
  const { setAccessToken, setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 2. Initialize Google Auth Request
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '1015755840124-gn1ob4kv3gpt99dnthfvfacuh50af14b.apps.googleusercontent.com',
    useProxy: true,
    redirectUri: AuthSession.makeRedirectUri({
        useProxy: true,
        scheme: 'pandaplanner',
      }),
    scopes: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/tasks',
      ],
  });

  // 3. Listen for Google Response and Update Global State
  useEffect(() => {
     if (response?.type === 'success') {
       const { authentication } = response;
       const token = authentication?.accessToken;

       if (token) {
         console.log("✅ Panda Token Secured:", token);

         // SAVE TO GLOBAL STATE
         setAccessToken(token);

         // Continue with Firebase Login (Optional, if you still want a user profile)
         handleGoogleLogin(token);
       }
     } else if (response?.type === 'error') {
       Alert.alert("Auth Error", "Google login was interrupted.");
     }
   }, [response]);

  const handleGoogleLogin = async (token: string) => {
    setIsLoading(true);
    try {
      // If your FirebaseService.loginWithGoogle needs the access token, pass it here
      const userProfile = await FirebaseService.loginWithGoogle(token);
      setUser(userProfile); // Save user info to global state too

      // Navigate to the Dashboard
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Firebase Auth Error:", error);
      Alert.alert("Login Failed", "Authenticated with Google, but couldn't sync with PandaPlanner.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const user = await FirebaseService.logIn(email, password);
      setUser(user); // Save regular login user to global state
      router.replace("/(tabs)");
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred.";
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      Alert.alert("Login Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐼 PandaPlanner</Text>
      <Text style={styles.subtitle}>Welcome back</Text>

      <AppInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <AppInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <>
          <PrimaryButton title="Login" onPress={handleLogin} />

          <View style={styles.separatorContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <Pressable
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={!request || isLoading}
          >
            <Ionicons name="logo-google" size={20} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={() => router.push("/signup")}>
        <Text style={styles.link}>Create account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 20,
    color: Colors.textSecondary,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border || '#ccc',
  },
  orText: {
    marginHorizontal: 10,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 20,
    textAlign: "center",
    color: Colors.primary,
  },
});