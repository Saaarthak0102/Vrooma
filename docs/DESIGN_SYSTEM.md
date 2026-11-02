# VROOMA — DESIGN SYSTEM & TOKENS

## 1. Design Philosophy

Vrooma follows a luxury automotive digital aesthetic inspired by premier marque showrooms:
- **Clean Layouts & Generous White Space:** Nothing on the screen exists without a direct commercial or user purpose.
- **Restrained Palette:** Warm stone backgrounds (`#FAFAF9`), deep obsidian ink (`#1C1917`), and a single vibrant accent: Vrooma Crimson (`#E11D48`).
- **Editorial Typography:** Crisp, modern geometric sans (**Urbanist**) paired with an editorial italic serif (**Instrument Serif**) for single-word emotional emphasis in major headlines.
- **Showroom Hierarchy:** Large car photography, clear ex-showroom & on-road prices, and exactly one unambiguous primary action on every view.

---

## 2. Color Tokens

| Token | CSS Variable | Hex / Value | Usage |
|---|---|---|---|
| Background | `--bg` | `#FAFAF9` | Primary page canvas |
| Background Sheen | `--bg-sheen` | `#F5F5F4` | Header blur, subtle row alternation |
| Surface | `--surface` | `#FFFFFF` | Cards, modals, sheets |
| Surface Glass | `--surface-glass` | `rgba(255, 255, 255, 0.85)` | Sticky action bars, frosted navigation |
| Ink Primary | `--ink` | `#1C1917` | Headings, primary text, high-contrast labels |
| Ink Secondary | `--ink-secondary` | `#78716C` | Metadata, subtitles, secondary specs |
| Ink Tertiary | `--ink-tertiary` | `#A8A29E` | Placeholders, inactive icons, subtle borders |
| Border | `--border` | `#E7E5E4` | Component borders, table dividers |
| Dark | `--dark` | `#0C0A09` | Dark contrast buttons, bottom action sheets |
| Accent | `--accent` | `#E11D48` | Primary CTA buttons, key highlight badges, active tabs |
| Accent Ink | `--accent-ink` | `#FFFFFF` | Text on accent backgrounds |
| Accent Subtle | `--accent-subtle` | `#FFE4E6` | Pill badges, selected card backgrounds |
| Success | `--success` | `#15803D` | SLA Met badge, available slots, verified checkmarks |
| Warning | `--warning` | `#B45309` | SLA Warning clock (<2 min remaining), low stock |
| Error | `--error` | `#DC2626` | SLA Breached alert, form validation errors |

---

## 3. Typography & Heading Rules

```tsx
// Font configuration via next/font/google
import { Urbanist, Instrument_Serif } from "next/font/google";

export const fontSans = Urbanist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const fontSerif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
```

### The Single-Accent Rule
When crafting hero titles or editorial headers, use `<Accent>` or `font-serif italic` for **strictly one word**:
- ✅ *Discover the <span className="font-serif italic font-normal text-accent">precision</span> of Brand X.*
- ❌ *Discover <span className="font-serif italic">the precision of Brand X</span>.* (Violates rule: multiple words italicized).

---

## 4. Components & Primitives

All primitives live in `src/components/ui/` and wrap Radix UI primitives with Tailwind styling:
- `Button`: Primary (`bg-accent text-accent-ink hover:opacity-95`), Dark (`bg-dark text-white`), Secondary (`bg-surface border border-border text-ink hover:bg-stone-50`), Ghost (`text-ink hover:bg-stone-100`).
- `Badge`: Pill radius (`rounded-full`), padding `px-3 py-1`, text `text-xs font-semibold`.
- `Card`: `bg-surface rounded-2xl border border-border shadow-card`.
- `Input` & `Select`: Height 44px (minimum touch target), `border-border focus:border-accent focus:ring-1 focus:ring-accent`.

---

## 5. Do's and Don'ts

| Do | Don't |
|---|---|
| Use `formatINR(1245000)` → `₹12,45,000` | Hardcode rupee strings or use un-spaced values like `Rs 1245000` |
| Maintain minimum touch targets of $\ge 44 \times 44\text{px}$ on mobile | Create dense, un-tappable mobile UI |
| Use `notWired("Feature Name", day)` for pending integrations | Leave empty callbacks `onClick={() => {}}` or dead `href="#"` |
| Mask pre-owned registration plates (`UP32 ** **** 1234`) | Show full registration numbers to unauthenticated public visitors |
| Place a clear Next Step (Test Drive / Price Breakup) on every vehicle screen | Leave the user at a dead-end without an enquiry action |

