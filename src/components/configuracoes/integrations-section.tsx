"use client";

import { useEffect, useState } from "react";
import { Send, MessageCircle, Globe, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Workflow, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IntegrationsStatus {
  domain: string | null;
  contactWhatsapp: string | null;
  telegram: { botTokenSet: boolean; chatId: string | null };
  zapi: { instance: string | null; tokenSet: boolean; clientTokenSet: boolean };
  n8n?: {
    apiKeySet: boolean;
    leadWebhook: { set: boolean; hint: string | null };
    manualWebhook: { set: boolean; hint: string | null };
    importWebhook: { set: boolean; hint: string | null };
    cloudUrl: string;
  };
}

// Helper: campos string com "" significa "limpar"; null/undefined "não mexer"
type PatchPayload = Partial<{
  domain: string | null;
  contactWhatsapp: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  zApiInstance: string | null;
  zApiToken: string | null;
  zApiClientToken: string | null;
}>;

export function IntegrationsSection() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  // Estados de input — null = "não tocar", string = novo valor
  const [domain, setDomain] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [zApiInstance, setZApiInstance] = useState("");
  const [zApiToken, setZApiToken] = useState("");
  const [zApiClientToken, setZApiClientToken] = useState("");

  useEffect(() => { void reload(); }, []);

  async function reload() {
    try {
      const r = await fetch("/api/campaign/integrations");
      if (!r.ok) return;
      const d: IntegrationsStatus = await r.json();
      setStatus(d);
      setDomain(d.domain ?? "");
      setContactWhatsapp(d.contactWhatsapp ?? "");
      setTelegramChatId(d.telegram.chatId ?? "");
      setZApiInstance(d.zapi.instance ?? "");
    } catch { /* silencioso */ }
  }

  async function save(patch: PatchPayload, label: string) {
    setLoading(true);
    try {
      const r = await fetch("/api/campaign/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        toast.success(`${label} salvo`);
        // Limpa tokens sensíveis dos inputs após salvar (já estão no banco)
        if ("telegramBotToken" in patch) setTelegramBotToken("");
        if ("zApiToken" in patch) setZApiToken("");
        if ("zApiClientToken" in patch) setZApiClientToken("");
        await reload();
      } else {
        toast.error(`Erro ao salvar ${label}`);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!status) return null;

  return (
    <div className="space-y-5">
      {/* Domain — para resolver tenant em rotas públicas */}
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold">Domínio</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Domínio público (ex: <code>ovile.com.br</code>) usado para resolver esta campanha em rotas públicas (/cadastro). Sem isso, o cadastro público cairá na campanha padrão.
        </p>
        <div className="flex gap-2">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="ovile.com.br"
            className="font-mono text-xs"
          />
          <Button
            size="sm"
            disabled={loading}
            onClick={() => save({ domain: domain.trim() || null }, "Domínio")}
            className="gap-1.5 text-xs"
          >
            <Save className="w-3.5 h-3.5" /> Salvar
          </Button>
        </div>
      </div>

      {/* Contato WhatsApp público (anti-ban) */}
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold">Contato WhatsApp do /cadastro</h2>
          </div>
          <StatusBadge ok={!!status.contactWhatsapp} />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Número exibido na tela de sucesso do cadastro público. Em vez da campanha mandar a
          primeira mensagem (risco de banimento do número), o <strong className="text-foreground/80">apoiador</strong> abre
          o WhatsApp com uma mensagem pré-preenchida e envia pra gente — a conversa entra na janela
          de 24h iniciada pelo cliente e o restante do fluxo (grupo, links) segue normalmente por aí.
        </p>
        <div>
          <Label className="text-[11px]">Número (com DDI, só dígitos)</Label>
          <Input
            value={contactWhatsapp}
            onChange={(e) => setContactWhatsapp(e.target.value)}
            placeholder="5541999999999"
            className="font-mono text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={loading}
            onClick={() => save({ contactWhatsapp: contactWhatsapp.trim() || null }, "Contato WhatsApp")}
            className="gap-1.5 text-xs"
          >
            <Save className="w-3.5 h-3.5" /> Salvar
          </Button>
          {status.contactWhatsapp && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => save({ contactWhatsapp: null }, "Contato WhatsApp removido")}
            >
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* Telegram */}
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold">Telegram (Bot)</h2>
          </div>
          <StatusBadge ok={status.telegram.botTokenSet && !!status.telegram.chatId} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Bot do BotFather + chat_id do canal/grupo onde a campanha receberá notificações e comandos.
        </p>
        <div>
          <Label className="text-[11px]">Bot Token</Label>
          <div className="flex gap-2">
            <Input
              type={showSecrets ? "text" : "password"}
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder={status.telegram.botTokenSet ? "•••••••••• (já salvo)" : "123456:ABC..."}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSecrets((s) => !s)}
              className="px-2"
              title={showSecrets ? "Ocultar segredos" : "Mostrar segredos"}
            >
              {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-[11px]">Chat ID</Label>
          <Input
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="-1001234567890"
            className="font-mono text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={loading}
            onClick={() => save({
              telegramBotToken: telegramBotToken.trim() === "" ? undefined : telegramBotToken.trim(),
              telegramChatId: telegramChatId.trim() || null,
            }, "Telegram")}
            className="gap-1.5 text-xs"
          >
            <Save className="w-3.5 h-3.5" /> Salvar
          </Button>
          {status.telegram.botTokenSet && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => save({ telegramBotToken: null, telegramChatId: null }, "Telegram removido")}
            >
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* Z-API */}
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold">Z-API (WhatsApp)</h2>
          </div>
          <StatusBadge ok={!!status.zapi.instance && status.zapi.tokenSet && status.zapi.clientTokenSet} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Credenciais da instância Z-API desta campanha. Usadas pelos workflows n8n (lidos via /api/n8n/config).
        </p>
        <div>
          <Label className="text-[11px]">Instance ID</Label>
          <Input
            value={zApiInstance}
            onChange={(e) => setZApiInstance(e.target.value)}
            placeholder="3F3DB93D8FCE11FDF2216E531F01401A"
            className="font-mono text-xs"
          />
        </div>
        <div>
          <Label className="text-[11px]">Instance Token</Label>
          <Input
            type={showSecrets ? "text" : "password"}
            value={zApiToken}
            onChange={(e) => setZApiToken(e.target.value)}
            placeholder={status.zapi.tokenSet ? "•••••••••• (já salvo)" : "Token de 24 chars"}
            className="font-mono text-xs"
          />
        </div>
        <div>
          <Label className="text-[11px]">Client-Token</Label>
          <Input
            type={showSecrets ? "text" : "password"}
            value={zApiClientToken}
            onChange={(e) => setZApiClientToken(e.target.value)}
            placeholder={status.zapi.clientTokenSet ? "•••••••••• (já salvo)" : "Client-Token da conta"}
            className="font-mono text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={loading}
            onClick={() => save({
              zApiInstance: zApiInstance.trim() || null,
              zApiToken: zApiToken.trim() === "" ? undefined : zApiToken.trim(),
              zApiClientToken: zApiClientToken.trim() === "" ? undefined : zApiClientToken.trim(),
            }, "Z-API")}
            className="gap-1.5 text-xs"
          >
            <Save className="w-3.5 h-3.5" /> Salvar
          </Button>
          {(status.zapi.tokenSet || status.zapi.instance) && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => save({ zApiInstance: null, zApiToken: null, zApiClientToken: null }, "Z-API removida")}
            >
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* n8n */}
      {status.n8n && (
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-semibold">n8n (Workflows)</h2>
            </div>
            <StatusBadge ok={status.n8n.apiKeySet && status.n8n.leadWebhook.set} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Orquestrador dos fluxos de WhatsApp (convite, resposta SIM/NÃO, reativação, disparo em massa).
            Configurado via env vars no Vercel; este painel mostra apenas o status.
          </p>

          <div className="space-y-2">
            <IntegrationRow
              label="API key (Bearer)"
              hint="usada pelo n8n para autenticar contra /api/n8n/* — definir N8N_API_KEY no Vercel"
              ok={status.n8n.apiKeySet}
            />
            <IntegrationRow
              label="WF3 · Lead novo"
              hint={status.n8n.leadWebhook.hint ?? "definir N8N_LEAD_WEBHOOK_URL no Vercel"}
              ok={status.n8n.leadWebhook.set}
            />
            <IntegrationRow
              label="WF4 · Disparo manual"
              hint={status.n8n.manualWebhook.hint ?? "definir N8N_MANUAL_WEBHOOK_URL no Vercel"}
              ok={status.n8n.manualWebhook.set}
            />
            <IntegrationRow
              label="WF1 · Import bulk"
              hint={status.n8n.importWebhook.hint ?? "definir N8N_IMPORT_WEBHOOK_URL no Vercel"}
              ok={status.n8n.importWebhook.set}
            />
          </div>

          <div className="pt-1">
            <a
              href={status.n8n.cloudUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir n8n Cloud
            </a>
          </div>

          <div className="text-[10px] text-muted-foreground/70 leading-relaxed border-t border-white/[0.06] pt-3 mt-2">
            <strong className="text-foreground/80">WF2 (Resposta WhatsApp):</strong> não usa webhook do nosso lado —
            recebe direto do Z-API. Configure o webhook recebido apontando para{" "}
            <code className="text-foreground/90">/webhook/ovile-resposta-wa</code> na sua instância n8n.
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrationRow({ label, hint, ok }: { label: string; hint: string | null; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground font-mono truncate">{hint}</p>}
      </div>
      {ok ? (
        <span className="flex items-center gap-1 text-[10px] text-green-400 shrink-0">
          <CheckCircle2 className="w-3 h-3" /> ok
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] text-amber-400 shrink-0">
          <AlertCircle className="w-3 h-3" /> faltando
        </span>
      )}
    </div>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="flex items-center gap-1 text-[10px] text-green-400">
      <CheckCircle2 className="w-3 h-3" /> conectado
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] text-amber-400">
      <AlertCircle className="w-3 h-3" /> não configurado
    </span>
  );
}
