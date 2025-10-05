import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  ImageSourcePropType,
  Alert,
  ActivityIndicator,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { auth } from "../firebase";
import { updateLessonsProgress, addRecentActivity, getUserProfileOnce } from "../services/userService";

type LessonDetailNavProp = NativeStackNavigationProp<RootStackParamList, "LessonDetail">;
type LessonDetailRouteProp = RouteProp<RootStackParamList, "LessonDetail">;

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
};

export default function LessonDetailScreen() {
  const navigation = useNavigation<LessonDetailNavProp>();
  const route = useRoute<LessonDetailRouteProp>();
  const [marking, setMarking] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [loadingGenerated, setLoadingGenerated] = useState(false);

  // If route.params is missing, show a safe fallback
  if (!route?.params) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lesson</Text>
          <View style={{ width: 56 }} />
        </View>

        <View style={styles.contentEmpty}>
          <Text style={styles.emptyText}>No lesson selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Accept either standard params or generatedContent passed from LessonsScreen
  const {
    id,
    title,
    subtitle,
    generatedContent, // optional param passed by LessonsScreen
  } = route.params as { id?: any; title?: any; subtitle?: any; generatedContent?: any };

  const safeId = id == null ? "" : String(id);
  const safeTitleRaw = title ?? subtitle ?? "Untitled";

  const safeTitleDisplay =
    typeof safeTitleRaw === "string" || typeof safeTitleRaw === "number"
      ? String(safeTitleRaw)
      : JSON.stringify(safeTitleRaw);

  const lessonHeading = `Lesson ${safeId}`;

  // On mount check if this lesson is already completed (reads user profile once)
  useEffect(() => {
    let mounted = true;
    const checkCompleted = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const profile = await getUserProfileOnce(user.uid);
        if (!mounted) return;
        const completedCount = typeof profile?.lessonsCompleted === "number" ? profile!.lessonsCompleted! : 0;
        setAlreadyCompleted(Number(safeId) <= completedCount);
      } catch (err) {
        console.warn("checkCompleted failed:", err);
      }
    };
    checkCompleted();
    return () => {
      mounted = false;
    };
  }, [safeId]);

  // Helper to render generated content safely
  const renderGeneratedContent = (content: any) => {
    if (!content) return null;

    return (
      <>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.paragraph}>{content.overview}</Text>

        {Array.isArray(content.sections) &&
          content.sections.map((s: any, idx: number) => (
            <View key={idx}>
              <Text style={styles.sectionTitle}>{s.heading}</Text>
              <Text style={styles.paragraph}>{s.body}</Text>
            </View>
          ))}

        {Array.isArray(content.notes) && content.notes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Notes & Resources</Text>
            {content.notes.map((n: any, i: number) => (
              <Text key={i} style={styles.paragraph}>
                • {n}
              </Text>
            ))}
          </>
        )}
      </>
    );
  };

  // mark the lesson complete (updates Firestore and writes activity)
  const markLessonComplete = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in to mark lessons complete.");
      return;
    }
    const lessonNum = Number(safeId);
    if (Number.isNaN(lessonNum)) {
      Alert.alert("Error", "Invalid lesson id.");
      return;
    }
    if (lessonNum === 0) {
      Alert.alert("Error", "Invalid lesson id.");
      return;
    }

    if (alreadyCompleted) {
      Alert.alert("Already completed", "You have already completed this lesson.");
      return;
    }

    try {
      setMarking(true);

      // Read current profile to compute new completed count safely
      const profile = await getUserProfileOnce(user.uid);
      const currentCompleted = typeof profile?.lessonsCompleted === "number" ? profile!.lessonsCompleted! : 0;
      const newCompleted = Math.max(currentCompleted, lessonNum);

      // Write progress
      await updateLessonsProgress(user.uid, { lessonsCompleted: newCompleted });

      // Add activity record
      await addRecentActivity(user.uid, {
        title: `Completed ${safeTitleDisplay}`,
        subtitle: `Lesson ${lessonNum} completed from detail screen`,
        done: true,
      });

      setAlreadyCompleted(true);
      Alert.alert("Nice!", "Lesson marked as complete.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("Lessons"),
        },
      ]);
    } catch (err) {
      console.warn("markLessonComplete failed:", err);
      Alert.alert("Error", "Could not mark lesson complete. Try again.");
    } finally {
      setMarking(false);
    }
  };

  // Start quiz: pass generated quiz if present
  const startQuiz = () => {
    const quizFromGenerated = generatedContent?.quiz;
    navigation.navigate("Quiz", {
      lessonId: safeId,
      title: safeTitleDisplay,
      subtitle: safeTitleDisplay,
      quiz: quizFromGenerated ?? undefined,
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {lessonHeading}
        </Text>

        <View style={{ width: 56 }} /> {/* spacer so header stays centred */}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{generatedContent?.title ?? safeTitleDisplay}</Text>

          {/* If we have generated content, render it. Otherwise use the placeholder blocks */}
          {generatedContent ? (
            renderGeneratedContent(generatedContent)
          ) : (
            <>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.paragraph}>
                This area contains the lesson material. Replace this placeholder with the real content
                blocks you want to serve to learners. Short paragraphs, clear headings and frequent small
                breaks make mobile lessons easier to read.
              </Text>

              <Text style={styles.sectionTitle}>Key Points</Text>
              <Text style={styles.paragraph}>• A short, scannable bullet point.</Text>
              <Text style={styles.paragraph}>• Another important takeaway.</Text>

              <Text style={styles.sectionTitle}>Try this</Text>
              <Text style={styles.paragraph}>
                A quick example or small in-line activity. You can also include images or diagrams here if needed.
              </Text>
            </>
          )}
        </View>

        <View style={{ height: 18 }} />

        <TouchableOpacity
          style={[styles.quizBtn, generatedContent?.quiz ? null : { backgroundColor: "#FFB997" }]}
          onPress={startQuiz}
          accessibilityLabel="Start quiz"
        >
          <Text style={styles.quizBtnText}>{generatedContent?.quiz ? "Start Quiz" : "Start Quiz"}</Text>
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        <TouchableOpacity
          style={[styles.quizBtn, alreadyCompleted ? { backgroundColor: "#8BC99D" } : null]}
          onPress={markLessonComplete}
          accessibilityLabel="Mark lesson complete"
          disabled={marking || alreadyCompleted}
        >
          {marking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.quizBtnText}>{alreadyCompleted ? "Completed" : "Finish lesson (mark complete)"}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 120 }} /> {/* spacer so bottom nav doesn't overlap content */}
      </ScrollView>

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

/* styles - keep your original styles (copy/paste from your file) */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: height * 0.06,
    paddingBottom: height * 0.12,
  },

  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "space-between",
  },

  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  backText: {
    color: "#2E6B8A",
    fontSize: 14,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BRAND_BLUE,
    textAlign: "center",
    flex: 1,
  },

  content: {
    flex: 1,
    width: "100%",
  },

  contentInner: {
    paddingBottom: 20,
  },

  card: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 14,
    padding: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0E4A66",
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0E4A66",
    marginTop: 12,
    marginBottom: 6,
  },

  paragraph: {
    fontSize: 14,
    color: "#123E51",
    marginBottom: 10,
    lineHeight: 20,
  },

  quizBtn: {
    width: "100%",
    height: 56,
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  quizBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  contentEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    color: "#0E4A66",
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
