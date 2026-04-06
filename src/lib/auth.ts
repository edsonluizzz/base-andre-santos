import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
        .split(",").map((e) => e.trim()).filter(Boolean);

      // ── Primeiro login ──────────────────────────────────────────────────────
      if (user?.email && user.id) {
        token.id = user.id;
        token.isSuperAdmin = superAdminEmails.includes(user.email);

        // Resolver convites pendentes (UserEstablishment com pendingEmail)
        const pending = await db.userEstablishment.findMany({
          where: { pendingEmail: user.email, userId: null },
        });
        for (const p of pending) {
          await db.userEstablishment.update({
            where: { id: p.id },
            data: { userId: user.id, pendingEmail: null, inviteStatus: "ACCEPTED", acceptedAt: new Date() },
          }).catch(() => {});
        }

        // Buscar vínculos do usuário
        const ues = await db.userEstablishment.findMany({
          where: { userId: user.id },
        });

        if (ues.length === 0) {
          // Usuário legado — criar UserEstablishment a partir do User.establishmentId
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { role: true, establishmentId: true },
          });
          if (dbUser) {
            await db.userEstablishment.upsert({
              where: { userId_establishmentId: { userId: user.id, establishmentId: dbUser.establishmentId } },
              update: { inviteStatus: "ACCEPTED" },
              create: {
                userId: user.id,
                establishmentId: dbUser.establishmentId,
                role: dbUser.role,
                inviteStatus: "ACCEPTED",
                acceptedAt: new Date(),
              },
            }).catch(() => {});
            token.role = dbUser.role;
            token.establishmentId = dbUser.establishmentId;
            token.needsChurchSelection = false;
          }
        } else if (ues.length === 1) {
          token.role = ues[0].role;
          token.establishmentId = ues[0].establishmentId;
          token.needsChurchSelection = false;
          const est = await db.establishment.findUnique({ where: { id: ues[0].establishmentId }, select: { suspended: true } });
          token.suspended = est?.suspended ?? false;
          // Sincronizar User.role e User.establishmentId para compatibilidade
          await db.user.update({
            where: { id: user.id },
            data: { role: ues[0].role, establishmentId: ues[0].establishmentId },
          }).catch(() => {});
        } else {
          // Múltiplas congregações → seletor
          token.role = ues[0].role;
          token.establishmentId = ues[0].establishmentId;
          token.needsChurchSelection = true;
        }
      }

      // ── Impersonação de estabelecimento (super admin) ───────────────────────
      if (trigger === "update" && session !== null && "impersonateId" in session && token.isSuperAdmin) {
        if (session.impersonateId) {
          const est = await db.establishment.findUnique({ where: { id: session.impersonateId as string } });
          if (est) {
            token.originalEstablishmentId = token.establishmentId;
            token.establishmentId = est.id;
            token.isImpersonating = true;
            token.suspended = false; // super admin não é bloqueado por suspensão
          }
        } else {
          // Sair da impersonação
          token.establishmentId = token.originalEstablishmentId ?? token.establishmentId;
          token.originalEstablishmentId = undefined;
          token.isImpersonating = false;
          token.suspended = false;
        }
        return token;
      }

      // ── Troca de congregação via /select-church ─────────────────────────────
      if (trigger === "update" && session?.selectedEstablishmentId && token.id) {
        // SuperAdmin pode trocar para qualquer estabelecimento sem vínculo
        if (token.isSuperAdmin) {
          const est = await db.establishment.findUnique({
            where: { id: session.selectedEstablishmentId },
          });
          if (est) {
            token.establishmentId = est.id;
            token.role = "ADMIN";
            token.needsChurchSelection = false;
            await db.user.update({
              where: { id: token.id as string },
              data: { role: "ADMIN", establishmentId: est.id },
            }).catch(() => {});
          }
          return token;
        }

        const ue = await db.userEstablishment.findUnique({
          where: {
            userId_establishmentId: {
              userId: token.id as string,
              establishmentId: session.selectedEstablishmentId,
            },
          },
        });
        if (ue) {
          token.establishmentId = ue.establishmentId;
          token.role = ue.role;
          token.needsChurchSelection = false;
          await db.user.update({
            where: { id: token.id as string },
            data: { role: ue.role, establishmentId: ue.establishmentId },
          }).catch(() => {});
        }
        return token;
      }

      // ── Refresh de role/establishment (ex: admin alterou permissão) ─────────
      if (trigger === "update" && token.id && !session?.selectedEstablishmentId) {
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
        session.user.needsChurchSelection = Boolean(token.needsChurchSelection);
        session.user.suspended = Boolean(token.suspended);
        session.user.isImpersonating = Boolean(token.isImpersonating);
        session.user.originalEstablishmentId = token.originalEstablishmentId as string | undefined;
      }
      return session;
    },

    async signIn({ user }) {
      // Promover para ADMIN se estiver na lista ADMIN_EMAILS
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
