import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Usa apenas o config edge-safe (sem Prisma/Node.js APIs)
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Rotas públicas de alto tráfego (cadastro em evento, landing de ebook,
  // CEP lookup, stats) ficam FORA do middleware: páginas estáticas saem
  // direto do CDN e cada request economiza uma invocação edge — essencial
  // para aguentar burst de evento dentro do plano Hobby.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|ebooks|robots.txt|sitemap.xml|cadastro|material$|material/|ebook|privacidade|fotoperfil|r$|r/|api/public|api/cep|.*\\.(?:png|jpg|jpeg|webp|svg|gif)$).*)",
  ],
};
