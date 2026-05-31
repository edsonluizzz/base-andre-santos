import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db"; // Campaign é tabela GLOBAL (não tenant)
import { encrypt } from "@/lib/crypto";

/**
 * GET /api/campaign/integrations
 * Retorna integrações da campanha ativa do usuário (Metricool, Telegram, Z-API).
 * Tokens são mascarados — só revela presença/ausência via *Set boolean.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cid = session.user.campaignId ?? "andre-santos-2026";
    const c = await db.campaign.findUnique({
      where: { id: cid },
      select: {
        metricoolToken: true, metricoolBlogId: true,
        telegramBotToken: true, telegramChatId: true,
        zApiInstance: true, zApiToken: true, zApiClientToken: true,
        domain: true,
      },
    });

    // n8n: env vars do servidor (chave + webhooks) — multi-tenant ainda compartilha
    // n8n único hoje. Mascaramos URLs para mostrar só host + path-prefix.
    function urlHint(raw: string | undefined): string | null {
      if (!raw) return null;
      try {
        const u = new URL(raw);
        const p = u.pathname.split("/").slice(0, 3).join("/");
        return `${u.host}${p}`;
      } catch {
        return raw.length > 40 ? raw.slice(0, 40) + "…" : raw;
      }
    }
    const n8nLeadUrl = process.env.N8N_LEAD_WEBHOOK_URL;
    const n8nManualUrl = process.env.N8N_MANUAL_WEBHOOK_URL;
    const n8nImportUrl = process.env.N8N_IMPORT_WEBHOOK_URL;

    return NextResponse.json({
      domain: c?.domain ?? null,
      metricool: {
        tokenSet: Boolean(c?.metricoolToken),
        blogId: c?.metricoolBlogId ?? null,
      },
      telegram: {
        botTokenSet: Boolean(c?.telegramBotToken),
        chatId: c?.telegramChatId ?? null,
      },
      zapi: {
        instance: c?.zApiInstance ?? null,
        tokenSet: Boolean(c?.zApiToken),
        clientTokenSet: Boolean(c?.zApiClientToken),
      },
      n8n: {
        apiKeySet: Boolean(process.env.N8N_API_KEY),
        leadWebhook: { set: Boolean(n8nLeadUrl), hint: urlHint(n8nLeadUrl) },
        manualWebhook: { set: Boolean(n8nManualUrl), hint: urlHint(n8nManualUrl) },
        importWebhook: { set: Boolean(n8nImportUrl), hint: urlHint(n8nImportUrl) },
        cloudUrl: "https://andresantos.app.n8n.cloud",
      },
    });
  } catch (err) {
    console.error("[campaign/integrations GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

interface IntegrationPatch {
  domain?: string | null;
  metricoolToken?: string | null;
  metricoolBlogId?: string | null;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  zApiInstance?: string | null;
  zApiToken?: string | null;
  zApiClientToken?: string | null;
}

/**
 * PATCH /api/campaign/integrations
 * Atualiza credenciais de integração. Apenas ADMIN.
 * Para limpar um campo: enviar string vazia "".
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cid = session.user.campaignId ?? "andre-santos-2026";
    const body = (await req.json()) as IntegrationPatch;

    // Campos sensíveis — criptografar antes de salvar
    const SECRET_FIELDS = new Set<keyof IntegrationPatch>([
      "metricoolToken", "telegramBotToken", "zApiToken", "zApiClientToken",
    ]);

    const data: IntegrationPatch = {};
    const fields: (keyof IntegrationPatch)[] = [
      "domain",
      "metricoolToken", "metricoolBlogId",
      "telegramBotToken", "telegramChatId",
      "zApiInstance", "zApiToken", "zApiClientToken",
    ];
    for (const f of fields) {
      if (f in body) {
        const v = body[f];
        const normalized = typeof v === "string" && v.trim() === "" ? null : (v ?? null);
        data[f] = SECRET_FIELDS.has(f) ? encrypt(normalized) : normalized;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true, updated: false });
    }

    await db.campaign.update({ where: { id: cid }, data });
    await db.auditLog.create({
      data: {
        action: "CAMPAIGN_INTEGRATIONS_UPDATE",
        actorId: session.user.id,
        targetId: cid,
        metadata: { fields: Object.keys(data) },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, updated: true });
  } catch (err) {
    console.error("[campaign/integrations PATCH]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
