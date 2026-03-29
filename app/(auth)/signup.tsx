import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import AppInput from "../(components)/AppInput";
import PrimaryButton from "../(components)/PrimaryButton";
import FirebaseService from "../../services/FirebaseService";

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animation logic remains the same...
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("🐼 Oops!", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("🐼 Oops!", "Password should be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("🐼 Oops!", "Passwords don't match");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      // This now creates both the Auth user and the Firestore document
      await FirebaseService.signUp(email, password);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // navigation occurs after successful async operations
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Signup Process Error:", error);
      let errorMessage = "Could not create account.";

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "That email address is already in use!";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "That email address is invalid!";
      } else if (error.message.includes('permission-denied')) {
        errorMessage = "Database permission denied. Check Firestore rules.";
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Signup Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFBF5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeEarLeft} />
      <View style={styles.decorativeEarRight} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Panda Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.pandaCircle}>
                <Text style={styles.pandaEmoji}>🐼</Text>
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join the Panda family!</Text>
            </View>

            {/* Signup Form */}
            <View style={styles.formContainer}>
              <View style={styles.inputCard}>
                <View style={styles.inputHeader}>
                  <Ionicons name="mail-outline" size={20} color="#FF8787" />
                  <Text style={styles.inputLabel}>Email</Text>
                </View>
                <AppInput
                  placeholder="panda@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  placeholderTextColor="#C7C7C7"
                />
              </View>

              <View style={styles.inputCard}>
                <View style={styles.inputHeader}>
                  <Ionicons name="lock-closed-outline" size={20} color="#FF8787" />
                  <Text style={styles.inputLabel}>Password</Text>
                </View>
                <View style={styles.passwordContainer}>
                  <AppInput
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.passwordInput]}
                    placeholderTextColor="#C7C7C7"
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9B9B9B"
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputCard}>
                <View style={styles.inputHeader}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FF8787" />
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                </View>
                <View style={styles.passwordContainer}>
                  <AppInput
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    style={[styles.input, styles.passwordInput]}
                    placeholderTextColor="#C7C7C7"
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9B9B9B"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsCard}>
                <Text style={styles.requirementsTitle}>Password must:</Text>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={password.length >= 6 ? "checkmark-circle" : "ellipse-outline"}
                    size={14}
                    color={password.length >= 6 ? "#FF8787" : "#C7C7C7"}
                  />
                  <Text style={[styles.requirementText, password.length >= 6 && styles.requirementMet]}>
                    Be at least 6 characters
                  </Text>
                </View>
              </View>

              {isLoading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#FF8787" />
                  <Text style={styles.loaderText}>Creating your panda account...</Text>
                </View>
              ) : (
                <PrimaryButton
                  title="Sign Up"
                  onPress={handleSignup}
                  style={styles.signupButton}
                />
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                  }}
                >
                  <Text style={styles.link}>Log in</Text>
                </Pressable>
              </View>
            </View>

            {/* Panda Tip */}
            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={20} color="#FF8787" />
              <Text style={styles.tipText}>
                🐼 Create an account to sync your calendar and stay organized!
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -80,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#9BD8EC',
    opacity: 0.1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFF7B2',
    opacity: 0.15,
  },
  decorativeEarLeft: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#9BD8EC',
    opacity: 0.2,
    transform: [{ rotate: '-20deg' }],
  },
  decorativeEarRight: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#9BD8EC',
    opacity: 0.2,
    transform: [{ rotate: '20deg' }],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pandaCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF8787',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  pandaEmoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3A3A3A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9B9B9B',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#9BD8EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9B9B9B',
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#3A3A3A',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 12,
    padding: 4,
  },
  requirementsCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF8787',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 11,
    color: '#9B9B9B',
  },
  requirementMet: {
    color: '#FF8787',
  },
  loaderContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FF8787',
    fontWeight: '500',
  },
  signupButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#9B9B9B',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF8787',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF5F0',
    padding: 14,
    borderRadius: 16,
    marginTop: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#8B6B4D',
    lineHeight: 18,
  },
});