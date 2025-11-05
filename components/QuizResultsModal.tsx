import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, } from "react-native";
import type { QuizProps } from "../types";

const { width } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const LIGHT_CARD = "#DFF4FF";

export default function QuizResultsModal({
 visible, onClose, onViewProgress, onBackToLessons, score, total, percent, lessonsCompletedCount, loading = false,
}: QuizProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Saving results...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Quiz Results</Text>

              <View style={{ alignItems: "center", marginTop: 8 }}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNumber}>
                    {score}/{total}
                  </Text>
                  <Text style={styles.scorePercent}>{percent}%</Text>
                </View>
              </View>

              <Text style={styles.subText}>
                {percent >= 70 ? "Great job, keep going!" : "Nice try, review the lesson and try again."}
              </Text>

              <Text style={styles.lessonsText}>Lessons completed: {lessonsCompletedCount}</Text>

              <TouchableOpacity
                style={[styles.primaryBtn]}
                onPress={() => onViewProgress && onViewProgress()}
                accessibilityLabel="View Progress"
              >
                <Text style={styles.primaryBtnText}>View Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn]}
                onPress={() => onBackToLessons && onBackToLessons()}
                accessibilityLabel="Back to Lessons"
              >
                <Text style={styles.secondaryBtnText}>Back to Lessons</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 10 }} onPress={onClose} accessibilityLabel="Close results">
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: Math.min(width - 48, 520),
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
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
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FF8A5B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: BRAND_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  closeText: {
    marginTop: 10,
    color: BRAND_BLUE,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loadingText: {
    marginTop: 12,
    color: "#123E51",
  },
});
