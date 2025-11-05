import React, { useEffect, useRef, useState } from "react";
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions, Animated, } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Props } from "../types";

const { width } = Dimensions.get("window");
const STORAGE_KEY = "seenOnboarding_v1";

const slides = (name = "User") => [
  {
    key: "welcome",
    title: `Welcome, ${name}!`,
    text: "Learn at your own pace, track lessons, notes and progress.",
  },
  {
    key: "progress",
    title: "Track Progress",
    text: "Complete lessons and watch your progress fill up the tracker.",
  },
  {
    key: "support",
    title: "Get Help Fast",
    text: "Tap the Nibble AI button for quick explanations and practice.",
  },
];

export default function OnboardingModal({
  visible,
  onClose,
  userName,
  userUid,
}: Props) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [index, setIndex] = useState<number>(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (typeof visible === "boolean") {
        if (mounted) setIsVisible(visible);
        return;
      }
      if (userUid) {
        try {
          const userRef = doc(db, "users", userUid);
          const snap = await getDoc(userRef);
          const data = snap.exists() ? (snap.data() as any) : {};
          const seen = Boolean(data?.seenOnboarding_v1);
          if (!seen && mounted) setIsVisible(true);
          return;
        } catch (e) {
        }
      }

      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (!v && mounted) setIsVisible(true);
      } catch {
        if (mounted) setIsVisible(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [visible, userUid]);

  useEffect(() => {
    if (typeof visible === "boolean") setIsVisible(visible);
  }, [visible]);

  const s = slides(userName ?? "User");
  const current = s[index] ?? { title: "", text: "" };

  async function closeAndPersist() {
    if (userUid) {
      try {
        await setDoc(doc(db, "users", userUid), { seenOnboarding_v1: true }, { merge: true });
      } catch (err) {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, "true");
        } catch {
          // ignore
        }
        console.warn("Failed to write seen flag to Firestore:", err);
      }
    } else {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // ignore
      }
    }

    setIsVisible(false);
    setIndex(0);
    if (onClose) onClose();
  }

  function handleSkip() {
    closeAndPersist();
  }

  function handleNext() {
    if (index === s.length - 1) {
      closeAndPersist();
      return;
    }

    Animated.sequence([
      Animated.timing(fade, { toValue: 0.3, duration: 140, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();

    setIndex((prev) => Math.min(prev + 1, s.length - 1));
  }

  if (!isVisible) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={!!isVisible}
      onRequestClose={closeAndPersist}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: fade }]}>
          {/* Header: single Skip button */}
          <View style={styles.header}>
            {/* explicit spacer view */}
            <View style={{ width: 48 }} />
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* always coerce to string to avoid stray primitive rendering */}
            <Text style={styles.title}>{String(current.title)}</Text>
            <Text style={styles.body}>{String(current.text)}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {s.map((_, i) => (
                <View key={i} style={[styles.dot, i === index ? styles.dotActive : undefined]} />
              ))}
            </View>

            {/* Footer: only the primary Next/Get started centered */}
            <View style={styles.buttonsRow}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <TouchableOpacity style={[styles.primaryBtn]} onPress={handleNext} activeOpacity={0.85}>
                  <Text style={styles.primaryText}>
                    {index === s.length - 1 ? "Get started" : "Next"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: width - 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipBtn: {
    padding: 6,
  },
  skipText: {
    color: "#888",
    fontWeight: "600",
  },
  content: {
    paddingVertical: 18,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800" as any,
    marginBottom: 8,
    color: "#074E73",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: "#2E6B8A",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  footer: {
    marginTop: 8,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E6F6FF",
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: "#FF8A5B",
    width: 18,
    borderRadius: 9,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtn: {
    backgroundColor: "#FF8A5B",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 26,
    minWidth: 160,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800" as any,
    fontSize: 14,
  },
});
