import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return constructMetadata({
    title: "Contact Vrooma Lucknow - Showroom Desks & Enquiries",
    description: "Get in touch with our sales desks, service advisors, and executive team at Hazratganj and Gomti Nagar showrooms.",
    path: "/contact",
  });
}

export default function ContactPage() {
  return (
    <PageShell
      title="Contact Our Showroom Team"
      subtitle="Reach out to our vehicle specialists for quotes, test drive coordination, or service advice."
      breadcrumbs={[{ label: "Contact" }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start max-w-5xl">
        {/* Contact Form */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card">
          <h2 className="text-xl font-bold text-ink mb-1">Direct Web Inquiry</h2>
          <p className="text-xs text-ink-soft mb-6">
            Inquiries are automatically assigned to an available consultant with a 5-minute response guarantee.
          </p>
          <EnquiryForm />
        </div>

        {/* Showroom Contacts Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-card space-y-4 text-xs">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
              Headquarters & Flagship
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Vrooma Flagship Hazratganj</p>
                  <p className="text-ink-soft">14/A, MG Marg, Hazratganj, Lucknow, UP 226001</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Direct Desk Phone</p>
                  <a href="tel:+915224098800" className="text-accent-ink hover:underline">
                    +91 522 409 8800
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">General Email</p>
                  <p className="text-ink-soft">contact@vrooma.in</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Showroom Hours</p>
                  <p className="text-ink-soft">Monday – Saturday: 9:30 AM – 8:00 PM</p>
                  <p className="text-ink-soft">Sunday: 10:00 AM – 7:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

