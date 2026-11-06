"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useAuth } from "@/components/auth/AuthProvider";
import { getServiceBookingDataAction, bookSlotAction } from "@/server/actions/booking";
import { normalizeVehicleReg } from "@/lib/validation/vehicle";
import { Workshop, Slot, Booking } from "@/types/domain";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Wrench, ShieldCheck, Loader2 } from "lucide-react";

const STEPS = [
  { title: "Workshop" },
  { title: "Service Type" },
  { title: "Bay Slot" },
  { title: "Vehicle & Owner" },
  { title: "Confirmed" },
];

export default function BookServicePage() {
  const router = useRouter();
  const { user, openSignInSheet } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  // Dynamic datasets
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selections
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceOption>(SERVICE_OPTIONS[0]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Form details
  const [modelName, setModelName] = useState("Model H");
  const [regNo, setRegNo] = useState("UP32AB1234");
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Pre-fill user profile fields once authenticated
  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.full_name || "");
      setPhone((prev) => prev || user.phone || "");
    }
  }, [user]);

  // Initial load of workshops and service slots
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const data = await getServiceBookingDataAction();
        if (!isMounted) return;
        setWorkshops(data.workshops);
        if (data.workshops.length > 0) {
          setSelectedWorkshop(data.workshops[0]);
        }
        setSlots(data.slots);
      } catch (err: any) {
        console.error("Failed to load workshop data:", err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }
    loadInitial();
    return () => { isMounted = false; };
  }, []);

  // When workshop changes, refresh slots
  const handleWorkshopChange = async (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    try {
      const data = await getServiceBookingDataAction(workshop.id);
      setSlots(data.slots);
      setSelectedSlot(null);
    } catch (err: any) {
      console.warn("Error refreshing slots for workshop:", err);
    }
  };

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
    if (!name || phone.length < 10 || !selectedSlot || !selectedWorkshop) {
      toast.error("Please fill in owner details and appointment slot");
      return;
    }

    const cleanReg = normalizeVehicleReg(regNo);
    if (!cleanReg) {
      toast.error("Please enter a valid Indian vehicle registration number (e.g. UP32AB1234 or 22BH1234AA)");
      return;
    }

    if (!consent) {
      toast.error("DPDP consent is required to confirm booking");
      return;
    }

    if (!user) {
      toast.info("Please sign in or create an account to confirm your workshop service appointment.");
      openSignInSheet();
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("loading");

    try {
      const result = await bookSlotAction({
        slotId: selectedSlot.id,
        kind: "service",
        vehicleInfo: {
          model_name: modelName,
          reg_no: cleanReg,
        },
      });

      if (!result.ok) {
        setSubmitStatus("error");
        setTimeout(() => setSubmitStatus("idle"), 600);

        if (result.error.code === "CONFLICT") {
          toast.error("This bay slot was just reserved by another customer. Please choose another time.");
          const refreshed = await getServiceBookingDataAction(selectedWorkshop.id);
          setSlots(refreshed.slots);
          setSelectedSlot(null);
          setCurrentStep(2);
          return;
        }

        if (result.error.code === "INCOMPLETE_PROFILE") {
          toast.info("Please complete your profile details first.");
          router.push("/onboarding");
          return;
        }

        if (result.error.code === "UNAUTHORIZED") {
          toast.info("Please sign in to confirm your appointment.");
          openSignInSheet();
          return;
        }

        toast.error(result.error.message || "Failed to confirm service appointment.");
        return;
      }

      setSubmitStatus("success");
      setConfirmedBooking({
        id: result.data.bookingId,
        user_id: user.id,
        slot_id: selectedSlot.id,
        kind: "service",
        status: "confirmed",
        vehicle_info: {
          model_name: modelName,
          reg_no: cleanReg,
        },
        showroom_or_workshop_name: result.data.showroomOrWorkshopName,
        starts_at: result.data.startsAt,
        ends_at: result.data.endsAt,
        consultant_name: result.data.consultantDisplayName,
        created_at: new Date().toISOString(),
      });
      setCurrentStep(4);
    } catch {
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus("idle"), 600);
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

        {loadingData ? (
          <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-card flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-accent-ink animate-spin" />
            <p className="text-xs text-ink-soft">Loading workshop bays and calendar availability...</p>
          </div>
        ) : (
          <>
            {/* Step 0: Workshop Selection */}
            {currentStep === 0 && selectedWorkshop && (
              <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block">
                    Select Service Center Facility
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {workshops.map((w) => {
                      const isSelected = w.id === selectedWorkshop.id;
                      return (
                        <div
                          key={w.id}
                          onClick={() => handleWorkshopChange(w)}
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
                  slots={slots}
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
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    status={submitStatus}
                    loadingText="Locking Bay..."
                    successText="Appointment Confirmed!"
                    className="gap-2"
                    rightIcon={<ShieldCheck className="h-4 w-4" />}
                  >
                    Confirm Service Appointment
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
          </>
        )}
      </div>
    </PageShell>
  );
}
