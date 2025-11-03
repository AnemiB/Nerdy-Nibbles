import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ImageSourcePropType, Alert, ActivityIndicator,} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { auth } from "../firebase";
import { getUserProfileOnce, addRecentActivity, generateLessonContentForUser, markLessonComplete as markLessonCompleteService, } from "../services/userService";
import type { LessonDetailNavProp } from "../types";
import type { LessonDetailRouteProp } from "../types";

import { LESSONS_BACKUP } from "../components/LessonBackups";

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

function safeText(value: any) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    try {
      return JSON.stringify(value);
    } catch {
      return "[unrenderable]";
    }
  }
}

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

  const [regenerating, setRegenerating] = useState(false);

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

  const { id, title, subtitle, generatedContent } = route.params as {
    id?: any;
    title?: any;
    subtitle?: any;
    generatedContent?: any;
  };

  const lessonId = id == null ? "" : String(id);
  const lessonLabel = safeText(title ?? subtitle ?? `Lesson ${lessonId}`);

  const curatedLesson = LESSONS_BACKUP[lessonId] ?? null;

  const [contentSource, setContentSource] = useState<"ai" | "none">("none");
  const [aiContent, setAiContent] = useState<any | null>(generatedContent ?? null);

  useEffect(() => {
    // If aiContent is stringified JSON, try to parse it automatically
    if (aiContent && typeof aiContent === "string") {
      try {
        const parsed = JSON.parse(aiContent);
        setAiContent(parsed);
        return;
      } catch {
        // Not JSON — continue to validation below
      }
    }

    // Validate AI output shape
    if (!aiContent) {
      setContentSource("none");
      return;
    }
    const ok =
      typeof aiContent === "object" &&
      aiContent !== null &&
      ("overview" in aiContent) &&
      Array.isArray(aiContent.quiz);
    if (ok) {
      setContentSource("ai");
    } else {
      console.warn("LessonDetail: AI content missing expected keys. Using curated content.");
      setContentSource("none");
    }
  }, [aiContent]);

  useEffect(() => {
    if (aiContent !== null) {
      try {
        console.debug("LessonDetail: aiContent preview:", JSON.stringify(aiContent).slice(0, 2000));
      } catch {
        console.debug("LessonDetail: aiContent (non-serializable)");
      }
    }
  }, [aiContent]);

  // Determine completion from profile
  useEffect(() => {
    let mounted = true;
    const checkCompleted = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const profile = await getUserProfileOnce(user.uid);
        if (!mounted) return;
        const completedArr = Array.isArray((profile as any)?.completedLessons) ? (profile as any).completedLessons : [];
        const isDone = completedArr.map(String).includes(lessonId);
        setAlreadyCompleted(Boolean(isDone));
      } catch (err) {
        console.warn("checkCompleted failed:", err);
      }
    };
    checkCompleted();
    return () => {
      mounted = false;
    };
  }, [lessonId]);

  // Navigate to Quiz
  const startQuiz = () => {
    const contentToUse = contentSource === "ai" && aiContent ? aiContent : curatedLesson ?? createGenericContent(lessonId, lessonLabel);

    const quiz = Array.isArray(contentToUse.quiz) && contentToUse.quiz.length > 0 ? contentToUse.quiz : createGenericContent(lessonId, lessonLabel).quiz;

    navigation.navigate("Quiz", {
      lessonId,
      title: lessonLabel,
      subtitle: safeText(contentToUse.title ?? lessonLabel),
      quiz,
    } as any);
  };

  // Mark lesson complete
  const handleMarkComplete = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in to mark lessons complete.");
      return;
    }
    const lessonNum = Number(lessonId);
    if (Number.isNaN(lessonNum) || lessonNum <= 0) {
      Alert.alert("Invalid lesson", "Cannot mark this lesson as complete.");
      return;
    }
    if (alreadyCompleted) {
      Alert.alert("Already completed", "You have already completed this lesson.");
      return;
    }

    try {
      setMarking(true);
      await markLessonCompleteService(user.uid, lessonId);
      await addRecentActivity(user.uid, {
        title: `Completed ${lessonLabel}`,
        subtitle: `Lesson ${lessonNum} completed`,
        done: true,
      });
      setAlreadyCompleted(true);
      Alert.alert("Nice!", "Lesson marked as complete.");
    } catch (err) {
      console.warn("handleMarkComplete failed:", err);
      Alert.alert("Error", "Could not mark lesson complete. Try again.");
    } finally {
      setMarking(false);
    }
  };

  const regenerateFromAI = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to refresh lessons.");
      return;
    }
    setRegenerating(true);
    try {
      const res = await generateLessonContentForUser(user.uid, lessonId, { title: lessonLabel, subtitle: lessonLabel });
      if (res && res.content) {
        setAiContent(res.content);
        setContentSource("ai");
      } else {
        throw new Error("No content returned");
      }
    } catch (err: any) {
      console.warn("Regenerate failed:", err);
      Alert.alert("Could not refresh", "We couldn't refresh the lesson right now. Showing the available lesson content.");
      setContentSource("none");
    } finally {
      setRegenerating(false);
    }
  };

  const displayedContent = useMemo(() => {
    if (contentSource === "ai" && aiContent) {
      return aiContent;
    }
    return curatedLesson ?? createGenericContent(lessonId, lessonLabel);
  }, [contentSource, aiContent, curatedLesson, lessonId, lessonLabel]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {`Lesson ${lessonId}`}
        </Text>

        <View style={{ width: 56 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.titleRow}>
          <Text style={styles.lessonTitleLarge}>{safeText(displayedContent.title ?? lessonLabel)}</Text>
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>{safeText(displayedContent.shortLabel ?? "Lesson")}</Text>
          </View>
        </View>

        {/* Card with overview and sections */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.paragraph}>{safeText(displayedContent.overview)}</Text>

          {Array.isArray(displayedContent.sections) &&
            displayedContent.sections.map((s: any, idx: number) => (
              <View key={`sec-${idx}`} style={{ marginTop: idx === 0 ? 8 : 12 }}>
                <Text style={styles.sectionTitle}>{safeText(s.heading)}</Text>
                <Text style={styles.paragraph}>{safeText(s.body)}</Text>
              </View>
            ))}

          {Array.isArray(displayedContent.notes) && displayedContent.notes.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Notes</Text>
              {displayedContent.notes.map((n: any, i: number) => (
                <Text key={`note-${i}`} style={styles.paragraph}>
                  • {safeText(n)}
                </Text>
              ))}
            </>
          )}
        </View>

        <View style={{ height: 12 }} />

        <TouchableOpacity style={styles.quizBtn} onPress={startQuiz} accessibilityLabel="Start quiz">
          <Text style={styles.quizBtnText}>Start Quiz</Text>
        </TouchableOpacity>

        <View style={{ height: 10 }} />

        <TouchableOpacity
          style={[styles.quizBtn, alreadyCompleted ? styles.completedBtn : null]}
          onPress={handleMarkComplete}
          disabled={marking || alreadyCompleted}
        >
          {marking ? <ActivityIndicator color="#fff" /> : <Text style={styles.quizBtnText}>{alreadyCompleted ? "Completed" : "Mark complete"}</Text>}
        </TouchableOpacity>

        <View style={{ height: 8 }} />

        <View style={styles.secondaryRow}>
          <View style={{ flex: 1, marginRight: 8 }} />
          <View style={{ flex: 1 }} />
        </View>

        <View style={{ height: 8 }} />

        <TouchableOpacity
          style={[styles.regenBtn, regenerating ? { opacity: 0.8 } : null]}
          onPress={regenerateFromAI}
          disabled={regenerating}
        >
          {regenerating ? <ActivityIndicator color={BRAND_BLUE} /> : <Text style={styles.regenText}>Refresh lesson</Text>}
        </TouchableOpacity>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom nav */}
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

function createGenericContent(id: string, title: string) {
  return {
    title: title || `Lesson ${id}`,
    overview: "Core lesson content,concise, clear, and mobile-friendly.",
    sections: [{ heading: "Key ideas", body: "This lesson gives reliable, general learning points when custom content isn't ready." }],
    quiz: [
      { question: "What is this lesson type?", options: ["Core lesson", "Random text", "Nothing", "Error"], correctIndex: 0 },
      { question: "Why include such content?", options: ["Ensure continuity", "Make things worse", "Crash the app", "Hide content"], correctIndex: 0 },
      { question: "What should it include?", options: ["Overview and quiz", "Only images", "Only links", "Empty page"], correctIndex: 0 },
    ],
    notes: ["Default curated lesson for continuity."],
    shortLabel: "Lesson",
  };
}

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

  titleRow: {
    width: "100%",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  lessonTitleLarge: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0E4A66",
    flex: 1,
  },

  statusWrap: {
    marginLeft: 12,
    backgroundColor: "#F1F8FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  statusText: { color: "#075985", fontWeight: "700" },

  card: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0E4A66",
    marginTop: 6,
    marginBottom: 6,
  },

  paragraph: {
    fontSize: 14,
    color: "#123E51",
    marginBottom: 8,
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

  completedBtn: {
    backgroundColor: "#8BC99D",
  },

  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  ghostBtn: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#F7FAFC",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  ghostBtnText: {
    color: BRAND_BLUE,
    fontWeight: "700",
  },

  regenBtn: {
    marginTop: 10,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E6F3FF",
    backgroundColor: "#fff",
  },
  regenText: {
    color: BRAND_BLUE,
    fontWeight: "800",
  },

  rawBox: {
    marginTop: 10,
    backgroundColor: "#F8F9FB",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F5",
  },
  rawText: {
    fontSize: 12,
    color: "#333",
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
