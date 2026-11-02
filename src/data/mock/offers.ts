import { Offer, Banner } from "@/types/domain";

export const mockOffers: Offer[] = [
  {
    id: "off-1",
    title: "Lucknow Executive Festival Package",
    body: "Complimentary 5-Year Extended Warranty + Comprehensive 3-Year Maintenance Plan on Model H ZX Automatic.",
    badge: "Exclusive",
    model_id: "model-h",
    valid_until: "2026-12-31",
    active: true,
  },
  {
    id: "off-2",
    title: "Zero Down Payment & 100% On-Road Funding",
    body: "Partnered with leading nationalised banks for instant on-road vehicle loan approval within 2 hours.",
    badge: "Finance Offer",
    model_id: null,
    valid_until: "2027-01-31",
    active: true,
  },
  {
    id: "off-3",
    title: "Exchange Bonus up to ₹45,000",
    body: "Upgrade your existing car of any make or model and receive a guaranteed ₹45,000 corporate exchange bonus.",
    badge: "Exchange",
    model_id: "model-c",
    valid_until: "2027-03-31",
    active: true,
  },
];

export const mockBanners: Banner[] = [
  {
    id: "ban-1",
    title: "Discover the All-New Model H in Lucknow",
    image_url: "/images/placeholders/car-1.svg",
    href: "/cars/model-h",
    sort: 1,
    active: true,
  },
  {
    id: "ban-2",
    title: "Vrooma Certified Pre-Owned Cars - 140 Checkpoints",
    image_url: "/images/placeholders/car-2.svg",
    href: "/used-cars",
    sort: 2,
    active: true,
  },
];

