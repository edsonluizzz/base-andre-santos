import NextAuth from "next-auth";
import { db } from "./db";
import { authConfig } from "./auth.config";

const CAMPAIGN_ID = "andre-santos-2026";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      try {
        const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
          .split(",").map((e) => e.trim()).filter(Boolean);

        if (user?.email && user.id) {
          // user.id aqui é o sub do OAuth (Google), não o UUID do banco — buscar pelo email
          const dbUser = await db.user.findUnique({ where: { email: user.email }, select: { id: true } });
          const userId = dbUser?.id ?? user.id;

          token.id = userId;
          token.image = user.image ?? token.image;
          token.isSuperAdmin = superAdminEmails.includes(user.email);

          const pending = await db.userCampaign.findMany({
            where: { pendingEmail: user.email, userId: null },
          });
          for (const p of pending) {
            await db.userCampaign.update({
              where: { id: p.id },
              data: { userId, pendingEmail: null, inviteStatus: "ACCEPTED", acceptedAt: new Date() },
            }).catch(() => {});
            const existingCollab = await db.collaborator.findUnique({ where: { userId } });
            if (!existingCollab) {
              await db.collaborator.create({
                data: { name: user.name ?? user.email ?? "Colaborador", campaignId: p.campaignId, userId },
              }).catch(() => {});
            }
          }

          const collabsByEmail = await db.collaborator.findMany({ where: { email: user.email, userId: null } });
          for (const c of collabsByEmail) {
            await db.collaborator.update({ where: { id: c.id }, data: { userId } }).catch(() => {});
          }

          const uc = await db.userCampaign.findUnique({
            where: { userId_campaignId: { userId, campaignId: CAMPAIGN_ID } },
          });

          const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
          const isAdmin = adminEmails.includes(user.email);

          if (!uc) {
            const newRole = isAdmin ? "ADMIN" : "MEMBER";
            await db.userCampaign.create({
              data: { userId, campaignId: CAMPAIGN_ID, role: newRole, inviteStatus: "ACCEPTED", acceptedAt: new Date() },
            }).catch(() => {});
            token.role = newRole;
            token.campaignId = CAMPAIGN_ID;
          } else {
            const effectiveRole = isAdmin && uc.role !== "ADMIN" ? "ADMIN" : uc.role;
            if (isAdmin && uc.role !== "ADMIN") {
              await db.userCampaign.update({ where: { userId_campaignId: { userId, campaignId: CAMPAIGN_ID } }, data: { role: "ADMIN" } }).catch(() => {});
            }
            token.role = effectiveRole;
            token.campaignId = uc.campaignId;
            await db.user.update({ where: { id: userId }, data: { role: effectiveRole, campaignId: uc.campaignId } }).catch(() => {});
          }
        }

        if (trigger === "update" && token.id && !session?.selectedEstablishmentId) {
          const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { role: true } });
          if (dbUser) token.role = dbUser.role;
        }

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
      } catch (err) {
        console.error("[JWT] erro no callback:", err);
        if (user?.id) token.id = user.id;
        token.role = token.role ?? "MEMBER";
        token.campaignId = token.campaignId ?? CAMPAIGN_ID;
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

    async signIn({ user, profile }) {
      try {
        // Garante Campaign
        await db.campaign.upsert({
          where: { id: CAMPAIGN_ID },
          update: {},
          create: { id: CAMPAIGN_ID, name: "Base André Santos", joinCode: "andre2026" },
        });

        if (!user.email) return true;

        const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
        const isAdmin = adminEmails.includes(user.email);

        // Upsert do usuário (sem PrismaAdapter, fazemos manualmente)
        const dbUser = await db.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name ?? undefined,
            image: (profile?.picture as string) ?? user.image ?? undefined,
            ...(isAdmin ? { role: "ADMIN" } : {}),
          },
          create: {
            email: user.email,
            name: user.name ?? "",
            image: (profile?.picture as string) ?? user.image ?? "",
            role: isAdmin ? "ADMIN" : "MEMBER",
            campaignId: CAMPAIGN_ID,
          },
        });

        // Sincroniza o id do NextAuth com o id do banco
        user.id = dbUser.id;

        // Garante que UserCampaign reflita o role correto (admin nunca deve ficar como MEMBER)
        await db.userCampaign.upsert({
          where: { userId_campaignId: { userId: dbUser.id, campaignId: CAMPAIGN_ID } },
          update: { ...(isAdmin ? { role: "ADMIN" } : {}), inviteStatus: "ACCEPTED" },
          create: { userId: dbUser.id, campaignId: CAMPAIGN_ID, role: isAdmin ? "ADMIN" : "MEMBER", inviteStatus: "ACCEPTED", acceptedAt: new Date() },
        }).catch(() => {});
      } catch (err) {
        console.error("[signIn] erro:", err);
      }
      return true;
    },
  },
  session: { strategy: "jwt" },
});
