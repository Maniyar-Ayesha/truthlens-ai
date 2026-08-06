import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import apiClient, { getStoredUser } from "../config/apiClient";
import { Search, Trash2, FileText, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon } from "lucide-react-native";

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");

  const fetchHistory = async () => {
    try {
      const user = await getStoredUser();
      const params = new URLSearchParams();
      if (user.email) params.set("email", user.email);

      const response = await apiClient.get(`/api/history?${params.toString()}`);
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.records)
        ? response.data.records
        : [];
      setRecords(data);
      setFilteredRecords(data);
    } catch (err: any) {
      console.log("History fetch error:", err.message);
      setRecords([]);
      setFilteredRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  useEffect(() => {
    let result = records;
    if (filterType !== "All") {
      result = result.filter(
        (item) => String(item.type || "").toLowerCase() === filterType.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          String(item.type || "").toLowerCase().includes(q) ||
          String(item.explanation || "").toLowerCase().includes(q) ||
          String(item.inputText || "").toLowerCase().includes(q)
      );
    }
    setFilteredRecords(result);
  }, [records, search, filterType]);

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api/history/${id}`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
    } catch (err: any) {
      Alert.alert("Error", "Failed to delete history record");
    }
  };

  const handleDeleteAll = async () => {
    Alert.alert("Clear All History", "Are you sure you want to delete all history records?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete All",
        style: "destructive",
        onPress: async () => {
          try {
            const user = await getStoredUser();
            await apiClient.delete("/api/history", {
              params: { email: user.email || "guest" },
            });
            setRecords([]);
            setFilteredRecords([]);
          } catch (err: any) {
            Alert.alert("Error", "Failed to clear history");
          }
        },
      },
    ]);
  };

  const getIcon = (typeStr: string) => {
    const val = String(typeStr || "").toLowerCase();
    if (val.includes("image")) return <ImageIcon size={22} color="#06b6d4" />;
    if (val.includes("video")) return <VideoIcon size={22} color="#a855f7" />;
    if (val.includes("url")) return <LinkIcon size={22} color="#22c55e" />;
    return <FileText size={22} color="#3b82f6" />;
  };

  const total = records.length;
  const real = records.filter(
    (item) => String(item.status || item.prediction || "").toUpperCase() === "REAL"
  ).length;
  const fake = records.filter(
    (item) => String(item.status || item.prediction || "").toUpperCase() === "FAKE"
  ).length;
  const uncertain = records.filter(
    (item) => String(item.status || item.prediction || "").toUpperCase() === "UNCERTAIN"
  ).length;

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
      >
        <Text style={styles.headerTitle}>Analysis History</Text>
        <Text style={styles.headerSubtitle}>Saved detection records</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#06b6d4" }]}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#22c55e" }]}>{real}</Text>
            <Text style={styles.statLabel}>Real</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#ef4444" }]}>{fake}</Text>
            <Text style={styles.statLabel}>Fake</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#eab308" }]}>{uncertain}</Text>
            <Text style={styles.statLabel}>Uncertain</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search history..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter & Clear Row */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["All", "News", "Image", "Video", "URL"].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.filterChip, filterType === t && styles.filterChipActive]}
                onPress={() => setFilterType(t)}
              >
                <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredRecords.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleDeleteAll}>
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator size="large" color="#06b6d4" style={{ marginTop: 40 }} />
        ) : filteredRecords.length === 0 ? (
          <Text style={styles.emptyText}>No analysis history found.</Text>
        ) : (
          filteredRecords.map((item, idx) => {
            const status = String(item.status || item.prediction || "UNCERTAIN").toUpperCase();
            const statusBg =
              status === "REAL"
                ? "rgba(34, 197, 94, 0.2)"
                : status === "FAKE"
                ? "rgba(239, 68, 68, 0.2)"
                : "rgba(234, 179, 8, 0.2)";
            const statusColor =
              status === "REAL" ? "#4ade80" : status === "FAKE" ? "#f87171" : "#fde047";

            return (
              <TouchableOpacity
                key={item._id || idx}
                style={styles.historyCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Result", { data: item })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>{getIcon(item.type)}</View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemType}>{item.type || "Analysis"}</Text>
                    <Text style={styles.itemDate}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recent"}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{status}</Text>
                  </View>
                </View>

                <Text style={styles.itemExplanation} numberOfLines={2}>
                  {item.explanation || item.inputText || "No additional detail."}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.confidenceText}>
                    Confidence: {item.confidence || item.accuracy || "N/A"}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(item._id)}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "rgba(6, 182, 212, 0.25)",
    borderWidth: 1,
    borderColor: "#06b6d4",
  },
  filterChipText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  clearBtn: {
    padding: 10,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 15,
    marginTop: 40,
  },
  historyCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  itemType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  itemDate: {
    fontSize: 12,
    color: "#64748b",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  itemExplanation: {
    fontSize: 13,
    color: "#cbd5e1",
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 10,
    marginTop: 6,
  },
  confidenceText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
