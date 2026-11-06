import type { Metadata } from "next";
import { Urbanist, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SignInSheet } from "@/components/auth/SignInSheet";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { SheenBackground } from "@/components/layout/SheenBackground";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
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

// The app is English only. next-intl is used purely as the English text catalogue (messages/en.json).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <html lang="en" className={`${urbanist.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-screen flex flex-col font-sans antialiased text-ink bg-bg selection:bg-accent selection:text-dark relative">
        <div
          id="header-scroll-sentinel"
          className="absolute top-[40px] left-0 h-px w-px pointer-events-none opacity-0"
          aria-hidden="true"
        />
        <SheenBackground />
        <NextIntlClientProvider locale="en" messages={messages}>
          <NuqsAdapter>
            <AuthProvider>
              <SmoothScrollProvider>
                <ConfirmProvider>
                  <SiteHeader />
                  <main className="flex-1">{children}</main>
                  <SiteFooter />
                  <ChatWidget />
                  <SignInSheet />
                  <Toaster position="top-right" richColors closeButton />
                </ConfirmProvider>
              </SmoothScrollProvider>
            </AuthProvider>
          </NuqsAdapter>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
