import type { NextAuthConfig, Session } from "next-auth";
import Google from "next-auth/providers/google";

const ROLE_RANK: Record<string, number> = { MEMBER: 0, LEADER: 1, ADMIN: 2 };
const ROUTE_MIN_RANK: [string, number][] = [
  ["/mapa", 1], ["/zonas", 1], ["/grupos", 1], ["/agenda", 1], ["/relatorio", 1],
  ["/comunicados", 2], ["/configuracoes", 2], ["/super-admin", 2],
];

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  // Necessário para domínios personalizados no Vercel (ovile.com.br) — aplicado
  // tanto no middleware (edge) quanto no servidor (auth.ts). Sem isso, o NextAuth
  // v5 beta não confia no host header quando atrás do proxy reverso da Vercel.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Cookies scoped pra .ovile.com.br pra SSO entre subdomínios
  // (andre.ovile.com.br, miriam.ovile.com.br). Em dev (localhost), o domain
  // é omitido pra cookie funcionar normalmente.
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        ...(process.env.NODE_ENV === "production" && { domain: ".ovile.com.br" }),
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.callback-url"
        : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        ...(process.env.NODE_ENV === "production" && { domain: ".ovile.com.br" }),
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Host-authjs.csrf-token"
        : "authjs.csrf-token",
      // __Host- prefix REQUIRES NO domain attribute. CSRF cookie fica scoped
      // pro host atual; não vaza entre subdomínios mas isso é OK (cada
      // subdomain valida CSRF localmente).
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "MEMBER";
        session.user.campaignId = (token.campaignId as string) ?? "andre-santos-2026";
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.suspended = false;
        session.user.isImpersonating = Boolean(token.isImpersonating);
      }
      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const session = auth as Session | null;
      const isLoggedIn = !!session?.user;
      const { pathname } = nextUrl;

      const isPublic =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/sem-acesso" ||
        pathname.startsWith("/cadastro") ||
        pathname.startsWith("/ebook") ||
        pathname.startsWith("/r") ||
        pathname.startsWith("/entrar") ||
        pathname.startsWith("/api/public/") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/invite/") ||
        pathname.startsWith("/api/cron/") ||
        pathname.startsWith("/api/telegram/") ||
        pathname.startsWith("/api/join") ||
        pathname.startsWith("/api/cep/") ||
        pathname.startsWith("/api/n8n/") ||
        pathname === "/privacidade" ||
        pathname === "/api/onboarding";

      if (isPublic) return true;
      if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
      if (isLoggedIn && pathname === "/login") return Response.redirect(new URL("/dashboard", nextUrl));

      // Proteção por papel
      const role = (auth as Session | null)?.user?.role ?? "MEMBER";
      const rank = ROLE_RANK[role] ?? 0;
      for (const [prefix, minRank] of ROUTE_MIN_RANK) {
        if (pathname.startsWith(prefix) && rank < minRank) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }

      return true;
    },
  },
};
