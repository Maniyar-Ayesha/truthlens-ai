import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import apiClient, { getStoredUser } from "../config/apiClient";
import { Image as ImageIcon, FileText, Video as VideoIcon, Link as LinkIcon } from "lucide-react-native";

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const user = await getStoredUser();
      if (!user.email) return;
      const res = await apiClient.get(`/api/dashboard/stats/${encodeURIComponent(user.email)}`);
      setStats(res.data);
    } catch {
      setStats(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const cards = [
    {
      title: "Image Deepfake Detection",
      description: "Analyze manipulated or AI-generated images in real time.",
      type: "image",
      icon: <ImageIcon size={32} color="#ffffff" />,
      colors: ["#ec4899", "#ef4444"],
    },
    {
      title: "Fake News Detection",
      description: "Detect misinformation and AI-generated fake news instantly.",
      type: "news",
      icon: <FileText size={32} color="#ffffff" />,
      colors: ["#3b82f6", "#06b6d4"],
    },
    {
      title: "Video Deepfake Detection",
      description: "Scan videos for deepfake manipulation using AI detection.",
      type: "video",
      icon: <VideoIcon size={32} color="#ffffff" />,
      colors: ["#a855f7", "#6366f1"],
    },
    {
      title: "URL Verification",
      description: "Verify suspicious links and detect unsafe websites instantly.",
      type: "url",
      icon: <LinkIcon size={32} color="#ffffff" />,
      colors: ["#22c55e", "#10b981"],
    },
  ];

  const statItems = [
    { label: "Total Analysis", value: stats?.totalAnalysis ?? 0 },
    { label: "Fake Count", value: stats?.fakeNews ?? 0 },
    { label: "Real Count", value: stats?.realNews ?? 0 },
    { label: "News", value: stats?.newsChecked ?? 0 },
    { label: "Images", value: stats?.imagesChecked ?? 0 },
    { label: "Videos", value: stats?.videosChecked ?? 0 },
    { label: "URLs", value: stats?.urlsChecked ?? 0 },
  ];

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
      >
        <Text style={styles.headerTitle}>TruthLens AI</Text>
        <Text style={styles.headerSubtitle}>AI-powered Fake News & Deepfake Detection System</Text>

        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>Version 1.0 • Final Year AI Project</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          {statItems.map((item, idx) => (
            <View key={idx} style={styles.statBox}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.cardsContainer}>
          {cards.map((card, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.cardWrapper}
              activeOpacity={0.88}
              onPress={() => navigation.navigate("HomeTab", { screen: "Home", params: { type: card.type } })}
            >
              <LinearGradient colors={card.colors as [string, string]} style={styles.card}>
                <View style={styles.iconWrapper}>{card.icon}</View>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
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
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 16,
  },
  badgeContainer: {
    alignSelf: "center",
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderColor: "rgba(6, 182, 212, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  badgeText: {
    color: "#06b6d4",
    fontSize: 12,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 8,
  },
  statBox: {
    minWidth: 100,
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#06b6d4",
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: Platform.OS === "web" ? "48.5%" : "100%",
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    minHeight: 160,
    justifyContent: "center",
  },
  iconWrapper: {
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
});
