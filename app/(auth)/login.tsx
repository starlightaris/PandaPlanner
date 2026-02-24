import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import AppInput from "../(components)/AppInput";
import PrimaryButton from "../(components)/PrimaryButton";
import { Colors } from "../theme/colors";

export default function LoginScreen() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        🐼 PandaPlanner
      </Text>

      <Text style={styles.subtitle}>
        Welcome back
      </Text>

      <AppInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <AppInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />

      <PrimaryButton
        title="Login"
        onPress={() => {}}
      />

      <Pressable
        onPress={() =>
          router.push("/signup")
        }
      >

        <Text style={styles.link}>
          Create account
        </Text>

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