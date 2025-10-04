// screens/SignUpScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";

type SignUpNavProp = NativeStackNavigationProp<RootStackParamList, "SignUp">;

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpNavProp>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // visual-only: create account -> go to Home
  const onCreateAccount = () => {
    navigation.replace("Home");
  };

  const goToLogIn = () => {
    navigation.replace("LogIn");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Sign Up</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Full name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="..."
          placeholderTextColor="#BDBDBD"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 18 }]}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="..."
          placeholderTextColor="#BDBDBD"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="..."
          placeholderTextColor="#BDBDBD"
          secureTextEntry
          style={styles.input}
        />
      </View>

      <TouchableOpacity
        style={styles.createBtn}
        activeOpacity={0.9}
        onPress={onCreateAccount}
      >
        <Text style={styles.createBtnText}>Create account</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginBtn}
        activeOpacity={0.9}
        onPress={goToLogIn}
      >
        <Text style={styles.loginBtnText}>Log In</Text>
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
    fontSize: 30,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  subtitle: {
    fontSize: 16,
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
  createBtn: {
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
  createBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  loginBtn: {
    width: "92%",
    height: 52,
    backgroundColor: BRAND_BLUE,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#00000020",
    elevation: 2,
  },
  loginBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
