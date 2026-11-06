"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Stepper } from "@/components/ui/stepper";
import { ShowroomPicker } from "@/components/booking/ShowroomPicker";
import { DemoCarPicker } from "@/components/booking/DemoCarPicker";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";
import { FormField, PhoneField } from "@/components/forms/PhoneField";
import { ConsentCheckbox } from "@/components/forms/ConsentCheckbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { getTestDriveBookingDataAction, bookSlotAction } from "@/server/actions/booking";
import { Showroom, DemoCar, Slot, Booking } from "@/types/domain";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

const STEPS = [
  { title: "Showroom" },
  { title: "Demo Car" },
  { title: "Date & Slot" },
  { title: "Details" },
  { title: "Confirmed" },
];

function BookTestDriveWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep links from model / used-car pages: ?variant=<variantId>&model=<slug> or ?usedCar=<stockId>
  const variantParam = searchParams.get("variant");
  const modelParam = searchParams.get("model");
  const usedCarStockId = searchParams.get("usedCar");
  const [loadError, setLoadError] = useState(false);
  const latestShowroomRef = useRef<string | null>(null);
  const { user, openSignInSheet } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  // Dynamic datasets
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [demoCars, setDemoCars] = useState<DemoCar[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selections
  const [selectedShowroom, setSelectedShowroom] = useState<Showroom | null>(null);
  const [selectedDemoCar, setSelectedDemoCar] = useState<DemoCar | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Form details
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [consent, setConsent] = useState(false);
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

  // Initial load of showrooms, demo cars, and slots
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const data = await getTestDriveBookingDataAction();
        if (!isMounted) return;
        setShowrooms(data.showrooms);
        if (data.showrooms.length > 0) {
          setSelectedShowroom(data.showrooms[0]);
        }
        setDemoCars(data.demoCars);
        if (data.demoCars.length > 0) {
          const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
          const wanted = modelParam ? squash(modelParam) : "";
          const preferred =
            (variantParam && data.demoCars.find((c) => c.variant_id === variantParam)) ||
            (wanted && data.demoCars.find((c) => squash(c.variant_name).includes(wanted))) ||
            data.demoCars[0];
          setSelectedDemoCar(preferred);
          if (preferred.id !== data.demoCars[0].id) {
            const forCar = await getTestDriveBookingDataAction(data.showrooms[0]?.id, preferred.id);
            if (isMounted) setSlots(forCar.slots);
          } else {
            setSlots(data.slots);
          }
        } else {
          setSlots(data.slots);
        }
      } catch (err: any) {
        console.error("Failed to load booking data:", err);
        if (isMounted) setLoadError(true);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }
    loadInitial();
    return () => { isMounted = false; };
  }, []);

  // When showroom changes, update demo cars and slots
  const handleShowroomChange = async (showroom: Showroom) => {
    setSelectedShowroom(showroom);
    latestShowroomRef.current = showroom.id;
    try {
      const data = await getTestDriveBookingDataAction(showroom.id);
      if (latestShowroomRef.current !== showroom.id) return; // a newer selection superseded this response
      setDemoCars(data.demoCars);
      const firstCar = data.demoCars[0] || null;
      setSelectedDemoCar(firstCar);
      setSlots(data.slots);
      setSelectedSlot(null);
    } catch (err: any) {
      console.warn("Error refreshing demo cars for showroom:", err);
    }
  };

  // When demo car changes, refresh slots
  const handleDemoCarChange = async (car: DemoCar) => {
    setSelectedDemoCar(car);
    if (selectedShowroom) {
      try {
        const data = await getTestDriveBookingDataAction(selectedShowroom.id, car.id);
        setSlots(data.slots);
        setSelectedSlot(null);
      } catch (err: any) {
        console.warn("Error refreshing slots for demo car:", err);
      }
    }
  };

  const handleNext = () => {
    if (currentStep === 2 && !selectedSlot) {
      toast.error("Please pick a test drive time slot");
      return;
    }
    setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const submitBooking = async () => {
    if (!selectedSlot || !selectedDemoCar || !selectedShowroom) return;

    setIsSubmitting(true);
    setSubmitStatus("loading");

    try {
      const result = await bookSlotAction({
        slotId: selectedSlot.id,
        kind: "test_drive",
        vehicleInfo: {
          model_name: selectedDemoCar.variant_name,
        },
        notes: usedCarStockId ? `Interested in used car ${usedCarStockId}` : null,
        consent: true,
        contactName: name,
        contactPhone: phone,
      });

      if (!result.ok) {
        setSubmitStatus("error");
        setTimeout(() => setSubmitStatus("idle"), 600);

        if (result.error.code === "CONFLICT") {
          const alreadyBooked = (result.error.fields as any)?.reason === "already_booked";
          toast.error(
            alreadyBooked
              ? result.error.message
              : "This slot was just taken by another user. Please choose another time."
          );
          // Refresh slots and return to slot picker
          const refreshed = await getTestDriveBookingDataAction(selectedShowroom.id, selectedDemoCar.id);
          setSlots(refreshed.slots);
          setSelectedSlot(null);
          setCurrentStep(2);
          return;
        }

        if (result.error.code === "INCOMPLETE_PROFILE") {
          toast.info("Please complete your driver profile details first.");
          router.push("/onboarding");
          return;
        }

        if (result.error.code === "UNAUTHORIZED") {
          toast.info("Please sign in to confirm your booking.");
          openSignInSheet(() => void submitBooking());
          return;
        }

        toast.error(result.error.message || "Failed to confirm booking.");
        return;
      }

      setSubmitStatus("success");
      setConfirmedBooking({
        id: result.data.bookingId,
        ref: result.data.ref,
        user_id: user?.id ?? "",
        slot_id: selectedSlot.id,
        kind: "test_drive",
        status: "confirmed",
        vehicle_info: {
          model_name: selectedDemoCar.variant_name,
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
      toast.error("Failed to confirm booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || phone.length < 10 || !selectedSlot || !selectedDemoCar || !selectedShowroom) {
      toast.error("Please fill in your name, valid phone and appointment slot");
      return;
    }
    if (!consent) {
      toast.error("DPDP consent is required to confirm booking");
      return;
    }

    if (!user) {
      toast.info("Please sign in or create an account to confirm your guaranteed test drive.");
      // After sign-in the booking is submitted automatically with the details already entered.
      openSignInSheet(() => void submitBooking());
      return;
    }

    await submitBooking();
  };

  return (
    <PageShell
      title="Book a Guaranteed Test Drive"
      subtitle="Select your preferred Lucknow showroom, choose a demo vehicle, and lock a dedicated test drive slot."
      breadcrumbs={[{ label: "Book Test Drive" }]}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <Stepper steps={STEPS} currentStep={currentStep} />

        {loadingData ? (
          <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-card flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-accent-ink animate-spin" />
            <p className="text-xs text-ink-soft">Loading showrooms and active demo fleet...</p>
          </div>
        ) : (
          <>
            {(loadError || showrooms.length === 0) && (
              <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-card space-y-3">
                <p className="text-sm font-semibold text-ink">We couldn&apos;t load showroom availability.</p>
                <p className="text-xs text-ink-soft">Please check your connection and try again.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
              </div>
            )}

            {/* Step 0: Showroom Picker */}
            {currentStep === 0 && selectedShowroom && (
              <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
                <ShowroomPicker
                  showrooms={showrooms}
                  selectedId={selectedShowroom.id}
                  onSelect={handleShowroomChange}
                />
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button onClick={handleNext} className="gap-2">
                    <span>Select Vehicle</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 1: Demo Car Picker */}
            {currentStep === 1 && (
              <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
                <DemoCarPicker
                  demoCars={demoCars}
                  selectedId={selectedDemoCar?.id || ""}
                  onSelect={handleDemoCarChange}
                />
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={handleBack} className="gap-1.5">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Showroom</span>
                  </Button>
                  <Button onClick={handleNext} disabled={!selectedDemoCar} className="gap-2">
                    <span>Select Slot</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Slot Picker */}
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
                    <span>Demo Car</span>
                  </Button>
                  <Button onClick={handleNext} disabled={!selectedSlot} className="gap-2">
                    <span>Driver Details</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Driver Details & Consent */}
            {currentStep === 3 && (
              <form
                onSubmit={handleSubmitBooking}
                className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6"
              >
                <div>
                  <h3 className="text-base font-bold text-ink">Driver Contact Details</h3>
                  <p className="text-xs text-ink-soft">
                    For gate entry pass and test drive insurance coverage
                  </p>
                </div>

                <FormField label="Driver Full Name" required>
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
                    loadingText="Locking Slot..."
                    successText="Slot Confirmed!"
                    className="gap-2"
                    rightIcon={<ShieldCheck className="h-4 w-4" />}
                  >
                    Confirm Test Drive
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

export default function BookTestDrivePage() {
  // useSearchParams (deep links from model / used-car pages) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <BookTestDriveWizard />
    </Suspense>
  );
}
