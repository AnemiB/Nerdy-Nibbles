import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert, Image, ImageSourcePropType, Platform, } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types";

import { auth, db } from "../firebase";
import { onAuthStateChanged, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList, "Settings">;

const { height } = Dimensions.get("window");

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_CARD = "#DFF4FF";

const assets: { [k: string]: ImageSourcePropType } = {
  Lessons: require("../assets/Lessons.png"),
  Settings: require("../assets/Settings.png"),
  Home: require("../assets/Home.png"),
  NibbleAi: require("../assets/NibbleAi.png"),
};

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();

  const [username, setUsername] = useState<string>("Loading...");
  const [newUsername, setNewUsername] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const name =
          user.displayName ??
          (user.email ? user.email.split("@")[0] : "User");
        setUsername(name);
      } else {
        setUsername("DemoUser");
      }
    });

    return () => unsubscribe();
  }, []);

  async function handleSave() {
    if (!newUsername.trim() && !newPassword.trim()) {
      Alert.alert("Nothing to save", "Change your username or password to update.");
      return;
    }

    try {
      if (newUsername.trim()) {
        // Update Firebase Auth displayName when signed in
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: newUsername.trim() });
          const userRef = doc(db, "users", auth.currentUser.uid);
          await setDoc(
            userRef,
            {
              displayName: newUsername.trim(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        // Update local UI
        setUsername(newUsername.trim());
        setNewUsername("");
      }

      if (newPassword.trim()) {
        Alert.alert(
          "Password change",
          "Changing passwords requires re-authentication and is not implemented in this demo. Please use account management to change your password."
        );
        setNewPassword("");
        setCurrentPassword("");
      } else {
        setCurrentPassword("");
      }

      Alert.alert("Saved", "Your profile has been updated.");
    } catch (err: any) {
      console.error("Save failed", err);
      Alert.alert("Save failed", err?.message ?? "Unknown error");
    }
  }

  async function handleSignOut() {
  try {
    if (auth) {
      await signOut(auth);
    }

    // reset the navigation stack and send user to LogIn screen
    navigation.reset({
      index: 0,
      routes: [{ name: "LogIn" }],
    });
  } catch (err: any) {
    console.error("Sign out error", err);
    Alert.alert("Sign out failed", err?.message ?? "Unknown error");
  }
}


  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: "100%", alignItems: "center" }}>
        <Text style={styles.header}>Settings</Text>
      </View>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        editable={false}
        accessible
        accessibilityLabel="Current username"
      />

      <Text style={styles.label}>New Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter new username..."
        placeholderTextColor="#C4CBD1"
        value={newUsername}
        onChangeText={setNewUsername}
        accessibilityLabel="New username"
      />

      <Text style={styles.label}>Current Password</Text>
      <TextInput
        style={styles.input}
        placeholder="••••••"
        placeholderTextColor="#C4CBD1"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
        accessibilityLabel="Current password"
      />

      <Text style={styles.label}>New Password</Text>
      <TextInput
        style={styles.input}
        placeholder="••••••"
        placeholderTextColor="#C4CBD1"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        accessibilityLabel="New password"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} accessibilityLabel="Save settings">
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} accessibilityLabel="Sign out">
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

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
    paddingBottom: height * 0.12,
  },

  header: {
    fontSize: 22,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginBottom: 18,
  },

  label: {
    color: "#0E4A66",
    fontSize: 13,
    marginTop: 10,
    marginBottom: 6,
  },

  input: {
    borderWidth: 2,
    borderColor: "#D6F1FF",
    borderRadius: 26,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
    color: "#08324A",
    backgroundColor: "#FFFFFF",
  },

  saveButton: {
    width: "100%",
    height: 52,
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  signOutButton: {
    width: "100%",
    height: 52,
    backgroundColor: BRAND_BLUE,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  signOutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 45,
    height: 64,
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
