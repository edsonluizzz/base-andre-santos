import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/session-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Ovile Eleitoral",
  description: "Gestão de base eleitoral",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <SessionProvider>
          {children}
          <Toaster richColors position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
