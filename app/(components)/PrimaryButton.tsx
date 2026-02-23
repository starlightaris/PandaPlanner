import { Pressable, Text, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
};

export default function PrimaryButton({ title, onPress }: Props) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  text: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});