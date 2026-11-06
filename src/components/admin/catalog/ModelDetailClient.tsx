"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FormField } from "@/components/forms/PhoneField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import type { AdminModel, AdminVariant } from "@/server/repositories/admin-models";
import { VariantDialog } from "@/components/admin/VariantDialog";
import { saveModelAction } from "@/server/actions/admin-catalog";

interface ModelDetailClientProps {
  model: AdminModel;
}

export function ModelDetailClient({ model }: ModelDetailClientProps) {
  const router = useRouter();
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<AdminVariant | null>(null);
  const [name, setName] = useState(model.name);
  const [tagline, setTagline] = useState(model.tagline);
  const [bodyType, setBodyType] = useState(model.body_type);
  const [isActive, setIsActive] = useState(model.is_active);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveModelAction({
        id: model.id,
        slug: model.slug,
        name,
        tagline,
        body_type: bodyType,
        hero_image: model.hero_image,
        // saveModelAction resets anything omitted, so carry the current values through untouched.
        gallery: model.gallery,
        is_featured: model.is_featured ?? false,
        is_active: isActive,
        expected_updated_at: model.updated_at,
      });
      if (res.ok) {
        toast.success(`Model ${name} updated successfully in catalog`);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error("Failed to update model");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <Link
          href="/admin/catalog?tab=models"
          className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Models</span>
        </Link>
        <span className="text-xs font-mono text-ink-mute">ID: {model.id}</span>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-bold text-ink mb-4">Edit Model Metadata</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Model Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>

          <FormField label="Tagline" required>
            <Textarea
              rows={2}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Body Style" required>
              <Select value={bodyType} onValueChange={(v: any) => setBodyType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="hatchback">Hatchback</SelectItem>
                  <SelectItem value="mpv">MPV</SelectItem>
                  <SelectItem value="ev">EV</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Catalog Visibility">
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-xs font-semibold">
                  {isActive ? "Published Live" : "Draft / Inactive"}
                </span>
              </div>
            </FormField>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" size="sm" className="gap-1.5" disabled={isSaving}>
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-ink">Active Trim Variants</h3>
            <p className="text-[11px] text-ink-mute">
              Configured trim lines with engine, fuel, and transmission specifications.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-9"
            onClick={() => {
              setEditingVariant(null);
              setVariantDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Variant</span>
          </Button>
        </div>

        <div className="space-y-2">
          {model.variants.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-ink-mute">
              No variants yet. Add the first trim so buyers can see prices.
            </p>
          )}
          {model.variants.map((v: AdminVariant) => (
            <div
              key={v.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg-sheen/50 text-xs"
            >
              <div>
                <span className="font-bold text-ink block">
                  {v.name}
                  {!v.is_active && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      Hidden
                    </Badge>
                  )}
                </span>
                <span className="text-ink-mute text-[10px] uppercase">
                  {v.fuel} · {v.transmission}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-ink">
                  ₹{v.ex_showroom.toLocaleString("en-IN")}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-3 text-[11px]"
                  onClick={() => {
                    setEditingVariant(v);
                    setVariantDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <VariantDialog
        open={variantDialogOpen}
        onOpenChange={setVariantDialogOpen}
        modelId={model.id}
        modelName={model.name}
        variant={editingVariant}
      />
    </div>
  );
}

