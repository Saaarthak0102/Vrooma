"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageShell } from "@/components/layout/PageShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { SavedCarCard } from "@/components/dashboard/SavedCarCard";
import { EnquiryRow } from "@/components/dashboard/EnquiryRow";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { memoryStore } from "@/server/store";
import { Calendar, Bookmark, MessageSquare, Car, ArrowRight, Wrench } from "lucide-react";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const bookings = memoryStore.bookings.slice(0, 2);
  const enquiries = memoryStore.leads.slice(0, 2);
  const savedModel = memoryStore.models[0];

  return (
    <PageShell
      title={`Welcome back, ${user?.full_name?.split(" ")[0] || "Motorist"}`}
      subtitle="Manage your upcoming showroom test drives, workshop appointments, and saved vehicle quotes."
      breadcrumbs={[{ label: "Dashboard" }]}
      actions={
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="secondary" className="text-xs">
            <Link href="/book/service">Book Service</Link>
          </Button>
          <Button asChild size="sm" variant="primary" className="text-xs gap-1">
            <Link href="/book/test-drive">
              <span>Book Demo</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Quick Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Upcoming Bookings"
            value={bookings.length}
            subtitle="Demos & Service"
            icon={<Calendar className="h-4 w-4" />}
          />
          <StatCard
            label="Saved Vehicles"
            value={2}
            subtitle="Models & Pre-Owned"
            icon={<Bookmark className="h-4 w-4" />}
          />
          <StatCard
            label="Active Enquiries"
            value={enquiries.length}
            subtitle="5-Min SLA assigned"
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <StatCard
            label="Showroom City"
            value="Lucknow"
            subtitle="Hazratganj Flagship"
            icon={<Car className="h-4 w-4" />}
          />
        </div>

        {/* Next Scheduled Booking */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink">Upcoming Appointment</h3>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-semibold text-accent-ink hover:underline"
            >
              View all ({memoryStore.bookings.length})
            </Link>
          </div>
          {bookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookings.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-mute italic">No upcoming appointments scheduled.</p>
          )}
        </div>

        {/* Saved Vehicles & Recent Inquiries Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Saved Vehicles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Saved Vehicles</h3>
              <Link
                href="/dashboard/saved"
                className="text-xs font-semibold text-accent-ink hover:underline"
              >
                View saved
              </Link>
            </div>
            {savedModel && <SavedCarCard item={savedModel} type="model" />}
          </div>

          {/* Recent Inquiries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Recent Enquiries</h3>
              <Link
                href="/dashboard/enquiries"
                className="text-xs font-semibold text-accent-ink hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {enquiries.map((l) => (
                <EnquiryRow key={l.id} lead={l} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
