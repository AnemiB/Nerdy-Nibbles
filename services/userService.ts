// services/userService.ts
import { db } from "../firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDoc,
  addDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  DocumentData,
} from "firebase/firestore";
// Use the Hugging Face generator implementation (replace OpenAI)
import { generateFoodLessonFromHuggingFace } from "./aiService";

export type RecentActivity = {
  id?: string;
  title: string;
  subtitle?: string;
  done?: boolean;
  timestamp?: any; // Firestore Timestamp or JS Date
  createdAt?: any;
};

export type UserProfile = {
  name?: string;
  email?: string;
  lessonsCompleted?: number;
  totalLessons?: number;
  completedLessons?: string[]; // store explicit completed lesson ids (e.g., ["1","3"])
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
    // timestamps
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload, { merge: true });
    // read back to confirm and return
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

// Mark a lesson complete: atomically add lessonId into completedLessons array, then update lessonsCompleted count
export async function markLessonComplete(uid: string, lessonId: string) {
  if (!uid) throw new Error("markLessonComplete: missing uid");
  if (!lessonId) throw new Error("markLessonComplete: missing lessonId");

  const ref = doc(db, "users", uid);

  try {
    // add lesson id to completedLessons array (no duplicate because arrayUnion)
    await updateDoc(ref, {
      completedLessons: arrayUnion(lessonId),
      lastUpdated: serverTimestamp(),
    });

    // read back the doc to compute lessonsCompleted count and return the updated profile
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("markLessonComplete: document not found after update");
    }
    const data = snap.data() as UserProfile;
    const completed = Array.isArray(data.completedLessons) ? data.completedLessons : [];
    // Ensure lessonsCompleted numeric field is in sync
    try {
      await updateDoc(ref, {
        lessonsCompleted: completed.length,
        lastUpdated: serverTimestamp(),
      });
    } catch (err) {
      // Non-fatal — we still return the profile
      console.warn("markLessonComplete: failed to update lessonsCompleted numeric field:", err);
    }

    return { profile: data, lessonsCompletedCount: completed.length };
  } catch (err) {
    console.error("markLessonComplete error:", err);
    throw err;
  }
}

// Realtime listener for users/{uid} doc
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

// Update lessons progress fields on users/{uid} (keeps compatibility with previous usage)
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

/**
 * generateLessonContentForUser
 * - Checks cache at users/{uid}/generatedLessons/{lessonId}
 * - If cached, returns cached content
 * - Otherwise calls the AI generator (Hugging Face), caches result with metadata
 * - Returns { cached: boolean, content, metadata, fromFallback?: boolean }
 */
export async function generateLessonContentForUser(
  uid: string,
  lessonId: string,
  opts?: { title?: string; subtitle?: string; tone?: string; difficulty?: string }
) {
  if (!uid) throw new Error("generateLessonContentForUser: missing uid");
  if (!lessonId) throw new Error("generateLessonContentForUser: missing lessonId");

  const lessonRef = doc(db, "users", uid, "generatedLessons", lessonId);

  // 1) Try cached
  try {
    const snap = await getDoc(lessonRef);
    if (snap.exists()) {
      const d = snap.data();
      return { cached: true, content: d?.content, metadata: d?.metadata, fromFallback: !!d?.metadata?.fromFallback };
    }
  } catch (err) {
    console.warn("generateLessonContentForUser: cache read failed:", err);
    // proceed to generate
  }

  // 2) Generate via Hugging Face (client-side)
  try {
    const gen = await generateFoodLessonFromHuggingFace(lessonId, opts?.title, opts?.subtitle, {
      tone: opts?.tone,
      difficulty: opts?.difficulty,
    });

    const payload = {
      content: gen.content,
      metadata: {
        generatedAt: serverTimestamp(),
        source: gen.fromFallback ? "hf-fallback" : `hf:${gen.modelUsed}`,
        fromFallback: !!gen.fromFallback,
      },
      raw: gen.raw,
      createdAt: serverTimestamp(),
    };

    // 3) Persist cache in Firestore so we don't re-call HF on next open
    try {
      await setDoc(lessonRef, payload, { merge: true });
    } catch (writeErr) {
      console.warn("generateLessonContentForUser: failed to cache generated content:", writeErr);
      // still return the content even if write fails
    }

    return { cached: false, content: gen.content, metadata: payload.metadata, fromFallback: !!gen.fromFallback };
  } catch (err) {
    console.error("generateLessonContentForUser: generation failed:", err);
    // As a final fallback, attempt to return an empty minimal lesson instead of throwing
    // (aiService should already return a fallback, but be defensive here)
    const fallback = {
      title: opts?.title ?? `Lesson ${lessonId}`,
      overview: "Lesson content unavailable right now.",
      sections: [{ heading: opts?.subtitle ?? "Overview", body: "Could not generate lesson content." }],
      quiz: [],
      notes: [],
    };

    const payload = {
      content: fallback,
      metadata: {
        generatedAt: serverTimestamp(),
        source: "local-final-fallback",
        fromFallback: true,
      },
      raw: "",
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(lessonRef, payload, { merge: true });
    } catch (e) {
      // ignore caching error
    }

    return { cached: false, content: fallback, metadata: payload.metadata, fromFallback: true };
  }
}

// Optional: realtime listener for activities
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

// Read user doc once (fallback)
export async function getUserProfileOnce(uid: string): Promise<UserProfile | null> {
  if (!uid) throw new Error("getUserProfileOnce: missing uid");
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
