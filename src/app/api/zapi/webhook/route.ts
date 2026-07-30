import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";
import { normalizePhone } from "@/lib/utils";

// Receptor do webhook "on-message-received" da Z-API (F3). Grava cada mensagem
// recebida (inbox do "agora pra frente") e repassa ao WF2 (n8n SIM/NÃO) para não
// quebrar a automação. Rota PÚBLICA (a Z-API chama de fora) — ver isPublic em auth.config.
//
// Configurar na Z-API: on-message-received → /api/zapi/webhook?cid=andre-santos-2026&key=<ZAPI_WEBHOOK_SECRET>
// ZAPI_WEBHOOK_SECRET é OBRIGATÓRIA — sem ela a rota rejeita tudo (fail-closed).
// Antes era opcional; isso permitia injeção de whatsappMessage falsas em qualquer
// campanha via ?cid= sem autenticação (auditoria 2026-07-30).

const DEFAULT_CID = "andre-santos-2026";

// Shape parcial e tolerante do payload da Z-API (varia por tipo de mensagem).
interface ZapiWebhookBody {
  instanceId?: string;
  phone?: string;
  fromMe?: boolean;
  momment?: number | string;
  moment?: number | string;
  senderName?: string;
  chatName?: string;
  isGroup?: boolean;
  messageId?: string;
  type?: string;
  text?: { message?: string };
  image?: { imageUrl?: string; caption?: string };
  video?: { videoUrl?: string; caption?: string };
  audio?: { audioUrl?: string };
  document?: { documentUrl?: string; fileName?: string };
}

function toMillis(m: unknown): number {
  const n = typeof m === "number" ? m : Number(m);
  if (!Number.isFinite(n) || n <= 0) return Date.now();
  return n < 1e12 ? n * 1000 : n; // veio em segundos ⇒ converte p/ ms
}

function parseContent(b: ZapiWebhookBody): { type: string; body?: string; mediaUrl?: string } {
  if (b.image?.imageUrl) return { type: "image", mediaUrl: b.image.imageUrl, body: b.image.caption };
  if (b.video?.videoUrl) return { type: "video", mediaUrl: b.video.videoUrl, body: b.video.caption };
  if (b.audio?.audioUrl) return { type: "audio", mediaUrl: b.audio.audioUrl };
  if (b.document?.documentUrl) return { type: "document", mediaUrl: b.document.documentUrl, body: b.document.fileName };
  if (b.text?.message) return { type: "text", body: b.text.message };
  return { type: "other" };
}

// Repassa o payload cru ao WF2 (n8n) — mantém o fluxo SIM/NÃO. Best-effort.
async function relayToWF2(raw: unknown): Promise<void> {
  const url = process.env.N8N_RESPOSTA_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
  } catch (err) {
    console.error("[zapi/webhook] relay WF2 falhou:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // ZAPI_WEBHOOK_SECRET é obrigatória — sem ela, rejeita tudo (fail-closed).
    const secret = process.env.ZAPI_WEBHOOK_SECRET;
    if (!secret || searchParams.get("key") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cid = searchParams.get("cid") || DEFAULT_CID;
    const raw = (await req.json().catch(() => ({}))) as ZapiWebhookBody;

    // Sempre repassa ao WF2 primeiro (não bloqueia o que vem depois).
    relayToWF2(raw);

    // Por enquanto só conversas 1:1 (ignora grupos) e mensagens com telefone.
    if (raw.isGroup || !raw.phone) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const dbUrl = (await getCampaignDbUrl(cid)) ?? process.env.DATABASE_URL;
    const { db } = getCampaignContext({ user: { campaignId: cid, dbUrl: dbUrl ?? undefined } });

    // Dedup: a Z-API reentrega webhooks. zapiMessageId é único.
    if (raw.messageId) {
      const exists = await db.whatsappMessage.findUnique({
        where: { zapiMessageId: raw.messageId },
        select: { id: true },
      });
      if (exists) return NextResponse.json({ ok: true, duplicate: true });
    }

    const phoneDigits = raw.phone.replace(/\D/g, "");
    const { type, body, mediaUrl } = parseContent(raw);

    await db.whatsappMessage.create({
      data: {
        campaignId: cid,
        phone: phoneDigits,
        phoneNormalized: normalizePhone(phoneDigits),
        fromMe: Boolean(raw.fromMe),
        senderName: raw.senderName || raw.chatName || null,
        type,
        body: body || null,
        mediaUrl: mediaUrl || null,
        zapiMessageId: raw.messageId || null,
        isGroup: false,
        read: Boolean(raw.fromMe), // o que eu mesmo enviei já entra como lido
        timestamp: new Date(toMillis(raw.momment ?? raw.moment)),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[zapi/webhook] erro:", err);
    // 200 mesmo em erro: a Z-API reenviaria em loop se receber 5xx.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
