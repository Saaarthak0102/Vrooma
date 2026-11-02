# VROOMA — SYSTEM ARCHITECTURE

## 1. High-Level Architecture

Vrooma is designed as a modular, high-performance automotive dealership platform built on Next.js 15 App Router, TypeScript, and a repository-based persistence abstraction that supports zero-code-change switching between in-memory mock storage and Supabase PostgreSQL.

```mermaid
flowchart TD
  subgraph Presentation ["Presentation Layer (Next.js App Router)"]
    PublicUI["Public Catalog & Gated Breakup (SSR + CSR)"]
    BuyerUI["Buyer Dashboard & Booking Steppers (CSR)"]
    StaffUI["Staff Lead Desk & SLA Clocks (CSR)"]
    AdminUI["Dealer Principal CMS & Leakage Monitor (CSR)"]
  end

  subgraph API ["Next.js API & Route Handlers (/api/*)"]
    LeadAPI["/api/leads & import"]
    BookingAPI["/api/bookings & slots"]
    PriceAPI["/api/price & cars/search"]
    AIAgentAPI["/api/ai/lead-copilot"]
    DPDPAPI["/api/me/delete & consent"]
  end

  subgraph Domain ["Domain Core & Services"]
    PriceEngine["Pure Price Engine (RTO, TCS, Ins.)"]
    EMIEngine["Pure EMI & Amortisation Engine"]
    SLAService["SLA State Machine (<5m, Breached)"]
    AssignService["Showroom Auto-Assignment Service"]
    AIGuardrail["AI Discount Guardrail Sanitizer"]
  end

  subgraph Repositories ["Repository Abstraction Layer (src/server/repositories/*)"]
    ModelRepo["models.ts"]
    UsedCarRepo["used-cars.ts"]
    PricingRepo["pricing.ts"]
    LeadRepo["leads.ts"]
    BookingRepo["bookings.ts"]
  end

  subgraph Storage ["Storage Adapter"]
    MockStore["In-Memory Store (NEXT_PUBLIC_USE_MOCK=true)"]
    SupabaseDB["Supabase PostgreSQL + RLS (NEXT_PUBLIC_USE_MOCK=false)"]
  end

  Presentation --> API
  Presentation --> Domain
  API --> Domain
  API --> Repositories
  Repositories --> MockStore
  Repositories --> SupabaseDB
```

---

## 2. Mock-to-Supabase Swap Pattern

The entire data access layer is abstracted behind pure TypeScript interfaces in `src/server/repositories/`. No frontend page or API route communicates directly with a database driver.

### Persistence Switch Flag
The active adapter is controlled by a single environment variable:
```env
NEXT_PUBLIC_USE_MOCK=true # or false for live Supabase
```

### Repository Implementation Architecture
```typescript
// Example: src/server/repositories/leads.ts
import { env } from "@/lib/env";
import { getMockStore } from "@/server/store";
import { createServerClient } from "@/lib/supabase/server";

export async function getLeads(): Promise<Lead[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return getMockStore().getLeads();
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("leads").select("*");
  if (error) throw error;
  return data;
}
```

This guarantees:
1. Complete offline capability and immediate boot time during frontend development and automated unit testing.
2. 100% decoupling between UI state machines and database schemas.
3. Clean zero-regression migration to production Supabase by configuring connection credentials in `.env.local`.

---

## 3. Data Flow & Lead SLA Lifecycle

```mermaid
sequenceDiagram
  autonumber
  actor Customer as Car Buyer
  participant Web as Vrooma Web App
  participant API as /api/leads
  participant SLA as SLA Clock Engine
  actor Staff as Sales Consultant

  Customer->>Web: Submits on-road price enquiry / test drive
  Web->>API: POST /api/leads (with DPDP consent)
  API->>SLA: Starts 5-minute countdown clock
  API-->>Web: Confirmation + consultant name assigned
  Web-->>Customer: WhatsApp/SMS acknowledgement queued
  Staff->>Web: Opens Staff Lead Inbox
  Web->>Staff: Displays color-coded lead (Active: 4m 58s remaining)
  Staff->>Web: Generates AI First-Reply draft
  Note over Web: AI Guardrail strips any discount words
  Staff->>Customer: Calls customer & sends verified reply
  Staff->>Web: Marks lead as "Contacted" (SLA Met)
```

---

## 4. Security & DPDP Isolation

1. **Personal Data Masking:** Registration plates on pre-owned cars are permanently masked in public repository queries (`src/lib/masking.ts`).
2. **Consent & Erasure:** All customer forms capture explicit consent metadata (IP address, timestamp, terms version). Deletion requests immediately wipe lead records and dissociate past bookings via `/api/me/delete`.
3. **Role-Based Row Level Security (RLS):**
   - Public: Read-only access to published models, active price rules, and public stock.
   - Buyer: Read/write only on their own user ID.
   - Staff: Read/write on leads assigned to their designated showroom.
   - Admin / Used-Car Manager: Full access across catalogs and AI price recommendations.

