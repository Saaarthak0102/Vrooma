import type { Metadata } from "next";
import { Urbanist, Instrument_Serif, Noto_Serif_Devanagari } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SignInSheet } from "@/components/auth/SignInSheet";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { SheenBackground } from "@/components/layout/SheenBackground";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { Toaster } from "sonner";
import { constructMetadata } from "@/lib/seo";
import "@/app/globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument",
  display: "swap",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  variable: "--font-noto-serif-devanagari",
  display: "swap",
});

export const metadata: Metadata = constructMetadata();

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface RootLocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLocaleLayout({
  children,
  params,
}: RootLocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const isHindi = locale === "hi";

  const fontClasses = [
    urbanist.variable,
    instrumentSerif.variable,
    isHindi ? notoSerifDevanagari.variable : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html lang={locale} className={fontClasses}>
      <body className="min-h-screen flex flex-col font-sans antialiased text-ink bg-bg selection:bg-accent selection:text-dark relative">
        <div
          id="header-scroll-sentinel"
          className="absolute top-[40px] left-0 h-px w-px pointer-events-none opacity-0"
          aria-hidden="true"
        />
        <SheenBackground />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <SmoothScrollProvider>
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <ChatWidget />
              <SignInSheet />
              <Toaster position="top-right" richColors closeButton />
            </SmoothScrollProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
