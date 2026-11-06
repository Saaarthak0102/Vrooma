"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/forms/PhoneField";
import { saveModelAction } from "@/server/actions/admin-catalog";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const BODY_TYPES = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "hatchback", label: "Hatchback" },
  { value: "mpv", label: "MPV" },
  { value: "ev", label: "EV" },
];

export function ModelCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [bodyType, setBodyType] = useState("sedan");
  const [heroImage, setHeroImage] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setTagline("");
      setBodyType("sedan");
      setHeroImage("");
      // New models start as drafts: a model without variants must not appear on /cars.
      setIsActive(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await saveModelAction({
        slug,
        name,
        tagline,
        body_type: bodyType,
        hero_image: heroImage,
        is_active: isActive,
      });
      if (!res.ok) {
        setError(res.error?.message ?? "Could not create the model.");
        return;
      }
      toast.success(`${name} created. Add its variants next.`);
      onOpenChange(false);
      router.push(`/admin/catalog?tab=models&model=${res.data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Add new model</DialogTitle>
          <DialogDescription>
            Create the model first, then add its variants and prices. It stays a draft until you publish it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Model name" required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              maxLength={100}
              required
              className="h-11"
            />
          </FormField>

          <FormField label="URL slug" required>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="h-11 font-mono text-sm"
              required
            />
            <p className="text-[11px] text-ink-mute">Public page: /cars/{slug || "your-slug"}</p>
          </FormField>

          <FormField label="Tagline" required>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} required className="h-11" />
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Body style" required>
              <Select value={bodyType} onValueChange={setBodyType}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BODY_TYPES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Publish now">
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Publish now" />
                <span className="text-xs font-semibold">{isActive ? "Live" : "Draft"}</span>
              </div>
            </FormField>
          </div>

          <FormField label="Hero image path or URL" required>
            <Input
              value={heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
              placeholder="/images/cars/model-x.jpg"
              required
              className="h-11 text-sm"
            />
          </FormField>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Creating…" : "Create model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
