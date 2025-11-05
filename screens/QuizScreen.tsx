import React, { useState, useEffect } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions, Alert, ActivityIndicator, } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RootStackParamList, QuizQuestion } from "../types";
import { lessonsData } from "./LessonsScreen";
import { auth } from "../firebase";
import { updateLessonsProgress, addRecentActivity } from "../services/userService";
import { callChatAPI } from "../services/aiService";

import QuizResultsModal from "../components/QuizResultsModal";

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
  const { lessonId, title, subtitle, quiz } = (route.params ?? ({} as any)) as {
    lessonId?: any;
    title?: any;
    subtitle?: any;
    quiz?: any;
  };

  const hasValidQuiz =
    Array.isArray(quiz) &&
    quiz.length > 0 &&
    typeof quiz[0]?.question === "string" &&
    Array.isArray(quiz[0]?.options) &&
    quiz[0].options.length >= 2 &&
    typeof quiz[0].correctIndex === "number";

  const defaultQuestions: QuizQuestion[] = [
    {
      id: "q1",
      question: "What is the main nutritional role of natural sugars in whole fruit?",
      options: [
        "They act as preservatives",
        "They provide instant energy and are packaged with fibre and nutrients",
        "They are harmful and should always be avoided",
        "They are the same as added table sugar",
      ],
      correctIndex: 1,
    },
    {
      id: "q2",
      question: "Which component of whole fruit slows digestion and sugar absorption?",
      options: ["Fibre", "Fruit juice", "Added sweeteners", "Fruit colour"],
      correctIndex: 0,
    },
    {
      id: "q3",
      question: "Which swap helps reduce intake of added sugars when choosing snacks?",
      options: [
        "Replace whole fruit with soda",
        "Choose whole fruit instead of sweetened yogurt",
        "Buy canned in syrup fruit",
        "Drink concentrated fruit syrup",
      ],
      correctIndex: 1,
    },
  ];

  const suppliedQuestions = hasValidQuiz ? (quiz as QuizQuestion[]).slice(0, 3) : [];
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    hasValidQuiz ? suppliedQuestions : defaultQuestions
  );

  const [index, setIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, number | null>>({});
  const [resultsVisible, setResultsVisible] = useState(false);
  const [score, setScore] = useState(0);
  const [percent, setPercent] = useState(0);
  const [lessonsCompletedCount, setLessonsCompletedCount] = useState<number | null>(null);
  const [savingResult, setSavingResult] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const current = questions[index];

  useEffect(() => {
    let mounted = true;
    async function generateQuestionsFromAI() {
      if (hasValidQuiz) return;
      setGenerating(true);
      setGenerationError(null);

      const lessonHint = String(subtitle ?? title ?? `Lesson ${lessonId ?? ""}`).trim();

      const prompt = `
You are a helpful assistant that generates short multiple-choice quizzes for a lesson.

Produce a JSON array of exactly 3 objects. Each object must have:
- "question": a single-sentence question relevant to the lesson titled "${lessonHint}"
- "options": an array of 4 short answer choices (strings)
- "correctIndex": a number 0..3 indicating which option is correct

Return ONLY valid JSON (no extra explanation). Example item:
{"question":"...","options":["A","B","C","D"],"correctIndex":1}
`;

      try {
        const raw = await callChatAPI(prompt, 45000);

        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          const first = raw.indexOf("[");
          const last = raw.lastIndexOf("]");
          if (first !== -1 && last !== -1 && last > first) {
            try {
              parsed = JSON.parse(raw.slice(first, last + 1));
            } catch {
              parsed = null;
            }
          }
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("AI returned invalid JSON");
        }

        const candidate = parsed
          .map((it: any, i: number) => {
            if (!it || typeof it.question !== "string" || !Array.isArray(it.options)) return null;
            const opts = it.options.slice(0, 4).map(String).map((s: string) => s.trim());
            while (opts.length < 4) opts.push("None of the above");
            const cIdx = typeof it.correctIndex === "number" ? it.correctIndex : 0;
            return {
              id: `ai-${i}`,
              question: it.question.trim(),
              options: opts,
              correctIndex: Math.max(0, Math.min(3, cIdx)),
            } as QuizQuestion | null;
          })
          .filter((it): it is QuizQuestion => it !== null);

        if (candidate.length < 1) throw new Error("Parsed AI output invalid shape");

        if (mounted) {
          setQuestions(candidate.slice(0, 3));
        }
      } catch (err: any) {
        console.warn("AI quiz generation failed:", err);
        if (mounted) {
          setGenerationError(String(err?.message ?? err));
        }
      } finally {
        if (mounted) setGenerating(false);
      }
    }

    if (!hasValidQuiz) {
      generateQuestionsFromAI();
    }

    return () => {
      mounted = false;
    };
  }, []);

  function onSelectMCOption(i: number) {
    const key = current.id ?? current.question;
    setAnswersMap((prev) => ({ ...prev, [key]: i }));
  }

  function goNext() {
    if (index < questions.length - 1) setIndex(index + 1);
    else finishQuiz();
  }

  function goPrev() {
    if (index > 0) setIndex(index - 1);
  }

  function computeScore(): { correctCount: number; pct: number } {
    let correctCount = 0;
    questions.forEach((q) => {
      const key = q.id ?? q.question;
      const selectedIndex = answersMap[key];
      if (typeof selectedIndex === "number" && selectedIndex === q.correctIndex) {
        correctCount++;
      }
    });
    const pct = Math.round((correctCount / questions.length) * 100);
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
        subtitle: `Score ${correctCount}/${questions.length} (${pct}%)`,
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
  const selectedForCurrent =
    typeof answersMap[keyForCurrent] === "number" ? (answersMap[keyForCurrent] as number) : null;

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

        {generating ? (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12, color: "#123E51" }}>Generating quiz questions...</Text>
            {generationError ? <Text style={{ color: "red", marginTop: 8 }}>{generationError}</Text> : null}
          </View>
        ) : (
          <>
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
              <Text style={styles.nextBtnText}>{index < questions.length - 1 ? "Next Question" : "Finish"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.prevBtn]} onPress={goPrev} accessibilityLabel="Previous question">
              <Text style={styles.prevBtnText}>Previous Question</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <QuizResultsModal
        visible={resultsVisible}
        onClose={closeResults}
        onViewProgress={goToProgress}
        onBackToLessons={goToLessons}
        score={score}
        total={questions.length}
        percent={percent}
        lessonsCompletedCount={lessonsCompletedCount === null ? lessonsData.filter((l) => l.done).length : lessonsCompletedCount}
        loading={savingResult} correctCount={0} />

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")} accessibilityLabel="Home">
          <Image source={assets.Home} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("NibbleAi")}
          accessibilityLabel="Nibble AI"
        >
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
