# VROOMA — ACCESS & GATING MATRIX

## 1. Gating Philosophy: Value Before Capture

Car shoppers abandon websites when hit by an immediate registration wall. Vrooma uses a progressive value-first gating model:
1. **Free Exploration:** Anyone can explore all car models, view high-res photo galleries, read complete technical specifications, view ex-showroom price ranges, and inspect masked used car listings without logging in.
2. **Value Exchange Gates:**
   - **On-Road Price Breakup:** Calculating exact Lucknow/Kanpur RTO taxes, insurance premiums, and handling charges reveals real commercial intent. Unauthenticated visitors are prompted to provide name and mobile phone (with DPDP consent) to unlock the full breakdown.
   - **140-Point Inspection Dossier:** Summary scores (e.g. 138/140) are public. Viewing line-by-line tyre tread depths, engine compression stats, and diagnostic logs triggers the lead gate modal.
3. **Frictionless Booking:** Booking a test drive or service appointment does NOT require a pre-existing account or password. The booking form captures driver details and phone number, auto-creates a guest lead/profile, and presents the confirmation docket seamlessly.

---

## 2. Comprehensive Access Matrix

| Resource / Route | Anonymous Public | Authenticated Buyer | Sales Consultant | Used-Car Manager | Admin / Dealer Principal |
|---|---|---|---|---|---|
| **Home (`/`)** | View | View | View | View | View |
| **Model Catalog (`/cars`)** | View & Filter | View & Filter | View & Filter | View & Filter | View & Filter |
| **Model Detail (`/cars/[slug]`)** | View specs & base price | View all | View all | View all | View all |
| **On-Road Price Modal** | Gate (Name + Phone) | View full breakup | View full breakup | View full breakup | View full breakup |
| **Used Catalog (`/used-cars`)** | View (Masked Reg) | View (Masked Reg) | View (Masked Reg) | View (Full Reg) | View (Full Reg) |
| **Used Detail (`/used-cars/[id]`)** | View score summary | View full dossier | View full dossier | View full dossier | View full dossier |
| **140-pt Inspection Report** | Gate (Name + Phone) | View line-by-line | View line-by-line | View line-by-line | View line-by-line |
| **Book Test Drive (`/book/test-drive`)** | Auto-creates Guest | Book with profile | Assisted Booking | Assisted Booking | Assisted Booking |
| **Book Service (`/book/service`)** | Auto-creates Guest | Book with profile | Assisted Booking | Assisted Booking | Assisted Booking |
| **EMI Calculator (`/emi-calculator`)** | Free interactive use | Free interactive use | Free interactive use | Free interactive use | Free interactive use |
| **Trade-In Valuation (`/trade-in`)** | View AI price band | View AI price band | View AI price band | View AI price band | View AI price band |
| **Buyer Dashboard (`/dashboard/*`)** | Redirect to Sign-in | Manage profile/drives | Redirect to Staff | Redirect to Admin | Redirect to Admin |
| **Staff Lead Desk (`/staff/*`)** | 403 Forbidden | 403 Forbidden | Assigned showroom | All showrooms | All showrooms |
| **AI First-Reply Composer** | 403 Forbidden | 403 Forbidden | Edit & Send | Edit & Send | Edit & Send |
| **Admin Console (`/admin/*`)** | 403 Forbidden | 403 Forbidden | 403 Forbidden | Inventory only | Full CMS & Leakage |
| **AI Price Suggestion View** | Hidden | Hidden | Hidden | Visible & Editable | Visible & Editable |

---

## 3. Implementation Patterns

### In Components: `AuthGate`
```tsx
import { AuthGate } from "@/components/auth/AuthGate";

export function InspectionReportWrapper({ report }: { report: InspectionReport }) {
  return (
    <AuthGate
      reason="View the complete 140-point technical inspection report"
      fallback={<InspectionTeaserSummary score={report.score} />}
    >
      <FullInspectionDossier report={report} />
    </AuthGate>
  );
}
```

### In Routes: `useRequireAuth` & Middleware
Staff and Admin routes enforce role verification in layout shells and Next.js middleware, instantly routing unauthorized sessions to `/sign-in`.

