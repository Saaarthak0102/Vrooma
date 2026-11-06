"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { isModelSavedAction, toggleSaveVehicleAction } from "@/server/actions/buyer-dashboard";

const SYNC_EVENT = "vrooma:saved-model-changed";

/**
 * Persisted "save this car" state for a model page. Backed by the saved_items table, so it survives
 * refresh and shows up in the dashboard. Several buttons on one page stay in sync via a window event.
 */
export function useSavedModel(modelSlug: string) {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSaved(false);
      return;
    }
    isModelSavedAction(modelSlug).then((res) => {
      if (!cancelled && res.ok) setSaved(res.data.isSaved);
    });
    return () => {
      cancelled = true;
    };
  }, [modelSlug, user?.id]);

  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string; isSaved: boolean }>).detail;
      if (detail?.slug === modelSlug) setSaved(detail.isSaved);
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [modelSlug]);

  const toggle = useCallback(() => {
    requireAuth(async () => {
      if (pending) return;
      setPending(true);
      try {
        const res = await toggleSaveVehicleAction("model", modelSlug);
        if (res.ok) {
          setSaved(res.data.isSaved);
          window.dispatchEvent(
            new CustomEvent(SYNC_EVENT, { detail: { slug: modelSlug, isSaved: res.data.isSaved } })
          );
          toast.success(res.data.isSaved ? "Vehicle saved to your account" : "Removed from saved vehicles");
        } else {
          toast.error(res.error.message || "Could not update saved vehicles.");
        }
      } catch {
        toast.error("Could not update saved vehicles.");
      } finally {
        setPending(false);
      }
    });
  }, [requireAuth, pending, modelSlug]);

  return { saved, pending, toggle };
}
