import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import {
  zapiSendText, zapiSendImage, zapiSendVideo, zapiSendAudio,
  zapiListGroups, toZapiPhone, ZapiNotConfiguredError,
} from "@/lib/zapi";

export const dynamic = "force-dynamic";

const TYPES = ["text", "image", "video", "audio"] as const;
type SendType = (typeof TYPES)[number];

/**
 * Resolve o destinatário com VERIFICAÇÃO — nunca deixa um ID de grupo virar
 * "telefone". (Incidente 2026-06-09: ID de grupo enviado como phone fez a
 * Z-API entregar a mensagem num número aleatório formado pelos dígitos do ID.)
 *
 * - Telefone: SOMENTE 10-11 dígitos locais ou 12-13 com DDI 55. Qualquer
 *   outra contagem de dígitos é rejeitada.
 * - Grupo: o ID precisa existir na lista de grupos da instância (Z-API).
 */
async function resolveRecipient(cid: string, raw: unknown): Promise<string | null> {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim();
  const digits = v.replace(/\D/g, "");

  const isLocalPhone = !v.includes("-") && (digits.length === 10 || digits.length === 11);
  const isIntlPhone = !v.includes("-") && digits.startsWith("55") && (digits.length === 12 || digits.length === 13);
  if (isLocalPhone || isIntlPhone) return toZapiPhone(digits);

  // Não é telefone válido → só aceita se for um grupo REAL da instância
  const groups = await zapiListGroups(cid);
  const match = groups.find((g) => g.id === v);
  return match ? match.id : null;
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

    const to = await resolveRecipient(cid, body.to);
    if (!to) {
      return NextResponse.json(
        { error: "Destinatário inválido — não é telefone BR válido nem grupo da instância" },
        { status: 400 }
      );
    }

    const type = body.type as SendType;
    if (!TYPES.includes(type)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    let result;
    if (type === "text") {
      const message = body.message?.trim();
      if (!message) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
      if (message.length > 4000) return NextResponse.json({ error: "Mensagem longa demais" }, { status: 400 });
      result = await zapiSendText(cid, to, message);
    } else {
      const url = body.mediaUrl;
      // Só aceita mídia hospedada no nosso Blob — evita virar relay aberto de URLs
      if (!url || !/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(url)) {
        return NextResponse.json({ error: "mediaUrl inválida (use o upload do painel)" }, { status: 400 });
      }
      const caption = body.caption?.trim() || undefined;
      if (type === "image") result = await zapiSendImage(cid, to, url, caption);
      else if (type === "video") result = await zapiSendVideo(cid, to, url, caption);
      else result = await zapiSendAudio(cid, to, url);
    }

    // Diagnóstico: Z-API 200 sem messageId = aceitou mas não enfileirou
    console.info("[zapi/send] to=%s type=%s resultado=%s", to, type, JSON.stringify(result).slice(0, 400));
    if (!result?.messageId) {
      return NextResponse.json(
        { error: "Z-API aceitou mas não enfileirou a mensagem (sem messageId) — destinatário pode ser inválido", zapi: result },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi/send POST]", err);
    return NextResponse.json({ error: "Falha ao enviar pelo WhatsApp (Z-API)" }, { status: 502 });
  }
}
