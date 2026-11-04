# VROOMA — DAILY DMS EXPORT SPECIFICATION

> **Purpose:** Daily CSV export feed synchronizing web leads, test drive reservations, and workshop service bookings into the dealership's Dealer Management System (DMS).

---

## 1. Security & Authorization

- **Access Guard:** Requires Dealership Admin / Manager role session OR Bearer Token matching `CRON_SECRET`.
- **Cache Policy:** `Cache-Control: no-store`.
- **Audit Logging:** Every export invocation logs an immutable entry to `public.audit_log` with actor ID, timestamp, and target date.

---

## 2. CSV Injection Prevention

Any formula execution vector (characters `= + - @ \t \r`) at the start of any text field is neutralised by prefixing with `'` and enclosing in standard CSV quotes (`"`).

---

## 3. IST Day Boundaries

Export covers one full calendar day in Indian Standard Time (`Asia/Kolkata`, UTC+05:30):
- Start: `YYYY-MM-DDT00:00:00+05:30` (Previous day 18:30:00 UTC)
- End: `YYYY-MM-DDT23:59:59.999+05:30` (Current day 18:29:59.999 UTC)

---

## 4. Export Field Dictionary

### Section A: Inbound Customer Leads

| Column | Description | Example |
|---|---|---|
| `record_type` | Always `LEAD` | `LEAD` |
| `lead_ref` | Dealership reference code | `LD-7K2M9X` |
| `customer_name` | Full customer name | `Rajesh Sharma` |
| `phone` | Standardized E.164 phone | `+919876543210` |
| `email` | Customer email address | `rajesh@example.com` |
| `showroom` | Facility assigned to handle lead | `Hazratganj Flagship` |
| `model_interest` | Car model or certified stock | `Model H` |
| `source` | Acquisition source channel | `web` / `portal` / `walkin` |
| `status` | Lead pipeline state | `new`, `contacted`, `won` |
| `assigned_consultant` | Named sales consultant | `Rohit Verma` |
| `created_at_ist` | Timestamp in IST | `2026-11-05 14:32:10` |

### Section B: Test Drive & Workshop Bookings

| Column | Description | Example |
|---|---|---|
| `record_type` | Always `BOOKING` | `BOOKING` |
| `booking_ref` | Dealership booking code | `BK-3X9P2Q` |
| `kind` | Test drive or service | `test_drive` / `service` |
| `customer_name` | Driver or vehicle owner | `Priya Verma` |
| `phone` | Contact mobile | `+919876543211` |
| `facility` | Showroom or Service Bay | `Indira Nagar Workshop` |
| `vehicle_info` | Vehicle model and masked reg | `Model C (UP32 ** **** 1234)` |
| `slot_time_ist` | Appointment window in IST | `2026-11-05 11:00 - 12:00` |
| `status` | Confirmation status | `confirmed`, `cancelled` |
| `created_at_ist` | Booking creation in IST | `2026-11-05 09:15:00` |

