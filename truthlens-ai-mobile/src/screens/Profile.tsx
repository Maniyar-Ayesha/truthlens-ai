import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import apiClient, { getStoredUser, setStoredUser } from "../config/apiClient";
import { User, Mail, Edit3, LogOut, CheckCircle2 } from "lucide-react-native";
import { AuthContext } from "../context/AuthContext";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user: ctxUser, logout, updateUser } = useContext(AuthContext);
  const [user, setUser] = useState<any>(ctxUser || {});
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoredUser().then((u) => {
      const activeUser = Object.keys(u).length ? u : ctxUser || {};
      setUser(activeUser);
      setName(activeUser.name || "");
      setUsername(activeUser.username || activeUser.email?.split("@")[0] || "");
    });
  }, [ctxUser]);

  const handleSave = async () => {
    const updatedUser = {
      ...user,
      name: name.trim() || "User",
      username: username.trim() || "truthlens_user",
    };

    try {
      setSaving(true);
      const res = await apiClient.put("/api/auth/profile", {
        name: updatedUser.name,
        username: updatedUser.username,
      });
      const returnedUser = res.data?.user || updatedUser;
      await setStoredUser(returnedUser);
      await updateUser(returnedUser);
      setUser(returnedUser);
      setEditMode(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch {
      await setStoredUser(updatedUser);
      await updateUser(updatedUser);
      setUser(updatedUser);
      setEditMode(false);
      Alert.alert("Success", "Profile updated locally");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  };

  const isGoogleAccount =
    user.password === "google-login" ||
    (user.picture && user.picture.includes("googleusercontent")) ||
    Boolean(user.uid);

  return (
    <LinearGradient colors={["#000000", "#020617", "#071330"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Avatar Circle */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.userName}>{user.name || "User"}</Text>
          <Text style={styles.userHandle}>
            @{user.username || user.email?.split("@")[0] || "truthlens_user"}
          </Text>

          {/* Details Box */}
          <View style={styles.infoGroup}>
            <View style={styles.infoBox}>
              <View style={styles.infoLabelRow}>
                <User size={16} color="#94a3b8" />
                <Text style={styles.infoLabel}>Full Name</Text>
              </View>
              {editMode ? (
                <TextInput
                  style={styles.editInput}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#64748b"
                />
              ) : (
                <Text style={styles.infoValue}>{user.name || "User"}</Text>
              )}
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoLabelRow}>
                <User size={16} color="#94a3b8" />
                <Text style={styles.infoLabel}>Username</Text>
              </View>
              {editMode ? (
                <TextInput
                  style={styles.editInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor="#64748b"
                />
              ) : (
                <Text style={styles.infoValue}>
                  @{user.username || user.email?.split("@")[0] || "truthlens_user"}
                </Text>
              )}
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoLabelRow}>
                <Mail size={16} color="#94a3b8" />
                <Text style={styles.infoLabel}>Email Address</Text>
              </View>
              <Text style={styles.infoValue}>{user.email || "No email"}</Text>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.infoBox, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.infoLabel}>Account Type</Text>
                <Text style={styles.infoValue}>
                  {isGoogleAccount ? "Google Account" : "TruthLens User"}
                </Text>
              </View>

              <View style={[styles.infoBox, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                  <CheckCircle2 size={14} color="#4ade80" style={{ marginRight: 4 }} />
                  <Text style={[styles.infoValue, { color: "#4ade80" }]}>Active</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Edit / Save Button */}
          {editMode ? (
            <TouchableOpacity
              style={styles.buttonWrapper}
              activeOpacity={0.8}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient colors={["#06b6d4", "#2563eb"]} style={styles.primaryButton}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Save Profile</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.buttonWrapper}
              activeOpacity={0.8}
              onPress={() => setEditMode(true)}
            >
              <LinearGradient colors={["#06b6d4", "#2563eb"]} style={styles.primaryButton}>
                <Edit3 size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Logout</Text>
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
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    borderWidth: 3,
    borderColor: "#06b6d4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#06b6d4",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  userHandle: {
    fontSize: 14,
    color: "#06b6d4",
    marginBottom: 20,
  },
  infoGroup: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 14,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  editInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "#06b6d4",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#ffffff",
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  buttonWrapper: {
    width: "100%",
    marginBottom: 12,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
