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
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "MEMBER";
        session.user.establishmentId = (token.campaignId as string) ?? "andre-santos-2026";
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.needsChurchSelection = false;
        session.user.suspended = false;
        session.user.isImpersonating = Boolean(token.isImpersonating);
        session.user.noEstablishment = false;
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
        pathname.startsWith("/entrar") ||
        pathname.startsWith("/api/public/") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/invite/") ||
        pathname.startsWith("/api/cron/") ||
        pathname.startsWith("/api/join") ||
        pathname.startsWith("/api/cep/") ||
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
