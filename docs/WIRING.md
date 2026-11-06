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
pnpm layout:console      # phone/tablet/desktop layout audit of every console screen (dev only)
```
