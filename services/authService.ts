// services/authService.ts
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { createUserProfile } from "./userService";

export type AuthResponse =
  | { user: User | null; error?: undefined }
  | { user?: undefined; error: any };

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user };
  } catch (error) {
    console.error("loginUser error:", error);
    return { error };
  }
}

/**
 * Creates the auth user, sets displayName (if provided), sends verification,
 * and creates a users/{uid} profile document in Firestore (merge).
 */
export async function signUpUser(name: string, email: string, password: string): Promise<AuthResponse> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // set displayName if provided
    if (credential.user && name) {
      try {
        await updateProfile(credential.user, { displayName: name });
        console.log("signUpUser: displayName set to", name);
      } catch (e) {
        console.warn("signUpUser: updateProfile failed:", e);
      }
    }

    // send email verification (non-blocking)
    try {
      if (credential.user) {
        await sendEmailVerification(credential.user);
        console.log("signUpUser: verification email sent");
      }
    } catch (e) {
      console.warn("signUpUser: sendEmailVerification failed:", e);
    }

    // Create initial profile doc in Firestore (awaited so we can see failures in logs)
    try {
      if (credential.user) {
        console.log("signUpUser: creating profile for uid:", credential.user.uid);
        await createUserProfile(credential.user.uid, {
          name: name || credential.user.displayName || "",
          email: credential.user.email || email,
          lessonsCompleted: 0,
          totalLessons: 6,
          recentActivities: [],
        });
        console.log("signUpUser: createUserProfile succeeded for", credential.user.uid);
      }
    } catch (e) {
      console.error("signUpUser: createUserProfile failed:", e);
      // Not fatal for signup success; still return the auth user, but surface the error in logs
    }

    return { user: credential.user };
  } catch (error) {
    console.error("signUpUser error:", error);
    return { error };
  }
}

export async function signOutUser(): Promise<void> {
  return firebaseSignOut(auth);
}
