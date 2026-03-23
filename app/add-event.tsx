import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";

import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import DateTimePicker from "@react-native-community/datetimepicker";

import { useState } from "react";

import { Colors } from "./theme/colors";
import AppInput from "./(components)/AppInput";
import PrimaryButton from "./(components)/PrimaryButton";
import { Modal } from "react-native";

export default function AddEvent() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const [date, setDate] = useState(new Date());

  const [startTime, setStartTime] = useState(new Date());

  const [endTime, setEndTime] = useState(new Date());

  const [showDate, setShowDate] = useState(false);

  const [showStart, setShowStart] = useState(false);

  const [showEnd, setShowEnd] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);

  const formatDate = (d: Date) =>
    d.toISOString().split("T")[0];

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <View style={styles.container}>
      {/* Header */}

      <View style={styles.header}>

        {/* Back */}
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </Pressable>


        {/* Title */}
        <Text style={styles.headerTitle}>
          New Event
        </Text>


        {/* Menu */}
        <Pressable onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-vertical" size={22} />
        </Pressable>


      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>Title</Text>

        <AppInput
          placeholder="Meeting"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>
          Location
        </Text>

        <AppInput
          placeholder="Office"
          value={location}
          onChangeText={setLocation}
        />

        {/* Date */}

        <Text style={styles.label}>Date</Text>

        <Pressable
          style={styles.picker}
          onPress={() => setShowDate(true)}
        >
          <Text>{formatDate(date)}</Text>
        </Pressable>

        {showDate && (
          <DateTimePicker
            mode="date"
            value={date}
            onChange={(_, selected) => {
              setShowDate(false);
              if (selected) setDate(selected);
            }}
          />
        )}

        {/* Start */}

        <Text style={styles.label}>
          Start Time
        </Text>

        <Pressable
          style={styles.picker}
          onPress={() => setShowStart(true)}
        >
          <Text>
            {formatTime(startTime)}
          </Text>
        </Pressable>

        {showStart && (
          <DateTimePicker
            mode="time"
            value={startTime}
            onChange={(_, selected) => {
              setShowStart(false);
              if (selected)
                setStartTime(selected);
            }}
          />
        )}

        {/* End */}

        <Text style={styles.label}>
          End Time
        </Text>

        <Pressable
          style={styles.picker}
          onPress={() => setShowEnd(true)}
        >
          <Text>
            {formatTime(endTime)}
          </Text>
        </Pressable>

        {showEnd && (
          <DateTimePicker
            mode="time"
            value={endTime}
            onChange={(_, selected) => {
              setShowEnd(false);
              if (selected)
                setEndTime(selected);
            }}
          />
        )}

        <PrimaryButton
          title="Save Event"
          onPress={() => {}}
        />
      </ScrollView>

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setMenuVisible(false)}
        >

          <View style={styles.menu}>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push("/import");
              }}
            >

              <Ionicons name="download-outline" size={20} />

              <Text style={styles.menuText}>
                Import Schedule
              </Text>

            </Pressable>

          </View>

        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  content: {
    padding: 20,
  },

  label: {
    marginTop: 16,
    marginBottom: 6,
  },

  picker: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  overlay:{
  flex:1,
  backgroundColor:"rgba(0,0,0,0.2)",
  alignItems:"flex-end",
  paddingTop:60,
  paddingRight:16
  },

  menu:{
  backgroundColor:"white",
  borderRadius:12,
  padding:10,
  width:180
  },

  menuItem:{
  flexDirection:"row",
  alignItems:"center",
  padding:10
  },

  menuText:{
  marginLeft:10,
  fontSize:16
  },
});