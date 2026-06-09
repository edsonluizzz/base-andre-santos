import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { zapiGroupMetadata, ZapiNotConfiguredError } from "@/lib/zapi";
import { getCampaignContext } from "@/lib/campaign-context";

export const dynamic = "force-dynamic";

/** Metadata do grupo real: participantes (admin/comum) + link de convite. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
    }
    const { cid } = getCampaignContext(session);

    const meta = await zapiGroupMetadata(cid, params.id);
    return NextResponse.json(meta);
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi/groups/[id] GET]", err);
    return NextResponse.json(
      { error: "Falha ao buscar dados do grupo na Z-API" },
      { status: 502 }
    );
  }
}
