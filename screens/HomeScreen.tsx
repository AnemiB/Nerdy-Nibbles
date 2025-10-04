// screens/HomeScreen.tsx
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const CARD_BG = "#F3F9FF";

const recentActivities = [
  { id: "1", label: "Completed: Reading labels", time: "2d ago" },
  { id: "2", label: "Attempted quiz: Serving sizes", time: "5d ago" },
  { id: "3", label: "Asked tutor: Hidden sugars", time: "1w ago" },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();

  // placeholders for actions until you add real screens
  const todoAlert = (name: string) =>
    Alert.alert("Not implemented", `${name} screen not implemented yet.`);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hi — Welcome to your lessons</Text>
          <Text style={styles.subGreeting}>Keep learning — you’re doing great</Text>
        </View>

        <TouchableOpacity
          style={styles.profilePill}
          onPress={() => todoAlert("Profile")}
        >
          <Text style={styles.profileInitial}>C</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressLeft}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPct}>68%</Text>
          </View>
        </View>

        <View style={styles.progressRight}>
          <Text style={styles.progressTitle}>Course progress</Text>
          <Text style={styles.progressDesc}>
            You’re on lesson 4 of 12 — keep the momentum!
          </Text>

          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => todoAlert("Continue last lesson")}
          >
            <Text style={styles.smallBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity
          style={[styles.quickBtn, { marginRight: 10 }]}
          onPress={() => todoAlert("Library")}
        >
          <Text style={styles.quickBtnTitle}>Explore library</Text>
          <Text style={styles.quickBtnLabel}>Browse all lessons</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: "#FFF6F0" }]}
          onPress={() => todoAlert("Ask AI Tutor")}
        >
          <Text style={[styles.quickBtnTitle, { color: BRAND_BLUE }]}>
            Ask AI Tutor
          </Text>
          <Text style={[styles.quickBtnLabel, { color: BRAND_BLUE }]}>
            Quick question
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <TouchableOpacity onPress={() => todoAlert("Activity feed")}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={recentActivities}
        keyExtractor={(i) => i.id}
        style={{ width: "100%" }}
        contentContainerStyle={{ paddingBottom: 48 }}
        renderItem={({ item }) => (
          <View style={styles.activityRow}>
            <View style={styles.activityDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activityLabel}>{item.label}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
            <TouchableOpacity
              style={styles.activityAction}
              onPress={() => todoAlert("Review activity")}
            >
              <Text style={styles.activityActionText}>Open</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  greeting: { fontSize: 22, fontWeight: "700", color: BRAND_BLUE },
  subGreeting: { color: "#2E6B8A", marginTop: 4 },

  profilePill: {
    backgroundColor: CARD_BG,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: { color: BRAND_BLUE, fontWeight: "700" },

  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  progressLeft: { marginRight: 14 },
  progressCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "#E6F3FF",
  },
  progressPct: { fontSize: 16, fontWeight: "800", color: BRAND_BLUE },
  progressRight: { flex: 1 },
  progressTitle: { color: BRAND_BLUE, fontWeight: "700", fontSize: 15 },
  progressDesc: { marginTop: 6, color: "#2E6B8A" },
  smallBtn: {
    marginTop: 10,
    width: 120,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: { color: "#fff", fontWeight: "700" },

  quickRow: {
    flexDirection: "row",
    marginBottom: 18,
    justifyContent: "space-between",
  },
  quickBtn: {
    flex: 1,
    backgroundColor: "#FFF8F5",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
  },
  quickBtnTitle: { fontWeight: "700", color: ACCENT_ORANGE, marginBottom: 4 },
  quickBtnLabel: { color: "#7B98A8", fontSize: 12 },

  sectionHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { fontWeight: "700", color: BRAND_BLUE },
  viewAll: { color: "#7B98A8", fontWeight: "600" },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F6FB",
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT_ORANGE,
    marginRight: 12,
  },
  activityLabel: { fontWeight: "600", color: "#0E4A66" },
  activityTime: { color: "#7B98A8", marginTop: 4, fontSize: 12 },
  activityAction: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  activityActionText: { color: BRAND_BLUE, fontWeight: "700" },
});
