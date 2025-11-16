import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ImageSourcePropType, Dimensions, ActivityIndicator, ScrollView, } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { auth } from "../firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { HomeNavProp } from "../types";
import OnboardingModal from "../components/OnboardingModal";
import { callChatAPI } from "../services/aiService";

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
  PlaneArrow: require("../assets/PlaneArrow.png"),
  Check: require("../assets/Check.png"),
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const [userName, setUserName] = useState<string>("User");
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [totalLessons, setTotalLessons] = useState(8);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const unsubAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setCurrentUid(user ? user.uid : null);
      if (!user) {
        if (mountedRef.current) {
          setLoading(false);
          setUserName("User");
          setRecentActivities([]);
          setLessonsCompleted(0);
          setTotalLessons(8);
        }
        return;
      }

      try {
        if (mountedRef.current) setLoading(true);

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          if (data.name) setUserName(data.name);
          if (typeof data.lessonsCompleted === "number") setLessonsCompleted(data.lessonsCompleted);
          if (typeof data.totalLessons === "number") setTotalLessons(Math.max(data.totalLessons, 8));
        } else {
          setUserName(user.displayName || "User");
          setLessonsCompleted(0);
          setTotalLessons(8);
        }

        const activityQuery = query(
          collection(db, "users", user.uid, "activities"),
          orderBy("timestamp", "desc"),
          limit(5)
        );
        const snapshot = await getDocs(activityQuery);
        const items = snapshot.docs.map((d) => {
          const raw = d.data() as any;
          const ts = raw.timestamp;
          const time = ts && typeof ts.toDate === "function" ? ts.toDate() : raw.timestamp;
          return {
            id: d.id,
            title: raw.title || "",
            subtitle: raw.subtitle || "",
            done: Boolean(raw.done),
            timestamp: time,
          };
        });
        if (mountedRef.current) setRecentActivities(items);
      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubAuth();
    };
  }, []);

  const progressPct = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
  const normalizedPct = Math.min(Math.max(progressPct, 0), 100);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={ACCENT_ORANGE} />
      </SafeAreaView>
    );
  }

  function handleActivityPress(item: any) {
    const subtitle = String(item.subtitle || "");
    const m = subtitle.match(/Lesson\s*#?\s*(\d+)/i);
    if (m && m[1]) {
      const id = m[1];
      navigation.navigate("LessonDetail", { id: String(id), title: `Lesson ${id}`, subtitle: `Lesson ${id}` } as any);
    } else {
      navigation.navigate("Lessons");
    }
  }

  // navigate to NibbleAi with provided prompt (prefill + optional auto-send)
  function navigateNibbleWith(prompt: string, autoSend = true) {
    navigation.navigate("NibbleAi" as any, { initialMessage: String(prompt), autoSend: Boolean(autoSend) } as any);
  }
  const tutorPrompt = "Explain more about why natural sugars in food are important.";

  // Generate a single common food-education question using the AI, then navigate to NibbleAi
  async function generateAndSendQuestion(autoSend = true) {
    if (generatingQuestion) return; // avoid double taps
    setGeneratingQuestion(true);

    // Prompt for the AI: ask for a single natural question (one sentence) suitable for learners
    const aiPrompt = `You are an assistant that creates learner-focused questions about food and nutrition.
Reply with exactly one concise, natural-sounding question (one sentence) someone learning about food might ask.
Return only the question text, no explanation. Examples: "What are natural sugars and are they healthier than added sugars?"`;

    try {
      // callChatAPI may accept a timeout param; we pass 20s (if supported)
      const raw = await callChatAPI(aiPrompt, 20000);
      let question = String(raw ?? "").trim();

      // clean up: take the first non-empty line, strip numbering/quotes
      question = question
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 0) || "";

      question = question.replace(/^["']|["']$/g, "").replace(/^\d+\.\s*/, "").trim();

      if (!question) throw new Error("Empty question returned");

      navigateNibbleWith(question, autoSend);
    } catch (err) {
      console.warn("Failed to generate question; falling back to default prompt:", err);
      navigateNibbleWith(tutorPrompt, autoSend);
    } finally {
      setGeneratingQuestion(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingModal
        userName={userName}
        userUid={currentUid}
        visible={showOnboarding ? true : undefined}
        onClose={() => setShowOnboarding(false)}
        score={0}
        total={0}
        percent={0}
        lessonsCompletedCount={0}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ width: "100%", alignItems: "center", marginTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.hello}>Hello, {userName || "User"}!</Text>

          <TouchableOpacity
            onPress={() => setShowOnboarding(true)}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
            activeOpacity={0.8}
            accessibilityLabel="Show tips"
          >
            <Text style={{ color: BRAND_BLUE, fontWeight: "700" }}>Show tips</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View style={styles.progressPill}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressCount}>
              {lessonsCompleted}/{totalLessons}
            </Text>
            <Text style={styles.progressLabel}>Lessons Completed</Text>
          </View>

          <View style={[styles.progressTrack, { flexDirection: "row" }]}>
            <View style={[styles.progressFill, { flex: normalizedPct }]} />
            <View style={{ flex: 100 - normalizedPct, backgroundColor: "transparent" }} />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Recent Activity</Text>

          {recentActivities.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#00000080" }}>No recent activity yet</Text>
          ) : (
            <View style={styles.activityCard}>
              <FlatList
                data={recentActivities}
                keyExtractor={(i) => i.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity activeOpacity={0.85} onPress={() => handleActivityPress(item)}>
                    <View style={styles.activityItem}>
                      <View style={styles.activityText}>
                        <Text style={styles.activityTitle}>{item.title}</Text>
                        <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                        {item.timestamp && (
                          <Text style={{ fontSize: 11, color: "#2E6B8A", marginTop: 6 }}>
                            {new Date(item.timestamp).toLocaleString()}
                          </Text>
                        )}
                      </View>
                      {item.done && (
                        <View style={styles.checkWrap}>
                          <Image source={assets.Check} style={styles.iconCheck} resizeMode="contain" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        <View style={[styles.sectionContainer, { marginTop: 8 }]}>
          <Text style={styles.sectionHeading}>Q&A Assistance</Text>

          {/* tutorCard: tapping either the text or the send button will ask the AI to generate a common question,
              then open the Nibble AI screen with that generated question prefilled (and auto-sent).
          */}
          <View style={styles.tutorCard}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => generateAndSendQuestion(true)}
              activeOpacity={0.85}
              disabled={generatingQuestion}
            >
              <Text style={styles.tutorText}>
                {generatingQuestion ? "Generating a helpful question..." : "Tap to get a common food-education question generated for you"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tutorSend}
              onPress={() => generateAndSendQuestion(true)}
              accessibilityLabel="Ask Nibble AI"
              disabled={generatingQuestion}
            >
              {generatingQuestion ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Image source={assets.PlaneArrow} style={styles.iconPlane} resizeMode="contain" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("Lessons")}>
            <Text style={styles.primaryBtnText}>New Lesson</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate("NibbleAi")}>
            <Image source={assets.NibbleAi} style={styles.nibbleIcon} resizeMode="contain" />
            <Text style={styles.secondaryBtnText}>Review with Nibble AI</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")}>
          <Image source={assets.Home} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("NibbleAi")}>
          <Image source={assets.NibbleAi} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Lessons")}>
          <Image source={assets.Lessons} style={styles.iconBottom} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Settings")}>
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
    paddingBottom: 0,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  hello: {
    fontSize: 20,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginBottom: 12,
  },
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
  },
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
