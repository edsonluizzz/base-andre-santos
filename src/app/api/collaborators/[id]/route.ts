import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalcTier } from "@/lib/tier";

const CID = "andre-santos-2026";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const c = await db.collaborator.findFirst({
      where: { id: params.id, campaignId: CID },
      include: {
        zones: { include: { zone: true } },
        whatsappGroups: { include: { group: true } },
        registeredBy: { select: { name: true, email: true } },
      },
    });
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(c);
  } catch (err) {
    console.error("[collaborator GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await db.collaborator.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdminOrLeader = ["ADMIN", "LEADER"].includes(session.user.role ?? "");
    const isCellLeader = existing.registeredById === session.user.id;

    if (!isAdminOrLeader && !isCellLeader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, city, neighborhood, campaignRole, status, notes, birthday, zoneIds, profile, supportStatus, contributionTypes } = body;

    // Líderes de célula só podem alterar status e contributionTypes
    const data: Record<string, unknown> = {};
    if (isAdminOrLeader) {
      if (name) data.name = name.trim();
      if (email !== undefined) data.email = email?.trim() || null;
      if (phone !== undefined) data.phone = phone?.trim() || null;
      if (city !== undefined) data.city = city?.trim() || null;
      if (neighborhood !== undefined) data.neighborhood = neighborhood?.trim() || null;
      if (campaignRole) data.campaignRole = campaignRole;
      if (profile) data.profile = profile;
      if (supportStatus) data.supportStatus = supportStatus;
      if (notes !== undefined) data.notes = notes?.trim() || null;
      if (birthday !== undefined) data.birthday = birthday || null;
    }
    if (status) data.status = status;
    if (Array.isArray(contributionTypes)) data.contributionTypes = contributionTypes;

    if (isAdminOrLeader && zoneIds !== undefined) {
      await db.zoneCollaborator.deleteMany({ where: { collaboratorId: params.id } });
      data.zones = { create: zoneIds.map((zid: string) => ({ zoneId: zid })) };
    }

    const updated = await db.collaborator.update({
      where: { id: params.id },
      data,
      include: {
        zones: { include: { zone: { select: { id: true, name: true } } } },
        registeredBy: { select: { name: true, email: true } },
      },
    });

    // Recalcula tier do registrador se status mudou
    if (status && status !== existing.status && existing.registeredById) {
      await recalcTier(existing.registeredById).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[collaborator PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await db.collaborator.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const registeredById = existing.registeredById;
    await db.collaborator.delete({ where: { id: params.id } });

    if (registeredById) await recalcTier(registeredById).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[collaborator DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
