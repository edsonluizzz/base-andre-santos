import NextAuth from "next-auth";
import { db } from "./db";
import { authConfig } from "./auth.config";
import { getCampaignDbUrl, getCampaignModuleScope } from "./meta-db";

// Tenant/campanha padrão desta implantação. Cada projeto Vercel que roda este
// mesmo código (ex: base-jeffrey-chiquini) define seu próprio DEFAULT_CAMPAIGN_ID
// via env var, isolando completamente admins/fallback do André.
const CAMPAIGN_ID = process.env.DEFAULT_CAMPAIGN_ID ?? "andre-santos-2026";
const CAMPAIGN_NAME = process.env.DEFAULT_CAMPAIGN_NAME ?? "Base André Santos";

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
        const financeAdminEmails = (process.env.FINANCE_ADMIN_EMAILS ?? "")
          .split(",").map((e) => e.trim()).filter(Boolean);

        if (user?.email && user.id) {
          // user.id aqui é o sub do OAuth (Google), não o UUID do banco — buscar pelo email
          const dbUser = await db.user.findUnique({ where: { email: user.email }, select: { id: true } });
          const userId = dbUser?.id ?? user.id;

          token.id = userId;
          token.name = user.name ?? token.name;
          token.image = user.image ?? token.image;
          token.isSuperAdmin = superAdminEmails.includes(user.email);
          // Financeiro é restrito por e-mail, separado do role ADMIN (compartilhado por 5 pessoas)
          // e de isSuperAdmin (acesso de plataforma) — só quem estiver em FINANCE_ADMIN_EMAILS entra.
          token.isFinanceAdmin = financeAdminEmails.includes(user.email);

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

          const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
          const isAdmin = adminEmails.includes(user.email);

          // Busca em TODAS as campanhas — multi-tenant (usa a mais antiga como campanha principal)
          const uc = await db.userCampaign.findFirst({
            where: { userId, inviteStatus: "ACCEPTED" },
            orderBy: { acceptedAt: "asc" },
          });

          if (!uc) {
            if (isAdmin) {
              // Admin sem UC → garante vínculo com a campanha principal
              await db.userCampaign.create({
                data: { userId, campaignId: CAMPAIGN_ID, role: "ADMIN", inviteStatus: "ACCEPTED", acceptedAt: new Date() },
              }).catch(() => {});
              token.role = "ADMIN";
              token.campaignId = CAMPAIGN_ID;
              token.dbUrl = (await getCampaignDbUrl(CAMPAIGN_ID)) ?? process.env.DATABASE_URL;
              token.moduleScope = await getCampaignModuleScope(CAMPAIGN_ID);
            }
            // Não-admin sem campanha: token fica sem campaignId (signIn já bloqueou — safety net)
          } else {
            const effectiveRole = isAdmin && uc.role !== "ADMIN" ? "ADMIN" : uc.role;
            if (isAdmin && uc.role !== "ADMIN") {
              await db.userCampaign.update({
                where: { userId_campaignId: { userId, campaignId: uc.campaignId } },
                data: { role: "ADMIN" },
              }).catch(() => {});
            }
            token.role = effectiveRole;
            token.campaignId = uc.campaignId;
            token.dbUrl = (await getCampaignDbUrl(uc.campaignId)) ?? process.env.DATABASE_URL;
            token.moduleScope = await getCampaignModuleScope(uc.campaignId);
            await db.user.update({ where: { id: userId }, data: { role: effectiveRole, campaignId: uc.campaignId } }).catch(() => {});
          }
        }

        // Fallback: JWT antigo sem token.name → busca 1x do banco e armazena no cookie
        if (!token.name && token.id) {
          const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { name: true } });
          if (dbUser?.name) token.name = dbUser.name;
        }

        if (trigger === "update" && token.id) {
          const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { role: true } });
          if (dbUser) token.role = dbUser.role;
        }

        // Impersonation TTL: 2 horas
        const IMPERSONATION_TTL_MS = 2 * 60 * 60 * 1000;
        if (token.isImpersonating && token.impersonationExpiry) {
          if (Date.now() > (token.impersonationExpiry as number)) {
            token.isImpersonating = false;
            token.impersonationExpiry = undefined;
            await db.auditLog.create({ data: { action: "IMPERSONATE_END", actorId: token.id as string } }).catch(() => {});
          }
        }

        if (trigger === "update" && session !== null && "impersonateId" in session && token.isSuperAdmin) {
          if (session.impersonateId) {
            token.isImpersonating = true;
            token.impersonationExpiry = Date.now() + IMPERSONATION_TTL_MS;
            await db.auditLog.create({ data: { action: "IMPERSONATE_START", actorId: token.id as string, targetId: session.impersonateId as string } }).catch(() => {});
          } else {
            token.isImpersonating = false;
            token.impersonationExpiry = undefined;
            await db.auditLog.create({ data: { action: "IMPERSONATE_END", actorId: token.id as string } }).catch(() => {});
          }
          return token;
        }

        // Troca de campanha — exclusivo para super-admin
        if (trigger === "update" && session !== null && "selectedCampaignId" in session && token.isSuperAdmin) {
          const cid = session.selectedCampaignId as string | null;
          if (cid) {
            token.campaignId = cid;
            token.dbUrl = (await getCampaignDbUrl(cid)) ?? process.env.DATABASE_URL;
            token.moduleScope = await getCampaignModuleScope(cid);
            await db.auditLog.create({ data: { action: "CAMPAIGN_SWITCH", actorId: token.id as string, targetId: cid } }).catch(() => {});
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
        session.user.campaignId = (token.campaignId as string) ?? CAMPAIGN_ID;
        session.user.dbUrl = token.dbUrl as string | undefined;
        session.user.moduleScope = (token.moduleScope as string) ?? "full";
        // Re-avalia isSuperAdmin/isFinanceAdmin em toda sessão — garante tokens criados antes do campo funcionem
        const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
          .split(",").map((e) => e.trim()).filter(Boolean);
        const financeAdminEmails = (process.env.FINANCE_ADMIN_EMAILS ?? "")
          .split(",").map((e) => e.trim()).filter(Boolean);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin) ||
          (!!session.user.email && superAdminEmails.includes(session.user.email));
        session.user.isFinanceAdmin = Boolean(token.isFinanceAdmin) ||
          (!!session.user.email && financeAdminEmails.includes(session.user.email));
        session.user.suspended = false;
        session.user.isImpersonating = Boolean(token.isImpersonating);
      }
      return session;
    },

    async signIn({ user, profile }) {
      try {
        await db.campaign.upsert({
          where: { id: CAMPAIGN_ID },
          update: {},
          create: { id: CAMPAIGN_ID, name: CAMPAIGN_NAME, joinCode: process.env.CAMPAIGN_JOIN_CODE ?? "ovile2026" },
        }).catch(() => {});

        if (!user.email) return true;

        const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
        const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
        const isAdmin = adminEmails.includes(user.email) || superAdminEmails.includes(user.email);

        if (!isAdmin) {
          // 1) Convite pendente por email — busca em QUALQUER campanha (multi-tenant)
          const pendingInvite = await db.userCampaign.findFirst({
            where: { pendingEmail: user.email.toLowerCase() },
            select: { id: true },
          });

          if (!pendingInvite) {
            // 2) Usuário já aceito (retornando) — busca em qualquer campanha
            const existingUser = await db.user.findUnique({ where: { email: user.email }, select: { id: true } });
            if (existingUser) {
              const acceptedUC = await db.userCampaign.findFirst({
                where: { userId: existingUser.id, inviteStatus: "ACCEPTED" },
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

        // Cria/atualiza UserCampaign na campanha principal apenas para admins
        // Não-admins têm o UC criado pelo jwt callback ao ativar o invite pendente
        if (isAdmin) {
          await db.userCampaign.upsert({
            where: { userId_campaignId: { userId: dbUser.id, campaignId: CAMPAIGN_ID } },
            update: { role: "ADMIN", inviteStatus: "ACCEPTED" },
            create: { userId: dbUser.id, campaignId: CAMPAIGN_ID, role: "ADMIN", inviteStatus: "ACCEPTED", acceptedAt: new Date() },
          }).catch(() => {});
        }
      } catch (err) {
        console.error("[signIn] erro:", err);
      }
      return true;
    },
  },
  session: { strategy: "jwt" },
});
