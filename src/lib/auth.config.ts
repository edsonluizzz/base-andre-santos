import type { NextAuthConfig, Session } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config — sem imports de Node.js (Prisma, db, etc.)
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const session = auth as Session | null;
      const isLoggedIn = !!session?.user;
      const { pathname } = nextUrl;

      const isLoginPage = pathname === "/login";
      const isLandingPage = pathname === "/";
      const isCadastro = pathname.startsWith("/cadastro");
      const isApiAuth = pathname.startsWith("/api/auth");
      const isApiOnboarding = pathname === "/api/onboarding";
      const isApiStripeWebhook = pathname === "/api/stripe/webhook";
      const isSelectChurch = pathname === "/select-church";
      const isSuspendedPage = pathname === "/suspended";

      // Rotas sempre públicas
      if (isApiAuth || isApiOnboarding || isApiStripeWebhook || isLandingPage || isCadastro || isSuspendedPage) return true;

      // Não logado: redireciona para login
      if (!isLoggedIn && !isLoginPage && !isSelectChurch) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Logado na página de login: redireciona para dashboard
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Estabelecimento suspenso
      if (isLoggedIn && session?.user?.suspended && !session?.user?.isSuperAdmin) {
        return Response.redirect(new URL("/suspended", nextUrl));
      }

      // Precisa escolher congregação
      if (isLoggedIn && session?.user?.needsChurchSelection && !isSelectChurch) {
        return Response.redirect(new URL("/select-church", nextUrl));
      }

      return true;
    },
  },
};
