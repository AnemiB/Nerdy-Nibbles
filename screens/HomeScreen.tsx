import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ImageSourcePropType, Dimensions, ActivityIndicator, ScrollView,} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { auth } from "../firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { query, collection, orderBy, limit, getDocs } from "firebase/firestore";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;
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
  const [totalLessons, setTotalLessons] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const unsubAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (!user) {
        if (mountedRef.current) {
          setLoading(false);
          setUserName("User");
          setRecentActivities([]);
          setLessonsCompleted(0);
          setTotalLessons(0);
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
          if (typeof data.totalLessons === "number") setTotalLessons(data.totalLessons);
        } else {
          setUserName(user.displayName || "User");
          setLessonsCompleted(0);
          setTotalLessons(6);
        }

        const activityQuery = query(collection(db, "users", user.uid, "activities"), orderBy("timestamp", "desc"), limit(5));
        const snapshot = await getDocs(activityQuery);
        const items = snapshot.docs.map((d) => {
          const raw = d.data() as any;
          const ts = raw.timestamp;
          const time = ts && typeof ts.toDate === "function" ? ts.toDate() : raw.timestamp;
          return {
            id: d.id,
            title: raw.title || "",
            subtitle: raw.subtitle || "",
            done: raw.done || false,
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
  const progressBarWidth = `${Math.min(Math.max(progressPct, 0), 100)}%`;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={ACCENT_ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ScrollView wraps main content so everything scrolls above the bottom nav */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ width: "100%", alignItems: "center", marginTop: 8 }}>
          <Text style={styles.hello}>Hello, {userName || "User"}!</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressPill}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressCount}>
              {lessonsCompleted}/{totalLessons}
            </Text>
            <Text style={styles.progressLabel}>Lessons Completed</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill]} />
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
                )}
              />
            </View>
          )}
        </View>

        <View style={[styles.sectionContainer, { marginTop: 8 }]}>
          <Text style={styles.sectionHeading}>Q&A Assistance</Text>
          <View style={styles.tutorCard}>
            <Text style={styles.tutorText}>Explain more about why natural sugars in food are important.</Text>
            <TouchableOpacity style={styles.tutorSend} onPress={() => console.log("Tutor send tapped")}>
              <Image source={assets.PlaneArrow} style={styles.iconPlane} resizeMode="contain" />
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
  activityText: { flex: 1 },
  activityTitle: { color: "#0E4A66", fontWeight: "700", fontSize: 13 },
  activitySubtitle: { color: "#2E6B8A", marginTop: 4, fontSize: 13 },
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
  iconCheck: { width: 18, height: 18 },
  tutorCard: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tutorText: { flex: 1, color: "#0E4A66", fontSize: 14, marginRight: 12 },
  tutorSend: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlane: { width: 22, height: 22 },
  buttonGroup: { width: "100%", marginTop: 18, alignItems: "center" },
  primaryBtn: {
    width: "100%",
    height: 52,
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
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
  nibbleIcon: { width: 22, height: 22, marginRight: 10 },
  secondaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
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
  navItem: { alignItems: "center", justifyContent: "center", flex: 1 },
  iconBottom: { width: 26, height: 26 },
});
