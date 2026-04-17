import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await db.member.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const orderId = form.get("orderId") as string | null;

    if (!file || !orderId) {
      return NextResponse.json({ error: "Arquivo e orderId são obrigatórios" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato inválido. Use JPG, PNG ou PDF." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB." }, { status: 400 });
    }

    // Verificar que o pedido pertence ao membro
    const order = await db.shirtOrder.findFirst({
      where: { id: orderId, memberId: member.id },
    });
    if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const arrayBuffer = await file.arrayBuffer();
    const blob = await put(
      `shirt-proofs/${member.id}-${orderId}-${Date.now()}.${ext}`,
      Buffer.from(arrayBuffer),
      { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN! }
    );

    await db.shirtOrder.update({
      where: { id: orderId },
      data: { paymentProofUrl: blob.url, paymentProofUploadedAt: new Date() },
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
