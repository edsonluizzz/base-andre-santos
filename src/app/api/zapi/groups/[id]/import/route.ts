import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { zapiGroupMetadata, ZapiNotConfiguredError } from "@/lib/zapi";

export const dynamic = "force-dynamic";

/**
 * Importa/vincula um grupo real do WhatsApp ao roteamento regional.
 *
 * Body: { linkToGroupId?: string }
 * - com linkToGroupId → vincula a um registro WhatsAppGroup existente
 *   (preenche zapiGroupId e atualiza o inviteLink real)
 * - sem linkToGroupId → cria um registro novo a partir do grupo real
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

    const { linkToGroupId } = (await req.json().catch(() => ({}))) as { linkToGroupId?: string };

    const meta = await zapiGroupMetadata(CID, params.id);

    // Evita vincular o mesmo grupo real a dois registros
    const already = await db.whatsAppGroup.findFirst({
      where: { campaignId: CID, zapiGroupId: meta.id, ...(linkToGroupId ? { id: { not: linkToGroupId } } : {}) },
      select: { id: true, name: true },
    });
    if (already) {
      return NextResponse.json(
        { error: `Este grupo já está vinculado ao registro "${already.name}"` },
        { status: 409 }
      );
    }

    if (linkToGroupId) {
      const record = await db.whatsAppGroup.findFirst({
        where: { id: linkToGroupId, campaignId: CID },
        select: { id: true },
      });
      if (!record) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });

      const updated = await db.whatsAppGroup.update({
        where: { id: record.id },
        data: {
          zapiGroupId: meta.id,
          ...(meta.invitationLink ? { inviteLink: meta.invitationLink } : {}),
        },
      });
      return NextResponse.json({ mode: "linked", group: updated });
    }

    const created = await db.whatsAppGroup.create({
      data: {
        campaignId: CID,
        name: meta.subject,
        zapiGroupId: meta.id,
        inviteLink: meta.invitationLink ?? null,
        description: meta.description?.slice(0, 500) ?? null,
      },
    });
    return NextResponse.json({ mode: "created", group: created }, { status: 201 });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi/groups/[id]/import POST]", err);
    return NextResponse.json({ error: "Falha ao importar grupo da Z-API" }, { status: 502 });
  }
}
