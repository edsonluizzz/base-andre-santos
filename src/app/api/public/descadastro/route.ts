import { NextRequest, NextResponse } from "next/server";
import { resolvePublicTenant } from "@/lib/tenant-resolver";
import { isRateLimited } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/mala-direta/emails";
import { verifyUnsubscribe } from "@/lib/mala-direta/unsubscribe-token";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited("descadastro", ip, 30, 60)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
    }

    const url = new URL(req.url);
    let e = url.searchParams.get("e");
    let t = url.searchParams.get("t");
    if (!e || !t) {
      const body = await req.json().catch(() => ({}));
      e = e ?? body.e ?? null;
      t = t ?? body.t ?? null;
    }
    const email = normalizeEmail(e);
    if (!email || !t || !verifyUnsubscribe(email, t)) {
      return NextResponse.json({ error: "Link inválido" }, { status: 400 });
    }

    const { db, cid } = await resolvePublicTenant(req);
    await db.emailSuppression.upsert({
      where: { campaignId_email: { campaignId: cid, email } },
      create: { campaignId: cid, email, reason: "UNSUBSCRIBE" },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[descadastro] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
