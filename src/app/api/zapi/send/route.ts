import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import {
  zapiSendText, zapiSendImage, zapiSendVideo, zapiSendAudio,
  toZapiPhone, ZapiNotConfiguredError,
} from "@/lib/zapi";

export const dynamic = "force-dynamic";

const TYPES = ["text", "image", "video", "audio"] as const;
type SendType = (typeof TYPES)[number];

/** groupId Z-API ("1203...-group" / "5541...-1623275280") ou telefone com DDI */
function normalizeTo(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim();
  if (/^[\d-]+(-group)?$/.test(v) && v.includes("-")) return v; // id de grupo
  return toZapiPhone(v);
}

/**
 * Envia mensagem (texto/imagem/vídeo/áudio) pelo WhatsApp da campanha.
 * Mídia vai por URL (upload prévio via /api/zapi/upload → Vercel Blob).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
    }
    const { cid } = getCampaignContext(session);

    const body = (await req.json().catch(() => ({}))) as {
      to?: string; type?: string; message?: string; mediaUrl?: string; caption?: string;
    };

    const to = normalizeTo(body.to);
    if (!to) return NextResponse.json({ error: "Destinatário inválido" }, { status: 400 });

    const type = body.type as SendType;
    if (!TYPES.includes(type)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    if (type === "text") {
      const message = body.message?.trim();
      if (!message) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
      if (message.length > 4000) return NextResponse.json({ error: "Mensagem longa demais" }, { status: 400 });
      await zapiSendText(cid, to, message);
    } else {
      const url = body.mediaUrl;
      // Só aceita mídia hospedada no nosso Blob — evita virar relay aberto de URLs
      if (!url || !/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(url)) {
        return NextResponse.json({ error: "mediaUrl inválida (use o upload do painel)" }, { status: 400 });
      }
      const caption = body.caption?.trim() || undefined;
      if (type === "image") await zapiSendImage(cid, to, url, caption);
      else if (type === "video") await zapiSendVideo(cid, to, url, caption);
      else await zapiSendAudio(cid, to, url);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi/send POST]", err);
    return NextResponse.json({ error: "Falha ao enviar pelo WhatsApp (Z-API)" }, { status: 502 });
  }
}
