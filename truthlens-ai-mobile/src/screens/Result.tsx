import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export default function ResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const data = route.params?.data || route.params || {};
  const rawStatus = data.status || data.prediction || "UNCERTAIN";

  const statusMap: Record<string, string> = {
    SAFE: "REAL",
    SUSPICIOUS: "UNCERTAIN",
    UNSAFE: "FAKE",
  };

  const status = statusMap[String(rawStatus).toUpperCase()] || String(rawStatus).toUpperCase();

  const confidenceValue = parseInt(
    String(data.confidence || data.accuracy || "0").replace("%", ""),
    10
  );

  const confidenceDisplay =
    status === "REAL"
      ? Math.min(99, Math.max(85, Number.isFinite(confidenceValue) ? confidenceValue : 90))
      : status === "FAKE"
      ? Math.min(35, Math.max(10, Number.isFinite(confidenceValue) ? confidenceValue : 25))
      : Math.min(69, Math.max(50, Number.isFinite(confidenceValue) ? confidenceValue : 55));

  const statusConfig = {
    REAL: {
      gradient: ["#16a34a", "#047857"],
      textColor: "#4ade80",
      bgBorder: "rgba(34, 197, 94, 0.3)",
    },
    FAKE: {
      gradient: ["#dc2626", "#991b1b"],
      textColor: "#f87171",
      bgBorder: "rgba(239, 68, 68, 0.3)",
    },
    UNCERTAIN: {
      gradient: ["#eab308", "#ca8a04"],
      textColor: "#fde047",
      bgBorder: "rgba(234, 179, 8, 0.3)",
    },
  }[status] || {
    gradient: ["#eab308", "#ca8a04"],
    textColor: "#fde047",
    bgBorder: "rgba(234, 179, 8, 0.3)",
  };

  const handleShareReport = async () => {
    try {
      const htmlContent = `
        <html>
          <body style="font-family: Helvetica, Arial, sans-serif; padding: 20px; background-color: #ffffff; color: #111;">
            <h1 style="color: #0284c7;">TruthLens AI Analysis Report</h1>
            <p><strong>Status:</strong> ${status}</p>
            <p><strong>Confidence:</strong> ${confidenceDisplay}%</p>
            <hr />
            <h3>Explanation</h3>
            <p>${data.explanation || "No explanation provided."}</p>
            ${
              (data.key_points || data.keyFindings)?.length
                ? `<h3>Key Findings</h3><ul>${(data.key_points || data.keyFindings).map((k: string) => `<li>${k}</li>`).join("")}</ul>`
                : ""
            }
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (err: any) {
      Alert.alert("Report Error", "Failed to generate or share report");
    }
  };

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { borderColor: statusConfig.bgBorder }]}>
          <Text style={styles.headerTitle}>Analysis Result</Text>

          {/* Status Badge Circle */}
          <LinearGradient colors={statusConfig.gradient as [string, string]} style={styles.statusBadge}>
            <Text style={styles.statusText}>{status}</Text>
          </LinearGradient>

          {/* Score */}
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreValue, { color: statusConfig.textColor }]}>
              {confidenceDisplay}%
            </Text>
            <Text style={styles.scoreLabel}>Accuracy Percentage</Text>
          </View>

          {/* Explanation */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Explanation</Text>
            <Text style={styles.sectionContent}>
              {data.explanation || "No explanation available."}
            </Text>
          </View>

          {/* Key Findings */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Key Findings</Text>
            {(data.key_points || data.keyFindings)?.length > 0 ? (
              (data.key_points || data.keyFindings).map((point: string, idx: number) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: statusConfig.textColor }]}>●</Text>
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No key findings available.</Text>
            )}
          </View>

          {/* Confidence Breakdown if present */}
          {data.confidenceBreakdown && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>Confidence Breakdown</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Frame Classifier (CNN)</Text>
                <Text style={styles.breakdownValue}>{data.confidenceBreakdown.cnn}%</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Temporal Consistency</Text>
                <Text style={styles.breakdownValue}>{data.confidenceBreakdown.temporal}%</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lip Sync Validation</Text>
                <Text style={styles.breakdownValue}>{data.confidenceBreakdown.lipSync}%</Text>
              </View>
            </View>
          )}

          {/* Sources Checked */}
          {data.sources_checked?.length > 0 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>Sources Checked</Text>
              {data.sources_checked.map((src: string, idx: number) => (
                <Text key={idx} style={styles.sourceText}>
                  • {src}
                </Text>
              ))}
            </View>
          )}

          {/* Buttons */}
          <TouchableOpacity style={styles.secondaryButton} onPress={handleShareReport}>
            <Text style={styles.secondaryButtonText}>Export PDF Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButtonWrapper}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("MainTabs", { screen: "DashboardTab" })}
          >
            <LinearGradient colors={statusConfig.gradient as [string, string]} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
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
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 20,
  },
  statusBadge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 6,
  },
  statusText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 2,
  },
  sectionBox: {
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 20,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  breakdownLabel: {
    color: "#94a3b8",
    fontSize: 14,
  },
  breakdownValue: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  sourceText: {
    color: "#cbd5e1",
    fontSize: 13,
    marginBottom: 4,
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonWrapper: {
    width: "100%",
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
