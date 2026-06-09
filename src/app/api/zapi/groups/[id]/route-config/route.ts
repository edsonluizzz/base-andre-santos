import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { zapiGroupMetadata, ZapiNotConfiguredError } from "@/lib/zapi";
import type { PRRegion } from "@prisma/client";

export const dynamic = "force-dynamic";

const REGIONS = ["RMC", "LITORAL", "NORTE", "NOROESTE", "OESTE", "SUDOESTE", "SUL", "CENTRO", "OUTROS"];

/**
 * Define o papel do grupo REAL no roteamento regional do WhatsApp (WF2).
 *
 * Body: { region?: string | null, isFallback?: boolean }
 * Mantém o registro WhatsAppGroup espelhado do grupo real (upsert por
 * zapiGroupId) com nome e link de convite REAIS. Garante consistência:
 * 1 grupo por região e 1 fallback por campanha.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
    }
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const body = (await req.json().catch(() => ({}))) as { region?: string | null; isFallback?: boolean };
    const hasRegion = "region" in body;
    const hasFallback = typeof body.isFallback === "boolean";
    if (!hasRegion && !hasFallback) {
      return NextResponse.json({ error: "Informe region e/ou isFallback" }, { status: 400 });
    }
    if (hasRegion && body.region !== null && !REGIONS.includes(body.region!)) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }
    const region = (hasRegion ? body.region : undefined) as PRRegion | null | undefined;

    // Nome e link de convite sempre espelhados do grupo real
    const meta = await zapiGroupMetadata(CID, params.id);

    const record = await db.$transaction(async (tx) => {
      // 1 grupo por região: limpa a região dos demais registros
      if (region) {
        await tx.whatsAppGroup.updateMany({
          where: { campaignId: CID, region, NOT: { zapiGroupId: meta.id } },
          data: { region: null },
        });
      }
      // 1 fallback por campanha
      if (body.isFallback === true) {
        await tx.whatsAppGroup.updateMany({
          where: { campaignId: CID, isFallback: true, NOT: { zapiGroupId: meta.id } },
          data: { isFallback: false },
        });
      }

      const existing = await tx.whatsAppGroup.findFirst({
        where: { campaignId: CID, zapiGroupId: meta.id },
        select: { id: true },
      });

      const data = {
        name: meta.subject,
        ...(meta.invitationLink ? { inviteLink: meta.invitationLink } : {}),
        ...(region !== undefined ? { region } : {}),
        ...(hasFallback ? { isFallback: body.isFallback! } : {}),
      };

      if (existing) {
        return tx.whatsAppGroup.update({ where: { id: existing.id }, data });
      }
      return tx.whatsAppGroup.create({
        data: { campaignId: CID, zapiGroupId: meta.id, ...data },
      });
    }, { timeout: 30000 });

    return NextResponse.json({ ok: true, record });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi route-config POST]", err);
    return NextResponse.json({ error: "Falha ao configurar roteamento do grupo" }, { status: 502 });
  }
}
