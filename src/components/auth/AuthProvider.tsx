"use client";

import React, {
  createContext,
  useRef,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { Profile, Role } from "@/types/domain";
import { createClient } from "@/lib/supabase/client";
import { signOut as serverSignOut } from "@/server/auth/actions";
import { SignInSheet } from "./SignInSheet";

export interface PendingIntent {
  type: string;
  payload?: any;
  createdAt: number;
}

interface AuthContextType {
  user: Profile | null;
  role: Role | null;
  status: "loading" | "authenticated" | "unauthenticated";
  signOut: () => Promise<void>;
  switchRole: (role: Role) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>;
  isSignInSheetOpen: boolean;
  openSignInSheet: (onSuccess?: () => void, intent?: Omit<PendingIntent, "createdAt">) => void;
  closeSignInSheet: () => void;
  /** Call after a successful sign-in: reloads the session, closes the sheet and resumes the action that needed it. */
  completeSignIn: (options?: { runPending?: boolean }) => Promise<void>;
  pendingIntent: PendingIntent | null;
  clearPendingIntent: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INTENT_STORAGE_KEY = "vrooma_auth_intent";
const INTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [isSignInSheetOpen, setIsSignInSheetOpen] = useState(false);
  // The action that triggered the sign-in prompt; run once after a successful sign-in, then dropped.
  const pendingCallbackRef = useRef<(() => void) | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);

  // Load pending intent from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(INTENT_STORAGE_KEY);
      if (stored) {
        const parsed: PendingIntent = JSON.parse(stored);
        if (Date.now() - parsed.createdAt < INTENT_TTL_MS) {
          setPendingIntent(parsed);
        } else {
          sessionStorage.removeItem(INTENT_STORAGE_KEY);
        }
      }
    } catch {}
  }, []);

  const refreshAuth = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setStatus("unauthenticated");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUser(profile as Profile);
        setStatus("authenticated");
      } else {
        // Minimal fallback until profile is created
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
          role: "buyer",
          locale: "en",
        });
        setStatus("authenticated");
      }
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  // Primary Auth hydration via Supabase SSR client
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setStatus("unauthenticated");
      return;
    }

    refreshAuth();

    // 2. Real-time auth state listener across tabs and OAuth redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session?.user) {
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (profile) {
              setUser(profile as Profile);
              setStatus("authenticated");
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                role: "buyer",
                locale: "en",
              });
              setStatus("authenticated");
            }
          } catch {
            setUser(null);
            setStatus("unauthenticated");
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openSignInSheet = useCallback(
    (onSuccess?: () => void, intent?: Omit<PendingIntent, "createdAt">) => {
      // Always replace: a stale callback from an earlier, abandoned prompt must never fire later.
      pendingCallbackRef.current = onSuccess ?? null;
      if (intent) {
        const fullIntent: PendingIntent = { ...intent, createdAt: Date.now() };
        setPendingIntent(fullIntent);
        try {
          sessionStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify(fullIntent));
        } catch {}
      }
      setIsSignInSheetOpen(true);
    },
    []
  );

  const closeSignInSheet = useCallback(() => {
    setIsSignInSheetOpen(false);
  }, []);

  const clearPendingIntent = useCallback(() => {
    setPendingIntent(null);
    try {
      sessionStorage.removeItem(INTENT_STORAGE_KEY);
    } catch {}
  }, []);

  const switchRole = useCallback((newRole: Role) => {
    const target: Profile = {
      id: `usr-${newRole}-1`,
      email: `${newRole}@vrooma.in`,
      full_name: `${newRole.toUpperCase()} Specialist`,
      role: newRole,
      locale: "en" as const,
    };
    setUser(target);
    setStatus("authenticated");
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<Profile> => {
      if (!user) {
        throw new Error("No authenticated user session");
      }

      const updatedUser: Profile = {
        ...user,
        ...updates,
      };

      setUser(updatedUser);

      // Persist to server API route
      try {
        await fetch("/api/me/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id, ...updates }),
        });
      } catch {}

      return updatedUser;
    },
    [user]
  );

  const signOut = useCallback(async () => {
    setUser(null);
    setStatus("unauthenticated");
    clearPendingIntent();
    await serverSignOut();
    router.refresh();
  }, [clearPendingIntent, router]);

  const completeSignIn = useCallback(
    async (options?: { runPending?: boolean }) => {
      await refreshAuth();
      setIsSignInSheetOpen(false);
      const pending = pendingCallbackRef.current;
      pendingCallbackRef.current = null;
      router.refresh();
      if (pending && options?.runPending !== false) pending();
    },
    [refreshAuth, router]
  );

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      signOut,
      switchRole,
      updateProfile,
      isSignInSheetOpen,
      openSignInSheet,
      closeSignInSheet,
      completeSignIn,
      pendingIntent,
      clearPendingIntent,
    }),
    [
      user,
      status,
      signOut,
      switchRole,
      updateProfile,
      isSignInSheetOpen,
      openSignInSheet,
      closeSignInSheet,
      completeSignIn,
      pendingIntent,
      clearPendingIntent,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignInSheet />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
