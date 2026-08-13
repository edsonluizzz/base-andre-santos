/**
 * Cliente Z-API para administração de grupos do WhatsApp da campanha.
 *
 * Credenciais: lidas de Campaign.zApi* via getCampaignIntegrations (criptografadas
 * no banco, fallback env ZAPI_*). Mesma base usada pelo n8n para send-text:
 *   https://api.z-api.io/instances/{instance}/token/{token}/{endpoint}
 * Header obrigatório: Client-Token (account security token).
 *
 * Docs: https://developer.z-api.io (group/get-groups, group/metadata-group,
 * group/add-participant, group/remove-participant).
 */

import { getCampaignIntegrations } from "./meta-db";

export interface ZapiGroupSummary {
  /** ID do grupo (campo `phone` na Z-API, ex: "120363019502650977-group") */
  id: string;
  name: string;
}

export interface ZapiParticipant {
  phone: string;
  name?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface ZapiGroupMetadata {
  id: string;
  subject: string;
  description?: string;
  owner?: string;
  creation?: number;
  invitationLink?: string;
  /** true = só administradores podem enviar (WhatsApp descarta msgs de não-admin SEM erro) */
  adminOnlyMessage: boolean;
  participants: ZapiParticipant[];
}

interface ZapiCreds {
  instance: string;
  token: string;
  clientToken: string | null;
}

export class ZapiNotConfiguredError extends Error {
  constructor() {
    super("Z-API não configurada para esta campanha (Configurações → Integrações)");
    this.name = "ZapiNotConfiguredError";
  }
}

/** Erro HTTP da Z-API com o status e o corpo preservados (para decisões finas: 404 = sem conversa). */
export class ZapiHttpError extends Error {
  status: number;
  body: string;
  constructor(path: string, status: number, body: string) {
    super(`Z-API ${path} falhou: HTTP ${status} ${body.slice(0, 300)}`);
    this.name = "ZapiHttpError";
    this.status = status;
    this.body = body;
  }
}

async function getCreds(cid: string): Promise<ZapiCreds> {
  const integrations = await getCampaignIntegrations(cid);
  const instance = integrations.zApiInstance ?? process.env.ZAPI_INSTANCE ?? null;
  const token = integrations.zApiToken ?? process.env.ZAPI_TOKEN ?? null;
  const clientToken = integrations.zApiClientToken ?? process.env.ZAPI_CLIENT_TOKEN ?? null;
  if (!instance || !token) throw new ZapiNotConfiguredError();
  return { instance, token, clientToken };
}

async function zapiFetch<T>(
  cid: string,
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown }
): Promise<T> {
  const { instance, token, clientToken } = await getCreds(cid);
  const url = `https://api.z-api.io/instances/${instance}/token/${token}/${path}`;

  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(clientToken ? { "Client-Token": clientToken } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ZapiHttpError(path, res.status, body);
  }
  return (await res.json()) as T;
}

/** Lista todos os grupos da instância (pagina até esvaziar, máx 200 grupos). */
export async function zapiListGroups(cid: string): Promise<ZapiGroupSummary[]> {
  const pageSize = 50;
  const groups: ZapiGroupSummary[] = [];
  for (let page = 1; page <= 4; page++) {
    const batch = await zapiFetch<Array<{ phone?: string; name?: string; isGroup?: boolean }>>(
      cid,
      `groups?page=${page}&pageSize=${pageSize}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const g of batch) {
      if (g.phone) groups.push({ id: g.phone, name: g.name ?? g.phone });
    }
    if (batch.length < pageSize) break;
  }
  return groups;
}

/** Metadata completo do grupo: participantes (com admin) + link de convite. */
export async function zapiGroupMetadata(cid: string, groupId: string): Promise<ZapiGroupMetadata> {
  const m = await zapiFetch<{
    phone?: string;
    subject?: string;
    description?: string;
    owner?: string;
    creation?: number;
    invitationLink?: string;
    adminOnlyMessage?: boolean | string;
    participants?: Array<{ phone?: string; name?: string; short?: string; isAdmin?: boolean | string; isSuperAdmin?: boolean | string }>;
  }>(cid, `group-metadata/${encodeURIComponent(groupId)}`);

  return {
    id: m.phone ?? groupId,
    subject: m.subject ?? groupId,
    description: m.description,
    owner: m.owner,
    creation: m.creation,
    invitationLink: m.invitationLink,
    adminOnlyMessage: m.adminOnlyMessage === true || m.adminOnlyMessage === "true",
    participants: (m.participants ?? [])
      .filter((p) => !!p.phone)
      .map((p) => ({
        phone: p.phone!,
        name: p.name ?? p.short,
        // Z-API às vezes retorna booleans como string
        isAdmin: p.isAdmin === true || p.isAdmin === "true",
        isSuperAdmin: p.isSuperAdmin === true || p.isSuperAdmin === "true",
      })),
  };
}

/** Dados do celular conectado à instância (telefone do número da campanha). */
export async function zapiGetDevice(cid: string): Promise<{ phone: string | null }> {
  const d = await zapiFetch<{ phone?: string }>(cid, "device");
  return { phone: d.phone ?? null };
}

/** Adiciona participantes (telefones com DDI, ex: 5541999999999). */
export async function zapiAddParticipants(cid: string, groupId: string, phones: string[]): Promise<void> {
  await zapiFetch(cid, "add-participant", {
    method: "POST",
    body: { groupId, phones, autoInvite: true },
  });
}

/** Remove participantes do grupo. */
export async function zapiRemoveParticipants(cid: string, groupId: string, phones: string[]): Promise<void> {
  await zapiFetch(cid, "remove-participant", {
    method: "POST",
    body: { groupId, phones },
  });
}

/** Configura o webhook "ao receber mensagem" da instância (F3 — recebimento). */
export async function zapiSetReceivedWebhook(cid: string, url: string): Promise<void> {
  await zapiFetch(cid, "update-webhook-received", { method: "PUT", body: { value: url } });
}

/** Normaliza telefone BR para o formato da Z-API (55 + DDD + número). */
export function toZapiPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.startsWith("55") ? d : `55${d}`;
}

// ─── Envio de mensagens (Fase 1 — WhatsApp pelo painel) ─────────────────────
// `to` aceita groupId Z-API ("1203...-group") ou telefone com DDI.
// Retornam a resposta da Z-API ({ zaapId, messageId } no sucesso) — um 200
// sem messageId indica que a Z-API aceitou mas não enfileirou de verdade.

export type ZapiSendResult = { zaapId?: string; messageId?: string; [k: string]: unknown };

/**
 * A Z-API retorna HTTP 200 mesmo quando aceita a chamada mas não enfileira a
 * mensagem de verdade (ex: sessão do WhatsApp desconectada do celular) — sem
 * isso, o app marcava "enviado" com sucesso mesmo quando nada saiu.
 */
function assertQueued(result: ZapiSendResult, endpoint: string): ZapiSendResult {
  if (!result.messageId && !result.zaapId) {
    throw new Error(`Z-API aceitou ${endpoint} mas não confirmou o envio (sessão do WhatsApp desconectada?)`);
  }
  return result;
}

export async function zapiSendText(cid: string, to: string, message: string): Promise<ZapiSendResult> {
  const result = await zapiFetch<ZapiSendResult>(cid, "send-text", { method: "POST", body: { phone: to, message } });
  return assertQueued(result, "send-text");
}

export async function zapiSendImage(cid: string, to: string, url: string, caption?: string): Promise<ZapiSendResult> {
  const result = await zapiFetch<ZapiSendResult>(cid, "send-image", { method: "POST", body: { phone: to, image: url, ...(caption ? { caption } : {}) } });
  return assertQueued(result, "send-image");
}

export async function zapiSendVideo(cid: string, to: string, url: string, caption?: string): Promise<ZapiSendResult> {
  const result = await zapiFetch<ZapiSendResult>(cid, "send-video", { method: "POST", body: { phone: to, video: url, ...(caption ? { caption } : {}) } });
  return assertQueued(result, "send-video");
}

export async function zapiSendAudio(cid: string, to: string, url: string): Promise<ZapiSendResult> {
  const result = await zapiFetch<ZapiSendResult>(cid, "send-audio", { method: "POST", body: { phone: to, audio: url } });
  return assertQueued(result, "send-audio");
}

export async function zapiSendDocument(cid: string, to: string, url: string, fileName: string): Promise<ZapiSendResult> {
  const result = await zapiFetch<ZapiSendResult>(cid, "send-document/pdf", {
    method: "POST",
    body: { phone: to, document: url, fileName },
  });
  return assertQueued(result, "send-document/pdf");
}

// ─── Histórico de conversa (Fase 2 — inbox no painel) ───────────────────────

export type ZapiMessageKind = "text" | "image" | "video" | "audio" | "document" | "other";

export interface ZapiChatMessage {
  id: string;
  fromMe: boolean;
  /** epoch em milissegundos */
  timestamp: number;
  senderName?: string;
  kind: ZapiMessageKind;
  /** texto da mensagem ou legenda da mídia */
  text?: string;
  /** URL da mídia (quando kind != text) */
  mediaUrl?: string;
}

/** Shape parcial e tolerante do item bruto da Z-API (varia por tipo de mensagem). */
interface RawZapiMessage {
  messageId?: string;
  id?: string;
  fromMe?: boolean | string;
  momment?: number | string;
  moment?: number | string;
  timestamp?: number | string;
  senderName?: string;
  chatName?: string;
  message?: string;
  text?: { message?: string };
  image?: { imageUrl?: string; caption?: string };
  video?: { videoUrl?: string; caption?: string };
  audio?: { audioUrl?: string };
  document?: { documentUrl?: string; fileName?: string };
}

/** Z-API usa o campo `momment` (sic) — às vezes em segundos, às vezes em ms. */
function toMillis(m: unknown): number {
  const n = typeof m === "number" ? m : Number(m);
  if (!Number.isFinite(n) || n <= 0) return Date.now();
  return n < 1e12 ? n * 1000 : n; // < ~2001 em ms ⇒ veio em segundos
}

/**
 * Últimas mensagens trocadas com um telefone (mais recentes primeiro na Z-API;
 * devolvemos em ordem cronológica). Parsing defensivo: a Z-API varia o shape
 * por tipo de mensagem (text.message, image.imageUrl, audio.audioUrl, ...).
 */
export async function zapiChatMessages(cid: string, phone: string, amount = 30): Promise<ZapiChatMessage[]> {
  const to = toZapiPhone(phone) ?? phone.replace(/\D/g, "");
  const raw = await zapiFetch<unknown>(cid, `chat-messages/${encodeURIComponent(to)}?amount=${amount}`);
  const list = Array.isArray(raw) ? raw : [];

  const messages = list.map((item): ZapiChatMessage => {
    const m = (item ?? {}) as RawZapiMessage;
    let kind: ZapiMessageKind = "other";
    let text: string | undefined;
    let mediaUrl: string | undefined;

    if (m.image?.imageUrl) { kind = "image"; mediaUrl = m.image.imageUrl; text = m.image.caption; }
    else if (m.video?.videoUrl) { kind = "video"; mediaUrl = m.video.videoUrl; text = m.video.caption; }
    else if (m.audio?.audioUrl) { kind = "audio"; mediaUrl = m.audio.audioUrl; }
    else if (m.document?.documentUrl) { kind = "document"; mediaUrl = m.document.documentUrl; text = m.document.fileName; }
    else if (typeof m.text?.message === "string") { kind = "text"; text = m.text.message; }
    else if (typeof m.message === "string") { kind = "text"; text = m.message; }

    return {
      id: String(m.messageId ?? m.id ?? `${m.momment ?? ""}-${Math.random().toString(36).slice(2, 8)}`),
      fromMe: m.fromMe === true || m.fromMe === "true",
      timestamp: toMillis(m.momment ?? m.moment ?? m.timestamp),
      senderName: m.senderName ?? m.chatName,
      kind,
      text: text?.trim() || undefined,
      mediaUrl,
    };
  });

  return messages.sort((a, b) => a.timestamp - b.timestamp);
}
