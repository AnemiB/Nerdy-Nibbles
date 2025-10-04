// screens/LogInScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";

type LoginNavProp = NativeStackNavigationProp<RootStackParamList, "LogIn">;

export default function LogInScreen() {
  const navigation = useNavigation<LoginNavProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // visual-only login: replace with real auth later
  const onPressLogin = () => {
    navigation.replace("Home");
  };

  const goToSignUp = () => {
    navigation.navigate("SignUp");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
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
            onPress={onPressLogin}
          >
            <Text style={styles.loginBtnText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupBtn}
            activeOpacity={0.9}
            onPress={goToSignUp}
          >
            <Text style={styles.signupBtnText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BRAND_BLUE = "#075985"; // deep blue used in text & sign-up button
const ACCENT_ORANGE = "#FF8A5B"; // orange for primary button
const LIGHT_BLUE_BG = "#DDF3FF"; // card background

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    padding: 24,
    alignItems: "center",
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
