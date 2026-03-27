import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role ?? "MEMBER";
      }
      return session;
    },
    async signIn({ user }) {
      const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
      if (user.email && adminEmails.includes(user.email)) {
        await db.user.update({
          where: { email: user.email },
          data: { role: "ADMIN" },
        }).catch(() => {});
      }
      return true;
    },
  },
  session: {
    strategy: "database",
  },
});
