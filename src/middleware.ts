import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Usa apenas o config edge-safe (sem Prisma/Node.js APIs)
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
