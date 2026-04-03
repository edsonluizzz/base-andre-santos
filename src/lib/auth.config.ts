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

      // Rotas sempre públicas
      if (isApiAuth || isLandingPage || isCadastro) return true;

      // Não logado: redireciona para login
      if (!isLoggedIn && !isLoginPage) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Logado na página de login: redireciona para dashboard
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
};
