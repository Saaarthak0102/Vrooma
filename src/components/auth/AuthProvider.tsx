"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Profile, Role } from "@/types/domain";
import { mockUsers } from "@/data/mock/users";

interface AuthContextType {
  user: Profile | null;
  role: Role | null;
  status: "loading" | "authenticated" | "unauthenticated";
  signIn: (email: string, role?: Role) => Promise<void>;
  signOut: () => void;
  switchRole: (role: Role) => void;
  isSignInSheetOpen: boolean;
  openSignInSheet: (onSuccess?: () => void) => void;
  closeSignInSheet: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "vrooma_mock_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [isSignInSheetOpen, setIsSignInSheetOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Check localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setStatus("authenticated");
      } else {
        // In mock mode, default to buyer profile for seamless exploration
        const defaultBuyer = mockUsers.find((u) => u.role === "buyer") || null;
        setUser(defaultBuyer);
        setStatus("authenticated");
      }
    } catch {
      setStatus("unauthenticated");
    }
  }, []);

  const signIn = async (email: string, targetRole: Role = "buyer") => {
    // Find matching mock user or synthesize one
    let matched = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.role === targetRole
    );
    if (!matched) {
      matched = {
        id: `usr-${Date.now()}`,
        email,
        full_name: email.split("@")[0],
        role: targetRole,
        locale: "en",
        city_id: "city-lucknow",
      };
    }

    setUser(matched);
    setStatus("authenticated");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matched));
    } catch {}

    setIsSignInSheetOpen(false);
    if (pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }
  };

  const signOut = () => {
    setUser(null);
    setStatus("unauthenticated");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const switchRole = (newRole: Role) => {
    const targetUser = mockUsers.find((u) => u.role === newRole);
    if (targetUser) {
      setUser(targetUser);
      setStatus("authenticated");
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(targetUser));
      } catch {}
    }
  };

  const openSignInSheet = (onSuccess?: () => void) => {
    if (onSuccess) {
      setPendingCallback(() => onSuccess);
    }
    setIsSignInSheetOpen(true);
  };

  const closeSignInSheet = () => {
    setIsSignInSheetOpen(false);
    setPendingCallback(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        status,
        signIn,
        signOut,
        switchRole,
        isSignInSheetOpen,
        openSignInSheet,
        closeSignInSheet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

