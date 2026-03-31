import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Use JPG, PNG, WebP, GIF ou PDF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 5MB." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const folder = (formData.get("folder") as string) ?? "uploads";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const blob = await put(filename, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar o upload no Vercel Blob" },
      { status: 500 }
    );
  }
}
