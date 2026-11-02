# VROOMA — ARCHITECTURAL DECISION RECORDS (ADRs)

## ADR-001: Next.js 15 App Router & React 19
- **Context:** The dealership platform requires fast public search indexing (SSR) alongside highly reactive client dashboards (CSR) and steppers.
- **Decision:** Adopt Next.js 15 App Router with TypeScript `strict: true`.
- **Consequences:** Pages benefit from server-side rendering for SEO and JSON-LD schema generation, while client components handle interactive filters, loan sliders, and modals.

---

## ADR-002: Repository Pattern for Data Access Abstraction
- **Context:** Need to ship a complete, high-fidelity Phase 1 frontend that runs immediately offline without requiring a live cloud database, while enabling a seamless swap to Supabase in Phase 2.
- **Decision:** Isolate all data fetching and mutations behind domain interfaces in `src/server/repositories/*`. An environment flag `NEXT_PUBLIC_USE_MOCK=true` selects an in-memory mutable store or Supabase SSR client.
- **Consequences:** Zero UI components or API routes contain direct SQL or database driver code. Swapping to Supabase requires editing zero frontend files.

---

## ADR-003: Integer Rupees Representation
- **Context:** Floating-point arithmetic introduces rounding drift in financial calculations (road tax, insurance, GST, EMI).
- **Decision:** All monetary amounts in database schemas, types, and APIs are stored strictly as integer Indian Rupees (`BIGINT`).
- **Consequences:** Eliminates decimal rounding discrepancies; display formatting is handled by pure utility functions (`formatINR`, `formatLakh`).

---

## ADR-004: URL State Synchronization with `nuqs`
- **Context:** Car buyers filter inventory by multiple facets (price, body, fuel, transmission, year). Page reloads or React context state make URLs unshareable and degrade back/forward navigation.
- **Decision:** Utilize `nuqs` (Next.js URL query state) for all catalog filters.
- **Consequences:** Filter states are fully synchronized with the browser URL, crawlable, bookmarkable, and shareable via WhatsApp without full-page reloads.

---

## ADR-005: Strict Dead-Button Policy with `notWired()`
- **Context:** Prototypes often contain dead links (`href="#"`) or silent `onClick` handlers that confuse stakeholders and users.
- **Decision:** Prohibit dead links and empty callbacks. All actions pending backend integration must use `notWired("Action Label", targetDay)` and be registered in `docs/WIRING.md`.
- **Consequences:** Users receive immediate visual feedback via Sonner toasts, and developers maintain an automated audit trail tracked by `scripts/check-wiring.mjs`.

---

## ADR-006: Radix UI Primitives with Luxury Tokens
- **Context:** Dealership UI must feel like a bespoke automotive showroom rather than a generic boilerplate template.
- **Decision:** Wrap un-styled Radix UI primitives (`@radix-ui/react-*`) in `src/components/ui/` with custom CSS variable tokens (`--bg`, `--surface`, `--ink`, `--accent`).
- **Consequences:** Full keyboard accessibility (WAI-ARIA compliance) with bespoke luxury automotive aesthetics.

