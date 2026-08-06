import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function LoaderScreen() {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <View style={styles.card}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          <LinearGradient colors={["#06b6d4", "#2563eb", "transparent"]} style={styles.spinnerGradient} />
        </Animated.View>

        <Text style={styles.title}>Analyzing Media...</Text>
        <Text style={styles.subtitle}>TruthLens AI deep neural networks are evaluating features, metadata, and signatures.</Text>

        <View style={styles.pulseBar}>
          <Text style={styles.pulseText}>Cross-referencing global datasets & AI models</Text>
        </View>
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
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 28,
    padding: 36,
    alignItems: "center",
  },
  spinner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 4,
    marginBottom: 28,
  },
  spinnerGradient: {
    flex: 1,
    borderRadius: 45,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  pulseBar: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pulseText: {
    color: "#06b6d4",
    fontSize: 12,
    fontWeight: "600",
  },
});
