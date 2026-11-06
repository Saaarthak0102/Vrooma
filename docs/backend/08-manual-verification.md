# Vrooma: manual verification checklist (you do this one)

How to use: run a production build (`npm run build && npm start`) so you test what you would ship. Use a normal window, an incognito window (a second person) and, if you can, your phone on the same Wi-Fi. Keep the browser console open (F12) all the time: any red error is a failure. Write PASS or FAIL and a note in the last column. Send me every FAIL with a screenshot.

Test accounts you need: email 1 (a new buyer), email 2 (a second buyer), a Google account, your admin email, one extra email to invite as a consultant.

## S. Setup sanity (5 min)
| # | Step | Expected | Result |
|---|---|---|---|
| S1 | Open `.env.local`. The Supabase URL must contain `eobtzcwinjmimzisypca` (DEV). Check the tables exist in THAT project (Table Editor) | DEV ref. About 35 tables visible. `ajumkjokagqfdikfguti` (PROD) appears nowhere in `.env.local` | |
| S1b | Open the PRODUCTION project (`ajum…`) in Supabase and run in its SQL editor: `select count(*) from auth.users;` and `select table_name from information_schema.tables where table_schema='public';` | Expect no users and no tables (or only what you pushed on purpose). If you see test users or test data, tell me before doing anything else. | |
| S2 | `.env.local` has no `NEXT_PUBLIC_USE_MOCK`; `APP_ENV=development` | True | |
| S3 | Supabase SQL editor: `select jobname, schedule, active from cron.job;` | Jobs listed and active (SLA, slots, purges, deletions) | |
| S4 | Supabase, Authentication, Users | Your test users appear here after you sign up | |
| S5 | Open every page type once with the console open: landing, cars, model, used cars, used car, offers, showrooms, EMI, contact, sign-in, dashboard | No red console errors, no blocked-by-CSP messages, animations work | |

## A. Authentication
| # | Step | Expected | Result |
|---|---|---|---|
| A1 | `/sign-up`, fill everything for email 1, request the code | Code email arrives within about a minute | |
| A2 | Type a wrong code | Clear error, you can retry | |
| A3 | Type the right code | Lands on the dashboard. Supabase table `profiles`: phone is `+91…`, city, language, `onboarding_completed_at` set. Table `consents`: rows for terms and service contact. | |
| A4 | Sign up another email leaving "offers and news" UNTICKED | No marketing consent granted | |
| A5 | Try to submit with a required consent unticked | Blocked, with a message | |
| A6 | Press "Resend code" repeatedly | Button disabled for about 60 s, friendly message, no crash | |
| A7 | Request a code, wait over 10 minutes, use it | "Expired" message, resend works | |
| A8 | Request a code on your laptop, open the email on your phone and use the code or link there | Works from the other device | |
| A9 | Google sign-in with a new Google account | Sent to `/onboarding`, can't skip, finishing it opens the dashboard | |
| A10 | Cancel on the Google screen | Back on sign-in with a friendly message | |
| A11 | Sign in with Google using the same email as email 1 | One user in Authentication, one row in `profiles` (no duplicate) | |
| A12 | Signed out, open `/book/test-drive` | Sign-in sheet, then after login you return and the booking continues | |
| A13 | Signed out, open `/dashboard` | Redirect to `/sign-in?next=/dashboard` | |
| A14 | Open `/sign-in?next=//evil.com` and sign in | You end on your dashboard, never on another site | |
| A15 | Sign out in one tab; look at another tab | Other tab shows signed out after a refresh or action | |
| A16 | As a buyer open `/staff` and `/admin` | A clear "no access" page, no redirect loop | |
| A17 | Repeat A1 to A3 on `/hi/sign-up` | Same flow in Hindi, text fits | |
| A18 | Run the bootstrap admin script for your email, then sign in | `/admin` opens. Running it again refuses unless forced. | |
| A19 | Admin, Users, invite your extra email as consultant | Invite email arrives, accepting it gives `/staff` but not `/admin` | |
| A20 | Admin deactivates that consultant | Their next request is rejected or they are signed out | |
| A21 | `npm start` (production mode): open `/api/auth/dev-login` | Not found (404) | |

## B. Public site (signed out, incognito)
| # | Step | Expected | Result |
|---|---|---|---|
| B1 | Landing | Real models and prices. Any on-road number shows a valid-until date and "prices may change". | |
| B2 | Cars page: search with a typo, filter, sort, reload | Results sensible, filters stay in the URL, empty state is clean | |
| B3 | Open a model | Ex-showroom price and "on-road from" teaser only. Full breakup asks you to sign in. | |
| B4 | Sign in and open the same model | Full breakup with each line, validity date and the "may change" note | |
| B5 | Used cars: view the page source and search for a full registration number | Only the masked form (`UP32 ** **** 1234`) exists anywhere | |
| B6 | A booked used car | Shown, but cannot be booked | |
| B7 | Offers page | Only unexpired offers | |
| B8 | EMI calculator with 10,00,000, 9%, 60 months | About ₹20,758 per month | |
| B9 | Contact form with consent ticked, then again with the same phone within a day | First creates a lead. Second does NOT create a second lead (it adds a repeat note). | |
| B10 | Contact form 11 times in a minute | After about 10, a "too many requests" response | |
| B11 | Footer newsletter without consent, then with | Blocked, then success. Using the unsubscribe link works twice without error. | |
| B12 | `/sitemap.xml` and `/robots.txt` | Real car pages listed; `/dashboard`, `/staff`, `/admin`, `/api` disallowed | |

## C. Buyer (signed in as email 1; second browser as email 2)
| # | Step | Expected | Result |
|---|---|---|---|
| C1 | Book a test drive (showroom, demo car, date, slot) | Confirmation with a `VR-…` reference. Appears on the dashboard. | |
| C2 | In both browsers, open the same last free slot and click book at the same moment | Exactly one booking succeeds. The other sees "just taken" and fresh slots. | |
| C3 | Double-click the confirm button | One booking only | |
| C4 | Try a second booking at an overlapping time | Friendly error naming the existing booking | |
| C5 | Reschedule to another slot, then to a full one | New slot works. Full slot fails and the old booking stays. | |
| C6 | Cancel a booking, cancel it again | Slot becomes free again. Second cancel is harmless. | |
| C7 | Service booking with an invalid registration, then a valid one | Invalid is rejected. Valid is accepted and shown masked in lists. | |
| C8 | After a booking, look at Staff, Leads (as consultant or admin) | A lead exists, assigned to a named consultant, with a 5-minute timer | |
| C9 | Trade-in: 6 photos fine; a 7th, a 6 MB photo, and a renamed `.exe` file | 7th, big file and fake type are rejected. Submit creates a lead. | |
| C10 | After the trade-in submit | You are NOT shown any price band or valuation number | |
| C11 | Save two cars, unsave one | Count and list always match. A sold car shows "No longer available". | |
| C12 | Dashboard: "View all" panel, browser Back, reload on `?view=saved` | Panel opens in place, Back closes it, deep link opens it. No page scroll on laptop; footer reachable. | |
| C13 | Enquiries panel | Friendly status words only, no internal or AI text | |
| C14 | Profile: change phone; open the profile in two tabs and save in both | Phone normalised. Second save says someone changed it. | |
| C15 | Profile: download my data | JSON with only your own data | |
| C16 | Delete my account | Signed out, bookings cancelled, signing in within 7 days cancels the request | |

## D. Staff (consultant, then manager, then admin)
| # | Step | Expected | Result |
|---|---|---|---|
| D1 | Consultant opens the lead inbox | Sees only leads of their own showroom | |
| D2 | Create a lead as a buyer while the inbox is open | It appears within seconds without refresh, with a timer | |
| D3 | Mark the lead contacted | Timer stops, first-contact time stored | |
| D4 | Leave a new lead untouched for 5+ minutes | Marked breached, manager notified (outbox row) | |
| D5 | Reassign a lead | Reason required, new consultant sees it, event logged | |
| D6 | Reply draft containing "discount" or "छूट" | Blocked | |
| D7 | Reply draft with "Our office opens at 9" and "कम समय में" | NOT blocked | |
| D8 | CSV import: use a file with a `+919876543210` phone, a duplicate row, a bad phone and a formula cell | Plus sign kept, duplicate and bad rows reported with row numbers, good rows imported. Importing the same file again creates nothing new. | |
| D9 | CSV with over 2,000 rows | Rejected clearly | |
| D10 | Daily CSV export (admin) opened in Excel | Opens fine; cells that start with `=` are escaped | |
| D11 | Paste another showroom's lead URL as a consultant | Not found or forbidden | |
| D12 | Consultant looks for the used-car price suggestion | Not visible. Manager can see it. | |

## E. Admin
| # | Step | Expected | Result |
|---|---|---|---|
| E1 | Add a model and variant with an image (try a huge and a wrong-type file too) | Good image accepted. Bad ones rejected. Appears on the site after refresh. | |
| E2 | Add a price rule overlapping an existing one | Rejected with a clear message | |
| E3 | Let a rule expire (or set dates in the past) | Public page shows "Contact showroom", not a number | |
| E4 | Change a used car's status and price | Valid transitions only; only manager or admin can change price | |
| E5 | Generate slots; check a closure date | No slots on closed days | |
| E6 | Add an assignment rule | Next lead for that showroom goes to the pool | |
| E7 | Change roles; try to demote yourself or the last admin | Blocked | |
| E8 | Open the audit log | Price and role changes recorded with who and when | |
| E9 | Open System | Outbox size, dead letters, cron runs visible | |
| E10 | Leak dashboard | Numbers agree with the leads you created and contacted | |

## F. Background jobs and email
| # | Step | Expected | Result |
|---|---|---|---|
| F1 | `select * from cron.job_run_details order by start_time desc limit 20;` | Recent runs, status succeeded | |
| F2 | Who calls `/api/cron/outbox`, `finalize-deletions`, `data-retention`? | A scheduler exists for each (pg_cron + pg_net, or an external scheduler). Write down which. | |
| F3 | Call an outbox cron route without the secret, then with it (PowerShell `Invoke-WebRequest`) | 401 without, 200 with | |
| F4 | Make a booking, wait for the scheduler | Confirmation email arrives in a real inbox (not just a database row) | |
| F5 | Temporarily remove the Resend key and restart in production mode | Messages are marked failed, not "sent" | |

## G. Security spot checks
| # | Step | Expected | Result |
|---|---|---|---|
| G1 | DevTools, Sources / Network: search all loaded files for `sb_secret` | Not found anywhere | |
| G2 | Response headers on any page | CSP, HSTS, X-Frame-Options, nosniff present | |
| G3 | Run the API probe script from `09-audit-flags` | No table or function open that should be closed | |
| G4 | Sign in with Google and use the sign-in sheet with the CSP active | No CSP errors in the console | |

## H. Performance and devices
| # | Step | Expected | Result |
|---|---|---|---|
| H1 | Chrome DevTools, Lighthouse, Mobile, on landing, cars, a model, used cars, a used car | Real numbers; target is under 2.5 s LCP on a 4G profile | |
| H2 | Phone on the same Wi-Fi: landing, booking flow, dashboard | Smooth, nothing overlapping or cut off | |
| H3 | Hindi at 360 px wide | Nothing overflows | |

When you finish, send me the FAIL rows.
