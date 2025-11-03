import { db } from "../firebase";
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, getDoc, addDoc, collection, query, orderBy, limit, getDocs, DocumentData,} from "firebase/firestore";
import { GOOGLE_API_KEY, GEMINI_MODEL } from "../env";
import { callChatAPI } from "./aiService";
import type { RecentActivity } from "../types";
import type { UserProfile } from "../types";


export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  if (!uid) throw new Error("createUserProfile: missing uid");
  const ref = doc(db, "users", uid);

  const payload = {
    ...data,
    completedLessons: data.completedLessons ?? [],
    recentActivities: data.recentActivities ?? [],
    totalLessons: data.totalLessons ?? undefined,
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload, { merge: true });
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("createUserProfile: document not found after write");
    }
    return snap.data() as UserProfile;
  } catch (err) {
    console.error("createUserProfile error:", err);
    throw err;
  }
}

export async function markLessonComplete(uid: string, lessonId: string) {
  if (!uid) throw new Error("markLessonComplete: missing uid");
  if (!lessonId) throw new Error("markLessonComplete: missing lessonId");

  const ref = doc(db, "users", uid);

  try {
    await updateDoc(ref, {
      completedLessons: arrayUnion(lessonId),
      lastUpdated: serverTimestamp(),
    });

    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("markLessonComplete: document not found after update");
    }
    const data = snap.data() as UserProfile;
    const completed = Array.isArray(data.completedLessons) ? data.completedLessons : [];
    try {
      await updateDoc(ref, {
        lessonsCompleted: completed.length,
        lastUpdated: serverTimestamp(),
      });
    } catch (err) {
      console.warn("markLessonComplete: failed to update lessonsCompleted numeric field:", err);
    }

    return { profile: data, lessonsCompletedCount: completed.length };
  } catch (err) {
    console.error("markLessonComplete error:", err);
    throw err;
  }
}

export function onUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const ref = doc(db, "users", uid);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
      } else {
        const data = snapshot.data() as UserProfile;
        callback(data);
      }
    },
    (err) => {
      console.warn("onUserProfile error:", err);
      callback(null);
    }
  );
}

export async function updateLessonsProgress(uid: string, fields: { lessonsCompleted?: number; totalLessons?: number }) {
  if (!uid) throw new Error("updateLessonsProgress: missing uid");
  const ref = doc(db, "users", uid);
  const payload: Partial<DocumentData> = {
    ...(fields.lessonsCompleted !== undefined ? { lessonsCompleted: fields.lessonsCompleted } : {}),
    ...(fields.totalLessons !== undefined ? { totalLessons: fields.totalLessons } : {}),
    lastUpdated: serverTimestamp(),
  };
  try {
    await updateDoc(ref, payload);
  } catch (err) {
    console.error("updateLessonsProgress error:", err);
    throw err;
  }
}

export async function addRecentActivity(uid: string, activity: Omit<RecentActivity, "timestamp" | "id">) {
  if (!uid) throw new Error("addRecentActivity: missing uid");
  const colRef = collection(db, "users", uid, "activities");
  const payload = {
    ...activity,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  try {
    const docRef = await addDoc(colRef, payload);
    return docRef.id;
  } catch (err) {
    console.error("addRecentActivity error:", err);
    throw err;
  }
}

export function onRecentActivities(uid: string, callback: (items: RecentActivity[]) => void, limitCount = 5) {
  const q = query(collection(db, "users", uid, "activities"), orderBy("timestamp", "desc"), limit(limitCount));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      callback(items);
    },
    (err) => {
      console.warn("onRecentActivities error:", err);
      callback([]);
    }
  );
}

export async function getUserProfileOnce(uid: string): Promise<UserProfile | null> {
  if (!uid) throw new Error("getUserProfileOnce: missing uid");
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function generateLessonContentForUser(
  uid: string,
  lessonId: string,
  meta: { title?: string; subtitle?: string } = {}
): Promise<{ content: any } | null> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY missing (env.ts)");
  }

  const prompt = `
You are a food education lesson generator, and only about food education. Produce a JSON object for lesson ${lessonId}.
Include keys: "title", "overview", "sections" (array of {heading,body}), "quiz" (array of {question, options, correctIndex}), and optional "notes".
Return ONLY valid JSON (no explanatory text).
Title: "${(meta.title ?? meta.subtitle ?? `Lesson ${lessonId}`).replace(/"/g, '\\"')}"
`.trim();

  // Try to parse raw text into structured content robustly
  function tryParseGeneratedText(rawText: string | undefined) {
    rawText = String(rawText || "").trim();
    // Quick JSON parse
    try {
      return JSON.parse(rawText);
    } catch {
      const first = rawText.indexOf("{");
      const last = rawText.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        try {
          return JSON.parse(rawText.slice(first, last + 1));
        } catch {
        }
      }
    }
    return null;
  }

  function makeFallback(rawText = "") {
    return {
      title: meta.title ?? `Lesson ${lessonId}`,
      overview: (String(rawText) || "").slice(0, 2000),
      sections: [{ heading: "Generated notes", body: String(rawText).slice(0, 5000) }],
      quiz: [],
      notes: ["AI generated text could not be parsed as JSON, showing as overview."],
    };
  }

  try {
    const raw = await callChatAPI(prompt, 60000);
    const parsed = tryParseGeneratedText(raw);
    if (parsed) return { content: parsed };
    return { content: makeFallback(raw) };
  } catch (err: any) {
    console.warn("generateLessonContentForUser: primary call failed:", String(err?.message ?? err));
    return null;
  }
}
