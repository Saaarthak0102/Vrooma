# VROOMA — DEAD-BUTTON AUDIT & WIRING REGISTRY

> **Strict Dead-Button Policy:**
> A button that is not yet connected to a backend may exist ONLY through the helper `notWired("Label", targetDay)` from `@/components/dev/NotWired`.
> Never use `href="#"`, empty callbacks, or buttons that silently do nothing.
> Every placeholder is registered in this file.

---

## 1. Active Placeholder Registry

Current placeholder count: **0** (`pnpm check:wiring` reports 0 unwired buttons).

All former admin and staff placeholders are now wired to real server actions and verified against Supabase by `scripts/console-e2e.mjs`:

| Former placeholder | Now |
|---|---|
| Create New Model / Add Variant / Edit Variant | Catalog > Models & variants (`saveModelAction`, `saveVariantAction`) |
| Create Price Rule | Catalog > On-road price rules (`savePriceRuleAction`, `deletePriceRuleAction`) |
| Create Showroom Offer / Upload New Banner | Catalog > Offers and Banners (`saveOfferAction`, `saveBannerAction`, `deleteBannerAction`) |
| Invite Staff User | Team > People & roles (`inviteStaff`, `setStaffRoleAction`, `setUserActiveAction`) |
| Add Routing Rule / Configure Pool | Team > Lead routing (`saveRoutingRuleAction`, `deleteRoutingRuleAction`) |
| Regenerate Slots | Team > Slot calendar (`generateSlotsAction`) |
| Intake Used Car | Used Stock > Add vehicle (`saveUsedCarAction`) |
| Mark Booking Attended | Bookings (`setBookingOutcomeAction`) |

**Removed rather than left dead:** "Add Showroom", "Add Workshop" and "Add Demo Car". There is no code to create those records; the Team > Showrooms & bays tab shows them read-only, with editable bay capacity (`updateWorkshopBaysAction`).

---

## 2. Verification

```bash
pnpm check:wiring        # dead-button audit
pnpm e2e:console         # every console feature, in a browser, asserted in Supabase (dev only)
pnpm charts:console      # overview charts and their table filters, asserted against Supabase (dev only)
pnpm layout:console      # phone/tablet/desktop layout audit of every console screen (dev only)
```

## Console overview charts

Every console screen opens with an **Overview** strip (charts load in the browser only, via `recharts`, so buyer pages are unaffected).
Clicking a KPI card, funnel stage or chart slice filters the table below it (`DataGrid` `externalFilter`); the chip or "Show all" clears it.
Numbers come from rows the page already reads, aggregated by `src/lib/analytics.ts`, except two small server queries in
`src/server/repositories/admin-overview.ts` (leads and bookings for the last 90 days, model demand, open-lead load).

| Screen | Charts | Source |
|---|---|---|
| `/staff` Lead Desk | pipeline funnel, lead source, interest by model, leads per day | the leads loaded in the grid (newest 200; labelled on the chart) |
| `/staff/bookings` | next-7-day bookings by type, workshop bay load, outcomes, type split | `bookings` and `slots` |
| `/staff/stock` | status, price bands, days on lot, fuel mix (trade-ins tab: condition, lead stage) | `used_cars`, `trade_in_requests` |
| `/admin` | lead funnel, enquiries vs replied in 5 min, online bookings, team workload (7/30/90 days) | `leads`, `bookings` (90 days) |
| `/admin/catalog` (Models) | enquiries by model, live vs hidden catalog | `leads`, `models`, `variants` |
| `/admin/team` | role and account split; open leads per consultant; capacity by day | `profiles`, `leads`, `slots` |

On phones the charts start collapsed (choice remembered per screen in `localStorage`) so the table is reachable first.
