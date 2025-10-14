import { db } from "../firebase";
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, getDoc, addDoc, collection, query, orderBy, limit, getDocs, DocumentData,} from "firebase/firestore";
import { HF_API_KEY, HF_MODEL } from "../env";
import { callChatAPI } from "./aiService";

export type RecentActivity = {
  id?: string;
  title: string;
  subtitle?: string;
  done?: boolean;
  timestamp?: any;
  createdAt?: any;
};

export type UserProfile = {
  name?: string;
  email?: string;
  lessonsCompleted?: number;
  totalLessons?: number;
  completedLessons?: string[]; 
  recentActivities?: RecentActivity[];
  createdAt?: any;
  lastUpdated?: any;
};

// Create or merge users/{uid} doc and return the written data (or throw)
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
    } catch (err) {      console.warn("markLessonComplete: failed to update lessonsCompleted numeric field:", err);
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

// Add an activity into users/{uid}/activities subcollection (document)
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
  if (!HF_API_KEY) {
    throw new Error("HF_API_KEY missing (env.ts)");
  }

  const prompt = `
You are a helpful lesson generator. Produce a JSON object for lesson ${lessonId}.
Include keys: "title", "overview", "sections" (array of {heading,body}), "quiz" (array of {question, options, correctIndex}), and optional "notes".
Return ONLY valid JSON (no explanatory text).
Title: "${(meta.title ?? meta.subtitle ?? `Lesson ${lessonId}`).replace(/"/g, '\\"')}"
`.trim();

  // Helper to try parse raw text into structured content
  function tryParseGeneratedText(rawText: string) {
    rawText = String(rawText || "").trim();
    // Try direct JSON parse
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

  // Fallback-shaped content if parsing fails completely
  function makeFallback(rawText = "") {
    return {
      title: meta.title ?? `Lesson ${lessonId}`,
      overview: (String(rawText) || "").slice(0, 2000),
      sections: [{ heading: "Generated notes", body: String(rawText).slice(0, 5000) }],
      quiz: [],
      notes: ["AI generated text could not be parsed as JSON,showing as overview."],
    };
  }

  async function fetchWithTimeout(resource: string, opts: RequestInit = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(resource, { ...opts, signal: controller.signal as any });
    } finally {
      clearTimeout(id);
    }
  }

  try {
    const raw = await callChatAPI(prompt);
    const parsed = tryParseGeneratedText(raw);
    if (parsed) return { content: parsed };
    return { content: makeFallback(raw) };
  } catch (err: any) {
    // If the error is a model-not-found 404, try a normalised candidate owner/model.
    const msg = String(err?.message ?? err);
    console.warn("generateLessonContentForUser: primary callChatAPI failed:", msg);

    if (msg.includes("Model not found") || msg.includes("404")) {
      try {
        const original = String(HF_MODEL || "").trim();
        let candidates: string[] = [];
        if (original) candidates.push(original);

        const slashIndex = original.indexOf("/");
        if (slashIndex !== -1) {
          const owner = original.slice(0, slashIndex);
          const modelPart = original.slice(slashIndex + 1);
          if (owner.includes("-")) {
            const ownerPrefix = owner.split("-")[0];
            const alt = `${ownerPrefix}/${modelPart}`;
            if (!candidates.includes(alt)) candidates.push(alt);
          }
        }
        if (slashIndex !== -1) {
          const modelPart = original.slice(slashIndex + 1);
          if (modelPart && !candidates.includes(modelPart)) candidates.push(modelPart);
        }

        for (const candidate of candidates) {
          try {
            const url = `https://api-inference.huggingface.co/models/${candidate}`;
            const body = { inputs: prompt, parameters: { max_new_tokens: 512 }, options: { wait_for_model: true } };
            const resp = await fetchWithTimeout(url, {
              method: "POST",
              headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }, 60000);

            if (resp.status === 404) {
              const txt = await resp.text().catch(() => "");
              console.warn(`generateLessonContentForUser: candidate model "${candidate}" 404: ${txt}`);
              continue; 
            }
            if (!resp.ok) {
              const txt = await resp.text().catch(() => "");
              console.warn(`generateLessonContentForUser: candidate model "${candidate}" returned ${resp.status}: ${txt}`);
              continue; 
            }

            const json = await resp.json().catch(() => null);
            let rawText = "";
            if (Array.isArray(json)) {
              rawText = json[0]?.generated_text ?? (typeof json[0] === "string" ? json[0] : JSON.stringify(json[0]));
            } else if (json && typeof json === "object") {
              rawText = (json as any).generated_text ?? (json as any).text ?? JSON.stringify(json);
            } else {
              rawText = String(json);
            }

            rawText = String(rawText).trim();
            const parsed = tryParseGeneratedText(rawText);
            if (parsed) return { content: parsed };
            return { content: makeFallback(rawText) };
          } catch (innerErr) {
            console.warn("generateLessonContentForUser: candidate attempt failed:", innerErr);
  
          }
        }
      } catch (fallbackErr) {
        console.warn("generateLessonContentForUser: fallback candidate attempts failed:", fallbackErr);
      }
    }

    // If not model-not-found or fallback attempts exhausted, return null to indicate hard failure.
    console.warn("generateLessonContentForUser failed:", err);
    return null;
  }
}
