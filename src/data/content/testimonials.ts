export interface Testimonial {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  carModel: string;
  quote: string;
  rating: number;
  isSample: true;
}

export const sampleTestimonials: Testimonial[] = [
  {
    id: "review-1",
    name: "Dr. Ananya Srivastava",
    initials: "AS",
    role: "Associate Professor, KGMU",
    location: "Gomti Nagar, Lucknow",
    carModel: "Model H ZX Automatic",
    quote:
      "Seeing the exact Lucknow RTO road tax and insurance itemised before booking a slot saved us hours. We locked our home test drive online, and the consultant reached our hospital campus on time with zero pushy sales talk.",
    rating: 5,
    isSample: true,
  },
  {
    id: "review-2",
    name: "Vikramaditya Pandey",
    initials: "VP",
    role: "Founder, Tech Startup",
    location: "Hazratganj, Lucknow",
    carModel: "Model C Certified Used (2022)",
    quote:
      "Vrooma's 140-point inspection report gave me total confidence in buying a pre-owned car. Having the registration number masked publicly until verification respects DPDP privacy completely. Seamless delivery experience.",
    rating: 5,
    isSample: true,
  },
  {
    id: "review-3",
    name: "Meera & Rajesh Mehrotra",
    initials: "MM",
    role: "Family Car Buyer",
    location: "Alambagh, Lucknow",
    carModel: "Model X Long Range EV",
    quote:
      "The EMI calculator gave us an accurate monthly figure before we walked into the showroom. Booking our first 10,000 km workshop maintenance took literally 45 seconds on the website.",
    rating: 5,
    isSample: true,
  },
];
