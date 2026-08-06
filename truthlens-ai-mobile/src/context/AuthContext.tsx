import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { clearStoredUser, setStoredUser } from "../config/apiClient";

export interface User {
  id?: string;
  uid?: string;
  _id?: string;
  name: string;
  email: string;
  picture?: string;
  photoURL?: string;
  role?: string;
  legacy?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUserJson = await AsyncStorage.getItem("user");

        if (storedToken && storedUserJson) {
          const parsedUser = JSON.parse(storedUserJson);
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Failed to load stored auth data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStorageData();

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const storedToken = await AsyncStorage.getItem("token");
          
          if (!storedToken) {
            const formattedUser: User = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
              email: firebaseUser.email || "",
              picture: firebaseUser.photoURL || "/logo.png",
            };
            await setStoredUser(formattedUser, idToken);
            setToken(idToken);
            setUser(formattedUser);
          }
        } catch (e) {
          console.log("Firebase state sync error:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (userData: User, authToken: string) => {
    setToken(authToken);
    setUser(userData);
    await setStoredUser(userData, authToken);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth).catch(() => {});
    } catch (err) {
      console.log("Logout cleanup exception:", err);
    } finally {
      setToken(null);
      setUser(null);
      await clearStoredUser();
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...userData };
    setUser(updated);
    await AsyncStorage.setItem("user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
