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
import { shouldRedirectOnAuthEvent } from "@/lib/auth-events";
import { IS_DEV_BUILD, PERSONA_LOGIN_ENDPOINT } from "@/lib/demo-mode";

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
  switchRole: (role: Role) => Promise<{ ok: true } | { ok: false; message: string }>;
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
  // Sign-out bookkeeping: lets the auth listener tell "the user pressed Sign out here" (we already navigate)
  // from "signed out elsewhere / session ended" (also send them to the landing page).
  const wasAuthenticatedRef = useRef(false);
  const signingOutRef = useRef(false);
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
        wasAuthenticatedRef.current = true;
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
        wasAuthenticatedRef.current = true;
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
          const redirect = shouldRedirectOnAuthEvent(
            wasAuthenticatedRef.current,
            event,
            signingOutRef.current
          );
          wasAuthenticatedRef.current = false;
          setUser(null);
          setStatus("unauthenticated");
          // Signed out in another tab, or the session ended: never leave personal pages on screen.
          if (redirect) window.location.assign("/");
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
        wasAuthenticatedRef.current = true;
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                role: "buyer",
                locale: "en",
              });
              setStatus("authenticated");
        wasAuthenticatedRef.current = true;
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
  }, [refreshAuth]);

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

  // Persona switch (development, or demo mode when DEMO_LOGIN=true). It performs a REAL Supabase sign-in through
  // /api/auth/dev-login or /api/auth/demo-login so the session
  // cookie exists; a client-only fake profile made the navbar look signed in while /dashboard and /profile
  // (middleware + requireUser) still redirected to sign-in.
  const switchRole = useCallback(
    async (newRole: Role): Promise<{ ok: true } | { ok: false; message: string }> => {
      try {
        const res = await fetch(PERSONA_LOGIN_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        });
        if (res.status === 404) {
          return {
            ok: false,
            message: IS_DEV_BUILD
              ? "Dev login is off. Run the dev server with ALLOW_DEV_LOGIN=true and APP_ENV=development."
              : "Demo sign-in is switched off.",
          };
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, message: body?.hint || body?.error || "Dev sign-in failed." };
        }
        await refreshAuth();
        return { ok: true };
      } catch {
        return { ok: false, message: "Could not reach the dev sign-in endpoint." };
      }
    },
    [refreshAuth]
  );

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
    signingOutRef.current = true;
    wasAuthenticatedRef.current = false;
    setUser(null);
    setStatus("unauthenticated");
    pendingCallbackRef.current = null;
    clearPendingIntent();

    // End the session in the browser client (clears its session and notifies other tabs) AND on the server
    // (clears the auth cookies). Either failing must not stop the other, or the user stays half signed in.
    try {
      await createClient()?.auth.signOut({ scope: "local" });
    } catch {
      // ignore: the server sign-out below still clears the cookies
    }
    try {
      await serverSignOut();
    } catch {
      // ignore: the hard navigation below still drops all client state
    }

    // Full page load to the landing page: drops every piece of client state, the router cache and any
    // rendered personal data (dashboard, profile) in one step.
    window.location.assign("/");
  }, [clearPendingIntent]);

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
