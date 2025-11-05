import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ImageSourcePropType, Dimensions, TextInput, Platform, ActivityIndicator, Alert, Modal, } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { auth } from "../firebase";
import { getUserProfileOnce, updateLessonsProgress, addRecentActivity, onUserProfile, generateLessonContentForUser, } from "../services/userService";
import type { LessonsNavProp } from "../types";
import type { FilterMode } from "../types";


const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
  Slider: require("../assets/Slider.png"),
  Search: require("../assets/Search.png"),
  Check: require("../assets/Check.png"),
};

import type { LessonItem } from "../types";

export const lessonsData: LessonItem[] = [
  { id: "1", title: "Nutrition Basics", subtitle: "Lesson 1", done: true },
  { id: "2", title: "Reading Labels", subtitle: "Lesson 2", done: true },
  { id: "3", title: "Food Safety", subtitle: "Lesson 3", done: true },
  { id: "4", title: "Budgeting", subtitle: "Lesson 4", done: false },
  { id: "5", title: "Misleading Claims", subtitle: "Lesson 5", done: false },
  { id: "6", title: "Labeling Rules", subtitle: "Lesson 6", done: false },
  { id: "7", title: "Serving Sizes", subtitle: "Lesson 7", done: false },
  { id: "8", title: "Sugar & Sweeteners", subtitle: "Lesson 8", done: false },
];


export default function LessonsScreen() {
  const navigation = useNavigation<LessonsNavProp>();
  const [loading, setLoading] = useState(true);
  const [lessonsCompleted, setLessonsCompleted] = useState<number>(0);
  const [totalLessons, setTotalLessons] = useState<number>(lessonsData.length);
  const [isGeneratingId, setIsGeneratingId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState<string>("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const start = async () => {
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
        console.warn("Failed initial profile load:", err);
      } finally {
        if (mounted) setLoading(false);
      }
      try {
        unsubscribe = onUserProfile(user.uid, (profile) => {
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
        console.warn("Failed to subscribe to profile:", err);
      }
    };

    start();

    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const isLessonDone = (id: string) => {
    const n = Number(id);
    if (Number.isNaN(n)) return false;
    return n <= lessonsCompleted;
  };

  const markComplete = async (id: string, title: string) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in to track lessons.");
      return;
    }
    const lessonNum = Number(id);
    if (Number.isNaN(lessonNum)) return;

    if (lessonNum <= lessonsCompleted) {
      return;
    }

    const newCompleted = Math.max(lessonsCompleted, lessonNum);

    try {
      setLessonsCompleted(newCompleted);

      await updateLessonsProgress(user.uid, { lessonsCompleted: newCompleted });

      await addRecentActivity(user.uid, {
        title: `Completed ${title}`,
        subtitle: `Lesson ${lessonNum} finished`,
        done: true,
      });
    } catch (err) {
      console.warn("Failed to mark lesson complete:", err);
      try {
        const profile = await getUserProfileOnce(user.uid);
        setLessonsCompleted(typeof profile?.lessonsCompleted === "number" ? profile!.lessonsCompleted! : 0);
      } catch (e) {
      }
      Alert.alert("Error", "Could not mark lesson complete. Please try again.");
    }
  };

  const goToLesson = async (item: { id: string; subtitle: string; title?: string }) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to view lessons.");
      return;
    }

    setIsGeneratingId(item.id);
    try {
      const res = await generateLessonContentForUser(user.uid, item.id, { title: item.title, subtitle: item.subtitle });
      const content = res?.content ?? null;
      navigation.navigate("LessonDetail", {
        id: String(item.id),
        title: item.title,
        subtitle: item.subtitle,
        generatedContent: content,
      } as any);
    } catch (err: any) {
      console.error("Failed to generate lesson:", err);
      Alert.alert("Could not load lesson", err?.message ?? "Try again later.");
    } finally {
      setIsGeneratingId(null);
    }
  };

  function lessonMatchesSearch(item: LessonItem, q: string) {
    if (!q) return true;
    const low = q.trim().toLowerCase();
    return (
      item.title.toLowerCase().includes(low) ||
      (item.subtitle || "").toLowerCase().includes(low) ||
      String(item.id).toLowerCase().includes(low)
    );
  }

  const filteredLessons = lessonsData.filter((it) => {
    if (!lessonMatchesSearch(it, searchText)) return false;
    if (filterMode === "completed") return isLessonDone(it.id);
    if (filterMode === "incomplete") return !isLessonDone(it.id);
    return true;
  });


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
        <Text style={styles.title}>Lessons</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchPill}>
          <TextInput
            placeholder="Search lessons"
            placeholderTextColor="#2E6B8A"
            style={styles.searchInput}
            accessible
            accessibilityLabel="Search lessons"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          <Image source={assets.Search} style={styles.searchIcon} resizeMode="contain" />
        </View>

        <TouchableOpacity
          style={styles.sliderBtn}
          onPress={() => setFilterOpen(true)}
          accessibilityLabel="Open filters"
        >
          <Image source={assets.Slider} style={styles.sliderIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* Simple filter modal */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={filterStyles.overlay} activeOpacity={1} onPress={() => setFilterOpen(false)}>
          <View style={filterStyles.panel}>
            <Text style={filterStyles.panelTitle}>Filter lessons</Text>

            <TouchableOpacity
              style={[filterStyles.option, filterMode === "all" ? filterStyles.optionSelected : null]}
              onPress={() => {
                setFilterMode("all");
                setFilterOpen(false);
              }}
            >
              <Text style={filterStyles.optionText}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[filterStyles.option, filterMode === "completed" ? filterStyles.optionSelected : null]}
              onPress={() => {
                setFilterMode("completed");
                setFilterOpen(false);
              }}
            >
              <Text style={filterStyles.optionText}>Completed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[filterStyles.option, filterMode === "incomplete" ? filterStyles.optionSelected : null]}
              onPress={() => {
                setFilterMode("incomplete");
                setFilterOpen(false);
              }}
            >
              <Text style={filterStyles.optionText}>Incomplete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={filterStyles.clearBtn}
              onPress={() => {
                setSearchText("");
                setFilterMode("all");
                setFilterOpen(false);
              }}
            >
              <Text style={filterStyles.clearText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Lessons card; only this area scrolls */}
      <View style={styles.lessonsCard}>
        <FlatList
          data={filteredLessons}
          keyExtractor={(i) => i.id}
          style={styles.lessonsList}
          contentContainerStyle={styles.lessonsListContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const done = isLessonDone(item.id);
            const generating = isGeneratingId === item.id;
            return (
              <View style={styles.lessonRowWrapper}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => goToLesson(item)} disabled={generating}>
                  <View style={styles.lessonItem}>
                    <View style={styles.lessonText}>
                      <Text style={styles.lessonTitle}>{item.title}</Text>
                      <Text style={styles.lessonSubtitle}>{item.subtitle}</Text>
                    </View>

                    <View style={styles.checkWrap}>
                      {generating ? (
                        <ActivityIndicator size="small" />
                      ) : done ? (
                        <Image source={assets.Check} style={styles.iconCheck} resizeMode="contain" accessible accessibilityLabel="Completed" />
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Action row for each lesson */}
                <View style={styles.lessonActions}>
                  {!done ? (
                    <TouchableOpacity
                      style={styles.markCompleteBtn}
                      onPress={() => markComplete(item.id, item.title)}
                      accessibilityLabel={`Mark ${item.title} complete`}
                    >
                      <Text style={styles.markCompleteText}>Mark complete</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: "#0E4A66" }}>No lessons found.</Text>
            </View>
          }
        />
      </View>

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

const filterStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000040",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    elevation: 12,
  },
  panelTitle: { fontWeight: "700", fontSize: 16, color: BRAND_BLUE, marginBottom: 8 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  optionSelected: {
    backgroundColor: LIGHT_CARD,
    borderColor: BRAND_BLUE,
  },
  optionText: { fontSize: 14, color: "#0E4A66", fontWeight: "600" },
  clearBtn: { marginTop: 6, alignItems: "center", paddingVertical: 8 },
  clearText: { color: ACCENT_ORANGE, fontWeight: "700" },
});

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
    paddingRight: 44,
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
    maxHeight: height * 0.62,
  },

  lessonsList: {
    width: "100%",
  },

  lessonsListContent: {
    paddingBottom: 8,
  },

  lessonRowWrapper: {
    marginBottom: 6,
  },

  lessonItem: {
    backgroundColor: "#F7FEFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
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

  lessonActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 6,
  },

  markCompleteBtn: {
    marginTop: 6,
    backgroundColor: ACCENT_ORANGE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  markCompleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  completedBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#EAF8F1",
  },

  completedBadgeText: {
    color: "#0E7A5B",
    fontWeight: "700",
    fontSize: 12,
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
