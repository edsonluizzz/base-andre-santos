import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";

let cachedNames: string[] | null = null;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!cachedNames) {
      const raw = readFileSync(join(process.cwd(), "public/pr-municipalities.json"), "utf-8");
      const geo = JSON.parse(raw);
      cachedNames = (geo.features as Array<{ properties: { name: string } }>)
        .map((f) => f.properties.name)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }

    return NextResponse.json(cachedNames, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("[municipios GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
