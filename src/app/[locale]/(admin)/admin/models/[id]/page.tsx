"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { memoryStore } from "@/server/store";
import { FormField } from "@/components/forms/PhoneField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function AdminModelDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const model = memoryStore.models.find((m) => m.id === id) || memoryStore.models[0];

  const [name, setName] = useState(model.name);
  const [tagline, setTagline] = useState(model.tagline);
  const [bodyType, setBodyType] = useState(model.body_type);
  const [isActive, setIsActive] = useState(model.is_active);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      toast.success(`Model ${name} updated successfully in catalog`);
      setTimeout(() => setStatus("idle"), 1400);
    }, 350);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <Link
          href="/admin/models"
          className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Models</span>
        </Link>
        <span className="text-xs font-mono text-ink-mute">ID: {model.id}</span>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
        <h2 className="text-lg font-bold text-ink">Edit Model Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Model Display Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Body Style" required>
            <Select value={bodyType} onValueChange={(val) => setBodyType(val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Body Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="hatchback">Hatchback</SelectItem>
                <SelectItem value="ev">Electric (EV)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <FormField label="Marketing Headline / Tagline" required>
          <Textarea value={tagline} onChange={(e) => setTagline(e.target.value)} required />
        </FormField>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-ink">Active in Public Showroom</p>
            <p className="text-[11px] text-ink-mute">Visible on buyer website and search filters</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {/* Variants List Section */}
        <div className="pt-6 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              Variants in Model ({model.variants?.length || 0})
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={notWired("Add Variant", 3)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Variant</span>
            </Button>
          </div>

          <div className="space-y-2">
            {model.variants?.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-ink/[0.015] text-xs"
              >
                <div>
                  <span className="font-bold text-ink">{v.name}</span>
                  <span className="text-ink-mute ml-2 capitalize">
                    {v.fuel} · {v.transmission}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-ink">₹{v.ex_showroom.toLocaleString()}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-accent-ink"
                    onClick={notWired(`Edit Variant ${v.name}`, 3)}
                  >
                    Edit Specs
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            type="submit"
            status={status}
            loadingText="Saving..."
            successText="Model Saved!"
            className="gap-2 text-xs"
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Model Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

