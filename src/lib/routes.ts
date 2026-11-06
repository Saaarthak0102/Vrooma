export const routes = {
  home: () => "/",
  cars: () => "/cars",
  carDetail: (modelSlug: string) => `/cars/${modelSlug}`,
  usedCars: () => "/used-cars",
  usedCarDetail: (stockId: string) => `/used-cars/${stockId}`,
  offers: () => "/offers",
  emiCalculator: () => "/emi-calculator",
  showrooms: () => "/showrooms",
  about: () => "/about",
  contact: () => "/contact",
  privacy: () => "/legal/privacy",
  terms: () => "/legal/terms",
  dataRights: () => "/legal/data-rights",
  signIn: (nextUrl?: string) => (nextUrl ? `/sign-in?next=${encodeURIComponent(nextUrl)}` : "/sign-in"),
  
  // Buyer profile & dashboard
  profile: () => "/profile",
  dashboard: () => "/dashboard",
  dashboardBookings: () => "/dashboard?view=bookings",
  dashboardSaved: () => "/dashboard?view=saved",
  dashboardEnquiries: () => "/dashboard?view=enquiries",
  dashboardProfile: () => "/profile",
  bookTestDrive: (variantId?: string) => (variantId ? `/book/test-drive?variant=${variantId}` : "/book/test-drive"),
  bookService: () => "/book/service",
  tradeIn: () => "/trade-in",

  // Staff
  staff: () => "/staff",
  staffLeadDetail: (id: string) => `/staff?lead=${id}`,
  staffLeadImport: () => "/staff?import=1",
  staffBookings: () => "/staff/bookings",
  staffStock: () => "/staff/stock",

  // Admin (three screens, sections chosen with ?tab=)
  admin: () => "/admin",
  adminAiLogs: () => "/admin?tab=ai",
  adminSystem: () => "/admin?tab=system",
  adminCatalog: (tab: "models" | "prices" | "offers" | "banners" = "models") => `/admin/catalog?tab=${tab}`,
  adminModelDetail: (id: string) => `/admin/catalog?tab=models&model=${id}`,
  adminTeam: (tab: "users" | "network" | "routing" | "slots" = "users") => `/admin/team?tab=${tab}`,
} as const;

