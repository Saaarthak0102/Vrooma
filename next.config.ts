import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' is only needed by the dev server's hot reload, never in a production build.
      `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "production" ? "" : "'unsafe-eval' "}https://*.supabase.co`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The site used to serve /en/... and /hi/... URLs. It is English only now; keep old links, bookmarks,
  // emails and search results working by sending them to the unprefixed page.
  async redirects() {
    return [
      { source: "/:locale(en|hi)", destination: "/", permanent: true },
      { source: "/:locale(en|hi)/:path*", destination: "/:path*", permanent: true },

      // The staff and admin consoles were consolidated into 2-3 screens per role. Old deep links keep working.
      // Temporary (302) redirects: they sit behind sign-in and the layout may still evolve.
      { source: "/admin/models", destination: "/admin/catalog?tab=models", permanent: false },
      { source: "/admin/models/:id", destination: "/admin/catalog?tab=models&model=:id", permanent: false },
      { source: "/admin/prices", destination: "/admin/catalog?tab=prices", permanent: false },
      { source: "/admin/offers", destination: "/admin/catalog?tab=offers", permanent: false },
      { source: "/admin/banners", destination: "/admin/catalog?tab=banners", permanent: false },
      { source: "/admin/users", destination: "/admin/team?tab=users", permanent: false },
      { source: "/admin/showrooms", destination: "/admin/team?tab=network", permanent: false },
      { source: "/admin/assignment", destination: "/admin/team?tab=routing", permanent: false },
      { source: "/admin/slots", destination: "/admin/team?tab=slots", permanent: false },
      { source: "/admin/ai-logs", destination: "/admin?tab=ai", permanent: false },
      { source: "/admin/system", destination: "/admin?tab=system", permanent: false },
      { source: "/admin/used-cars", destination: "/staff/stock", permanent: false },
      { source: "/admin/used-cars/:id", destination: "/staff/stock", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
