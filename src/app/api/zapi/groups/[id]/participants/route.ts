import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import {
  zapiAddParticipants,
  zapiRemoveParticipants,
  toZapiPhone,
  ZapiNotConfiguredError,
} from "@/lib/zapi";

export const dynamic = "force-dynamic";

function parsePhones(body: unknown): string[] | null {
  const phones = (body as { phones?: unknown })?.phones;
  if (!Array.isArray(phones) || phones.length === 0 || phones.length > 20) return null;
  const normalized = phones
    .filter((p): p is string => typeof p === "string")
    .map(toZapiPhone)
    .filter((p): p is string => p !== null);
  return normalized.length > 0 ? normalized : null;
}

async function guard() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Apenas administradores" }, { status: 403 }) };
  }
  const { cid } = getCampaignContext(session);
  return { cid };
}

/** Adiciona participantes ao grupo real do WhatsApp. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const g = await guard();
    if ("error" in g) return g.error;

    const phones = parsePhones(await req.json());
    if (!phones) {
      return NextResponse.json({ error: "Informe 1 a 20 telefones válidos" }, { status: 400 });
    }

    await zapiAddParticipants(g.cid!, params.id, phones);
    return NextResponse.json({ ok: true, phones });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi participants POST]", err);
    return NextResponse.json({ error: "Falha ao adicionar participante via Z-API" }, { status: 502 });
  }
}

/** Remove participantes do grupo real do WhatsApp. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const g = await guard();
    if ("error" in g) return g.error;

    const phones = parsePhones(await req.json());
    if (!phones) {
      return NextResponse.json({ error: "Informe 1 a 20 telefones válidos" }, { status: 400 });
    }

    await zapiRemoveParticipants(g.cid!, params.id, phones);
    return NextResponse.json({ ok: true, phones });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi participants DELETE]", err);
    return NextResponse.json({ error: "Falha ao remover participante via Z-API" }, { status: 502 });
  }
}
