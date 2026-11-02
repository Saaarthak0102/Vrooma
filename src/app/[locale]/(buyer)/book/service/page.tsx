"use client";

import React, { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Stepper } from "@/components/ui/stepper";
import { ServicePicker, SERVICE_OPTIONS, ServiceOption } from "@/components/booking/ServicePicker";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";
import { FormField, PhoneField } from "@/components/forms/PhoneField";
import { ConsentCheckbox } from "@/components/forms/ConsentCheckbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockWorkshops } from "@/data/mock/showrooms";
import { mockSlots } from "@/data/mock/slots";
import { createBooking } from "@/server/repositories/bookings";
import { Workshop, Slot, Booking } from "@/types/domain";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Wrench, ShieldCheck } from "lucide-react";

const STEPS = [
  { title: "Workshop" },
  { title: "Service Type" },
  { title: "Bay Slot" },
  { title: "Vehicle & Owner" },
  { title: "Confirmed" },
];

export default function BookServicePage() {
  const [currentStep, setCurrentStep] = useState(0);

  // Selections
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop>(mockWorkshops[0]);
  const [selectedService, setSelectedService] = useState<ServiceOption>(SERVICE_OPTIONS[0]);
  const serviceSlots = mockSlots.filter((s) => s.kind === "service");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Form details
  const [modelName, setModelName] = useState("Model H");
  const [regNo, setRegNo] = useState("UP32AB1234");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const handleNext = () => {
    if (currentStep === 2 && !selectedSlot) {
      toast.error("Please pick a service bay slot");
      return;
    }
    setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || phone.length < 10 || !selectedSlot) {
      toast.error("Please fill in owner details and appointment slot");
      return;
    }
    if (!consent) {
      toast.error("DPDP consent is required to confirm booking");
      return;
    }

    setIsSubmitting(true);
    try {
      const booking = await createBooking({
        user_id: "usr-buyer-1",
        slot_id: selectedSlot.id,
        kind: "service",
        status: "confirmed",
        vehicle_info: {
          model_name: modelName,
          reg_no: regNo,
        },
        showroom_or_workshop_name: selectedWorkshop.name,
        starts_at: selectedSlot.starts_at,
        ends_at: selectedSlot.ends_at,
        consultant_name: "Service Bay Lead Advisor",
      });

      setConfirmedBooking(booking);
      setCurrentStep(4);
    } catch {
      toast.error("Failed to confirm service appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Book Certified Workshop Service"
      subtitle="Schedule periodic maintenance, repairs, or health inspections with real-time bay capacity tracking in Lucknow."
      breadcrumbs={[{ label: "Book Service" }]}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <Stepper steps={STEPS} currentStep={currentStep} />

        {/* Step 0: Workshop Selection */}
        {currentStep === 0 && (
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block">
                Select Service Center Facility
              </label>
              <div className="grid grid-cols-1 gap-3">
                {mockWorkshops.map((w) => {
                  const isSelected = w.id === selectedWorkshop.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWorkshop(w)}
                      className={`cursor-pointer rounded-lg border p-4 transition-all flex items-start justify-between ${
                        isSelected
                          ? "border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent"
                          : "border-border bg-white hover:border-ink/20"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-accent-ink" />
                          <h4 className="text-sm font-bold text-ink">{w.name}</h4>
                        </div>
                        <p className="text-xs text-ink-soft">{w.address}</p>
                        <span className="inline-block text-[11px] font-semibold text-accent-ink">
                          {w.bays} Mechanical Service Bays
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleNext} className="gap-2">
                <span>Select Service Type</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Service Type */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
            <ServicePicker
              selectedId={selectedService.id}
              onSelect={setSelectedService}
            />
            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span>Workshop</span>
              </Button>
              <Button onClick={handleNext} className="gap-2">
                <span>Choose Bay Slot</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Bay Capacity Slot Picker */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
            <SlotPicker
              slots={serviceSlots}
              selectedSlotId={selectedSlot?.id}
              onSelectSlot={setSelectedSlot}
            />
            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span>Service Type</span>
              </Button>
              <Button onClick={handleNext} disabled={!selectedSlot} className="gap-2">
                <span>Vehicle Details</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Vehicle & Owner Details */}
        {currentStep === 3 && (
          <form
            onSubmit={handleSubmitBooking}
            className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6"
          >
            <div>
              <h3 className="text-base font-bold text-ink">Vehicle & Customer Information</h3>
              <p className="text-xs text-ink-soft">
                For job card generation and automated bay intake
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Vehicle Model" required>
                <Select value={modelName} onValueChange={setModelName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Model H">Model H</SelectItem>
                    <SelectItem value="Model C">Model C</SelectItem>
                    <SelectItem value="Model S">Model S</SelectItem>
                    <SelectItem value="Model X">Model X (EV)</SelectItem>
                    <SelectItem value="Model T">Model T (4x4)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Registration Number" required>
                <Input
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                  placeholder="UP32AB1234"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Owner Full Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aditya Mishra"
                  required
                />
              </FormField>
              <PhoneField
                label="Mobile Number (10 digits)"
                value={phone}
                onChange={setPhone}
                required
              />
            </div>

            <ConsentCheckbox checked={consent} onCheckedChange={setConsent} />

            <div className="flex justify-between pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                <span>{isSubmitting ? "Locking Bay..." : "Confirm Service Appointment"}</span>
                <ShieldCheck className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && confirmedBooking && (
          <BookingConfirmation
            booking={confirmedBooking}
            customerName={name}
            customerPhone={phone}
          />
        )}
      </div>
    </PageShell>
  );
}

