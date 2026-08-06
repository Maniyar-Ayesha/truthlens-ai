import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import apiClient from "../config/apiClient";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      return Alert.alert("Validation Error", "Please enter your email address.");
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Backend API Request
      const res = await apiClient.post("/api/auth/forgot-password", { email: cleanEmail });
      setLoading(false);
      Alert.alert("Success", res.data.message || "Password reset link sent to your email.");
      return navigation.navigate("Login");
    } catch (apiErr: any) {
      setLoading(false);
      console.log("Backend forgot password error:", apiErr?.response?.data || apiErr.message);

      const msg =
        apiErr?.response?.data?.message ||
        apiErr?.response?.data?.error ||
        (apiErr.message === "Network Error"
          ? "Network Error: Could not connect to backend server. Make sure node server.js is running."
          : apiErr.message || "Failed to send reset link.");
      return Alert.alert("Reset Failed", msg);
    }
  };

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>🔑</Text>
            </View>

            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your email to receive a password reset link</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.buttonWrapper}
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient colors={["#06b6d4", "#2563eb"]} style={styles.button}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.backContainer}>
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 38,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 20,
  },
  buttonWrapper: {
    width: "100%",
    marginBottom: 20,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backContainer: {
    paddingVertical: 8,
  },
  linkText: {
    color: "#06b6d4",
    fontSize: 15,
    fontWeight: "bold",
  },
});
