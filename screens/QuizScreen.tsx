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
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RootStackParamList } from "../types";

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

  // Example question set (replace with your real questions)
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
    },
    {
      id: "q2",
      question: "Which part of the fruit slows sugar absorption?",
      options: ["A. Juice", "B. Fibre", "C. Skin only", "D. Seed"],
    },
    {
      id: "q3",
      question: "Which is a practical swap to reduce added sugars?",
      options: ["A. Drink more soda", "B. Choose whole fruit", "C. Buy concentrated juice", "D. Add honey to cereal"],
    },
    // Add more questions as needed
  ];

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const current = questions[index];

  function goNext() {
    setSelected(null);
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      // quiz finished — navigate back to Lessons (or show results screen)
      navigation.navigate("Lessons");
    }
  }

  function goPrev() {
    setSelected(null);
    if (index > 0) setIndex(index - 1);
  }

  function onSelectOption(i: number) {
    setSelected(i);
  }

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
        <Text style={styles.questionCount}>Question {index + 1} of {questions.length}:</Text>

        <Text style={styles.questionText}>{current.question}</Text>

        <FlatList
          data={current.options}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index: optIndex }) => {
            const isSelected = selected === optIndex;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSelectOption(optIndex)}
                style={[
                  styles.optionButton,
                  isSelected ? styles.optionButtonSelected : null,
                ]}
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

        <TouchableOpacity
          style={[styles.nextBtn]}
          onPress={goNext}
          accessibilityLabel="Next question"
        >
          <Text style={styles.nextBtnText}>{index < questions.length - 1 ? "Next Question" : "Finish"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.prevBtn]}
          onPress={goPrev}
          accessibilityLabel="Previous question"
        >
          <Text style={styles.prevBtnText}>Previous Question</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom navigation - matches HomeScreen style and route names */}
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
