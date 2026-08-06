import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const getAutoApiUrl = (): string => {
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return `http://${ip}:5000`;
      }
    }
  } catch {
    // fallback
  }
  return Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
};

export const DEFAULT_API_URL = getAutoApiUrl();

let currentApiUrl = DEFAULT_API_URL;

export const setApiBaseUrl = (url: string) => {
  currentApiUrl = url.trim().replace(/\/$/, "");
  apiClient.defaults.baseURL = currentApiUrl;
};

export const getApiBaseUrl = () => currentApiUrl;

const apiClient = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 180000,
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.log("Error getting token from AsyncStorage", err);
  }
  return config;
});

export async function getStoredUser() {
  try {
    const str = await AsyncStorage.getItem("user");
    return str ? JSON.parse(str) : {};
  } catch {
    return {};
  }
}

export async function setStoredUser(user: any, token?: string) {
  try {
    if (token) {
      await AsyncStorage.setItem("token", token);
    }
    await AsyncStorage.setItem("user", JSON.stringify(user || {}));
  } catch (err) {
    console.log("Error saving stored user", err);
  }
}

export async function clearStoredUser() {
  try {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  } catch (err) {
    console.log("Error clearing stored user", err);
  }
}

export default apiClient;
