"use client";

import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { memoryStore } from "@/server/store";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, Plus } from "lucide-react";

export default function DashboardBookingsPage() {
  const bookings = memoryStore.bookings;

  return (
    <PageShell
      title="My Scheduled Bookings"
      subtitle="View, reschedule, or manage your upcoming test drive reservations and workshop service appointments."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Bookings" }]}
      actions={
        <Button asChild size="sm" variant="primary" className="text-xs gap-1.5">
          <Link href="/book/test-drive">
            <Plus className="h-4 w-4" />
            <span>Book New Appointment</span>
          </Link>
        </Button>
      }
    >
      {bookings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-10 w-10 text-ink-mute" />}
          title="No bookings found"
          description="You currently have no scheduled test drives or workshop appointments."
          action={
            <Button asChild variant="primary" size="sm">
              <Link href="/book/test-drive">Book a Test Drive</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

