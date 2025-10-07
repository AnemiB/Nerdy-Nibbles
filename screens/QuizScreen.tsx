import React, { useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions, Modal, Alert, ActivityIndicator, } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { lessonsData } from "./LessonsScreen";
import { auth } from "../firebase";
import { updateLessonsProgress, addRecentActivity } from "../services/userService";

type QuizNavProp = NativeStackNavigationProp<RootStackParamList, "Quiz">;
type QuizRouteProp = RouteProp<RootStackParamList, "Quiz">;

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";
const OPTION_BG = "#E8F7FF";

const assets = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
};

type MCQuestion = {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
};

export default function QuizScreen() {
  const navigation = useNavigation<QuizNavProp>();
  const route = useRoute<QuizRouteProp>();
  const { lessonId, title, subtitle, quiz } = (route.params ?? ({} as any)) as {
    lessonId?: any;
    title?: any;
    subtitle?: any;
    quiz?: any;
  };

  // Determine if quiz param contains MC structure (options+correctIndex)
  const isGeneratedMC =
    Array.isArray(quiz) &&
    quiz.length > 0 &&
    typeof quiz[0]?.question === "string" &&
    Array.isArray(quiz[0]?.options) &&
    quiz[0].options.length === 4 &&
    typeof quiz[0].correctIndex === "number";

  // Default MC questions (fallback)
  const defaultQuestions: MCQuestion[] = [
    {
      id: "q1",
      question: "What is the main purpose of natural sugars in fruits?",
      options: ["To taste good", "The natural forms of sugars", "To help with glucose levels", "There are no natural sugars in fruit"],
      correctIndex: 2,
    },
    {
      id: "q2",
      question: "Which part of the fruit slows sugar absorption?",
      options: ["Juice", "Fibre", "Skin only", "Seed"],
      correctIndex: 1,
    },
    {
      id: "q3",
      question: "Which is a practical swap to reduce added sugars?",
      options: ["Drink more soda", "Choose whole fruit", "Buy concentrated juice", "Add honey to cereal"],
      correctIndex: 1,
    },
  ];

  const generatedQuestions = isGeneratedMC ? (quiz as MCQuestion[]).slice(0, 3) : [];
  const mcQuestions = isGeneratedMC ? generatedQuestions : defaultQuestions;

  const [index, setIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, number | null>>({});
  const [resultsVisible, setResultsVisible] = useState(false);
  const [score, setScore] = useState(0);
  const [percent, setPercent] = useState(0);
  const [lessonsCompletedCount, setLessonsCompletedCount] = useState<number | null>(null);
  const [savingResult, setSavingResult] = useState(false);

  const current = mcQuestions[index];

  function onSelectMCOption(i: number) {
    const key = current.id ?? current.question;
    setAnswersMap((prev) => ({ ...prev, [key]: i }));
  }

  function goNext() {
    if (index < mcQuestions.length - 1) setIndex(index + 1);
    else finishQuiz();
  }

  function goPrev() {
    if (index > 0) setIndex(index - 1);
  }

  function computeScore(): { correctCount: number; pct: number } {
    let correctCount = 0;
    mcQuestions.forEach((q) => {
      const key = q.id ?? q.question;
      const selectedIndex = answersMap[key];
      if (typeof selectedIndex === "number" && selectedIndex === q.correctIndex) {
        correctCount++;
      }
    });
    const pct = Math.round((correctCount / mcQuestions.length) * 100);
    return { correctCount, pct };
  }

  function markLessonDoneLocal() {
    if (!lessonId) return;
    const found = lessonsData.find((l) => l.id === String(lessonId));
    if (found) found.done = true;
    const completed = lessonsData.filter((l) => l.done).length;
    setLessonsCompletedCount(completed);
  }

  async function finishQuiz() {
    const { correctCount, pct } = computeScore();
    setScore(correctCount);
    setPercent(pct);

    markLessonDoneLocal();

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Sign in to save quiz results and progress.");
      setResultsVisible(true);
      return;
    }

    const lessonNum = Number(lessonId);
    if (Number.isNaN(lessonNum)) {
      setResultsVisible(true);
      return;
    }

    try {
      setSavingResult(true);
      await updateLessonsProgress(user.uid, { lessonsCompleted: lessonNum });

      await addRecentActivity(user.uid, {
        title: `Quiz: ${String(subtitle ?? title ?? `Lesson ${lessonNum}`)}`,
        subtitle: `Score ${correctCount}/${mcQuestions.length} (${pct}%)`,
        done: pct >= 70,
      });
    } catch (err) {
      console.warn("Failed to save quiz results:", err);
    } finally {
      setSavingResult(false);
      setResultsVisible(true);
    }
  }

  function closeResults() {
    setResultsVisible(false);
  }

  function goToLessons() {
    setResultsVisible(false);
    navigation.navigate("Lessons");
  }

  function goToProgress() {
    setResultsVisible(false);
    navigation.navigate("Progress");
  }

  const keyForCurrent = current.id ?? current.question;
  const selectedForCurrent = typeof answersMap[keyForCurrent] === "number" ? (answersMap[keyForCurrent] as number) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: "100%", alignItems: "center" }}>
        <Text style={styles.headerText}>Lesson {lessonId ?? "1"} Quiz</Text>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.lessonTitle}>{subtitle ?? title ?? "Lesson"}</Text>
        <View style={styles.titleUnderline} />
      </View>

      <View style={styles.body}>
        <Text style={styles.questionCount}>
          Question {index + 1} of {mcQuestions.length}:
        </Text>

        <Text style={styles.questionText}>{current?.question}</Text>

        <FlatList
          data={current?.options}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index: optIndex }) => {
            const isSelected = selectedForCurrent === optIndex;
            const letter = String.fromCharCode(65 + optIndex);
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSelectMCOption(optIndex)}
                style={[styles.optionButton, isSelected ? styles.optionButtonSelected : null]}
              >
                <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                  <Text style={{ fontWeight: "700", marginRight: 8 }}>{`${letter}. `}</Text>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingVertical: 8 }}
        />

        <View style={{ height: 12 }} />

        <TouchableOpacity style={[styles.nextBtn]} onPress={goNext} accessibilityLabel="Next question">
          <Text style={styles.nextBtnText}>{index < mcQuestions.length - 1 ? "Next Question" : "Finish"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.prevBtn]} onPress={goPrev} accessibilityLabel="Previous question">
          <Text style={styles.prevBtnText}>Previous Question</Text>
        </TouchableOpacity>
      </View>

      {/* Results modal */}
      <Modal visible={resultsVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>Quiz Results</Text>

            <View style={{ alignItems: "center", marginTop: 8 }}>
              <View style={modalStyles.scoreCircle}>
                <Text style={modalStyles.scoreNumber}>
                  {score}/{mcQuestions.length}
                </Text>
                <Text style={modalStyles.scorePercent}>{percent}%</Text>
              </View>
            </View>

            <Text style={modalStyles.subText}>{percent >= 70 ? "Great job — keep going!" : "Nice try — review the lesson and try again."}</Text>

            <Text style={modalStyles.lessonsText}>
              Lessons completed: {lessonsCompletedCount === null ? lessonsData.filter((l) => l.done).length : lessonsCompletedCount}
            </Text>

            <TouchableOpacity style={[styles.nextBtn, { marginTop: 12 }]} onPress={goToProgress}>
              <Text style={styles.nextBtnText}>View Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.prevBtn, { marginTop: 10 }]} onPress={goToLessons}>
              <Text style={styles.prevBtnText}>Back to Lessons</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 10 }} onPress={closeResults}>
              <Text style={{ color: BRAND_BLUE, fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "86%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  scoreCircle: {
    marginTop: 8,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderColor: LIGHT_CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  scorePercent: {
    fontSize: 14,
    color: "#0E4A66",
    marginTop: 4,
  },
  subText: {
    marginTop: 12,
    color: "#123E51",
    textAlign: "center",
  },
  lessonsText: {
    marginTop: 12,
    color: "#0E4A66",
    fontWeight: "600",
  },
});

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

  titleRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },

  lessonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginBottom: 8,
  },

  titleUnderline: {
    width: 140,
    height: 2,
    backgroundColor: BRAND_BLUE,
  },

  body: {
    flex: 1,
  },

  questionCount: {
    fontSize: 13,
    color: "#0E4A66",
    marginBottom: 8,
  },

  questionText: {
    fontSize: 16,
    color: "#123E51",
    marginBottom: 16,
    lineHeight: 22,
  },

  optionButton: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 12,
    justifyContent: "center",
  },

  optionButtonSelected: {
    backgroundColor: OPTION_BG,
    borderWidth: 1.5,
    borderColor: BRAND_BLUE,
  },

  optionText: {
    fontSize: 14,
    color: "#0E4A66",
  },

  optionTextSelected: {
    color: "#08324A",
    fontWeight: "700",
  },

  nextBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 10,
  },

  nextBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  prevBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: BRAND_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },

  prevBtnText: {
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

  headerTextSmall: {
    fontSize: 12,
    color: "#ffffffff",
  },
});
