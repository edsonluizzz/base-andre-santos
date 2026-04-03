import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    async jwt({ token, user, trigger }) {
      const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
      if (user) {
        token.id = user.id;
        const dbUser = await db.user.findUnique({
          where: { email: user.email! },
          select: { id: true, role: true, establishmentId: true },
        });
        token.id = dbUser?.id ?? user.id;
        token.role = dbUser?.role ?? "MEMBER";
        token.establishmentId = dbUser?.establishmentId ?? "default-porto-belo";
        token.isSuperAdmin = superAdminEmails.length > 0 && superAdminEmails.includes(user.email ?? "");
      }
      // Re-fetch role from DB on token update (fixes stale role after admin changes)
      if (trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, establishmentId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.establishmentId = dbUser.establishmentId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.establishmentId = (token.establishmentId as string) ?? "default-porto-belo";
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      }
      return session;
    },
    async signIn({ user }) {
      const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
      if (user.email && adminEmails.includes(user.email)) {
        await db.user.upsert({
          where: { email: user.email },
          update: { role: "ADMIN" },
          create: { email: user.email, name: user.name ?? "", role: "ADMIN" },
        }).catch(() => {});
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
});
