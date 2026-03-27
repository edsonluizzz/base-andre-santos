import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch role from DB
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role ?? "MEMBER";
      }
      return session;
    },
    async signIn({ user }) {
      // Auto-promote admin emails defined in env
      const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
      if (user.email && adminEmails.includes(user.email)) {
        await db.user.update({
          where: { email: user.email },
          data: { role: "ADMIN" },
        }).catch(() => {}); // ignore if user not yet created
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
});
