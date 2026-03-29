import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";

export default function Index() {

  useEffect(() => {
    const timeout = setTimeout(() => {
        router.replace("/(auth)/login");
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  return <View />;
}