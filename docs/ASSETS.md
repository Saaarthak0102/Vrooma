# VROOMA — ASSET INVENTORY & CUTOUT PIPELINE

This document tracks all image assets, transparent vehicle cutouts, licensing, and processing scripts used across the Vrooma platform.

## 1. Approved Vehicle SVG Assets (`public/images/cars/`)

Single source of truth for all vehicle illustrations site-wide:

| Asset | Format | Intended Dimensions / Aspect | Model / Role & Usage | Edits |
|---|---|---|---|---|
| `s.svg` | SVG (Vector Cutout) | 664 × 374 (~16:9) | Model S / Urban Hatchback, Catalog & Detail views | Approved single source of truth |
| `y.svg` | SVG (Vector Cutout) | 370 × 208 (~16:9) | Model H / Executive Sedan, Hero Scene, Catalog & Detail views | Approved single source of truth |
| `c.svg` | SVG (Vector Cutout) | 640 × 480 (4:3) | Model C / Compact SUV, TransparentPricing Scene, Catalog views | Approved single source of truth |
| `x.svg` | SVG (Vector Cutout) | 842 × 421 (2:1) | Model X / Luxury EV, TransparentPricing Scene, Catalog views | Approved single source of truth |
| `r.svg` | SVG (Vector Cutout) | 658 × 439 (~3:2) | Model T / Rugged 4x4 Offroader, Catalog & Detail views | Approved single source of truth |

> [!NOTE]
> All vehicle badges, brand crests, and license plates are de-badged or masked to adhere to strict OEM confidentiality and DPDP Act 2023 regulations.

---

## 2. Dynamic Code-Only Components (No Raster Art)

The following interface elements are constructed 100% with CSS and SVG code (zero bitmap payload):
1. **`PhoneMockup`:** CSS-only 9:19.5 aspect frame with dynamic island, 44px border radius, and highlight gradients.
2. **`InspectedBadge`:** Precision layered SVG green glass shield medallion with radial lighting sheen.
3. **`Orb` (`ShowroomsOrbit`):** Geometric SVG map disc with radial grids and pulsing showroom coordinates.
4. **`MapPinRoute` (`HeroScene` & `FinalCta`):** Scrubbed SVG dashed motion vector paths rendered with GSAP `DrawSVGPlugin`.
5. **`SheenBackground`:** Rotated (-24deg) CSS blurred gradient bars with scrubbed scroll physics.

---

## 3. Production Studio Cutout Generation (`scripts/make-cutouts.py`)

When high-resolution photographer raw shots (`.cr3`, `.nef`, `.tiff`, `.png`) arrive from Hazratganj and Gomti Nagar studios, use the background removal automation script:

```bash
# 1. Install dependencies
pip install rembg pillow

# 2. Process all studio photos
python scripts/make-cutouts.py --input raw_photos/ --output public/images/cars/
```

The script applies:
- High-precision alpha matting (`alpha_matting_foreground_threshold=240`) to preserve delicate glass reflections and windshield transparencies.
- Optimised WebP export (`quality=92`) with alpha channel transparency.
