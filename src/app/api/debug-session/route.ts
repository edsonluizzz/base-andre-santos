import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const dbUser = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true, campaignId: true },
  }).catch(() => null);

  const userCampaign = dbUser ? await db.userCampaign.findUnique({
    where: { userId_campaignId: { userId: dbUser.id, campaignId: "andre-santos-2026" } },
    select: { role: true, inviteStatus: true },
  }).catch(() => null) : null;

  return NextResponse.json({
    session: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      isSuperAdmin: (session.user as { isSuperAdmin?: boolean }).isSuperAdmin,
    },
    db: {
      user: dbUser,
      userCampaign,
    },
    env: {
      ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "(not set)",
      SUPER_ADMIN_EMAILS: process.env.SUPER_ADMIN_EMAILS ?? "(not set)",
    },
  });
}
