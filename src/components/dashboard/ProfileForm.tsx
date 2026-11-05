"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/PhoneField";
import { updateBuyerProfileAction } from "@/server/actions/profile";
import { toast } from "sonner";

export function ProfileForm() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (user) {
      setName(user.full_name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("loading");

    try {
      const res = await updateBuyerProfileAction({
        fullName: name.trim(),
        phone: phone.trim(),
        expectedUpdatedAt: user?.updated_at,
      });

      if (!res.ok) {
        throw new Error(res.error.message);
      }

      setStatus("success");
      toast.success("Profile preferences updated");
      setTimeout(() => setStatus("idle"), 1400);
    } catch (err: any) {
      setStatus("error");
      toast.error(err?.message || "Failed to update profile");
      setTimeout(() => setStatus("idle"), 1400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Full Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>

      <FormField label="Registered Email (Account Identity)">
        <Input value={user?.email || ""} disabled className="bg-ink/5" />
      </FormField>

      <FormField label="Mobile Number">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>

      <Button
        type="submit"
        size="sm"
        disabled={loading}
        status={status}
        loadingText="Saving..."
        successText="Profile Saved!"
        className="text-xs"
      >
        Update Profile
      </Button>
    </form>
  );
}
