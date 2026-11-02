# VROOMA — DEAD-BUTTON AUDIT & WIRING REGISTRY

> **Strict Dead-Button Policy:**
> Today some buttons are not wired to a live backend yet. That is allowed ONLY through the helper `notWired("Label", targetDay)` from `@/components/dev/NotWired`.
> Never use `href="#"`, empty callbacks, or buttons that silently do nothing.
> Every placeholder is registered in this file. By the final day of the internship assignment, the count must be **zero**.

---

## 1. Active Placeholder Registry

Current placeholder count: **21**

| Button / Trigger | File Location | Target Day | Expected Backend / Integration |
|---|---|---|---|
| Add Routing Rule | `src/app/[locale]/(admin)/admin/assignment/page.tsx` | Day 3 | Supabase `assignment_rules` insert mutation |
| Configure Pool for Showroom | `src/app/[locale]/(admin)/admin/assignment/page.tsx` | Day 3 | Supabase staff assignment pool update mutation |
| Upload New Banner | `src/app/[locale]/(admin)/admin/banners/page.tsx` | Day 3 | Supabase storage bucket image upload + `banners` table insert |
| Create New Model | `src/app/[locale]/(admin)/admin/models/page.tsx` | Day 3 | Supabase `models` insert mutation |
| Add Variant | `src/app/[locale]/(admin)/admin/models/[id]/page.tsx` | Day 3 | Supabase `variants` insert mutation |
| Edit Variant | `src/app/[locale]/(admin)/admin/models/[id]/page.tsx` | Day 3 | Supabase `variants` update mutation |
| Create Showroom Offer | `src/app/[locale]/(admin)/admin/offers/page.tsx` | Day 3 | Supabase `offers` insert mutation |
| Create Price Rule | `src/app/[locale]/(admin)/admin/prices/page.tsx` | Day 3 | Supabase `price_rules` insert mutation |
| Add Showroom | `src/app/[locale]/(admin)/admin/showrooms/page.tsx` | Day 3 | Supabase `showrooms` insert mutation |
| Add Workshop | `src/app/[locale]/(admin)/admin/showrooms/page.tsx` | Day 3 | Supabase `showrooms` workshop insert mutation |
| Add Demo Car | `src/app/[locale]/(admin)/admin/showrooms/page.tsx` | Day 3 | Supabase `showrooms.demo_cars` JSON array update |
| Regenerate Next 30 Days Slots | `src/app/[locale]/(admin)/admin/slots/page.tsx` | Day 3 | Slot generator cron / API endpoint `/api/slots/generate` |
| Intake Used Car | `src/app/[locale]/(admin)/admin/used-cars/page.tsx` | Day 3 | Supabase `used_cars` insert mutation with 140-pt report |
| Invite Staff User | `src/app/[locale]/(admin)/admin/users/page.tsx` | Day 3 | Supabase auth invite user admin API |
| Google OAuth | `src/app/[locale]/(auth)/sign-in/page.tsx` | Day 4 | Supabase Auth Google OAuth provider redirect |
| Google OAuth | `src/components/auth/SignInSheet.tsx` | Day 4 | Supabase Auth Google OAuth provider redirect |
| Mark Booking Attended | `src/app/[locale]/(staff)/staff/bookings/page.tsx` | Day 4 | Supabase `bookings` status update to `completed` |
| Get Best Offer Enquiry | `src/components/cars/PriceSummaryBar.tsx` | Day 4 | Lead submission modal dialog pre-filled with variant |
| Reschedule Booking | `src/components/dashboard/BookingCard.tsx` | Day 4 | Booking rescheduling modal with slot picker |
| Cancel Booking | `src/components/dashboard/BookingCard.tsx` | Day 4 | Supabase `bookings` status update to `cancelled` |
| Remove Saved Car | `src/components/dashboard/SavedCarCard.tsx` | Day 4 | Supabase `saved_cars` delete mutation |

---

## 2. Verification Command

Run the wiring check script:
```bash
pnpm check:wiring
```

If any unregistered `notWired()` call is introduced or any dead `href="#"` link is detected, the check will alert and guide registration.
