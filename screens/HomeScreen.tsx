// screens/HomeScreen.tsx
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Image,
  ImageSourcePropType,
  Dimensions,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

const { height } = Dimensions.get("window"); // <-- define height used in styles

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF"; // soft light-blue pill bg
const CARD_BG = "#E8F7FF"; // slightly darker card bg

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
  PlaneArrow: require("../assets/PlaneArrow.png"),
  Check: require("../assets/Check.png"),
};

const recentActivities = [
  { id: "1", title: "Lesson 1:", subtitle: "Nutrition Basics", done: true },
  { id: "2", title: "Lesson 2:", subtitle: "Reading Labels", done: true },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();

  const lessonsCompleted = 3;
  const totalLessons = 6;
  const progressPct = Math.round((lessonsCompleted / totalLessons) * 100);
  const progressBarWidth = `${(lessonsCompleted / totalLessons) * 100}%`;

  const todoAlert = (name: string) =>
    // replace with navigation or real action later
    console.log(`${name} not implemented`);

  return (
    <SafeAreaView style={styles.container}>
      {/* Greeting */}
      <View style={{ width: "100%", alignItems: "center", marginTop: 8 }}>
        <Text style={styles.hello}>Hello, User!</Text>
      </View>

      {/* Progress pill */}
      <View style={styles.progressPill}>
        <View style={styles.progressTopRow}>
          <Text style={styles.progressCount}>
            {lessonsCompleted}/{totalLessons}
          </Text>
          <Text style={styles.progressLabel}>Lessons Completed</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressBarWidth }]} />
        </View>
      </View>

      {/* Recent Activity Card */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeading}>Recent Activity</Text>

        <View style={styles.activityCard}>
          <FlatList
            data={recentActivities}
            keyExtractor={(i) => i.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.activityItem}>
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                </View>

                <View style={styles.checkWrap}>
                  {/* Use your Check.png here. resizeMode contain preserves aspect ratio */}
                  <Image
                    source={assets.Check}
                    style={styles.iconCheck}
                    resizeMode="contain"
                    accessible
                    accessibilityLabel="Completed"
                  />
                </View>
              </View>
            )}
          />
        </View>
      </View>

      {/* Tutor Assistance */}
      <View style={[styles.sectionContainer, { marginTop: 8 }]}>
        <Text style={styles.sectionHeading}>Q&A Assistance</Text>

        <View style={styles.tutorCard}>
          <Text style={styles.tutorText}>
            Explain more about why natural sugars in food is important
          </Text>

          <TouchableOpacity
            style={styles.tutorSend}
            onPress={() => todoAlert("Send tutor question")}
            accessibilityLabel="Send question to tutor"
          >
            <Image
              source={assets.PlaneArrow}
              style={styles.iconPlane}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => todoAlert("New Lesson")}
        >
          <Text style={styles.primaryBtnText}>New Lesson</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => todoAlert("Review with Nibble AI")}
        >
          <Image
            source={assets.NibbleAi}
            style={styles.nibbleIcon}
            resizeMode="contain"
          />
          <Text style={styles.secondaryBtnText}>Review with Nibble AI</Text>
        </TouchableOpacity>
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

  /* Greeting */
  hello: {
    fontSize: 20,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginBottom: 12,
  },

  /* Progress pill */
  progressPill: {
    width: "100%",
    backgroundColor: LIGHT_CARD,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressCount: {
    fontWeight: "800",
    fontSize: 16,
    marginRight: 10,
    color: "#000",
  },
  progressLabel: {
    flex: 1,
    textAlign: "left",
    color: "#183E53",
    fontSize: 13,
  },
  progressTrack: {
    height: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 12,
  },

  /* Section container */
  sectionContainer: {
    width: "100%",
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginBottom: 8,
    alignSelf: "center",
  },

  /* Activity card */
  activityCard: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 18,
    padding: 12,
  },
  activityItem: {
    backgroundColor: "#F7FEFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    color: "#0E4A66",
    fontWeight: "700",
    fontSize: 13,
  },
  activitySubtitle: {
    color: "#2E6B8A",
    marginTop: 4,
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
    // resizeMode: 'contain' is set on the Image directly
  },

  /* Tutor assistance */
  tutorCard: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tutorText: {
    flex: 1,
    color: "#0E4A66",
    fontSize: 14,
    marginRight: 12,
  },
  tutorSend: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlane: {
    width: 22,
    height: 22,
  },

  /* Buttons */
  buttonGroup: {
    width: "100%",
    marginTop: 18,
    alignItems: "center",
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    width: "100%",
    height: 52,
    backgroundColor: BRAND_BLUE,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  nibbleIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  secondaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 45,
    height: 64,
    backgroundColor: BRAND_BLUE,
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
