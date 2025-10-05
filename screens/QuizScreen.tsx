// screens/QuizScreen.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Modal,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { lessonsData } from "./LessonsScreen"; // <-- assumes exported from LessonsScreen

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

export default function QuizScreen() {
  const navigation = useNavigation<QuizNavProp>();
  const route = useRoute<QuizRouteProp>();
  const { lessonId, title, subtitle } = route.params ?? ({} as any);

  // QUESTIONS: added correctAnswerIndex for scoring
  const questions = [
    {
      id: "q1",
      question: "What is the main purpose of natural sugars in fruits?",
      options: [
        "A. To taste good",
        "B. The natural forms of sugars",
        "C. To help with glucose levels",
        "D. There are no natural sugars in fruit",
      ],
      correctAnswerIndex: 2, // C
    },
    {
      id: "q2",
      question: "Which part of the fruit slows sugar absorption?",
      options: ["A. Juice", "B. Fibre", "C. Skin only", "D. Seed"],
      correctAnswerIndex: 1, // B
    },
    {
      id: "q3",
      question: "Which is a practical swap to reduce added sugars?",
      options: [
        "A. Drink more soda",
        "B. Choose whole fruit",
        "C. Buy concentrated juice",
        "D. Add honey to cereal",
      ],
      correctAnswerIndex: 1, // B
    },
    // Add more questions here (keep correctAnswerIndex included)
  ];

  const [index, setIndex] = useState(0);
  // answersMap keeps user choices across navigation: { [questionId]: selectedIndex }
  const [answersMap, setAnswersMap] = useState<Record<string, number>>({});
  const [resultsVisible, setResultsVisible] = useState(false);
  const [score, setScore] = useState(0);
  const [percent, setPercent] = useState(0);
  const [lessonsCompletedCount, setLessonsCompletedCount] = useState<number | null>(null);

  const current = questions[index];

  function onSelectOption(i: number) {
    setAnswersMap((prev) => ({ ...prev, [current.id]: i }));
  }

  function goNext() {
    // if no selection for current question, still allow moving on
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      finishQuiz();
    }
  }

  function goPrev() {
    if (index > 0) setIndex(index - 1);
  }

  function computeScore(): { correctCount: number; pct: number } {
    let correctCount = 0;
    questions.forEach((q) => {
      const selectedIndex = answersMap[q.id];
      if (typeof selectedIndex === "number" && selectedIndex === q.correctAnswerIndex) {
        correctCount++;
      }
    });
    const pct = Math.round((correctCount / questions.length) * 100);
    return { correctCount, pct };
  }

  function markLessonDone() {
    if (!lessonId) return;
    // mutate the shared lessonsData so other screens (Progress) reflect the change
    const found = lessonsData.find((l) => l.id === String(lessonId));
    if (found) found.done = true;
    // update completed count for UI
    const completed = lessonsData.filter((l) => l.done).length;
    setLessonsCompletedCount(completed);
  }

  function finishQuiz() {
    const { correctCount, pct } = computeScore();
    setScore(correctCount);
    setPercent(pct);

    // mark lesson completed in shared data
    markLessonDone();

    // show results modal
    setResultsVisible(true);
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

  // derive selected for this question (so selection persists when navigating)
  const selectedForCurrent = typeof answersMap[current.id] === "number" ? answersMap[current.id] : null;

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
          Question {index + 1} of {questions.length}:
        </Text>

        <Text style={styles.questionText}>{current.question}</Text>

        <FlatList
          data={current.options}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index: optIndex }) => {
            const isSelected = selectedForCurrent === optIndex;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSelectOption(optIndex)}
                style={[styles.optionButton, isSelected ? styles.optionButtonSelected : null]}
              >
                <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingVertical: 8 }}
        />

        <View style={{ height: 12 }} />

        <TouchableOpacity style={[styles.nextBtn]} onPress={goNext} accessibilityLabel="Next question">
          <Text style={styles.nextBtnText}>{index < questions.length - 1 ? "Next Question" : "Finish"}</Text>
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
                  {score}/{questions.length}
                </Text>
                <Text style={modalStyles.scorePercent}>{percent}%</Text>
              </View>
            </View>

            <Text style={modalStyles.subText}>
              {percent >= 70 ? "Great job — keep going!" : "Nice try — review the lesson and try again."}
            </Text>

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

      {/* Bottom navigation - matches HomeScreen style and route names */}
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
});
