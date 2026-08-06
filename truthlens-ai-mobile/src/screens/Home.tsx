import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import apiClient, { getStoredUser } from "../config/apiClient";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [type, setType] = useState<string>("news");
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<any>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (route.params?.type) {
      setType(route.params.type);
    }
  }, [route.params?.type]);

  const saveHistory = async (analysisType: string, data: any) => {
    try {
      const user = await getStoredUser();
      let inputText = "";
      if (analysisType === "News") inputText = text;
      if (analysisType === "URL") inputText = url;

      await apiClient.post("/api/history", {
        email: user.email || "guest",
        type: analysisType,
        inputText,
        ...data,
      });
    } catch (error: any) {
      console.log("History save error:", error.message);
    }
  };

  const goToResult = async (analysisType: string, data: any) => {
    await saveHistory(analysisType, data);
    navigation.navigate("Result", { data });
  };

  const analyzeNews = async () => {
    if (!text.trim()) return Alert.alert("Error", "Please enter news text");
    navigation.navigate("Loader");
    try {
      const response = await apiClient.post("/api/check-news", { text: text.trim() });
      await goToResult("News", response.data);
    } catch (err: any) {
      Alert.alert("Analysis Failed", err.response?.data?.message || "Failed to analyze news text");
      navigation.navigate("MainTabs", { screen: "HomeTab" });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageFile({
        uri: asset.uri,
        name: asset.fileName || "image.jpg",
        type: asset.mimeType || "image/jpeg",
      });
    }
  };

  const analyzeImage = async () => {
    if (!imageFile && !imageUri) return Alert.alert("Error", "Please select an image first");
    navigation.navigate("Loader");
    try {
      const formData = new FormData();
      if (Platform.OS === "web" && imageFile?.file) {
        formData.append("image", imageFile.file);
      } else {
        formData.append("image", imageFile as any);
      }
      const response = await apiClient.post("/api/check-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await goToResult("Image", response.data);
    } catch (err: any) {
      Alert.alert("Analysis Failed", err.response?.data?.message || "Failed to analyze image");
      navigation.navigate("MainTabs", { screen: "HomeTab" });
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setVideoUri(asset.uri);
      setVideoFile({
        uri: asset.uri,
        name: asset.fileName || "video.mp4",
        type: asset.mimeType || "video/mp4",
      });
    }
  };

  const analyzeVideo = async () => {
    if (!videoFile && !videoUri) return Alert.alert("Error", "Please upload a video file");
    navigation.navigate("Loader");
    try {
      const formData = new FormData();
      if (Platform.OS === "web" && videoFile?.file) {
        formData.append("video", videoFile.file);
      } else {
        formData.append("video", videoFile as any);
      }
      const response = await apiClient.post("/api/check-video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
      });
      await goToResult("Video", response.data);
    } catch (err: any) {
      Alert.alert("Analysis Failed", err.response?.data?.message || "Failed to analyze video");
      navigation.navigate("MainTabs", { screen: "HomeTab" });
    }
  };

  const analyzeUrl = async () => {
    if (!url.trim()) return Alert.alert("Error", "Please enter URL");
    navigation.navigate("Loader");
    try {
      const response = await apiClient.post("/api/check-url", { url: url.trim() });
      await goToResult("URL", response.data);
    } catch (err: any) {
      Alert.alert("Analysis Failed", err.response?.data?.error || err.response?.data?.message || "URL analysis failed");
      navigation.navigate("MainTabs", { screen: "HomeTab" });
    }
  };

  const featureTabs = [
    { key: "news", title: "Fake News", color: ["#3b82f6", "#06b6d4"] },
    { key: "image", title: "Image", color: ["#ec4899", "#ef4444"] },
    { key: "video", title: "Video", color: ["#a855f7", "#6366f1"] },
    { key: "url", title: "URL", color: ["#22c55e", "#10b981"] },
  ];

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>TruthLens AI</Text>
        <Text style={styles.headerSubtitle}>AI Detection Hub</Text>

        {/* Tab Selector */}
        <View style={styles.tabBar}>
          {featureTabs.map((tab) => {
            const active = type === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setType(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form Container */}
        <View style={styles.card}>
          {type === "news" && (
            <>
              <View style={styles.sampleButtonsRow}>
                <TouchableOpacity
                  style={[styles.sampleBtn, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]}
                  onPress={() => setText("Breaking: Scientists confirm aliens landed in Chennai yesterday and met government officials secretly.")}
                >
                  <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Try Sample Fake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sampleBtn, { backgroundColor: "rgba(34, 197, 94, 0.2)" }]}
                  onPress={() => setText("The Indian Space Research Organisation successfully launched a weather satellite to improve climate monitoring and disaster prediction.")}
                >
                  <Text style={{ color: "#22c55e", fontWeight: "bold" }}>Try Sample Real</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.textArea}
                placeholder="Paste news article here..."
                placeholderTextColor="#64748b"
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.buttonWrapper} activeOpacity={0.8} onPress={analyzeNews}>
                <LinearGradient colors={["#3b82f6", "#06b6d4"]} style={styles.button}>
                  <Text style={styles.buttonText}>Analyze News</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {type === "image" && (
            <>
              <TouchableOpacity style={styles.uploadArea} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 40, marginBottom: 8 }}>🖼️</Text>
                    <Text style={styles.uploadText}>Select Image for Deepfake Scan</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttonWrapper} activeOpacity={0.8} onPress={analyzeImage}>
                <LinearGradient colors={["#ec4899", "#ef4444"]} style={styles.button}>
                  <Text style={styles.buttonText}>Analyze Image</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {type === "video" && (
            <>
              <TouchableOpacity style={styles.uploadArea} onPress={pickVideo}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>🎬</Text>
                  <Text style={styles.uploadText}>
                    {videoUri ? "Video Selected for Deepfake Analysis" : "Select MP4 Video File"}
                  </Text>
                  <Text style={styles.uploadSubtext}>Upload MP4 video under 50 MB for faster analysis.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttonWrapper} activeOpacity={0.8} onPress={analyzeVideo}>
                <LinearGradient colors={["#a855f7", "#6366f1"]} style={styles.button}>
                  <Text style={styles.buttonText}>Analyze Video</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {type === "url" && (
            <>
              <View style={styles.sampleButtonsRow}>
                <TouchableOpacity
                  style={[styles.sampleBtn, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]}
                  onPress={() => setUrl("http://breaking-news-free-money.xyz")}
                >
                  <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Try Suspicious URL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sampleBtn, { backgroundColor: "rgba(34, 197, 94, 0.2)" }]}
                  onPress={() => setUrl("https://www.bbc.com")}
                >
                  <Text style={{ color: "#22c55e", fontWeight: "bold" }}>Try Trusted URL</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Enter URL to check..."
                placeholderTextColor="#64748b"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.buttonWrapper} activeOpacity={0.8} onPress={analyzeUrl}>
                <LinearGradient colors={["#22c55e", "#10b981"]} style={styles.button}>
                  <Text style={styles.buttonText}>Analyze URL</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
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
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: "rgba(6, 182, 212, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.4)",
  },
  tabText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 24,
    padding: 20,
  },
  sampleButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  sampleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  textArea: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    color: "#ffffff",
    fontSize: 15,
    height: 160,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    color: "#ffffff",
    fontSize: 15,
    marginBottom: 20,
  },
  uploadArea: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    minHeight: 180,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    resizeMode: "cover",
  },
  uploadText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  uploadSubtext: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
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
