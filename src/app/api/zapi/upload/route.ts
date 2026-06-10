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
  // Sem o token do Blob, handleUpload lança um BlobError opaco que o client
  // mascara como "Failed to retrieve the client token". Falhar explícito aqui
  // dá uma mensagem acionável (config do Vercel) em vez de erro sem rastro.
  // (Incidente 2026-06-09/10: imagem e voz não enviavam — store não conectado ao projeto.)
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[zapi/upload] BLOB_READ_WRITE_TOKEN ausente no runtime de produção");
    return NextResponse.json(
      { error: "Armazenamento de mídia indisponível: conecte um Blob store ao projeto (BLOB_READ_WRITE_TOKEN) e refaça o deploy." },
      { status: 503 }
    );
  }

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
          // Wildcards: o áudio gravado no navegador é `audio/webm;codecs=opus`
          // (com parâmetro) e o match exato `audio/webm` o rejeitava.
          allowedContentTypes: ["image/*", "video/*", "audio/*"],
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
    const message = err instanceof Error ? err.message : "Falha no upload";
    console.error("[zapi/upload] %s", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
