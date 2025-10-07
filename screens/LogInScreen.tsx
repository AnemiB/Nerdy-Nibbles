import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, SafeAreaView, Alert, } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { loginUser } from "../services/authService";

type LoginNavProp = NativeStackNavigationProp<RootStackParamList, "LogIn">;

export default function LogInScreen() {
  const navigation = useNavigation<LoginNavProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(email.trim(), password);
      if (res.user) {
        Alert.alert("Success", "Logged in successfully!", [
          {
            text: "OK",
            onPress: () => navigation.replace("Home"),
          },
        ]);
      } else {
        const code = res.error?.code;
        let message = "Login failed. Please try again.";
        if (code === "auth/user-not-found") message = "No account found with this email.";
        else if (code === "auth/wrong-password") message = "Incorrect password.";
        else if (res.error?.message) message = res.error.message;
        Alert.alert("Error", message);
      }
    } catch (err: any) {
      let message = "Login failed. Please try again.";
      if (err?.code === "auth/user-not-found") message = "No account found with this email.";
      else if (err?.code === "auth/wrong-password") message = "Incorrect password.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const goToSignUp = () => {
    navigation.navigate("SignUp");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Log In</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="..."
          placeholderTextColor="#BDBDBD"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          importantForAutofill="yes"
        />

        <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="..."
          placeholderTextColor="#BDBDBD"
          secureTextEntry
          style={styles.input}
          importantForAutofill="yes"
        />
      </View>

      <TouchableOpacity
        style={styles.loginBtn}
        activeOpacity={0.9}
        onPress={handleLogIn}
        disabled={loading}
      >
        <Text style={styles.loginBtnText}>{loading ? "Logging in..." : "Log In"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signupBtn} activeOpacity={0.9} onPress={goToSignUp}>
        <Text style={styles.signupBtnText}>Sign Up</Text>
      </TouchableOpacity>

      <View />
    </SafeAreaView>
  );
}

const BRAND_BLUE = "#075985";
const ACCENT_ORANGE = "#FF8A5B";
const LIGHT_BLUE_BG = "#DDF3FF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 18,
    color: BRAND_BLUE,
    marginTop: 6,
    marginBottom: 28,
  },
  formCard: {
    width: "100%",
    backgroundColor: LIGHT_BLUE_BG,
    borderRadius: 20,
    padding: 18,
    paddingBottom: 26,
    shadowColor: "#00000010",
    marginBottom: 28,
  },
  label: {
    color: BRAND_BLUE,
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 6,
  },
  input: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: ACCENT_ORANGE,
    fontSize: 15,
  },
  loginBtn: {
    width: "92%",
    height: 52,
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#00000020",
    elevation: 2,
  },
  loginBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  signupBtn: {
    width: "92%",
    height: 52,
    backgroundColor: BRAND_BLUE,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  signupBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
