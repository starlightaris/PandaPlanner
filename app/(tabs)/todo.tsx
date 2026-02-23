import { View, Text, StyleSheet, FlatList } from "react-native";

import { Colors } from "../theme/colors";

import EventCard from "../(components)/EventCard";

export default function TodoScreen() {

  const events = [

    {
      id: "1",
      title: "Finish Assignment",
      location: "Home",
      date: "2026-02-23",
      startTime: "18:00",
      endTime: "20:00",
    },

    {
      id: "2",
      title: "Gym",
      location: "Fitness Center",
      date: "2026-02-23",
      startTime: "21:00",
      endTime: "22:00",
    },

  ];

  return (

    <View style={styles.container}>

      <Text style={styles.header}>
        Todo List
      </Text>

      <FlatList

        data={events}

        keyExtractor={(item) => item.id}

        contentContainerStyle={{
          padding: 16,
        }}

        renderItem={({ item }) => (

          <EventCard

            title={item.title}

            location={item.location}

            date={item.date}

            startTime={item.startTime}

            endTime={item.endTime}

          />

        )}

      />

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: Colors.background,

  },

  header: {

    fontSize: 24,

    fontWeight: "700",

    padding: 16,

  },

});