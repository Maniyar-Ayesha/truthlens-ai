import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

export default function ExplanationScreen() {
  const navigation = useNavigation<any>();

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>AI Model Explanation</Text>
        <Text style={styles.headerSubtitle}>How TruthLens AI analyzes & detects synthetic media</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Text Fake News Analysis</Text>
          <Text style={styles.sectionText}>
            Our NLP engine evaluates stylistic cues, sensationalism, semantic coherence, and cross-references claim databases to flag clickbait and synthetic news stories.
          </Text>

          <Text style={styles.sectionTitle}>2. Image Deepfake Detection</Text>
          <Text style={styles.sectionText}>
            Utilizes MesoNet & EfficientNet CNN architectures to detect subtle manipulation artifacts, unnatural lighting gradients, frequency domain anomalies, and GAN blending boundaries.
          </Text>

          <Text style={styles.sectionTitle}>3. Video Deepfake Analysis</Text>
          <Text style={styles.sectionText}>
            Applies 3D CNNs and temporal consistency networks to audit frame-to-frame movement, lip-sync alignment, micro-expression jitter, and eye-blinking rates.
          </Text>

          <Text style={styles.sectionTitle}>4. URL Verification</Text>
          <Text style={styles.sectionText}>
            Checks domain age, WHOIS records, SSL certificates, phishing signatures, and malicious redirect chains.
          </Text>

          <TouchableOpacity style={styles.buttonWrapper} onPress={() => navigation.goBack()}>
            <LinearGradient colors={["#06b6d4", "#2563eb"]} style={styles.button}>
              <Text style={styles.buttonText}>Close Explanation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 24,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#06b6d4",
    marginTop: 12,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 22,
    marginBottom: 12,
  },
  buttonWrapper: {
    width: "100%",
    marginTop: 16,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
