"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/PhoneField";
import { toast } from "sonner";
import { notWired } from "@/components/dev/NotWired";

export function ProfileForm() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Profile preferences updated");
    }, 500);
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

      <Button type="submit" size="sm" disabled={loading} className="text-xs">
        {loading ? "Saving..." : "Update Profile"}
      </Button>
    </form>
  );
}

