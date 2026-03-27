import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import AppInput from "../(components)/AppInput";
import PrimaryButton from "../(components)/PrimaryButton";
import { Colors } from "../theme/colors";
import FirebaseService from "../services/FirebaseService"; // Adjust path if needed

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    // 1. Basic Validation
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      // 2. Call our service
      await FirebaseService.logIn(email, password);

      // 3. Navigate to the main app
      // Note: If you set up the root _layout listener,
      // it might auto-redirect you, but a manual replace is safe.
      router.replace("/(tabs)");
    } catch (error: any) {
      // 4. Handle Firebase-specific errors gracefully
      let errorMessage = "An unexpected error occurred.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
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
        secureTextEntry // Hide the password characters
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <PrimaryButton
          title="Login"
          onPress={handleLogin}
        />
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
  link: {
    marginTop: 20,
    textAlign: "center",
    color: Colors.primary,
  },
});