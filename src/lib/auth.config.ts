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
    // Session callback edge-safe: mapeia campos do token para session.user
    // Necessário para que o middleware consiga ler campos customizados
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "MEMBER";
        session.user.establishmentId = (token.establishmentId as string) ?? "";
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.needsChurchSelection = Boolean(token.needsChurchSelection);
        session.user.suspended = Boolean(token.suspended);
        session.user.isImpersonating = Boolean(token.isImpersonating);
        session.user.noEstablishment = Boolean(token.noEstablishment);
      }
      return session;
    },

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
      const isApiJoin = pathname.startsWith("/api/join");
      const isApiCron = pathname.startsWith("/api/cron/");
      const isSelectChurch = pathname === "/select-church";
      const isSuspendedPage = pathname === "/suspended";
      const isEntrar = pathname.startsWith("/entrar");
      const isSemAcesso = pathname === "/sem-acesso";

      // Rotas sempre públicas
      if (isApiAuth || isApiOnboarding || isApiStripeWebhook || isApiJoin || isApiCron ||
          isLandingPage || isCadastro || isSuspendedPage || isEntrar || isSemAcesso) {
        return true;
      }

      // Não logado: redireciona para login (preserva ?c= do join code)
      if (!isLoggedIn && !isLoginPage && !isSelectChurch) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Logado na página de login: redireciona para dashboard
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Chamadas de API nunca devem ser redirecionadas para páginas
      const isApiRoute = pathname.startsWith("/api/");
      if (isApiRoute) return true;

      // Estabelecimento suspenso
      if (isLoggedIn && session?.user?.suspended && !session?.user?.isSuperAdmin) {
        return Response.redirect(new URL("/suspended", nextUrl));
      }

      // Sem nenhum estabelecimento vinculado → tela de entrada
      if (isLoggedIn && session?.user?.noEstablishment && !isSelectChurch) {
        return Response.redirect(new URL("/entrar", nextUrl));
      }

      // Precisa escolher congregação (múltiplos vínculos)
      if (isLoggedIn && session?.user?.needsChurchSelection && !isSelectChurch) {
        return Response.redirect(new URL("/select-church", nextUrl));
      }

      return true;
    },
  },
};
