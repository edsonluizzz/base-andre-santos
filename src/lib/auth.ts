import NextAuth from "next-auth";
import { db } from "./db";
import { authConfig } from "./auth.config";
import { getCampaignDbUrl } from "./meta-db";

const CAMPAIGN_ID = "andre-santos-2026";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Necessário para domínios personalizados no Vercel (ovile.com.br)
  // Evita o erro "Configuration" no NextAuth v5 beta em produção
  trustHost: true,
  // Logger explícito — captura erros do NextAuth nos logs Vercel com detalhe
  logger: {
    error(error: unknown) {
      console.error("[NextAuth]", error instanceof Error ? error.message : error);
    },
    warn(code: string) {
      console.warn("[NextAuth warn]", code);
    },
  },
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
          token.name = user.name ?? token.name;
          token.image = user.image ?? token.image;
          token.isSuperAdmin = superAdminEmails.includes(user.email);

          // A) Vincula Collaborators existentes por email PRIMEIRO (evita criação de duplicata)
          let linkedCollabId: string | null = null;
          const collabsByEmail = await db.collaborator.findMany({ where: { email: user.email, userId: null } });
          if (collabsByEmail.length > 0) {
            await db.collaborator.update({ where: { id: collabsByEmail[0].id }, data: { userId } }).catch(() => {});
            linkedCollabId = collabsByEmail[0].id;
          }

          // B) Ativa pending UserCampaigns (invites pendentes) — em transação para evitar race conditions
          const pending = await db.userCampaign.findMany({
            where: { pendingEmail: user.email, userId: null },
          });
          if (pending.length > 0) {
            await db.$transaction(async (tx) => {
              for (const p of pending) {
                await tx.userCampaign.update({
                  where: { id: p.id },
                  data: { userId, pendingEmail: null, inviteStatus: "ACCEPTED", acceptedAt: new Date() },
                });

                const pWithCollab = p as typeof p & { collaboratorId?: string };
                if (!linkedCollabId && pWithCollab.collaboratorId) {
                  const target = await tx.collaborator.findUnique({ where: { id: pWithCollab.collaboratorId } });
                  if (target && !target.userId) {
                    await tx.collaborator.update({ where: { id: target.id }, data: { userId } });
                    linkedCollabId = target.id;
                  }
                }

                if (!linkedCollabId) {
                  const existing = await tx.collaborator.findFirst({ where: { userId } });
                  if (!existing) {
                    const c = await tx.collaborator.create({
                      data: { name: user.name ?? user.email ?? "Colaborador", campaignId: p.campaignId, userId },
                    });
                    linkedCollabId = c.id;
                  }
                }
              }
            }, { timeout: 10_000 }).catch((err) => {
              console.error("[JWT] erro ao ativar invites pendentes:", err);
            });
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
            token.dbUrl = (await getCampaignDbUrl(CAMPAIGN_ID)) ?? process.env.DATABASE_URL;
          } else {
            const effectiveRole = isAdmin && uc.role !== "ADMIN" ? "ADMIN" : uc.role;
            if (isAdmin && uc.role !== "ADMIN") {
              await db.userCampaign.update({ where: { userId_campaignId: { userId, campaignId: CAMPAIGN_ID } }, data: { role: "ADMIN" } }).catch(() => {});
            }
            token.role = effectiveRole;
            token.campaignId = uc.campaignId;
            token.dbUrl = (await getCampaignDbUrl(uc.campaignId)) ?? process.env.DATABASE_URL;
            await db.user.update({ where: { id: userId }, data: { role: effectiveRole, campaignId: uc.campaignId } }).catch(() => {});
          }
        }

        // Fallback: JWT antigo sem token.name → busca 1x do banco e armazena no cookie
        if (!token.name && token.id) {
          const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { name: true } });
          if (dbUser?.name) token.name = dbUser.name;
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
        token.dbUrl = token.dbUrl ?? process.env.DATABASE_URL;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        if (token.name) session.user.name = token.name as string;
        if (token.image) session.user.image = token.image as string;
        session.user.establishmentId = (token.campaignId as string) ?? CAMPAIGN_ID;
        session.user.campaignId = (token.campaignId as string) ?? CAMPAIGN_ID;
        session.user.dbUrl = token.dbUrl as string | undefined;
        // Re-avalia isSuperAdmin em toda sessão — garante tokens criados antes do campo funcionem
        const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
          .split(",").map((e) => e.trim()).filter(Boolean);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin) ||
          (!!session.user.email && superAdminEmails.includes(session.user.email));
        session.user.needsChurchSelection = false;
        session.user.suspended = false;
        session.user.isImpersonating = Boolean(token.isImpersonating);
        session.user.noEstablishment = false;
      }
      return session;
    },

    async signIn({ user, profile }) {
      try {
        await db.campaign.upsert({
          where: { id: CAMPAIGN_ID },
          update: {},
          create: { id: CAMPAIGN_ID, name: "Base André Santos", joinCode: process.env.CAMPAIGN_JOIN_CODE ?? "ovile2026" },
        }).catch(() => {});

        if (!user.email) return true;

        const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
        const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
        const isAdmin = adminEmails.includes(user.email) || superAdminEmails.includes(user.email);

        if (!isAdmin) {
          // 1) Convite pendente por email
          const pendingInvite = await db.userCampaign.findFirst({
            where: { pendingEmail: user.email.toLowerCase(), campaignId: CAMPAIGN_ID },
            select: { id: true },
          });

          if (!pendingInvite) {
            // 2) Usuário já aceito (retornando)
            const existingUser = await db.user.findUnique({ where: { email: user.email }, select: { id: true } });
            if (existingUser) {
              const acceptedUC = await db.userCampaign.findFirst({
                where: { userId: existingUser.id, campaignId: CAMPAIGN_ID, inviteStatus: "ACCEPTED" },
                select: { id: true },
              });
              if (!acceptedUC) return "/sem-acesso";
            } else {
              return "/sem-acesso";
            }
          }
        }

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

        user.id = dbUser.id;

        // Só cria/atualiza UserCampaign para admins ou usuários já convidados
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
