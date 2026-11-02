import type { Metadata } from "next";
import { Urbanist, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SignInSheet } from "@/components/auth/SignInSheet";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ChatWidget } from "@/components/chat/ChatWidget";
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

  return (
    <html lang={locale} className={`${urbanist.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-screen flex flex-col font-sans antialiased text-ink bg-bg selection:bg-accent selection:text-dark">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <ChatWidget />
            <SignInSheet />
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

