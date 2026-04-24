import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { authConfig } from "./auth.config";

const CAMPAIGN_ID = "andre-santos-2026";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
        .split(",").map((e) => e.trim()).filter(Boolean);

      if (user?.email && user.id) {
        token.id = user.id;
        token.image = user.image ?? token.image;
        token.isSuperAdmin = superAdminEmails.includes(user.email);

        // Resolver convites pendentes
        const pending = await db.userCampaign.findMany({
          where: { pendingEmail: user.email, userId: null },
        });
        for (const p of pending) {
          await db.userCampaign.update({
            where: { id: p.id },
            data: { userId: user.id, pendingEmail: null, inviteStatus: "ACCEPTED", acceptedAt: new Date() },
          }).catch(() => {});
          const existingCollab = await db.collaborator.findUnique({ where: { userId: user.id } });
          if (!existingCollab) {
            await db.collaborator.create({
              data: { name: user.name ?? user.email ?? "Colaborador", campaignId: p.campaignId, userId: user.id },
            }).catch(() => {});
          }
        }

        // Auto-vincular colaboradores com o mesmo e-mail
        const collabsByEmail = await db.collaborator.findMany({ where: { email: user.email, userId: null } });
        for (const c of collabsByEmail) {
          await db.collaborator.update({ where: { id: c.id }, data: { userId: user.id } }).catch(() => {});
        }

        // Buscar vínculo com a campanha
        const uc = await db.userCampaign.findUnique({
          where: { userId_campaignId: { userId: user.id, campaignId: CAMPAIGN_ID } },
        });

        if (!uc) {
          // Novo usuário — criar vínculo como MEMBER
          await db.userCampaign.create({
            data: { userId: user.id, campaignId: CAMPAIGN_ID, role: "MEMBER", inviteStatus: "ACCEPTED", acceptedAt: new Date() },
          }).catch(() => {});
          token.role = "MEMBER";
          token.campaignId = CAMPAIGN_ID;
        } else {
          token.role = uc.role;
          token.campaignId = uc.campaignId;
          await db.user.update({ where: { id: user.id }, data: { role: uc.role, campaignId: uc.campaignId } }).catch(() => {});
        }
      }

      // Refresh de role
      if (trigger === "update" && token.id && !session?.selectedEstablishmentId) {
        const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { role: true } });
        if (dbUser) token.role = dbUser.role;
      }

      // Impersonation (super admin)
      if (trigger === "update" && session !== null && "impersonateId" in session && token.isSuperAdmin) {
        if (session.impersonateId) {
          token.isImpersonating = true;
          await db.auditLog.create({ data: { action: "IMPERSONATE_START", actorId: token.id as string, targetId: session.impersonateId as string } }).catch(() => {});
        } else {
          token.isImpersonating = false;
          await db.auditLog.create({ data: { action: "IMPERSONATE_END", actorId: token.id as string } }).catch(() => {});
        }
        return token;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        if (token.image) session.user.image = token.image as string;
        session.user.establishmentId = (token.campaignId as string) ?? CAMPAIGN_ID;
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.needsChurchSelection = false;
        session.user.suspended = false;
        session.user.isImpersonating = Boolean(token.isImpersonating);
        session.user.noEstablishment = false;
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
  session: { strategy: "jwt" },
});
