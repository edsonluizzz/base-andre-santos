import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { db as globalDb } from "@/lib/db"; // AuditLog é global
import { triggerManualInviteBatch, type LeadPayload } from "@/lib/n8n";
import { logContactBulk } from "@/lib/contact-log"; // ContactKind inferido pelo template literal abaixo

// Cooldown por kind
const INVITE_COOLDOWN_DAYS = 3;          // disparo manual de convite (WF1 usa 7)
const REACTIVATION_MIN_SILENCE_DAYS = 30; // só reativar quem está em silêncio há 30d+

const MAX_PER_REQUEST = 200;

// n8n webhook pode demorar até 8s + lookup banco + audit log
export const maxDuration = 30;

type Kind = "invite" | "reactivation";

interface BulkInviteBody {
  ids: string[];
  kind?: Kind;
  preview?: boolean;
}

interface SkippedBreakdown {
  noPhone: number;
  inactive: number;
  cooldown: number;       // invite: contactado há < 3d  |  reactivation: contactado há < 30d
  notFound: number;
  notEligible: number;    // só reactivation: status diferente de LEAD|ACTIVE
}

/**
 * POST /api/collaborators/bulk-invite
 *
 * Admin dispara convite ou reativação WhatsApp em massa.
 *
 * Body: { ids: string[], kind?: "invite"|"reactivation", preview?: boolean }
 *
 * Filtros:
 *   invite:        phone + status!=INACTIVE + lastContactedAt > 3d  (ou nulo)
 *   reactivation:  phone + status IN (LEAD,ACTIVE) + lastContactedAt > 30d  (não-nulo)
 *
 * Limite: 200 por requisição.
 *
 * preview=true → { eligibleCount, skipped, ... } sem disparar
 * preview=false → dispara n8n + ContactLog + audit log
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { db, cid: campaignId } = getCampaignContext(session);
    const body = (await req.json()) as BulkInviteBody;
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    const kind: Kind = body.kind === "reactivation" ? "reactivation" : "invite";

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids vazio" }, { status: 400 });
    }
    if (ids.length > MAX_PER_REQUEST) {
      return NextResponse.json(
        { error: `Máximo ${MAX_PER_REQUEST} por disparo. Você selecionou ${ids.length}.` },
        { status: 400 },
      );
    }

    const cooldownDays = kind === "reactivation" ? REACTIVATION_MIN_SILENCE_DAYS : INVITE_COOLDOWN_DAYS;
    const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);

    const collabs = await db.collaborator.findMany({
      where: { id: { in: ids }, campaignId },
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        status: true,
        lastContactedAt: true,
      },
    });

    const skipped: SkippedBreakdown = {
      noPhone: 0,
      inactive: 0,
      cooldown: 0,
      notFound: ids.length - collabs.length,
      notEligible: 0,
    };
    const eligible: LeadPayload[] = [];

    for (const c of collabs) {
      if (!c.phone || c.phone.replace(/\D/g, "").length < 10) {
        skipped.noPhone++;
        continue;
      }

      if (kind === "invite") {
        // invite: bloqueia INACTIVE
        if (c.status === "INACTIVE") { skipped.inactive++; continue; }
      } else {
        // reactivation: só status LEAD ou ACTIVE
        if (c.status !== "LEAD" && c.status !== "ACTIVE") {
          if (c.status === "INACTIVE") skipped.inactive++;
          else skipped.notEligible++;
          continue;
        }
        // reactivation: precisa estar em silêncio há 30+ dias
        // (lastContactedAt nulo NÃO entra em reativação — esses são convite primeiro)
        if (!c.lastContactedAt) { skipped.notEligible++; continue; }
      }

      if (c.lastContactedAt && c.lastContactedAt >= cutoff) {
        skipped.cooldown++;
        continue;
      }

      eligible.push({
        collaboratorId: c.id,
        name: c.name,
        phone: c.phone,
        campaignId,
        city: c.city,
        source: kind === "reactivation" ? "MANUAL_REACTIVATION" : "MANUAL_BULK",
      });
    }

    // Preview: não dispara
    if (body.preview) {
      return NextResponse.json({
        eligibleCount: eligible.length,
        skipped,
        selected: ids.length,
        cooldownDays,
        kind,
      });
    }

    // Dispatch: dispara n8n + audit log
    const N8N_MANUAL_WEBHOOK_URL = process.env.N8N_MANUAL_WEBHOOK_URL;
    if (!N8N_MANUAL_WEBHOOK_URL) {
      return NextResponse.json(
        {
          error: "Disparo manual não configurado",
          hint: "Configure N8N_MANUAL_WEBHOOK_URL no Vercel apontando para o webhook do WF4 no n8n.",
        },
        { status: 503 },
      );
    }

    if (eligible.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skipped,
        kind,
        message: "Nenhum elegível. Nada enviado.",
      });
    }

    // Bloqueante: aguarda confirmação que o webhook chegou ao n8n
    const trigger = await triggerManualInviteBatch(eligible, session.user.id, kind);

    if (!trigger.ok) {
      return NextResponse.json(
        {
          error: "Falha ao acionar fluxo no n8n",
          detail: trigger.error,
          hint: "Verifique se o WF4 está ATIVO no n8n (toggle verde) e se a URL configurada em N8N_MANUAL_WEBHOOK_URL existe.",
        },
        { status: 502 },
      );
    }

    // ContactLog para cada elegível (no tenant DB)
    await logContactBulk(
      db,
      campaignId,
      eligible.map((e) => e.collaboratorId),
      kind === "reactivation" ? "SENT_REACTIVATION" : "SENT_INVITE",
      { channel: "WHATSAPP", actorId: session.user.id, source: "MANUAL_ADMIN" },
    );

    // Audit log no banco GLOBAL
    await globalDb.auditLog.create({
      data: {
        action: kind === "reactivation" ? "BULK_REACTIVATION" : "BULK_INVITE",
        actorId: session.user.id,
        metadata: {
          campaignId,
          kind,
          requested: ids.length,
          sent: eligible.length,
          skipped,
          ids: eligible.map((e) => e.collaboratorId),
        },
      },
    }).catch((err) => {
      console.error("[bulk-invite] audit log falhou:", err);
    });

    return NextResponse.json({
      ok: true,
      sent: eligible.length,
      skipped,
      cooldownDays,
      kind,
      n8nStatus: trigger.status,
    });
  } catch (err) {
    console.error("[bulk-invite POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
