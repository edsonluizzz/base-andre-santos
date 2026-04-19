import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/session-provider";
import { LgpdBanner } from "@/components/lgpd-banner";
import { PostHogProvider } from "@/components/posthog-provider";
import { auth } from "@/lib/auth";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Ovile",
  description: "Sistema de gestão para igrejas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ovile",
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${playfair.variable}`}>
      <head>
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body className="antialiased">
        <SessionProvider session={session}>
          <PostHogProvider>
            {children}
            <LgpdBanner />
            <Toaster richColors theme="dark" />
          </PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
