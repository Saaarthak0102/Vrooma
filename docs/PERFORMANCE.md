# VROOMA — PERFORMANCE SPECIFICATION & 4G OPTIMIZATION

## 1. Performance Target: Sub-2.5s on 4G

The client brief mandates that every public page load in **under 2.5 seconds on an average 4G connection in Lucknow**.

### Core Web Vitals Targets
- **Largest Contentful Paint (LCP):** $\le 2.0\text{ seconds}$ on Fast 3G / 4G throttle profiles.
- **Interaction to Next Paint (INP):** $\le 100\text{ ms}$.
- **Cumulative Layout Shift (CLS):** $\le 0.05$ (guaranteed by explicit width/height on car image containers).
- **First Input Delay (FID):** $\le 80\text{ ms}$.

---

## 2. Technical Performance Strategies

### A. Next-Gen Image Optimization
- All car images use `next/image` with format conversions to WebP and AVIF.
- Strict responsive `sizes` definition prevents mobile viewports from downloading desktop 4K assets:
  ```tsx
  <Image
    src={car.heroImage}
    alt={car.name}
    fill
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    priority={isAboveFold}
    className="object-cover"
  />
  ```

### B. Font Loading Without Layout Shift
- Google Fonts (`Urbanist` and `Instrument Serif`) are self-hosted and loaded at build time via `next/font/google`.
- CSS custom properties (`--font-sans`, `--font-serif`) with `display: swap` eliminate render-blocking external stylesheets.

### C. Bundle Splitting & URL State Optimization
- **`nuqs` for Filtering:** Lightweight URL search param synchronization avoiding full component re-mounts.
- **Dynamic Imports:** Heavy client modules (e.g. PapaParse CSV importer on `/staff/leads/import`) are dynamically imported only when needed.

---

## 3. Performance Checklist for New Features

- [ ] Does this page render critical text and pricing server-side without waiting for client JavaScript?
- [ ] Are all car thumbnail dimensions fixed with aspect-ratio classes to prevent CLS?
- [ ] Are third-party scripts (e.g. Google Maps, analytics) deferred or loaded asynchronously?
- [ ] Has the page bundle size been verified with `pnpm build`?

