import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db } = getCampaignContext(session);
    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
      select: {
        id: true,
        campaignName: true,
        logoBase64: true,
        whatsappGroupLink: true,
        googleRefreshToken: true,
        deliveryPaymentValue: true,
        updatedAt: true,
      },
    });
    // Nunca expor o refresh token (mesmo criptografado) ao client — só o status.
    const { googleRefreshToken, ...rest } = settings;
    return NextResponse.json({ ...rest, googleCalendarConnected: Boolean(googleRefreshToken) });
  } catch (err) {
    console.error("[settings GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { db } = getCampaignContext(session);
    const { campaignName, logoBase64, whatsappGroupLink, deliveryPaymentValue } = await req.json();
    if (deliveryPaymentValue !== undefined && (typeof deliveryPaymentValue !== "number" || deliveryPaymentValue < 0)) {
      return NextResponse.json({ error: "Valor de pagamento inválido" }, { status: 400 });
    }
    if (
      logoBase64 !== undefined && logoBase64 !== null &&
      (typeof logoBase64 !== "string" ||
        !/^data:image\/(png|jpeg|webp|gif);base64,/.test(logoBase64) ||
        logoBase64.length > 2_000_000)
    ) {
      return NextResponse.json({ error: "Logo inválido (use PNG/JPEG/WebP/GIF, máx. ~1.5MB)" }, { status: 400 });
    }
    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {
        ...(campaignName && { campaignName }),
        ...(logoBase64 !== undefined && { logoBase64 }),
        ...(whatsappGroupLink !== undefined && { whatsappGroupLink: whatsappGroupLink || null }),
        ...(deliveryPaymentValue !== undefined && { deliveryPaymentValue }),
        updatedAt: new Date(),
      },
      create: {
        id: "singleton",
        campaignName: campaignName ?? "Base Andre Santos",
        logoBase64: logoBase64 ?? null,
        whatsappGroupLink: whatsappGroupLink ?? null,
        deliveryPaymentValue: deliveryPaymentValue ?? 10,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[settings PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
