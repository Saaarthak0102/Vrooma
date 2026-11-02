"use client";

import { useAuth } from "./AuthProvider";

export function useRequireAuth() {
  const { user, openSignInSheet } = useAuth();

  const requireAuth = (action: () => void) => {
    if (user) {
      action();
    } else {
      openSignInSheet(action);
    }
  };

  return { requireAuth, isAuthenticated: !!user };
}

