import { TextInput, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

export default function AppInput(props: Props) {
  return <TextInput style={styles.input} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
});