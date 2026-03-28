import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

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
  const { setAccessToken, setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  useEffect(() => {
    if (request) {
      console.log('✅ Redirect URI:', request.redirectUri);
    }
  }, [request])

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      const token = authentication?.accessToken;

      if (token) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAccessToken(token);
        handleGoogleLogin(token);
      }
    } else if (response?.type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Auth Error", "Google login was interrupted.");
    }
  }, [response]);

  const handleGoogleLogin = async (token: string) => {
    setIsLoading(true);
    try {
      const userProfile = await FirebaseService.loginWithGoogle(token);
      setUser(userProfile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("🐼 Oops!", "Please fill in all fields");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const user = await FirebaseService.logIn(email, password);
      setUser(user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred.";
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login Failed", errorMessage);
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
              <Text style={styles.title}>Panda Planner</Text>
              <Text style={styles.subtitle}>Your smart schedule companion</Text>
            </View>

            {/* Login Form */}
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

              {isLoading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#FF8787" />
                  <Text style={styles.loaderText}>Panda is logging you in...</Text>
                </View>
              ) : (
                <>
                  <PrimaryButton
                    title="Login"
                    onPress={handleLogin}
                    style={styles.loginButton}
                  />

                  <View style={styles.separatorContainer}>
                    <View style={styles.line} />
                    <Text style={styles.orText}>or continue with</Text>
                    <View style={styles.line} />
                  </View>

                  <Pressable
                    style={styles.googleButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      promptAsync();
                    }}
                    disabled={!request || isLoading}
                  >
                    <LinearGradient
                      colors={['#9BD8EC', '#7BC5DC']}
                      style={styles.googleGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account?</Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/signup");
                  }}
                >
                  <Text style={styles.link}>Sign up</Text>
                </Pressable>
              </View>
            </View>

            {/* Panda Tip */}
            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={20} color="#FF8787" />
              <Text style={styles.tipText}>
                🐼 Sign in with Google to sync your calendar and tasks!
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
  loginButton: {
    marginTop: 8,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  orText: {
    marginHorizontal: 12,
    color: '#9B9B9B',
    fontSize: 12,
    fontWeight: '500',
  },
googleButton: {
  borderRadius: 30,
  overflow: 'hidden',
  shadowColor: '#9BD8EC', // Changed from '#4285F4' to your frosted blue
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
},
googleGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  paddingVertical: 14,
  borderRadius: 30,
},
googleButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
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