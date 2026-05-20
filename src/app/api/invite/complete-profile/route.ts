import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { normalizeCity } from "@/lib/utils";


export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const { name, phone, city, neighborhood, profile, contributionTypes } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
    }

    const userId = session.user.id;

    const existing = await db.collaborator.findUnique({ where: { userId } });

    if (existing) {
      await db.collaborator.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          phone,
          city: normalizeCity(city),
          neighborhood: neighborhood?.trim() || null,
          profile: profile ?? existing.profile,
          contributionTypes: contributionTypes ?? existing.contributionTypes,
          status: "ACTIVE",
        },
      });
    } else {
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
      await db.collaborator.create({
        data: {
          campaignId: cid,
          userId,
          name: name.trim(),
          phone,
          city: normalizeCity(city),
          neighborhood: neighborhood?.trim() || null,
          email: user?.email ?? null,
          profile: profile ?? "APOIADOR",
          contributionTypes: contributionTypes ?? [],
          status: "ACTIVE",
          source: "CONVITE_LINK",
        },
      });
    }

    await db.user.update({ where: { id: userId }, data: { name: name.trim() } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[invite/complete-profile] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
