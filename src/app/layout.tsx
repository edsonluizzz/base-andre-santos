import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ovile Eleitoral",
    template: "%s | Ovile Eleitoral",
  },
  description: "Plataforma de gestão de base eleitoral — Paraná 2026. Colaboradores, mapa de apoio, metas TSE, comunicados e mais.",
  keywords: ["gestão eleitoral", "base de apoio", "Paraná 2026", "deputado estadual", "CRM político"],
  authors: [{ name: "Edson Luiz Silva" }],
  robots: { index: false, follow: false },
  openGraph: {
    title: "Ovile Eleitoral — Gestão de Base Eleitoral",
    description: "Plataforma de gestão de base eleitoral · Paraná 2026",
    locale: "pt_BR",
    type: "website",
    siteName: "Ovile Eleitoral",
  },
  twitter: {
    card: "summary",
    title: "Ovile Eleitoral",
    description: "Plataforma de gestão de base eleitoral · Paraná 2026",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${bebasNeue.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <SessionProvider>
            {children}
            <Toaster richColors position="top-center" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
