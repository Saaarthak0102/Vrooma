# VROOMA — BUTTON SYSTEM & ORIGIN-AWARE MOTION INVENTORY

## 1. Architectural Overview & Design Contract

This document provides a comprehensive inventory of every button, interactive trigger, dropdown menu, select, popover, tooltip, and interactive panel across the Vrooma codebase.

### Core Principles
- **Behaviour Only:** No button changes its size, shape, colour, label, position, order or copy. Existing looks (pill shapes, 12px listing card buttons, disabled "Booked" styles) are strictly preserved.
- **GSAP & Layout Insulation:** All transforms, hovers, sweeps, and press scales are confined strictly to `.btn__surface`. The outer button/link element provides only layout positioning, hit area, and focus ring.
- **Pure CSS Motion:** Zero new JavaScript runtime for motion effects. Damped spring returns on press release via CSS `linear()` (settles in 420ms, ~3.8% overshoot).
- **Origin-Aware Dropdowns:** Menus, selects, and popovers dynamically anchor their scale and translate transitions to the Radix-calculated `transform-origin` and `data-side`.

---

## 2. GSAP Target Registry (Buttons & CTAs in Animated Timelines)

The following buttons or button containers are animated directly or indirectly by GSAP timelines in landing scenes and layout components. **These elements must NEVER receive CSS transform styles on their outer element**, ensuring zero conflict with GSAP pinning and scrubbing:

| File | GSAP Target / Selector | Animation Scope | Why Outer Transform is Forbidden |
|---|---|---|---|
| `src/components/landing/HeroScene.tsx` | `#hero-body-group` (`tl.to(heroBody, ...)`) | Pinned Hero exit at scroll 0.00–0.12 (opacity, y-shift) | Contains "Book a test drive" (`primary`) and "Browse cars" (`secondary`) PillButtons. Outer element is scrubbed by GSAP. |
| `src/components/landing/HeroScene.tsx` | `.hero-accordion-row` (`tl.to(...)`) | Mobile tap accordion & desktop height tweens | Interactive accordion row triggers. Layout height and opacity are managed by GSAP. |
| `src/components/landing/WhyVrooma.tsx` | `#why-dark-bar` (`tl.to(darkBar, ...)`) | Pinned scene progress 0.80–1.00 (y 60 -> 0, opacity 0 -> 1) | Contains "Book service" (`secondary`) PillButton. Outer dark bar is scrubbed by GSAP. |
| `src/components/landing/BookingSteps.tsx` | `#booking-right-card` (`tl.to(rightCard, ...)`) | Scene scroll entrance (x: 8vw -> 0, opacity 0 -> 1) | Contains "Explore cars" (`secondary`) PillButton. Card container is scrubbed by GSAP. |
| `src/components/landing/FinalCta.tsx` | `#final-cta-card` (`tl.to(...)`) | Route drawing & car scale scrub | Contains "Book a test drive" (`primary`) PillButton. Outer card is part of pinned stage layout. |
| `src/components/layout/SiteFooter.tsx` | `footerRef` / `wordmarkRef` (`ScrollTrigger`) | Wordmark rise behind links | Contains "Subscribe" newsletter form button. Outer form container interacts with footer scroll trigger. |

**Protection Guarantee:** In the Button component structure:
```html
<button class="btn" data-variant data-size data-shape data-status>
  <span class="btn__surface">  <!-- All transforms, scale, sweep, and highlight happen HERE -->
    <span class="btn__content">...</span>
  </span>
</button>
```
The outer element has `transform: none` at all times, completely eliminating GSAP transform matrix overwrites.

---

## 3. Master Button & Dropdown Inventory

Total inventory items: **219**.
Migration Status: **100% Complete**.

| File | Element | Kind | Current Look | Target Variant | Migration Status |
|---|---|---|---|---|---|
| `src/app/[locale]/(admin)/admin/assignment/page.tsx:24` | `<Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Add Routing Rul` | button | primary, pill, sm | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/assignment/page.tsx:59` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/banners/page.tsx:47` | `<Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Upload New Bann` | button | primary, pill, sm | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/models/page.tsx:56` | `<Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">` | link-button | ghost, pill, sm | ghost | Complete (Button Link) |
| `src/app/[locale]/(admin)/admin/models/page.tsx:62` | `<Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">` | link-button | ghost, pill, sm | ghost | Complete (Button Link) |
| `src/app/[locale]/(admin)/admin/models/page.tsx:82` | `<Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Create New Mode` | button | primary, pill, sm | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:53` | `<Select value={bodyType} onValueChange={(val) => setBodyType(val as any)}>` | button | primary, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:54` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:57` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:85` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:111` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:127` | `<Button type="submit" className="gap-2 text-xs">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/offers/page.tsx:52` | `<Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Create Showroom` | button | primary, pill, sm | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/prices/page.tsx:79` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/prices/page.tsx:104` | `<Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Create Price Ru` | button | primary, pill, sm | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/showrooms/page.tsx:101` | `<Button size="sm" variant="outline" className="text-xs gap-1" onClick={notWired(` | button | outline, pill, sm | outline | Complete (Button) |
| `src/app/[locale]/(admin)/admin/showrooms/page.tsx:115` | `<Button size="sm" variant="outline" className="text-xs gap-1" onClick={notWired(` | button | outline, pill, sm | outline | Complete (Button) |
| `src/app/[locale]/(admin)/admin/showrooms/page.tsx:129` | `<Button size="sm" variant="outline" className="text-xs gap-1" onClick={notWired(` | button | outline, pill, sm | outline | Complete (Button) |
| `src/app/[locale]/(admin)/admin/slots/page.tsx:65` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/used-cars/page.tsx:81` | `<Button asChild variant="secondary" size="sm" className="h-8 text-xs gap-1">` | link-button | secondary, pill, sm | secondary | Complete (Button Link) |
| `src/app/[locale]/(admin)/admin/used-cars/page.tsx:87` | `<Button asChild variant="ghost" size="sm" className="h-8 text-xs">` | link-button | ghost, pill, sm | ghost | Complete (Button Link) |
| `src/app/[locale]/(admin)/admin/used-cars/page.tsx:106` | `<Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Intake Used Car` | button | primary, pill, sm | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/used-cars/[id]/page.tsx:67` | `<Select value={status} onValueChange={(val) => setStatus(val as any)}>` | button | primary, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/used-cars/[id]/page.tsx:68` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/app/[locale]/(admin)/admin/used-cars/[id]/page.tsx:71` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/app/[locale]/(admin)/admin/used-cars/[id]/page.tsx:103` | `<Button type="submit" className="gap-2 text-xs">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/users/page.tsx:50` | `<Select` | button | primary, md | primary | Complete (Button) |
| `src/app/[locale]/(admin)/admin/users/page.tsx:54` | `<SelectTrigger className="h-8 text-xs bg-white">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/app/[locale]/(admin)/admin/users/page.tsx:57` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/app/[locale]/(admin)/admin/users/page.tsx:86` | `<Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Invite Staff Us` | button | primary, pill, sm | primary | Complete (Button) |
| `src/app/[locale]/(auth)/sign-in/page.tsx:60` | `<Button type="submit" className="w-full h-11 gap-2" disabled={loading}>` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(auth)/sign-in/page.tsx:72` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(auth)/sign-in/page.tsx:87` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(auth)/sign-in/page.tsx:96` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(auth)/sign-in/page.tsx:105` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(auth)/sign-in/page.tsx:114` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:142` | `<Button onClick={handleNext} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:158` | `<Button variant="outline" onClick={handleBack} className="gap-1.5">` | button | outline, pill, md | outline | Complete (Button) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:162` | `<Button onClick={handleNext} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:179` | `<Button variant="outline" onClick={handleBack} className="gap-1.5">` | button | outline, pill, md | outline | Complete (Button) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:183` | `<Button onClick={handleNext} disabled={!selectedSlot} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:206` | `<Select value={modelName} onValueChange={setModelName}>` | button | primary, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:207` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:210` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:250` | `<Button type="button" variant="outline" onClick={handleBack} className="gap-1.5"` | button | outline, pill, md | outline | Complete (Button) |
| `src/app/[locale]/(buyer)/book/service/page.tsx:254` | `<Button type="submit" disabled={isSubmitting} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/test-drive/page.tsx:132` | `<Button onClick={handleNext} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/test-drive/page.tsx:149` | `<Button variant="outline" onClick={handleBack} className="gap-1.5">` | button | outline, pill, md | outline | Complete (Button) |
| `src/app/[locale]/(buyer)/book/test-drive/page.tsx:153` | `<Button onClick={handleNext} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/test-drive/page.tsx:170` | `<Button variant="outline" onClick={handleBack} className="gap-1.5">` | button | outline, pill, md | outline | Complete (Button) |
| `src/app/[locale]/(buyer)/book/test-drive/page.tsx:174` | `<Button onClick={handleNext} disabled={!selectedSlot} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/book/test-drive/page.tsx:214` | `<Button type="button" variant="outline" onClick={handleBack} className="gap-1.5"` | button | outline, pill, md | outline | Complete (Button) |
| `src/app/[locale]/(buyer)/book/test-drive/page.tsx:218` | `<Button type="submit" disabled={isSubmitting} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(buyer)/dashboard/bookings/page.tsx:21` | `<Button asChild size="sm" variant="primary" className="text-xs gap-1.5">` | link-button | primary, pill, sm | primary | Complete (Button Link) |
| `src/app/[locale]/(buyer)/dashboard/bookings/page.tsx:35` | `<Button asChild variant="primary" size="sm">` | link-button | primary, pill, sm | primary | Complete (Button Link) |
| `src/app/[locale]/(buyer)/dashboard/page.tsx:28` | `<Button asChild size="sm" variant="secondary" className="text-xs">` | link-button | secondary, pill, sm | secondary | Complete (Button Link) |
| `src/app/[locale]/(buyer)/dashboard/page.tsx:31` | `<Button asChild size="sm" variant="primary" className="text-xs gap-1">` | link-button | primary, pill, sm | primary | Complete (Button Link) |
| `src/app/[locale]/(public)/offers/page.tsx:53` | `<Button asChild variant="primary" size="sm" className="text-xs gap-1">` | link-button | primary, pill, sm | primary | Complete (Button Link) |
| `src/app/[locale]/(public)/showrooms/page.tsx:71` | `<Button asChild variant="outline" size="sm" className="w-1/2 text-xs gap-1.5">` | link-button | outline, pill, sm | outline | Complete (Button Link) |
| `src/app/[locale]/(public)/showrooms/page.tsx:77` | `<Button asChild variant="secondary" size="sm" className="w-1/2 text-xs gap-1.5">` | link-button | secondary, pill, sm | secondary | Complete (Button Link) |
| `src/app/[locale]/(public)/showrooms/page.tsx:140` | `<Button asChild variant="outline" size="sm" className="w-1/2 text-xs gap-1.5">` | link-button | outline, pill, sm | outline | Complete (Button Link) |
| `src/app/[locale]/(public)/showrooms/page.tsx:146` | `<Button asChild variant="primary" size="sm" className="w-1/2 text-xs gap-1.5">` | link-button | primary, pill, sm | primary | Complete (Button Link) |
| `src/app/[locale]/(public)/used-cars/page.tsx:120` | `<Button variant="secondary" size="sm" onClick={handleReset}>` | button | secondary, pill, sm | secondary | Complete (Button) |
| `src/app/[locale]/(public)/used-cars/[stockId]/UsedCarDetailView.tsx:104` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(public)/used-cars/[stockId]/UsedCarDetailView.tsx:115` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(staff)/staff/bookings/page.tsx:78` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(staff)/staff/leads/import/page.tsx:71` | `<Button asChild variant="outline" size="sm" className="text-xs gap-1.5">` | link-button | outline, pill, sm | outline | Complete (Button Link) |
| `src/app/[locale]/(staff)/staff/leads/import/page.tsx:87` | `<Button variant="ghost" size="sm" onClick={loadSample} className="text-xs text-a` | button | ghost, pill, sm | ghost | Complete (Button) |
| `src/app/[locale]/(staff)/staff/leads/import/page.tsx:105` | `<Button onClick={handleImport} disabled={loading \|\| !csvContent.trim()} classNam` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(staff)/staff/leads/import/page.tsx:149` | `<Button asChild size="sm" variant="primary">` | link-button | primary, pill, sm | primary | Complete (Button Link) |
| `src/app/[locale]/(staff)/staff/leads/page.tsx:57` | `<Button asChild size="sm" variant="outline" className="text-xs gap-1.5 self-star` | link-button | outline, pill, sm | outline | Complete (Button Link) |
| `src/app/[locale]/(staff)/staff/leads/page.tsx:75` | `<Select value={statusFilter} onValueChange={setStatusFilter}>` | button | primary, md | primary | Complete (Button) |
| `src/app/[locale]/(staff)/staff/leads/page.tsx:76` | `<SelectTrigger className="h-11 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/app/[locale]/(staff)/staff/leads/page.tsx:79` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/app/[locale]/(staff)/staff/leads/page.tsx:103` | `<Select value={sourceFilter} onValueChange={setSourceFilter}>` | button | primary, md | primary | Complete (Button) |
| `src/app/[locale]/(staff)/staff/leads/page.tsx:104` | `<SelectTrigger className="h-11 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/app/[locale]/(staff)/staff/leads/page.tsx:107` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/app/[locale]/(staff)/staff/leads/page.tsx:125` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/(staff)/staff/leads/[id]/page.tsx:32` | `<Button asChild size="sm" variant="outline">` | link-button | outline, pill, sm | outline | Complete (Button Link) |
| `src/app/[locale]/(staff)/staff/page.tsx:38` | `<Button asChild size="sm" variant="outline" className="text-xs">` | link-button | outline, pill, sm | outline | Complete (Button Link) |
| `src/app/[locale]/(staff)/staff/page.tsx:41` | `<Button asChild size="sm" variant="primary" className="text-xs">` | link-button | primary, pill, sm | primary | Complete (Button Link) |
| `src/app/[locale]/error.tsx:30` | `<Button onClick={() => reset()} className="gap-2">` | button | primary, pill, md | primary | Complete (Button) |
| `src/app/[locale]/not-found.tsx:19` | `<Button asChild className="gap-2">` | link-button | primary, pill, md | primary | Complete (Button Link) |
| `src/components/admin/PriceSuggestionCard.tsx:89` | `<Button type="submit" size="sm" className="h-10 px-4 text-xs shrink-0 gap-1.5">` | button | primary, pill, sm | primary | Complete (Button) |
| `src/components/auth/AuthGate.tsx:44` | `<Button variant="primary" size="sm" onClick={() => openSignInSheet()}>` | button | primary, pill, sm | primary | Complete (Button) |
| `src/components/auth/SignInSheet.tsx:69` | `<Button type="submit" className="w-full gap-2" disabled={isLoading}>` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/auth/SignInSheet.tsx:81` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/auth/SignInSheet.tsx:114` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/auth/SignInSheet.tsx:123` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/auth/SignInSheet.tsx:132` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/auth/SignInSheet.tsx:141` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/auth/UserMenu.tsx:35` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/auth/UserMenu.tsx:53` | `<DropdownMenu>` | button | primary, md | primary | Complete (Button) |
| `src/components/auth/UserMenu.tsx:54` | `<DropdownMenuTrigger asChild>` | dropdown trigger | trigger, pill or ghost | ghost / trigger | Complete (Origin-Aware) |
| `src/components/auth/UserMenu.tsx:55` | `<button className="flex items-center gap-2 rounded-pill p-1 hover:bg-ink/5 trans` | chip-toggle | raw chip button | ghost / outline chip | Complete (Chip / Button) |
| `src/components/auth/UserMenu.tsx:65` | `<DropdownMenuContent align="end" className="w-56">` | dropdown content | floating panel | origin-aware dropdown | Complete (Origin-Aware) |
| `src/components/booking/BookingConfirmation.tsx:91` | `<Button asChild variant="outline" className="w-full text-xs">` | link-button | outline, pill, md | outline | Complete (Button Link) |
| `src/components/booking/BookingConfirmation.tsx:94` | `<Button asChild variant="primary" className="w-full text-xs gap-1">` | link-button | primary, pill, md | primary | Complete (Button Link) |
| `src/components/booking/SlotPicker.tsx:54` | `<button` | chip-toggle | raw chip button | ghost / outline chip | Complete (Chip / Button) |
| `src/components/booking/SlotPicker.tsx:101` | `<Tooltip key={slot.id}>` | button | primary, md | primary | Complete (Button) |
| `src/components/booking/SlotPicker.tsx:102` | `<TooltipTrigger asChild>` | dropdown trigger | tooltip trigger | tooltip-trigger | Complete (Origin-Aware) |
| `src/components/booking/SlotPicker.tsx:103` | `<button` | chip-toggle | raw chip button | ghost / outline chip | Complete (Chip / Button) |
| `src/components/booking/SlotPicker.tsx:112` | `<TooltipContent>` | tooltip | dark tooltip | origin-aware tooltip | Complete (Origin-Aware) |
| `src/components/booking/SlotPicker.tsx:117` | `<button` | chip-toggle | raw chip button | ghost / outline chip | Complete (Chip / Button) |
| `src/components/cars/CarGrid.tsx:34` | `<Button variant="secondary" size="sm" onClick={onClearFilters}>` | button | secondary, pill, sm | secondary | Complete (Button) |
| `src/components/cars/CitySelect.tsx:18` | `<Select value={value} onValueChange={onChange}>` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/CitySelect.tsx:19` | `<SelectTrigger className="h-9 min-w-[130px] text-xs bg-white font-medium">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/CitySelect.tsx:22` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/ColorSwatches.tsx:36` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/cars/FilterBar.tsx:33` | `<Select value={filters.city} onValueChange={(val) => onChange("city", val)}>` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/FilterBar.tsx:34` | `<SelectTrigger className="h-9 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/FilterBar.tsx:37` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/FilterBar.tsx:49` | `<Select value={filters.bodyType} onValueChange={(val) => onChange("bodyType", va` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/FilterBar.tsx:50` | `<SelectTrigger className="h-9 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/FilterBar.tsx:53` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/FilterBar.tsx:68` | `<Select value={filters.fuel} onValueChange={(val) => onChange("fuel", val)}>` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/FilterBar.tsx:69` | `<SelectTrigger className="h-9 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/FilterBar.tsx:72` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/FilterBar.tsx:87` | `<Select` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/FilterBar.tsx:91` | `<SelectTrigger className="h-9 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/FilterBar.tsx:94` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/FilterBar.tsx:115` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/cars/FilterSheet.tsx:31` | `<Button variant="secondary" size="sm" className="gap-2 text-xs h-10 px-4 md:hidd` | button | secondary, pill, sm | secondary | Complete (Button) |
| `src/components/cars/FilterSheet.tsx:47` | `<Select value={filters.city} onValueChange={(val) => onChange("city", val)}>` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/FilterSheet.tsx:48` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/FilterSheet.tsx:51` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/FilterSheet.tsx:65` | `<Select value={filters.bodyType} onValueChange={(val) => onChange("bodyType", va` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/FilterSheet.tsx:66` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/FilterSheet.tsx:69` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/FilterSheet.tsx:84` | `<Select value={filters.fuel} onValueChange={(val) => onChange("fuel", val)}>` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/FilterSheet.tsx:85` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/FilterSheet.tsx:88` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/FilterSheet.tsx:103` | `<Select` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/FilterSheet.tsx:107` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/FilterSheet.tsx:110` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/cars/FilterSheet.tsx:122` | `<Button variant="outline" size="sm" onClick={onReset} className="w-1/3 gap-1">` | button | outline, pill, sm | outline | Complete (Button) |
| `src/components/cars/FilterSheet.tsx:126` | `<Button variant="primary" size="sm" onClick={() => setOpen(false)} className="w-` | button | primary, pill, sm | primary | Complete (Button) |
| `src/components/cars/Gallery.tsx:36` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/cars/PriceSummaryBar.tsx:66` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/cars/PriceSummaryBar.tsx:76` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/cars/PriceSummaryBar.tsx:86` | `<Button asChild variant="primary" size="sm" className="text-xs gap-1.5">` | link-button | primary, pill, sm | primary | Complete (Button Link) |
| `src/components/cars/SearchBox.tsx:31` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/cars/SortSelect.tsx:15` | `<Select value={value} onValueChange={onChange}>` | button | primary, md | primary | Complete (Button) |
| `src/components/cars/SortSelect.tsx:16` | `<SelectTrigger className="h-11 bg-white text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/cars/SortSelect.tsx:19` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/chat/ChatWidget.tsx:95` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/chat/ChatWidget.tsx:127` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/chat/ChatWidget.tsx:170` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/chat/ChatWidget.tsx:195` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/dashboard/BookingCard.tsx:62` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/dashboard/BookingCard.tsx:70` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/dashboard/DataRightsPanel.tsx:78` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/dashboard/ProfileForm.tsx:40` | `<Button type="submit" size="sm" disabled={loading} className="text-xs">` | button | primary, pill, sm | primary | Complete (Button) |
| `src/components/dashboard/SavedCarCard.tsx:61` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/dev/NotWired.tsx:37` | `role="button"` | button | primary, md | primary | Complete (Button) |
| `src/components/emi/EmiCalculator.tsx:146` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/forms/EnquiryForm.tsx:121` | `<Select` | button | primary, md | primary | Complete (Button) |
| `src/components/forms/EnquiryForm.tsx:125` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/forms/EnquiryForm.tsx:128` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/forms/EnquiryForm.tsx:150` | `<Button type="submit" className="w-full h-11" disabled={loading}>` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/forms/TradeInForm.tsx:108` | `<Select` | button | primary, md | primary | Complete (Button) |
| `src/components/forms/TradeInForm.tsx:112` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/forms/TradeInForm.tsx:115` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/forms/TradeInForm.tsx:149` | `<Button type="submit" className="w-full h-11" disabled={loading}>` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/landing/BookingSteps.tsx:267` | `<PillButton asChild variant="secondary" showArrow className="w-full justify-cent` | link-button | secondary, pill, md/lg | secondary | Complete (Button Link) |
| `src/components/landing/BookingSteps.tsx:380` | `<PillButton asChild variant="secondary" showArrow className="w-full bg-white tex` | link-button | secondary, pill, md/lg | secondary | Complete (Button Link) |
| `src/components/landing/FeaturedStrip.tsx:93` | `<PillButton asChild variant="secondary" showArrow className="w-full fs-small h-1` | link-button | secondary, pill, md/lg | secondary | Complete (Button Link) |
| `src/components/landing/FinalCta.tsx:138` | `<PillButton asChild variant="primary" showArrow className="h-11 px-7 fs-small">` | link-button | primary, pill, md/lg | primary | Complete (Button Link) |
| `src/components/landing/FinalCta.tsx:218` | `<PillButton asChild variant="primary" showArrow className="w-full sm:w-auto h-12` | link-button | primary, pill, md/lg | primary | Complete (Button Link) |
| `src/components/landing/HeroScene.tsx:296` | `<PillButton asChild variant="primary" showArrow className="h-11 px-6 fs-small">` | link-button | primary, pill, md/lg | primary | Complete (Button Link) |
| `src/components/landing/HeroScene.tsx:299` | `<PillButton asChild variant="secondary" className="h-11 px-5 fs-small">` | link-button | secondary, pill, md/lg | secondary | Complete (Button Link) |
| `src/components/landing/HeroScene.tsx:530` | `<PillButton asChild variant="primary" showArrow className="w-full sm:w-auto h-11` | link-button | primary, pill, md/lg | primary | Complete (Button Link) |
| `src/components/landing/HeroScene.tsx:533` | `<PillButton asChild variant="secondary" className="w-full sm:w-auto h-11 fs-smal` | link-button | secondary, pill, md/lg | secondary | Complete (Button Link) |
| `src/components/landing/HeroScene.tsx:596` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/landing/WhyVrooma.tsx:282` | `<PillButton asChild variant="secondary" showArrow className="h-11 fs-small px-6 ` | link-button | secondary, pill, md/lg | secondary | Complete (Button Link) |
| `src/components/landing/WhyVrooma.tsx:368` | `<PillButton asChild variant="secondary" showArrow className="w-full fs-small bg-` | link-button | secondary, pill, md/lg | secondary | Complete (Button Link) |
| `src/components/layout/LocaleSwitcher.tsx:23` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/layout/MobileNav.tsx:29` | `<Button variant="ghost" size="icon" aria-label="Open Navigation Menu">` | icon button | ghost/secondary, icon, 36-44px | icon | Complete (Button) |
| `src/components/layout/SiteFooter.tsx:147` | `<PillButton` | button | primary, pill, md/lg | primary | Complete (Button) |
| `src/components/layout/SiteHeader.tsx:118` | `<PillButton asChild variant="primary" showArrow className="h-10 text-xs px-4">` | link-button | primary, pill, md/lg | primary | Complete (Button Link) |
| `src/components/layout/SiteHeader.tsx:124` | `<button` | button | raw button | primary | Complete (Nav Link / Button) |
| `src/components/layout/SiteHeader.tsx:168` | `<button` | button | raw button | primary | Complete (Nav Link / Button) |
| `src/components/layout/SiteHeader.tsx:198` | `<PillButton asChild variant="primary" showArrow className="w-full justify-betwee` | link-button | primary, pill, md/lg | primary | Complete (Button Link) |
| `src/components/listing/CarListingCard.tsx:255` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/listing/CarListingCard.tsx:266` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/listing/CarListingCard.tsx:277` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/listing/OfferListingCard.tsx:153` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/listing/OfferListingCard.tsx:164` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/listing/UsedListingCard.tsx:244` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/listing/UsedListingCard.tsx:256` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/listing/UsedListingCard.tsx:267` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/listing/UsedListingCard.tsx:278` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/staff/LeadRow.tsx:56` | `<Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1">` | link-button | ghost, pill, sm | ghost | Complete (Button Link) |
| `src/components/staff/ReassignDialog.tsx:55` | `<Button variant="outline" size="sm" className="text-xs gap-1.5 h-9">` | button | outline, pill, sm | outline | Complete (Button) |
| `src/components/staff/ReassignDialog.tsx:69` | `<Select value={selectedConsultant} onValueChange={setSelectedConsultant}>` | button | primary, md | primary | Complete (Button) |
| `src/components/staff/ReassignDialog.tsx:70` | `<SelectTrigger>` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/staff/ReassignDialog.tsx:73` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/staff/ReassignDialog.tsx:84` | `<Button variant="ghost" size="sm" onClick={() => setOpen(false)}>` | button | ghost, pill, sm | ghost | Complete (Button) |
| `src/components/staff/ReassignDialog.tsx:87` | `<Button variant="primary" size="sm" onClick={handleReassign} disabled={loading}>` | button | primary, pill, sm | primary | Complete (Button) |
| `src/components/staff/ReplyDraftEditor.tsx:132` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/ui/button.tsx:69` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/ui/flip-card.tsx:67` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/ui/flip-card.tsx:233` | `'a,button,input,select,textarea,label,summary,[role="button"],[role="link"],[dat` | button | primary, md | primary | Complete (Button) |
| `src/components/ui/pagination.tsx:46` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
| `src/components/ui/PillButton.tsx:48` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/used/UsedCarCard.tsx:131` | `<button` | button | raw button | primary | Complete (Button) |
| `src/components/used/UsedFilters.tsx:36` | `<Select value={filters.modelId} onValueChange={(val) => onChange("modelId", val)` | button | primary, md | primary | Complete (Button) |
| `src/components/used/UsedFilters.tsx:37` | `<SelectTrigger className="h-9 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/used/UsedFilters.tsx:40` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/used/UsedFilters.tsx:65` | `<Select value={filters.fuel} onValueChange={(val) => onChange("fuel", val)}>` | button | primary, md | primary | Complete (Button) |
| `src/components/used/UsedFilters.tsx:66` | `<SelectTrigger className="h-9 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/used/UsedFilters.tsx:69` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/used/UsedFilters.tsx:84` | `<Select` | button | primary, md | primary | Complete (Button) |
| `src/components/used/UsedFilters.tsx:88` | `<SelectTrigger className="h-9 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/used/UsedFilters.tsx:91` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |
| `src/components/used/UsedFilters.tsx:110` | `<Select` | button | primary, md | primary | Complete (Button) |
| `src/components/used/UsedFilters.tsx:114` | `<SelectTrigger className="h-9 text-xs">` | dropdown trigger | select trigger, border | select-trigger | Complete (Origin-Aware) |
| `src/components/used/UsedFilters.tsx:117` | `<SelectContent>` | dropdown content | floating select menu | origin-aware select | Complete (Origin-Aware) |

---

## 4. Regression Analysis & Layout Insulation Fixes (Dashboard / Header)

### 4.1 Identified Root Causes

1. **Anonymous Wrapper Span Stacking (`LocaleSwitcher`, `UserMenu`, `BookingCard` "Book Demo"):**
   - In `src/components/ui/button.tsx`, button children were automatically enclosed inside an anonymous, unstyled `<span>{children}</span>` within `.btn__label`.
   - Because `.btn__label` is a flex container, it treated that wrapper `<span>` as a single child. Inside the unstyled `<span>` (which had `display: inline` and no flex properties), adjacent inline or block elements (e.g. `<Globe />` + `<span>हिन्दी</span>`, or `<Avatar />` + `<span>Aditya</span>` + `<ChevronDown />`, or `<span>Book Demo</span>` + `<ArrowRight />`) lacked flex layout, causing them to break across multiple lines.
   - Because `.btn__surface` enforces `overflow: hidden` to clip motion sweeps, wrapped elements below the first line were clipped and rendered invisible (e.g., user name and chevron clipped, leaving only the avatar).

2. **Secondary & Outline Button Hover Pseudolayer Bleed ("Chat with us" pill outline):**
   - The `::before` highlight layer on `.btn[data-variant="secondary"]` and `.btn[data-variant="outline"]` had `opacity: 0.06;` permanently declared at rest (scaled via `scaleX(0)`).
   - In subpixel and high-DPI rendering, `scaleX(0)` with rounded corners can leak a faint subpixel vertical line or contour at rest.
   - Additionally, external padding utility classes (`px-4`) passed to the outer `.btn` created a gap between the outer element and `.btn__surface`, causing two nested rounded borders to appear.

### 4.2 Systematic Fixes Applied

1. **Direct Children in `.btn__label`:** Removed the intermediate wrapper `<span>` from `button.tsx` so that icon elements and text labels are direct flex children of `.btn__label`.
2. **Strict Flex & Gap Rule:** `.btn__label` enforces `display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap;`. Direct nested spans and SVG icons inherit flex centering and non-wrapping layout.
3. **Explicit Wrap Opt-In:** Added `wrap?: boolean` prop to `ButtonProps` (`data-wrap="true"`). All buttons default to `white-space: nowrap` unless explicitly configured with `wrap={true}`.
4. **Rest-State Zero Opacity:** Updated `src/styles/buttons.css` so secondary and outline `::before` pseudo-layers have `opacity: 0;` at rest, transitioning to `opacity: 0.06; transform: scaleX(1);` only during hover on fine-pointer devices.
5. **Outer Button Insulation:** Enforced `padding: 0 !important; border: none !important;` on `.btn` to prevent external padding/border utilities from offsetting the inner `.btn__surface`.

| `src/components/used/UsedFilters.tsx:135` | `<Button` | button | primary, pill, md | primary | Complete (Button) |
