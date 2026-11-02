"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLeadSchema, CreateLeadInput } from "@/lib/validation/lead";
import { createLead } from "@/server/repositories/leads";
import { FormField } from "./PhoneField";
import { PhoneField } from "./PhoneField";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, ShieldCheck, CheckCircle } from "lucide-react";

export interface EnquiryFormProps {
  modelId?: string;
  usedCarId?: string;
  defaultShowroomId?: string;
  onSuccess?: () => void;
  className?: string;
}

export function EnquiryForm({
  modelId,
  usedCarId,
  defaultShowroomId = "sr-hazratganj",
  onSuccess,
  className,
}: EnquiryFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      showroom_id: defaultShowroomId,
      model_id: modelId,
      used_car_id: usedCarId,
      source: "web",
      consent: true,
      phone: "",
      name: "",
      email: "",
      message: "",
    },
  });

  const phoneValue = watch("phone");
  const consentValue = watch("consent");
  const showroomValue = watch("showroom_id");

  const onSubmit = async (data: CreateLeadInput) => {
    setLoading(true);
    try {
      await createLead({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        showroom_id: data.showroom_id,
        model_id: data.model_id,
        used_car_id: data.used_car_id,
        message: data.message,
        source: data.source,
      });

      setSubmitted(true);
      toast.success("Enquiry received! A dedicated consultant is assigned.");
      onSuccess?.();
    } catch {
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/10 p-6 text-center space-y-3">
        <CheckCircle className="h-10 w-10 text-accent-ink mx-auto" />
        <h3 className="text-lg font-bold text-ink">Enquiry Registered!</h3>
        <p className="text-xs text-ink-soft max-w-sm mx-auto leading-relaxed">
          Per our 5-Minute Lead SLA, a certified product specialist will contact you on WhatsApp/Call shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${className}`}>
      {/* 5-Min SLA Guarantee Banner */}
      <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs font-semibold text-accent-ink">
        <Clock className="h-4 w-4 shrink-0" />
        <span>Guaranteed 5-Minute Call / WhatsApp SLA</span>
      </div>

      <FormField label="Full Name" required error={errors.name?.message}>
        <Input {...register("name")} placeholder="Aditya Mishra" />
      </FormField>

      <PhoneField
        label="Mobile Number (10 digits)"
        value={phoneValue}
        onChange={(val) => setValue("phone", val, { shouldValidate: true })}
        error={errors.phone?.message}
      />

      <FormField label="Email Address (Optional)" error={errors.email?.message}>
        <Input type="email" {...register("email")} placeholder="aditya@example.com" />
      </FormField>

      <FormField label="Preferred Showroom" required error={errors.showroom_id?.message}>
        <Select
          value={showroomValue}
          onValueChange={(val) => setValue("showroom_id", val, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Showroom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sr-hazratganj">Hazratganj Flagship (Lucknow)</SelectItem>
            <SelectItem value="sr-gomtinagar">Gomti Nagar Experience Center (Lucknow)</SelectItem>
            <SelectItem value="sr-kanpur-mall">Kanpur Mall Road</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Questions / Special Requests" error={errors.message?.message}>
        <Textarea
          {...register("message")}
          placeholder="e.g. Inquiring about exchange value, weekend demo or specific color..."
          className="min-h-[75px]"
        />
      </FormField>

      <ConsentCheckbox
        checked={consentValue}
        onCheckedChange={(c) => setValue("consent", c as any, { shouldValidate: true })}
        error={errors.consent?.message}
      />

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Submitting..." : "Submit Enquiry & Unlock Priority Slot"}
      </Button>
    </form>
  );
}
