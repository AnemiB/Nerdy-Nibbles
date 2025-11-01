import React, { useRef, useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ImageSourcePropType,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { callChatAPI } from "../services/aiService";
import type { Message } from "../types";

type NibbleNavProp = NativeStackNavigationProp<RootStackParamList, "NibbleAi">;

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

const BOTTOM_NAV_BOTTOM = 45;
const BOTTOM_NAV_HEIGHT = 64;
const INPUT_ROW_HEIGHT = 56;
const INPUT_GAP = 50;

// default bottom when keyboard is hidden: bottom nav + nav height + gap
const INPUT_ROW_BOTTOM = BOTTOM_NAV_BOTTOM + BOTTOM_NAV_HEIGHT + INPUT_GAP;

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
  PlaneArrow: require("../assets/PlaneArrow.png"),
};

export default function NibbleAiScreen() {
  const navigation = useNavigation<NibbleNavProp>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message> | null>(null);

  // animated bottom for the input row
  const bottomAnim = useRef(new Animated.Value(INPUT_ROW_BOTTOM)).current;

  // System instruction to make the assistant a food-education tutor
  const systemInstruction = `
You are "Nibble AI", a friendly, concise tutor that teaches practical food and food-education topics.
Be helpful and encouraging. For each user question:
1) Give a short direct answer (1-3 sentences).
2) Provide 2–3 actionable tips or examples the user can apply.
3) Briefly explain any jargon (1 sentence) if you use it.
4) End with one open follow-up question that invites the learner to continue.
Keep responses clear, factual, and age-appropriate.
`.trim();

  // Keyboard listeners: animate only the input row (and send button)
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: any) => {
      const keyboardHeight = e?.endCoordinates?.height ?? 0;
      // position input just above keyboard + small extra gap
      const toValue = keyboardHeight + INPUT_GAP;
      Animated.timing(bottomAnim, {
        toValue,
        duration: 260,
        useNativeDriver: false,
      }).start();
      // ensure messages scroll up a bit (if there are messages)
      setTimeout(() => {
        try {
          // @ts-ignore
          listRef.current?.scrollToEnd?.({ animated: true });
        } catch {}
      }, 120);
    };

    const onHide = () => {
      Animated.timing(bottomAnim, {
        toValue: INPUT_ROW_BOTTOM,
        duration: 200,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Async sendMessage uses callChatAPI and shows an AI placeholder while awaiting reply
  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `m${Date.now()}`,
      sender: "me",
      text: trimmed,
    };

    // add user's message to UI
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // scroll a bit so user sees their message
    setTimeout(() => {
      try {
        // @ts-ignore
        listRef.current?.scrollToEnd?.({ animated: true });
      } catch {}
    }, 50);

    // placeholder AI
    const placeholderId = `p${Date.now()}`;
    setMessages((prev) => [...prev, { id: placeholderId, sender: "ai", text: "..." }]);
    setSending(true);
    setTimeout(() => {
      try {
        // @ts-ignore
        listRef.current?.scrollToEnd?.({ animated: true });
      } catch {}
    }, 80);

    try {
      // Combine system instruction + user text so the callChatAPI receives context
      const prompt = `${systemInstruction}\n\nUser: ${trimmed}\n\nAssistant:`;
      const reply = await callChatAPI(prompt);

      // Replace placeholder with the actual reply
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, text: String(reply).trim() } : m)));
    } catch (e) {
      console.error("NibbleAi sendMessage error:", e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, text: "Sorry — I couldn't get a reply right now. Try again." } : m
        )
      );
    } finally {
      setSending(false);
      setTimeout(() => {
        try {
          // @ts-ignore
          listRef.current?.scrollToEnd?.({ animated: true });
        } catch {}
      }, 120);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.sender === "me";
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && <Text style={styles.bubbleLabel}>Nibble AI</Text>}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAi]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextAi]}>{item.text}</Text>
        </View>
        {isMe && <Text style={styles.bubbleLabelRight}>Me</Text>}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: "100%", alignItems: "center" }}>
        <Text style={styles.header}>Nibble AI</Text>
      </View>

      <View style={styles.chatCard}>
        {messages.length === 0 ? (
          // friendly empty state that invites the user to ask a question
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Ask anything about food</Text>
            <Text style={styles.emptyHint}>Examples: "How to read sugar on labels?" or "Safe internal temp for chicken?"</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatContent}
          />
        )}
      </View>

      {/* Animated input row: moves above keyboard only (rest of UI stays) */}
      <Animated.View style={[styles.inputRow, { bottom: bottomAnim }]}>
        <View style={styles.inputPill}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a food question..."
            placeholderTextColor="#C26B4A"
            value={input}
            onChangeText={setInput}
            accessibilityLabel="Message input"
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            editable={!sending}
          />
        </View>

        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} accessibilityLabel="Send" disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <Image source={assets.PlaneArrow} style={styles.sendIcon} resizeMode="contain" />}
        </TouchableOpacity>
      </Animated.View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: height * 0.06,
    paddingBottom: 8,
  },

  header: {
    fontSize: 20,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginBottom: 12,
  },

  chatCard: {
    width: "100%",
    backgroundColor: LIGHT_CARD,
    borderRadius: 14,
    padding: 14,
    flex: 1,
    marginBottom: INPUT_ROW_BOTTOM + 64,
  },

  chatContent: {
    paddingBottom: 6,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0E4A66",
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: "#2E6B8A",
    textAlign: "center",
  },

  msgRow: {
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
  },

  msgRowLeft: {
    justifyContent: "flex-start",
  },

  msgRowRight: {
    justifyContent: "flex-end",
  },

  bubbleLabel: {
    color: "#0E4A66",
    fontSize: 12,
    marginBottom: 4,
    marginRight: 8,
  },

  bubbleLabelRight: {
    color: "#0E4A66",
    fontSize: 12,
    marginLeft: 8,
  },

  bubble: {
    maxWidth: "78%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  bubbleAi: {
    backgroundColor: BRAND_BLUE,
    borderBottomLeftRadius: 6,
  },

  bubbleMe: {
    backgroundColor: ACCENT_ORANGE,
    borderBottomRightRadius: 6,
  },

  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },

  bubbleTextAi: {
    color: "#fff",
  },

  bubbleTextMe: {
    color: "#fff",
  },

  // absolute animated input row (position controlled by bottomAnim)
  inputRow: {
    position: "absolute",
    left: 20,
    right: 20,
    height: INPUT_ROW_HEIGHT,
    width: 345,
    flexDirection: "row",
    alignItems: "center",
  },

  inputPill: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#FF8A5B33",
    paddingVertical: 6,
    paddingHorizontal: 20,
    marginRight: 10,
  },

  textInput: {
    fontSize: 14,
    color: "#0E4A66",
  },

  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  sendIcon: {
    width: 22,
    height: 22,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: BOTTOM_NAV_BOTTOM,
    height: BOTTOM_NAV_HEIGHT,
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
