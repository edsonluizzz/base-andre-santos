import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { keepId, mergeId } = await req.json();
    if (!keepId || !mergeId) return NextResponse.json({ error: "keepId e mergeId são obrigatórios" }, { status: 400 });
    if (keepId === mergeId) return NextResponse.json({ error: "Os registros devem ser diferentes" }, { status: 400 });

    const [keep, merge] = await Promise.all([
      db.collaborator.findFirst({ where: { id: keepId, campaignId: CID } }),
      db.collaborator.findFirst({ where: { id: mergeId, campaignId: CID } }),
    ]);
    if (!keep) return NextResponse.json({ error: "Registro 'keep' não encontrado" }, { status: 404 });
    if (!merge) return NextResponse.json({ error: "Registro 'merge' não encontrado" }, { status: 404 });

    await db.$transaction(async (tx) => {
      // 1. Mescla campos: preenche nulos do keep com dados do merge
      await tx.collaborator.update({
        where: { id: keepId },
        data: {
          phone:             keep.phone             ?? merge.phone,
          city:              keep.city              ?? merge.city,
          neighborhood:      keep.neighborhood      ?? merge.neighborhood,
          notes:             keep.notes             ?? merge.notes,
          birthday:          keep.birthday          ?? merge.birthday,
          photoUrl:          keep.photoUrl          ?? merge.photoUrl,
          email:             keep.email             ?? merge.email,
          registeredById:    keep.registeredById    ?? merge.registeredById,
          source:            keep.source            ?? merge.source,
          profile:           keep.profile           !== "APOIADOR" ? keep.profile : merge.profile,
          supportStatus:     keep.supportStatus     !== "NEUTRO"   ? keep.supportStatus : merge.supportStatus,
          campaignRole:      keep.campaignRole      !== "VOLUNTARIO" ? keep.campaignRole : merge.campaignRole,
          lgpdConsent:       keep.lgpdConsent       || merge.lgpdConsent,
          lgpdConsentAt:     keep.lgpdConsentAt     ?? merge.lgpdConsentAt,
          contributionTypes: [...new Set([...keep.contributionTypes, ...merge.contributionTypes])],
        },
      });

      // 2. Transfere zonas (evita conflito de unique)
      const keepZones = await tx.zoneCollaborator.findMany({ where: { collaboratorId: keepId }, select: { zoneId: true } });
      const keepZoneIds = new Set(keepZones.map((z) => z.zoneId));
      const mergeZones = await tx.zoneCollaborator.findMany({ where: { collaboratorId: mergeId } });
      for (const mz of mergeZones) {
        if (!keepZoneIds.has(mz.zoneId)) {
          await tx.zoneCollaborator.update({ where: { id: mz.id }, data: { collaboratorId: keepId } });
        } else {
          await tx.zoneCollaborator.delete({ where: { id: mz.id } });
        }
      }

      // 3. Transfere grupos WhatsApp
      const keepGroups = await tx.whatsAppGroupMember.findMany({ where: { collaboratorId: keepId }, select: { groupId: true } });
      const keepGroupIds = new Set(keepGroups.map((g) => g.groupId));
      const mergeGroups = await tx.whatsAppGroupMember.findMany({ where: { collaboratorId: mergeId } });
      for (const mg of mergeGroups) {
        if (!keepGroupIds.has(mg.groupId)) {
          await tx.whatsAppGroupMember.update({ where: { id: mg.id }, data: { collaboratorId: keepId } });
        } else {
          await tx.whatsAppGroupMember.delete({ where: { id: mg.id } });
        }
      }

      // 4. Transfere presenças em eventos
      const keepAttend = await tx.attendance.findMany({ where: { collaboratorId: keepId }, select: { eventId: true } });
      const keepEventIds = new Set(keepAttend.map((a) => a.eventId));
      const mergeAttend = await tx.attendance.findMany({ where: { collaboratorId: mergeId } });
      for (const ma of mergeAttend) {
        if (!keepEventIds.has(ma.eventId)) {
          await tx.attendance.update({ where: { id: ma.id }, data: { collaboratorId: keepId } });
        } else {
          await tx.attendance.delete({ where: { id: ma.id } });
        }
      }

      // 5. Transfere RSVPs
      const keepRsvps = await tx.eventRsvp.findMany({ where: { collaboratorId: keepId }, select: { eventId: true } });
      const keepRsvpEventIds = new Set(keepRsvps.map((r) => r.eventId));
      const mergeRsvps = await tx.eventRsvp.findMany({ where: { collaboratorId: mergeId } });
      for (const mr of mergeRsvps) {
        if (!keepRsvpEventIds.has(mr.eventId)) {
          await tx.eventRsvp.update({ where: { id: mr.id }, data: { collaboratorId: keepId } });
        } else {
          await tx.eventRsvp.delete({ where: { id: mr.id } });
        }
      }

      // 6. Atualiza registeredById em outros colaboradores
      await tx.collaborator.updateMany({ where: { registeredById: mergeId }, data: { registeredById: keepId } });

      // 7. Deleta o registro duplicado
      await tx.collaborator.delete({ where: { id: mergeId } });
    }, { timeout: 30000 });

    await db.auditLog.create({
      data: { action: "MERGE_COLLABORATORS", actorId: session.user.id, targetId: keepId, metadata: { mergedId: mergeId } },
    }).catch(() => {});

    return NextResponse.json({ ok: true, message: "Registros mesclados com sucesso" });
  } catch (err) {
    console.error("[admin/collaborators/merge POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
