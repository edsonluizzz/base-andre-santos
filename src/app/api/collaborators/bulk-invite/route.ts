import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { db as globalDb } from "@/lib/db"; // AuditLog é global
import { triggerManualInviteBatch, type LeadPayload } from "@/lib/n8n";

// Cooldown menor pra disparo manual (3 dias) — WF1 usa 7 dias
const COOLDOWN_DAYS = 3;
const MAX_PER_REQUEST = 200;

interface BulkInviteBody {
  ids: string[];
  kind?: "invite"; // futura extensão: "reactivation"
  preview?: boolean; // se true, só calcula elegíveis sem disparar
}

interface SkippedBreakdown {
  noPhone: number;
  inactive: number;
  cooldown: number;
  notFound: number;
}

/**
 * POST /api/collaborators/bulk-invite
 *
 * Admin seleciona N colaboradores e dispara fluxo de convite WhatsApp em massa.
 *
 * Body: { ids: string[], kind?: "invite", preview?: boolean }
 *
 * Filtros de elegibilidade:
 *   - tem phone (não-nulo, não-vazio)
 *   - status != INACTIVE (não envia pra quem fez opt-out)
 *   - lastContactedAt > 3 dias atrás (ou null)
 *
 * Limite: 200 por requisição.
 *
 * preview=true → retorna { eligible, skipped } sem disparar (pra modal)
 * preview=false → dispara n8n + registra audit log
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { db, cid: campaignId } = getCampaignContext(session);
    const body = (await req.json()) as BulkInviteBody;
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids vazio" }, { status: 400 });
    }
    if (ids.length > MAX_PER_REQUEST) {
      return NextResponse.json(
        { error: `Máximo ${MAX_PER_REQUEST} por disparo. Você selecionou ${ids.length}.` },
        { status: 400 },
      );
    }

    const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

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
    };
    const eligible: LeadPayload[] = [];

    for (const c of collabs) {
      if (!c.phone || c.phone.replace(/\D/g, "").length < 10) {
        skipped.noPhone++;
        continue;
      }
      if (c.status === "INACTIVE") {
        skipped.inactive++;
        continue;
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
        source: "MANUAL_BULK",
      });
    }

    // Preview: não dispara
    if (body.preview) {
      return NextResponse.json({
        eligibleCount: eligible.length,
        skipped,
        selected: ids.length,
        cooldownDays: COOLDOWN_DAYS,
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
        message: "Nenhum elegível. Nada enviado.",
      });
    }

    // Bloqueante: aguarda confirmação que o webhook chegou ao n8n
    const trigger = await triggerManualInviteBatch(eligible, session.user.id);

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

    // Audit log no banco GLOBAL
    await globalDb.auditLog.create({
      data: {
        action: "BULK_INVITE",
        actorId: session.user.id,
        metadata: {
          campaignId,
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
      cooldownDays: COOLDOWN_DAYS,
      n8nStatus: trigger.status,
    });
  } catch (err) {
    console.error("[bulk-invite POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
