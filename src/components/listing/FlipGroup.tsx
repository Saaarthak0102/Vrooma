"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface FlipGroupContextValue {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  toggleCard: (id: string) => void;
  isFlipped: (id: string) => boolean;
}

export const FlipGroupContext = createContext<FlipGroupContextValue | null>(null);

export function useFlipGroup() {
  return useContext(FlipGroupContext);
}

export interface FlipGroupProps {
  children: React.ReactNode;
  /**
   * Signature of filters/search/sort results. When this key changes,
   * all cards automatically close (openId resets to null).
   */
  resetKey?: string;
}

export function FlipGroup({ children, resetKey }: FlipGroupProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Reset open card whenever the result set changes
  useEffect(() => {
    setOpenId(null);
  }, [resetKey]);

  const toggleCard = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  const isFlipped = useCallback(
    (id: string) => openId === id,
    [openId]
  );

  return (
    <FlipGroupContext.Provider value={{ openId, setOpenId, toggleCard, isFlipped }}>
      {children}
    </FlipGroupContext.Provider>
  );
}
