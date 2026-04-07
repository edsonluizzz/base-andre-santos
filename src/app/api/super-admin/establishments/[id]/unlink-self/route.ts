import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin || !session.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.userEstablishment.deleteMany({
      where: {
        userId: session.user.id,
        establishmentId: params.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
