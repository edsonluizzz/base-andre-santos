import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Client upload do Vercel Blob para mídia de WhatsApp (foto/vídeo/áudio).
 * O arquivo sobe direto do navegador pro Blob (não passa pela function —
 * o body de 4,5MB do Vercel não limita). Esta rota só emite o token,
 * restrito a ADMIN e a tipos/tamanho compatíveis com o WhatsApp (16MB).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "ADMIN") {
          throw new Error("Apenas administradores podem enviar mídia");
        }
        return {
          allowedContentTypes: [
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "video/mp4", "video/quicktime", "video/webm",
            "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/wav",
          ],
          maximumSizeInBytes: 16 * 1024 * 1024, // limite de mídia do WhatsApp
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ purpose: "whatsapp-media" }),
        };
      },
      onUploadCompleted: async () => {
        // Sem pós-processamento — a URL volta pro client, que chama /api/zapi/send
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("[zapi/upload POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha no upload" },
      { status: 400 }
    );
  }
}
