"use client";

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeInSchema, TradeInInput } from "@/lib/validation/trade-in";
import { submitTradeInAction, getTradeInUploadUrlsAction } from "@/server/actions/trade-in";
import { FormField, PhoneField } from "./PhoneField";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatINR } from "@/lib/money";
import { CheckCircle2, Sparkles, Upload, X, FileImage } from "lucide-react";

export function TradeInForm({ className }: { className?: string }) {
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TradeInInput>({
    resolver: zodResolver(tradeInSchema),
    defaultValues: {
      make: "",
      model: "",
      year: 2020,
      km: 45000,
      condition: "good",
      name: "",
      phone: "",
      consent: true,
    },
  });

  const phoneValue = watch("phone");
  const consentValue = watch("consent");
  const conditionValue = watch("condition");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const combined = [...selectedFiles, ...newFiles].slice(0, 6);

    for (const f of combined) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds the 5MB file size limit.`);
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        toast.error(`"${f.name}" is not a supported format (JPG, PNG, WebP only).`);
        return;
      }
    }

    setSelectedFiles(combined);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TradeInInput) => {
    setLoading(true);
    setStatus("loading");
    try {
      let uploadedPaths: string[] = [];

      // 1. Upload photos if selected
      if (selectedFiles.length > 0) {
        const fileSpecs = selectedFiles.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        }));

        const urlRes = await getTradeInUploadUrlsAction(fileSpecs);
        if (!urlRes.ok) {
          throw new Error(urlRes.error.message || "Failed to generate upload tokens");
        }

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const uploadInfo = urlRes.data[i];
          const putRes = await fetch(uploadInfo.signedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!putRes.ok) {
            console.warn(`[trade-in] Photo upload failed for ${file.name}`);
          } else {
            uploadedPaths.push(uploadInfo.path);
          }
        }
      }

      // 2. Submit Trade-in server action
      const res = await submitTradeInAction({
        make: data.make,
        model: data.model,
        year: data.year,
        km: data.km,
        condition: data.condition,
        notes: data.notes,
        name: data.name,
        phone: data.phone,
        consent: true,
        photos: uploadedPaths,
      });

      if (!res.ok) {
        throw new Error(res.error.message || "Failed to submit trade-in request");
      }

      setStatus("success");
      setSubmittedRef(res.data.leadRef);
      toast.success("Trade-in request registered! A specialist will contact you.");
    } catch (err: any) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 800);
      toast.error(err?.message || "Failed to submit trade-in request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {submittedRef && (
        <div className="rounded-xl border border-accent bg-accent-soft/30 p-6 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-accent-ink font-bold text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Trade-In Appraisal Registered</span>
            </div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-accent/20 border border-accent/40">
              Ref: {submittedRef}
            </span>
          </div>
          <p className="text-sm text-ink leading-relaxed font-medium">
            Your trade-in appraisal has been assigned to our Used-Car Manager. Per our 5-Minute Lead SLA, a certified pre-owned evaluator will review your photos and contact you on WhatsApp/Call with our certified offer.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Car Make / Manufacturer" required error={errors.make?.message}>
            <Input {...register("make")} placeholder="e.g. Honda, Maruti, Hyundai" />
          </FormField>
          <FormField label="Model & Variant" required error={errors.model?.message}>
            <Input {...register("model")} placeholder="e.g. City VX Petrol" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Manufacturing Year" required error={errors.year?.message}>
            <Input type="number" {...register("year")} placeholder="2020" />
          </FormField>
          <FormField label="Kilometers Driven" required error={errors.km?.message}>
            <Input type="number" {...register("km")} placeholder="45000" />
          </FormField>
          <FormField label="Vehicle Condition" required error={errors.condition?.message}>
            <Select
              value={conditionValue}
              onValueChange={(val) => setValue("condition", val as any, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent (Showroom condition)</SelectItem>
                <SelectItem value="good">Good (Normal wear & tear)</SelectItem>
                <SelectItem value="fair">Fair (Requires mechanical/body work)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <FormField label="Your Full Name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Aditya Mishra" />
          </FormField>
          <PhoneField
            label="Mobile Number"
            value={phoneValue}
            onChange={(val) => setValue("phone", val, { shouldValidate: true })}
            error={errors.phone?.message}
          />
        </div>

        {/* Real Photo Upload UI */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
            Exterior & Meter Photos (Optional, up to 6)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-dashed border-border p-4 text-center bg-white/50 space-y-2 cursor-pointer hover:bg-stone-50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-6 w-6 text-ink-mute mx-auto" />
            <p className="text-xs font-medium text-ink">Click or drag photos here</p>
            <p className="text-[10px] text-ink-soft">JPEG, PNG, WebP up to 5MB each (Max 6 photos)</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-border text-xs text-ink"
                >
                  <FileImage className="h-3.5 w-3.5 text-ink-mute" />
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                    className="text-ink-mute hover:text-danger ml-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <ConsentCheckbox
          checked={consentValue}
          onCheckedChange={(c) => setValue("consent", c as any, { shouldValidate: true })}
          error={errors.consent?.message}
        />

        <Button
          type="submit"
          className="w-full h-11"
          disabled={loading}
          status={status}
          loadingText="Calculating & Submitting..."
          successText="Valuation Ready!"
        >
          Get Instant Trade-In Valuation
        </Button>
      </form>
    </div>
  );
}

