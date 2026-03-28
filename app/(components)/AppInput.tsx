import { StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle } from "react-native";

interface Props extends TextInputProps {
  // Use TextStyle instead of ViewStyle to match TextInput requirements
  style?: StyleProp<TextStyle>;
}

export default function AppInput({ style, ...props }: Props) {
  return (
    <TextInput 
      style={[styles.defaultInput, style]} 
      placeholderTextColor="#C7C7C7" 
      {...props} 
    />
  );
}

const styles = StyleSheet.create({
  defaultInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    fontSize: 16,
    color: '#3A3A3A',
  },
});