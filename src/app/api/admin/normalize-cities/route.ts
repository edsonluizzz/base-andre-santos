import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { readFileSync } from "fs";
import { join } from "path";


// Correções curadas: variações conhecidas que não constam na lista canônica
const CURATED: Record<string, string> = {
  "ctba": "Curitiba",
  "curityba": "Curitiba",
  "parana": "Curitiba",      // estado digitado no lugar da cidade
  "pinhas": "Pinhais",
  "campo largo parana": "Campo Largo",
};

function normalizeStr(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

let canonicalMap: Map<string, string> | null = null;

function getCanonicalMap(): Map<string, string> {
  if (canonicalMap) return canonicalMap;
  const raw = readFileSync(join(process.cwd(), "public/pr-municipalities.json"), "utf-8");
  const geo = JSON.parse(raw) as { features: Array<{ properties: { name: string } }> };
  canonicalMap = new Map(geo.features.map((f) => [normalizeStr(f.properties.name), f.properties.name]));
  return canonicalMap;
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rows = await db.collaborator.findMany({
      where: { campaignId: CID, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    });

    const cities = rows.map((r) => r.city as string).filter(Boolean);
    const canonical = getCanonicalMap();

    const toUpdate: { original: string; corrected: string }[] = [];
    const unmatched: string[] = [];

    for (const city of cities) {
      const key = normalizeStr(city);
      const match = canonical.get(key) ?? CURATED[key] ?? null;
      if (match && match !== city) {
        toUpdate.push({ original: city, corrected: match });
      } else if (!match) {
        unmatched.push(city);
      }
    }

    let updated = 0;
    for (const { original, corrected } of toUpdate) {
      const result = await db.collaborator.updateMany({
        where: { campaignId: CID, city: original },
        data: { city: corrected },
      });
      updated += result.count;
    }

    return NextResponse.json({ ok: true, updated, corrections: toUpdate.length, unmatched });
  } catch (err) {
    console.error("[normalize-cities]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
