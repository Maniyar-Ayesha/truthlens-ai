import React, { useEffect, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const { user, token, isLoading } = useContext(AuthContext);

  useEffect(() => {
    if (!isLoading) {
      if (token && user) {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      }
    }
  }, [isLoading, token, user, navigation]);

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🔍</Text>
        </View>
        <Text style={styles.title}>TruthLens AI</Text>
        <Text style={styles.subtitle}>
          AI-powered Fake News, Deepfake Image, Video and URL Detection System
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#06b6d4" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity
            style={styles.buttonWrapper}
            activeOpacity={0.8}
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: user ? "MainTabs" : "Login" }],
              })
            }
          >
            <LinearGradient colors={["#06b6d4", "#2563eb"]} style={styles.button}>
              <Text style={styles.buttonText}>{user ? "Go to Dashboard" : "Get Started"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  glow: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(6, 182, 212, 0.12)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  logoIcon: {
    fontSize: 46,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonWrapper: {
    width: "100%",
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
});
