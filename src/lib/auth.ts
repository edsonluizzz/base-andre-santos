import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { authConfig } from "./auth.config";
import { DEFAULT_ESTABLISHMENT_ID } from "./constants";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1. Primeiro login: busca vínculos do usuário
      if (user) {
        // Single query: user + establishment links (evita 2 roundtrips ao DB)
        const dbUser = await db.user.findUnique({
          where: { email: user.email! },
          select: {
            id: true,
            userEstablishments: {
              select: { establishmentId: true, role: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });
        const userId = dbUser?.id ?? user.id;
        token.id = userId;

        const links = dbUser?.userEstablishments ?? [];

        if (links.length === 0) {
          // Sem vínculo — nega contexto (usuário não autorizado em nenhuma igreja)
          token.establishmentId = undefined;
          token.role = "MEMBER";
          token.needsEstablishmentSelection = false;
        } else if (links.length === 1) {
          token.establishmentId = links[0].establishmentId;
          token.role = links[0].role;
          token.needsEstablishmentSelection = false;
        } else {
          // Múltiplos vínculos: exige seleção
          token.establishmentId = undefined;
          token.role = undefined;
          token.needsEstablishmentSelection = true;
        }
      }

      // 2. Seleção manual de congregação via update()
      if (trigger === "update" && session?.selectedEstablishmentId && token.id) {
        const link = await db.userEstablishment.findUnique({
          where: {
            userId_establishmentId: {
              userId: token.id as string,
              establishmentId: session.selectedEstablishmentId,
            },
          },
          select: { role: true },
        });

        if (link) {
          token.establishmentId = session.selectedEstablishmentId;
          token.role = link.role;
          token.needsEstablishmentSelection = false;
        }
      }

      // 3. Re-fetch role em caso de update genérico (ex: admin muda role)
      if (trigger === "update" && token.id && token.establishmentId && !session?.selectedEstablishmentId) {
        const link = await db.userEstablishment.findUnique({
          where: {
            userId_establishmentId: {
              userId: token.id as string,
              establishmentId: token.establishmentId as string,
            },
          },
          select: { role: true },
        });
        if (link) {
          token.role = link.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "MEMBER";
        session.user.establishmentId = (token.establishmentId as string) ?? DEFAULT_ESTABLISHMENT_ID;
        session.user.needsEstablishmentSelection = (token.needsEstablishmentSelection as boolean | undefined) ?? false;
      }
      return session;
    },

    async signIn({ user }) {
      // Garante que admins cadastrados em ADMIN_EMAILS tenham o papel correto em todos os vínculos
      const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
      if (user.email && adminEmails.includes(user.email)) {
        const dbUser = await db.user.upsert({
          where: { email: user.email },
          update: { role: "ADMIN" },
          create: { email: user.email, name: user.name ?? "", role: "ADMIN" },
        }).catch(() => null);

        if (dbUser) {
          await db.userEstablishment.upsert({
            where: {
              userId_establishmentId: { userId: dbUser.id, establishmentId: DEFAULT_ESTABLISHMENT_ID },
            },
            update: { role: "ADMIN" },
            create: { userId: dbUser.id, establishmentId: DEFAULT_ESTABLISHMENT_ID, role: "ADMIN" },
          }).catch(() => {});
        }
      }

      // Sincroniza foto do Google com o cadastro do membro vinculado (só se ainda não tiver foto)
      if (user.email && user.image) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        }).catch(() => null);
        if (dbUser) {
          await db.member.updateMany({
            where: { userId: dbUser.id, photoUrl: null },
            data: { photoUrl: user.image },
          }).catch(() => {});
        }
      }

      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
});
