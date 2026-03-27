import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import AppInput from "../(components)/AppInput";
import PrimaryButton from "../(components)/PrimaryButton";
import { Colors } from "../theme/colors";
import FirebaseService from "../services/FirebaseService";

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    // 1. Basic Validation
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password should be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      // 2. Call our service to create the user
      await FirebaseService.signUp(email, password);

      // 3. Navigate to the main app
      // Because of the root _layout listener, the app will
      // automatically swap the (auth) stack for the (tabs) stack.
      router.replace("/(tabs)");
    } catch (error: any) {
      // 4. Specific Signup Error Handling
      let errorMessage = "Could not create account.";

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "That email address is already in use!";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "That email address is invalid!";
      }

      Alert.alert("Signup Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

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
        <PrimaryButton
          title="Sign Up"
          onPress={handleSignup}
        />
      )}

      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Already have account?</Text>
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
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
  },
  link: {
    marginTop: 20,
    textAlign: "center",
    color: Colors.primary,
  },
});