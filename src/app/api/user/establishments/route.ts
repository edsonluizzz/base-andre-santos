import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ues = await db.userEstablishment.findMany({
      where: {
        userId: session.user.id,
        inviteStatus: "ACCEPTED",
      },
      include: {
        establishment: { select: { id: true, name: true } },
      },
    });

    const result = await Promise.all(
      ues.map(async (ue) => {
        const settings = await db.settings.findUnique({
          where: { id: ue.establishmentId },
          select: { logoBase64: true },
        });
        return {
          establishmentId: ue.establishmentId,
          role: ue.role,
          name: ue.establishment.name,
          logoBase64: settings?.logoBase64 ?? null,
        };
      })
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
