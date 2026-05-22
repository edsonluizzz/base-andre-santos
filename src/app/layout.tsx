import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/session-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Ovile Eleitoral",
  description: "Gestão de base eleitoral",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body>
        <SessionProvider>
          {children}
          <Toaster richColors position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
