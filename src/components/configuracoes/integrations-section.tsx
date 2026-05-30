"use client";

import { useEffect, useState } from "react";
import { Camera, Send, MessageCircle, Globe, Save, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IntegrationsStatus {
  domain: string | null;
  metricool: { tokenSet: boolean; blogId: string | null };
  telegram: { botTokenSet: boolean; chatId: string | null };
  zapi: { instance: string | null; tokenSet: boolean; clientTokenSet: boolean };
}

// Helper: campos string com "" significa "limpar"; null/undefined "não mexer"
type PatchPayload = Partial<{
  domain: string | null;
  metricoolToken: string | null;
  metricoolBlogId: string | null;
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
  const [metricoolToken, setMetricoolToken] = useState("");
  const [metricoolBlogId, setMetricoolBlogId] = useState("");
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
      setMetricoolBlogId(d.metricool.blogId ?? "");
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
        if ("metricoolToken" in patch) setMetricoolToken("");
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

      {/* Metricool */}
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-pink-400" />
            <h2 className="text-sm font-semibold">Metricool (Instagram)</h2>
          </div>
          <StatusBadge ok={status.metricool.tokenSet} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Cole o token <code>X-Mc-Auth</code> da sua conta Metricool. Sem isso, o painel Instagram fica oculto.
        </p>
        <div>
          <Label className="text-[11px]">Token Metricool</Label>
          <div className="flex gap-2">
            <Input
              type={showSecrets ? "text" : "password"}
              value={metricoolToken}
              onChange={(e) => setMetricoolToken(e.target.value)}
              placeholder={status.metricool.tokenSet ? "•••••••••• (já salvo)" : "Cole o token"}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSecrets((s) => !s)}
              className="px-2"
              title={showSecrets ? "Ocultar" : "Mostrar"}
            >
              {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-[11px]">Blog ID (opcional — apenas se a conta tem múltiplas marcas)</Label>
          <Input
            value={metricoolBlogId}
            onChange={(e) => setMetricoolBlogId(e.target.value)}
            placeholder="123456"
            className="font-mono text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={loading}
            onClick={() => save({
              metricoolToken: metricoolToken.trim() === "" ? undefined : metricoolToken.trim(),
              metricoolBlogId: metricoolBlogId.trim() || null,
            }, "Metricool")}
            className="gap-1.5 text-xs"
          >
            <Save className="w-3.5 h-3.5" /> Salvar
          </Button>
          {status.metricool.tokenSet && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => save({ metricoolToken: null, metricoolBlogId: null }, "Metricool removido")}
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
          <Input
            type={showSecrets ? "text" : "password"}
            value={telegramBotToken}
            onChange={(e) => setTelegramBotToken(e.target.value)}
            placeholder={status.telegram.botTokenSet ? "•••••••••• (já salvo)" : "123456:ABC..."}
            className="font-mono text-xs"
          />
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
