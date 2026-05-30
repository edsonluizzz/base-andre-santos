import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getOAuth2Client } from "@/lib/google-calendar";
import { encrypt } from "@/lib/crypto";

const APP_URL = process.env.APP_URL ?? "";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.redirect(`${APP_URL}/configuracoes?gcal=error`);
    }
    const { db } = getCampaignContext(session);

    const code = req.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.redirect(`${APP_URL}/configuracoes?gcal=error`);

    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${APP_URL}/configuracoes?gcal=no_refresh_token`);
    }

    const encryptedToken = encrypt(tokens.refresh_token);
    await db.settings.upsert({
      where: { id: "singleton" },
      update: { googleRefreshToken: encryptedToken },
      create: { id: "singleton", campaignName: "Base Andre Santos", googleRefreshToken: encryptedToken, updatedAt: new Date() },
    });

    return NextResponse.redirect(`${APP_URL}/configuracoes?gcal=connected`);
  } catch (err) {
    console.error("[gcal/callback]", err);
    return NextResponse.redirect(`${APP_URL}/configuracoes?gcal=error`);
  }
}
