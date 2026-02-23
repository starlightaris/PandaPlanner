import { View, Text, StyleSheet, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../theme/colors";

export default function SettingsScreen() {

  return (

    <View style={styles.container}>

      {/* Profile */}

      <View style={styles.profile}>

        <Ionicons
          name="person-circle-outline"
          size={80}
          color={Colors.primary}
        />

        <Text style={styles.name}>
          PandaPlanner User
        </Text>

        <Text style={styles.email}>
          user@email.com
        </Text>

      </View>


      {/* Settings options */}

      <View style={styles.section}>

        <SettingItem
          icon="notifications-outline"
          title="Notifications"
        />

        <SettingItem
          icon="calendar-outline"
          title="Google Calendar Sync"
        />

        <SettingItem
          icon="moon-outline"
          title="Dark Mode"
        />

        <SettingItem
          icon="log-out-outline"
          title="Logout"
          danger
        />

      </View>

    </View>

  );

}

function SettingItem({
  icon,
  title,
  danger,
}: any) {

  return (

    <Pressable style={styles.item}>

      <Ionicons
        name={icon}
        size={22}
        color={danger ? "red" : Colors.primary}
      />

      <Text
        style={[
          styles.itemText,
          danger && { color: "red" },
        ]}
      >

        {title}

      </Text>

    </Pressable>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: Colors.background,

  },

  profile: {

    alignItems: "center",

    padding: 24,

  },

  name: {

    fontSize: 20,

    fontWeight: "600",

    marginTop: 8,

  },

  email: {

    color: Colors.textSecondary,

  },

  section: {

    backgroundColor: "white",

    margin: 16,

    borderRadius: 16,

  },

  item: {

    flexDirection: "row",

    alignItems: "center",

    padding: 16,

    borderBottomWidth: 1,

    borderBottomColor: Colors.border,

  },

  itemText: {

    marginLeft: 12,

    fontSize: 16,

  },

});