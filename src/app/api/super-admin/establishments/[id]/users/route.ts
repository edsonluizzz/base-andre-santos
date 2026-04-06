import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await db.userEstablishment.findMany({
      where: { establishmentId: params.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { invitedAt: "asc" },
    });

    return NextResponse.json(
      users.map((ue) => ({
        id: ue.id,
        userId: ue.userId,
        name: ue.user?.name ?? null,
        email: ue.user?.email ?? ue.pendingEmail ?? null,
        image: ue.user?.image ?? null,
        role: ue.role,
        inviteStatus: ue.inviteStatus,
        invitedAt: ue.invitedAt,
        acceptedAt: ue.acceptedAt,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
