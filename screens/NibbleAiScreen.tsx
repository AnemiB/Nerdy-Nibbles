// screens/NibbleAiScreen.tsx
import React, { useRef, useState } from "react";
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
  KeyboardAvoidingView,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";
import { callChatAPI } from "../services/aiService";

type NibbleNavProp = NativeStackNavigationProp<RootStackParamList, "NibbleAi">;

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

const BOTTOM_NAV_BOTTOM = 45;
const BOTTOM_NAV_HEIGHT = 64;
const INPUT_ROW_HEIGHT = 56;
const INPUT_GAP = 12;

const INPUT_ROW_BOTTOM = BOTTOM_NAV_BOTTOM + BOTTOM_NAV_HEIGHT + INPUT_GAP;

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
  PlaneArrow: require("../assets/PlaneArrow.png"),
};

type Message = {
  id: string;
  sender: "me" | "ai";
  text: string;
};

const initialMessages: Message[] = [
  { id: "m1", sender: "me", text: "What are the most important factors to a healthy diet?" },
  {
    id: "m2",
    sender: "ai",
    text: "The factors are:\n• Eating good food\n• Having good eating habits\n• Learning food lessons",
  },
];

export default function NibbleAiScreen() {
  const navigation = useNavigation<NibbleNavProp>();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<Message> | null>(null);

  // async sendMessage uses callChatAPI and shows an AI placeholder while awaiting reply
  async function sendMessage() {
    if (!input.trim()) return;

    const next = {
      id: `m${Date.now()}`,
      sender: "me" as const,
      text: input.trim(),
    };

    // add user's message
    setMessages((prev) => [...prev, next]);
    const userText = input.trim();
    setInput("");

    // scroll to bottom quickly
    setTimeout(() => {
      listRef.current?.scrollToEnd?.({ animated: true } as any);
    }, 50);

    // insert placeholder AI message
    const placeholderId = `p${Date.now()}`;
    setMessages((prev) => [...prev, { id: placeholderId, sender: "ai", text: "..." }]);
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true } as any), 50);

    try {
      const reply = await callChatAPI(userText);

      // replace placeholder with actual reply
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, text: reply } : m)));
    } catch (e) {
      console.error(e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, text: "Sorry — I couldn't get a reply right now." } : m
        )
      );
    } finally {
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true } as any), 50);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.sender === "me";
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && <Text style={styles.bubbleLabel}>Nibble AI</Text>}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAi]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextAi]}>
            {item.text}
          </Text>
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
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatContent}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        pointerEvents="box-none"
      >
        <View style={[styles.inputRow, { bottom: INPUT_ROW_BOTTOM }]}>
          <View style={styles.inputPill}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#C26B4A"
              value={input}
              onChangeText={setInput}
              accessibilityLabel="Message input"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
          </View>

          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} accessibilityLabel="Send">
            <Image source={assets.PlaneArrow} style={styles.sendIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom navigation */}
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

  inputRow: {
    position: "absolute",
    left: 0,
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
