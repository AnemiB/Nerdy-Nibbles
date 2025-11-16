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
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebase";
import { callChatAPI } from "../services/aiService";
import type { Message } from "../types";
import type { NibbleNavProp } from "../types";
import { useNavigation, useRoute } from "@react-navigation/native";

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

const BOTTOM_NAV_BOTTOM = 45;
const BOTTOM_NAV_HEIGHT = 64;
const INPUT_ROW_HEIGHT = 56;
const INPUT_GAP = 50;

const INPUT_ROW_BOTTOM = BOTTOM_NAV_BOTTOM + BOTTOM_NAV_HEIGHT + INPUT_GAP;

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
  PlaneArrow: require("../assets/PlaneArrow.png"),
};

const STORAGE_PREFIX = "nibbleai:";

/* --- Lightweight Markdown-ish renderer (no deps) --- */

function safeText(value: any) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    try {
      return JSON.stringify(value);
    } catch {
      return "[unrenderable]";
    }
  }
}

/* Inline parser: returns array of nested <Text> nodes (so it can be embedded inside a Text component) */
function renderInlineMarkdown(text: string, keyBase = ""): React.ReactNode[] {
  if (!text) return [<Text key={`${keyBase}-empty`}>{""}</Text>];

  // match **bold**, `code`, *italic*
  const inlineRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let matchCount = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) {
      parts.push(
        <Text key={`${keyBase}-text-${matchCount}-plain`}>{text.slice(lastIndex, idx)}</Text>
      );
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      const inner = token.slice(2, -2);
      parts.push(
        <Text key={`${keyBase}-text-${matchCount}-bold`} style={{ fontWeight: "700" }}>
          {inner}
        </Text>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      parts.push(
        <Text key={`${keyBase}-text-${matchCount}-code`} style={styles.inlineCode}>
          {inner}
        </Text>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const inner = token.slice(1, -1);
      parts.push(
        <Text key={`${keyBase}-text-${matchCount}-italic`} style={styles.italicText}>
          {inner}
        </Text>
      );
    } else {
      parts.push(<Text key={`${keyBase}-text-${matchCount}-plain2`}>{token}</Text>);
    }

    lastIndex = inlineRegex.lastIndex;
    matchCount++;
  }

  if (lastIndex < text.length) {
    parts.push(<Text key={`${keyBase}-text-${matchCount}-tail`}>{text.slice(lastIndex)}</Text>);
  }

  return parts;
}

/* Block-level parser: returns a View containing Text and Views for headings & lists */
function renderMarkdownBlock(text: string | null | undefined, keyBase = ""): React.ReactNode {
  const source = safeText(text ?? "");
  if (!source) return null;

  const lines = source.split(/\r?\n/);
  const output: React.ReactNode[] = [];

  let i = 0;
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = (flushKeyBase: string) => {
    if (!listBuffer) return;
    const { type, items } = listBuffer;
    output.push(
      <View key={`${flushKeyBase}-list`} style={styles.listContainer}>
        {items.map((it, idx) => {
          const bullet = type === "ul" ? "•" : `${idx + 1}.`;
          return (
            <View style={styles.listItemRow} key={`${flushKeyBase}-li-${idx}`}>
              <Text style={styles.listBullet}>{bullet}</Text>
              <Text style={styles.listText}>
                {renderInlineMarkdown(it, `${flushKeyBase}-li-${idx}`)}
              </Text>
            </View>
          );
        })}
      </View>
    );
    listBuffer = null;
  };

  for (; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === "") {
      flushList(`${keyBase}-line-${i}`);
      output.push(<View key={`${keyBase}-sp-${i}`} style={{ height: 8 }} />);
      continue;
    }

    // Headings: ###, ##, #
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList(`${keyBase}-line-${i}`);
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      if (level === 1) {
        output.push(
          <Text key={`${keyBase}-h1-${i}`} style={styles.h1}>
            {renderInlineMarkdown(content, `${keyBase}-h1-${i}`)}
          </Text>
        );
      } else if (level === 2) {
        output.push(
          <Text key={`${keyBase}-h2-${i}`} style={styles.h2}>
            {renderInlineMarkdown(content, `${keyBase}-h2-${i}`)}
          </Text>
        );
      } else {
        output.push(
          <Text key={`${keyBase}-h3-${i}`} style={styles.h3}>
            {renderInlineMarkdown(content, `${keyBase}-h3-${i}`)}
          </Text>
        );
      }
      continue;
    }

    // Unordered list - starts with - or *
    const ulMatch = raw.match(/^\s*[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!listBuffer) listBuffer = { type: "ul", items: [] };
      if (listBuffer.type !== "ul") {
        flushList(`${keyBase}-line-${i}`);
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(ulMatch[1]);
      continue;
    }

    // Ordered list - starts with number. e.g. "1. "
    const olMatch = raw.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!listBuffer) listBuffer = { type: "ol", items: [] };
      if (listBuffer.type !== "ol") {
        flushList(`${keyBase}-line-${i}`);
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(olMatch[1]);
      continue;
    }

    // Paragraph / normal line
    flushList(`${keyBase}-line-${i}`);
    output.push(
      <Text key={`${keyBase}-p-${i}`} style={styles.paragraphText}>
        {renderInlineMarkdown(line, `${keyBase}-p-${i}`)}
      </Text>
    );
  }

  // flush remaining
  flushList(`${keyBase}-end`);

  return <View key={`${keyBase}-wrap`}>{output}</View>;
}

/* --- Nibble AI screen with local per-user storage + markdown rendering --- */

export default function NibbleAiScreen() {
  const navigation = useNavigation<NibbleNavProp>();
  const route = useRoute<any>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message> | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

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

  // --- storage helpers ---
  const storageKeyFor = (uid: string | null) => STORAGE_PREFIX + (uid ?? "guest");

  async function loadMessagesForUid(uid: string | null) {
    try {
      const key = storageKeyFor(uid);
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        setMessages(parsed);
        setTimeout(() => {
          try {
            listRef.current?.scrollToEnd?.({ animated: false });
          } catch {}
        }, 50);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.warn("Failed to load messages from storage:", e);
    }
  }

  async function persistMessagesForUid(uid: string | null, msgs: Message[]) {
    try {
      const key = storageKeyFor(uid);
      await AsyncStorage.setItem(key, JSON.stringify(msgs));
    } catch (e) {
      console.warn("Failed to save messages to storage:", e);
    }
  }

  async function clearMessagesForUid(uid: string | null) {
    try {
      const key = storageKeyFor(uid);
      await AsyncStorage.removeItem(key);
      setMessages([]);
    } catch (e) {
      console.warn("Failed to clear stored messages:", e);
    }
  }

  // Subscribe to auth changes to pick up the current user and load their chat
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      const uid = user?.uid ?? null;
      setCurrentUid(uid);
      loadMessagesForUid(uid);
    });
    return () => unsub();
  }, []);

  // Auto-persist messages whenever they change (for the active uid)
  useEffect(() => {
    persistMessagesForUid(currentUid, messages);
  }, [messages, currentUid]);

  // Keyboard listeners: animate input row
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: any) => {
      const keyboardHeight = e?.endCoordinates?.height ?? 0;
      const toValue = keyboardHeight + INPUT_GAP;
      Animated.timing(bottomAnim, {
        toValue,
        duration: 260,
        useNativeDriver: false,
      }).start();
      setTimeout(() => {
        try {
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

    // Add user message and persist
    const afterUser = [...messages, userMsg];
    setMessages(afterUser);
    await persistMessagesForUid(currentUid, afterUser);

    setInput("");

    setTimeout(() => {
      try {
        listRef.current?.scrollToEnd?.({ animated: true });
      } catch {}
    }, 50);

    const placeholderId = `p${Date.now()}`;
    const placeholder: Message = { id: placeholderId, sender: "ai", text: "..." };
    const withPlaceholder = [...afterUser, placeholder];
    setMessages(withPlaceholder);
    await persistMessagesForUid(currentUid, withPlaceholder);

    setSending(true);
    setTimeout(() => {
      try {
        listRef.current?.scrollToEnd?.({ animated: true });
      } catch {}
    }, 80);

    try {
      const prompt = `${systemInstruction}\n\nUser: ${trimmed}\n\nAssistant:`;
      const reply = await callChatAPI(prompt);

      const replyText = String(reply ?? "").trim() || "Sorry, I couldn't get a reply right now. Try again.";

      const mapped = withPlaceholder.map((m) => (m.id === placeholderId ? { ...m, text: replyText } : m));
      setMessages(mapped);
      await persistMessagesForUid(currentUid, mapped);
    } catch (e) {
      console.error("NibbleAi sendMessage error:", e);
      const mapped = withPlaceholder.map((m) =>
        m.id === placeholderId ? { ...m, text: "Sorry, I couldn't get a reply right now. Try again." } : m
      );
      setMessages(mapped);
      await persistMessagesForUid(currentUid, mapped);
    } finally {
      setSending(false);
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd?.({ animated: true });
        } catch {}
      }, 120);
    }
  }

  /* --- NEW: handle initialMessage & autoSend from navigation params --- */
  useEffect(() => {
    const initial = route.params?.initialMessage;
    const auto = route.params?.autoSend;
    if (initial && typeof initial === "string") {
      // Prefill the input field
      setInput(initial);

      // If autoSend requested, call sendMessage after a small delay so state updates
      if (auto) {
        setTimeout(() => {
          // guard: avoid double-sending if already sending
          if (!sending) sendMessage();
        }, 300);
      }
      // scroll slightly to show input
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd?.({ animated: true });
        } catch {}
      }, 350);
    }
    // only run when route params change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params]);

  // Render each chat message. For AI messages we render markdown blocks so that headings, lists, bold etc render correctly.
  function renderMessage({ item }: { item: Message }) {
    const isMe = item.sender === "me";

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && <Text style={styles.bubbleLabel}>Nibble AI</Text>}

        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAi]}>
          {isMe ? (
            // user messages: plain text
            <Text style={[styles.bubbleText, styles.bubbleTextMe]}>{safeText(item.text)}</Text>
          ) : (
            // AI messages: render markdown-ish formatting
            <View>{renderMarkdownBlock(item.text, `ai-msg-${item.id}`) /* returns a View */}</View>
          )}
        </View>

        {isMe && <Text style={styles.bubbleLabelRight}>Me</Text>}
      </View>
    );
  }

  function confirmAndClear() {
    Alert.alert("Clear conversation", "This will delete the saved conversation for this account on this device. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearMessagesForUid(currentUid);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: "100%", alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
        <Text style={styles.header}>Nibble AI</Text>

        <TouchableOpacity style={{ position: "absolute", right: 24 }} onPress={confirmAndClear} accessibilityLabel="Clear conversation">
          <Text style={{ color: "#FF6B40", fontWeight: "700" }}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chatCard}>
        {messages.length === 0 ? (
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

/* --- styles (includes styles used by the markdown renderer) --- */
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

  // inline / block markdown styles
  h1: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff", // AI bubble is dark, so white text
    marginTop: 6,
    marginBottom: 6,
  },
  h2: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginTop: 6,
    marginBottom: 6,
  },
  h3: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginTop: 6,
    marginBottom: 6,
  },
  paragraphText: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 8,
    lineHeight: 20,
  },
  listContainer: {
    marginBottom: 8,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  listBullet: {
    width: 26,
    textAlign: "right",
    marginRight: 10,
    color: "#fff",
    fontWeight: "700",
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    lineHeight: 20,
  },

  inlineCode: {
    fontFamily: "monospace",
    backgroundColor: "#F3F7FA",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  italicText: {
    fontStyle: "italic",
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
