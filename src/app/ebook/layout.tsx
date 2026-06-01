import { Montserrat, Cormorant_Garamond } from "next/font/google";

const montserrat = Montserrat({
  variable: "--font-ebook-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-ebook-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function EbookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${montserrat.variable} ${cormorant.variable}`} style={{ minHeight: "100vh" }}>
      {children}
    </div>
  );
}
