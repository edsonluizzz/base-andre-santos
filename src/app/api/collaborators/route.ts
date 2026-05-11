import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalcTier } from "@/lib/tier";
import { normalizeCity } from "@/lib/utils";
import { CollaboratorRole, CollaboratorStatus } from "@prisma/client";

const CID = "andre-santos-2026";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") ?? "";
    const role = searchParams.get("role") ?? "";
    const city = searchParams.get("city") ?? "";
    const status = searchParams.get("status") ?? "ACTIVE";
    const mine = searchParams.get("mine") === "true";
    const registeredBy = searchParams.get("registeredBy") ?? "";
    const sourceType = searchParams.get("sourceType") ?? "";
    const profile = searchParams.get("profile") ?? "";
    const channel = searchParams.get("channel") ?? "";
    const supportStatus = searchParams.get("supportStatus") ?? "";

    const IMPORT_SOURCES = ["IMPORTACAO_CSV", "IMPORTACAO_XLSX"];

    const collaborators = await db.collaborator.findMany({
      where: {
        campaignId: CID,
        status: status === "ALL" ? undefined : (status as CollaboratorStatus),
        ...(role && { campaignRole: role as CollaboratorRole }),
        ...(city && { city }),
        ...(mine && { registeredById: session.user.id }),
        ...(registeredBy && { registeredById: registeredBy }),
        ...(profile && { profile: profile as never }),
        ...(channel && { channel: channel as never }),
        ...(supportStatus && { supportStatus: supportStatus as never }),
        ...(sourceType === "IMPORTADO" && { source: { in: IMPORT_SOURCES } }),
        ...(sourceType === "MANUAL" && { registeredById: { not: null } }),
        ...(sourceType === "PUBLICO" && {
          AND: [{ registeredById: null }, { source: { notIn: IMPORT_SOURCES } }],
        }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { source: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        zones: { include: { zone: { select: { id: true, name: true } } } },
        whatsappGroups: { include: { group: { select: { id: true, name: true } } } },
        registeredBy: { select: { name: true, email: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(collaborators);
  } catch (err) {
    console.error("[collaborators GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, email, phone, city, neighborhood, campaignRole, status, notes, birthday, zoneIds, profile, supportStatus, channel, contributionTypes } = body;
    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const collaborator = await db.collaborator.create({
      data: {
        campaignId: CID,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        city: normalizeCity(city),
        neighborhood: neighborhood?.trim() || null,
        campaignRole: campaignRole ?? "VOLUNTARIO",
        status: status ?? "ACTIVE",
        profile: profile ?? "APOIADOR",
        supportStatus: supportStatus ?? "NEUTRO",
        channel: channel || null,
        notes: notes?.trim() || null,
        birthday: birthday || null,
        contributionTypes: Array.isArray(contributionTypes) ? contributionTypes : [],
        registeredById: session.user.id,
        zones: zoneIds?.length
          ? { create: zoneIds.map((zid: string) => ({ zoneId: zid })) }
          : undefined,
      },
      include: {
        zones: { include: { zone: { select: { id: true, name: true } } } },
        registeredBy: { select: { name: true, email: true } },
      },
    });

    // status padrão é ACTIVE → recalcula tier do registrador
    await recalcTier(session.user.id).catch(() => {});

    return NextResponse.json(collaborator, { status: 201 });
  } catch (err) {
    console.error("[collaborators POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
