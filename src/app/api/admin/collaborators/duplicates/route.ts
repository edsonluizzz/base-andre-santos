import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Busca emails que aparecem mais de uma vez na base
    const withEmail = await db.collaborator.findMany({
      where: { campaignId: CID, email: { not: null } },
      select: { id: true, name: true, email: true, phone: true, city: true, userId: true, createdAt: true },
      orderBy: { email: "asc" },
    });

    // Agrupa por email (case-insensitive)
    const emailMap = new Map<string, typeof withEmail>();
    for (const c of withEmail) {
      const key = c.email!.toLowerCase().trim();
      const group = emailMap.get(key) ?? [];
      group.push(c);
      emailMap.set(key, group);
    }

    const pairs: { keep: (typeof withEmail)[0]; merge: (typeof withEmail)[0] }[] = [];
    for (const [, group] of emailMap) {
      if (group.length < 2) continue;
      // keep = o que tem userId (conta ativa); merge = o que não tem
      const withUser = group.filter((c) => c.userId);
      const withoutUser = group.filter((c) => !c.userId);
      if (withUser.length > 0 && withoutUser.length > 0) {
        pairs.push({ keep: withUser[0], merge: withoutUser[0] });
      } else if (withoutUser.length > 1) {
        // Ambos sem userId — sugere mais antigo como primário
        pairs.push({ keep: withoutUser[0], merge: withoutUser[1] });
      }
    }

    return NextResponse.json({ pairs });
  } catch (err) {
    console.error("[admin/collaborators/duplicates GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
