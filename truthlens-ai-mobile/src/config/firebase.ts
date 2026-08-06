import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, Auth } from "firebase/auth";
// @ts-ignore - getReactNativePersistence is exported in react-native target of firebase/auth
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────────────────────
// 🔴 FIREBASE CONFIGURATION
// Replace placeholder values below with your real project keys from:
// https://console.firebase.google.com → Project Settings → General → Your apps
// ─────────────────────────────────────────────────────────────
export const GOOGLE_WEB_CLIENT_ID = "894352983894-99l5b0aei4jccvuulor0im9eom758r13.apps.googleusercontent.com";

export const firebaseConfig = {
  apiKey: "AIzaSyDoGvBRnytWOTji4cat4lwiEZvZm_BaEs4",
  authDomain: "truthlens-ai.firebaseapp.com",
  projectId: "truthlens-ai",
  storageBucket: "truthlens-ai.appspot.com",
  messagingSenderId: "894352983894",
  appId: "1:894352983894:web:894352983894",
};

// Check if real credentials have been supplied
export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey) && Boolean(firebaseConfig.projectId);
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize auth with ReactNativeAsyncStorage persistence to avoid memory persistence warning
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  // Fallback if already initialized
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;