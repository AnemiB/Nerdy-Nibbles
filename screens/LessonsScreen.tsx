// screens/LessonsScreen.tsx
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ImageSourcePropType,
  Dimensions,
  TextInput,
  Platform,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";

type LessonsNavProp = NativeStackNavigationProp<RootStackParamList, "Lessons">;

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";
const BOTTOM_BLUE = "#00658A";

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
  Slider: require("../assets/Slider.png"), // slider icon you mentioned
  Search: require("../assets/Search.png"),
  Check: require("../assets/Check.png"),
};

const lessonsData = [
  { id: "1", title: "Lesson 1:", subtitle: "Nutrition Basics", done: true },
  { id: "2", title: "Lesson 2:", subtitle: "Reading Labels", done: true },
  { id: "3", title: "Lesson 3:", subtitle: "Food Safety", done: true },
  { id: "4", title: "Lesson 4:", subtitle: "Budgeting", done: false },
  { id: "5", title: "Lesson 5:", subtitle: "Misleading Claims", done: false },
  { id: "6", title: "Lesson 6:", subtitle: "Labeling Rules", done: false },
  { id: "7", title: "Lesson 7:", subtitle: "Serving Sizes", done: false },
  { id: "8", title: "Lesson 8:", subtitle: "Sugar & Sweeteners", done: false },
];

export default function LessonsScreen() {
  const navigation = useNavigation<LessonsNavProp>();

  const todoAlert = (name: string) => console.log(`${name} not implemented`);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: "100%", alignItems: "center" }}>
        <Text style={styles.title}>Lessons</Text>
      </View>

      {/* Search row with slider button */}
      <View style={styles.searchRow}>
        <View style={styles.searchPill}>
          <TextInput
            placeholder="Search"
            placeholderTextColor="#2E6B8A"
            style={styles.searchInput}
            accessible
            accessibilityLabel="Search lessons"
          />
          <Image source={assets.Search} style={styles.searchIcon} resizeMode="contain" />
        </View>

        <TouchableOpacity
          style={styles.sliderBtn}
          onPress={() => todoAlert("Open filters")}
          accessibilityLabel="Open filters"
        >
          <Image source={assets.Slider} style={styles.sliderIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* Lessons card - only this area scrolls */}
      <View style={styles.lessonsCard}>
        <FlatList
          data={lessonsData}
          keyExtractor={(i) => i.id}
          style={styles.lessonsList}
          contentContainerStyle={styles.lessonsListContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("LessonDetail", {
                  id: item.id,
                  title: item.subtitle,
                  subtitle: item.subtitle,
                })
              }
            >
              <View style={styles.lessonItem}>
                <View style={styles.lessonText}>
                  <Text style={styles.lessonTitle}>{item.title}</Text>
                  <Text style={styles.lessonSubtitle}>{item.subtitle}</Text>
                </View>

                <View style={styles.checkWrap}>
                  {item.done ? (
                    <Image
                      source={assets.Check}
                      style={styles.iconCheck}
                      resizeMode="contain"
                      accessible
                      accessibilityLabel="Completed"
                    />
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Home")}
          accessibilityLabel="Home"
        >
          <Image source={assets.Home} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("NibbleAi")}
          accessibilityLabel="Nibble AI"
        >
          <Image source={assets.NibbleAi} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Lessons")}
          accessibilityLabel="Lessons"
        >
          <Image source={assets.Lessons} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Settings")}
          accessibilityLabel="Settings"
        >
          <Image source={assets.Settings} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: height * 0.06,
    paddingBottom: height * 0.12,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginBottom: 12,
  },

  searchRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "space-between",
  },

  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#0E6B8A22",
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    paddingLeft: 16,
    paddingRight: 44, // space for icon
    marginRight: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#08324A",
  },

  searchIcon: {
    position: "absolute",
    right: 12,
    width: 18,
    height: 18,
  },

  sliderBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LIGHT_CARD,
    alignItems: "center",
    justifyContent: "center",
  },

  sliderIcon: {
    width: 20,
    height: 20,
  },

  // lessons card
  lessonsCard: {
    width: "100%",
    backgroundColor: LIGHT_CARD,
    borderRadius: 18,
    padding: 14,
    // limit height so that only list scrolls - tweaked to match your wireframe
    maxHeight: height * 0.62,
  },

  lessonsList: {
    width: "100%",
  },

  lessonsListContent: {
    paddingBottom: 8,
  },

  lessonItem: {
    backgroundColor: "#F7FEFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  lessonText: {
    flex: 1,
  },

  lessonTitle: {
    color: "#0E4A66",
    fontWeight: "700",
    fontSize: 14,
  },

  lessonSubtitle: {
    color: "#2E6B8A",
    marginTop: 6,
    fontSize: 13,
  },

  checkWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D6F1FF",
  },

  iconCheck: {
    width: 18,
    height: 18,
  },

  bottomNav: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 45,
    height: 64,
    backgroundColor: BOTTOM_BLUE,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    shadowColor: "#00000030",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  iconBottom: {
    width: 26,
    height: 26,
  },
});
