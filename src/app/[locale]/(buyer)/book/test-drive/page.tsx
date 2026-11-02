"use client";

import React, { useState } from "react";
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
import { mockShowrooms } from "@/data/mock/showrooms";
import { mockDemoCars, mockSlots } from "@/data/mock/slots";
import { createBooking } from "@/server/repositories/bookings";
import { createLead } from "@/server/repositories/leads";
import { Showroom, DemoCar, Slot, Booking } from "@/types/domain";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

const STEPS = [
  { title: "Showroom" },
  { title: "Demo Car" },
  { title: "Date & Slot" },
  { title: "Details" },
  { title: "Confirmed" },
];

export default function BookTestDrivePage() {
  const [currentStep, setCurrentStep] = useState(0);

  // Selections
  const [selectedShowroom, setSelectedShowroom] = useState<Showroom>(mockShowrooms[0]);
  const availableDemoCars = mockDemoCars.filter(
    (d) => d.showroom_id === selectedShowroom.id
  );
  const [selectedDemoCar, setSelectedDemoCar] = useState<DemoCar>(
    availableDemoCars[0] || mockDemoCars[0]
  );
  const availableSlots = mockSlots.filter(
    (s) => s.kind === "test_drive" && s.showroom_id === selectedShowroom.id
  );
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Form details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

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

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || phone.length < 10 || !selectedSlot) {
      toast.error("Please fill in your name, valid phone and appointment slot");
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
        kind: "test_drive",
        status: "confirmed",
        vehicle_info: {
          model_name: selectedDemoCar.variant_name,
        },
        showroom_or_workshop_name: selectedShowroom.name,
        starts_at: selectedSlot.starts_at,
        ends_at: selectedSlot.ends_at,
        consultant_name: "Rohit Verma (Senior Specialist)",
      });

      // Also create an associated lead for the consultant queue
      await createLead({
        name,
        phone,
        showroom_id: selectedShowroom.id,
        message: `Booked test drive for ${selectedDemoCar.variant_name} on ${new Date(selectedSlot.starts_at).toLocaleDateString()}`,
        source: "web",
      });

      setConfirmedBooking(booking);
      setCurrentStep(4); // Completed step
    } catch {
      toast.error("Failed to confirm booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Book a Guaranteed Test Drive"
      subtitle="Select your preferred Lucknow showroom, choose a demo vehicle, and lock a dedicated test drive slot."
      breadcrumbs={[{ label: "Book Test Drive" }]}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <Stepper steps={STEPS} currentStep={currentStep} />

        {/* Step 0: Showroom Picker */}
        {currentStep === 0 && (
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
            <ShowroomPicker
              showrooms={mockShowrooms}
              selectedId={selectedShowroom.id}
              onSelect={(s) => {
                setSelectedShowroom(s);
                const firstCar = mockDemoCars.find((d) => d.showroom_id === s.id);
                if (firstCar) setSelectedDemoCar(firstCar);
              }}
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
              demoCars={availableDemoCars.length > 0 ? availableDemoCars : mockDemoCars}
              selectedId={selectedDemoCar.id}
              onSelect={setSelectedDemoCar}
            />
            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span>Showroom</span>
              </Button>
              <Button onClick={handleNext} className="gap-2">
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
              slots={availableSlots.length > 0 ? availableSlots : mockSlots}
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
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                <span>{isSubmitting ? "Locking Slot..." : "Confirm Test Drive"}</span>
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
