import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Dimensions, ActivityIndicator,} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { lessonsData } from "./LessonsScreen";
import { auth } from "../firebase";
import { onUserProfile, getUserProfileOnce } from "../services/userService";

type ProgressNavProp = NativeStackNavigationProp<RootStackParamList, "Progress">;

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

const assets = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
};

export default function ProgressScreen() {
  const navigation = useNavigation<ProgressNavProp>();
  const [loading, setLoading] = useState(true);
  const [lessonsCompleted, setLessonsCompleted] = useState<number>(0);
  const [totalLessons, setTotalLessons] = useState<number>(lessonsData.length);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let mounted = true;

    const setup = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (mounted) {
          setLessonsCompleted(0);
          setTotalLessons(lessonsData.length);
          setLoading(false);
        }
        return;
      }
      try {
        const profile = await getUserProfileOnce(user.uid);
        if (!mounted) return;
        setLessonsCompleted(typeof profile?.lessonsCompleted === "number" ? profile!.lessonsCompleted! : 0);
        setTotalLessons(typeof profile?.totalLessons === "number" ? profile!.totalLessons! : lessonsData.length);
      } catch (err) {
        console.warn("getUserProfileOnce failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }

      try {
        unsub = onUserProfile(user.uid, (profile) => {
          if (!mounted) return;
          if (!profile) {
            setLessonsCompleted(0);
            setTotalLessons(lessonsData.length);
          } else {
            setLessonsCompleted(typeof profile.lessonsCompleted === "number" ? profile.lessonsCompleted : 0);
            setTotalLessons(typeof profile.totalLessons === "number" ? profile.totalLessons : lessonsData.length);
          }
        });
      } catch (err) {
        console.warn("onUserProfile subscribe failed:", err);
      }
    };

    setup();

    return () => {
      mounted = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const finishedLessons = lessonsData.filter((l) => {
    const idNum = Number(l.id);
    if (Number.isNaN(idNum)) return false;
    return idNum <= lessonsCompleted;
  });

  const finishedCount = finishedLessons.length;
  const percent = Math.round((finishedCount / (totalLessons || 1)) * 100);

  function onNextLesson() {
    const next = lessonsData.find((l) => {
      const idNum = Number(l.id);
      return !Number.isNaN(idNum) && idNum > lessonsCompleted;
    });

    if (next) {
      navigation.navigate("LessonDetail", {
        id: next.id,
        title: next.subtitle,
        subtitle: next.subtitle,
      });
    } else {
      navigation.navigate("Lessons");
    }
  }

  function onReviewWithAI() {
    navigation.navigate("NibbleAi");
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={ACCENT_ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: "100%", alignItems: "center" }}>
        <Text style={styles.headerText}>Progress Tracker</Text>
      </View>

      <View style={{ alignItems: "center", marginTop: 8 }}>
        <View style={styles.donutOuter}>
          <View style={styles.donutInner}>
            <Text style={styles.donutCount}>
              {finishedCount}/{totalLessons}
            </Text>
            <Text style={styles.donutLabel}>Lessons</Text>
            <Text style={{ fontSize: 12, color: "#0E4A66", marginTop: 6 }}>{percent}%</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Lessons Finished</Text>

      <View style={styles.finishedCard}>
        {finishedLessons.length === 0 ? (
          <Text style={styles.emptyText}>No lessons finished yet</Text>
        ) : (
          <FlatList
            data={finishedLessons}
            keyExtractor={(i) => i.id}
            renderItem={({ item, index }) => (
              <View style={styles.finishedRow}>
                <Text style={styles.finishedText}>{item.subtitle}</Text>
                {index < finishedLessons.length - 1 && <View style={styles.rowDivider} />}
              </View>
            )}
            contentContainerStyle={{ paddingVertical: 8 }}
            scrollEnabled={false}
          />
        )}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={onNextLesson}>
        <Text style={styles.nextBtnText}>Next Lesson</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reviewBtn} onPress={onReviewWithAI}>
        <Text style={styles.reviewBtnText}>Review with Nibble AI</Text>
      </TouchableOpacity>

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")} accessibilityLabel="Home">
          <Image source={assets.Home} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("NibbleAi")} accessibilityLabel="Nibble AI">
          <Image source={assets.NibbleAi} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Lessons")} accessibilityLabel="Lessons">
          <Image source={assets.Lessons} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Settings")} accessibilityLabel="Settings">
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

  headerText: {
    fontSize: 20,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginBottom: 12,
  },

  donutOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 14,
    borderColor: "#D3EDF9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00000012",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  donutInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  donutCount: {
    fontSize: 22,
    fontWeight: "700",
    color: BRAND_BLUE,
  },

  donutLabel: {
    fontSize: 13,
    color: "#0E4A66",
    marginTop: 6,
  },

  sectionTitle: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "600",
    color: BRAND_BLUE,
    alignSelf: "center",
  },

  finishedCard: {
    marginTop: 12,
    backgroundColor: LIGHT_CARD,
    borderRadius: 14,
    padding: 12,
    width: "100%",
    minHeight: 120,
    justifyContent: "center",
  },

  emptyText: {
    color: "#0E4A66",
    textAlign: "center",
  },

  finishedRow: {
    paddingVertical: 10,
  },

  finishedText: {
    textAlign: "center",
    color: "#0E4A66",
    fontWeight: "600",
  },

  rowDivider: {
    height: 1,
    backgroundColor: "#BEEAFB",
    marginTop: 10,
  },

  nextBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  nextBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  reviewBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: BRAND_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  reviewBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  bottomNav: {
    position: "absolute",
    left: 20,
    right: 20,
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
