"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Smartphone, RefreshCw, Users, Copy, ExternalLink, UserPlus, X,
  Crown, ShieldAlert, Star, Trash2, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PR_REGION_LABEL, type PRRegion } from "@/lib/pr-regions";
import { WhatsappComposer } from "./whatsapp-composer";

type RouteRecord = { id: string; region: PRRegion | null; isFallback: boolean; inviteLink: string | null };
type ZapiGroup = { id: string; name: string; record: RouteRecord | null };
type Orphan = { id: string; name: string; region: PRRegion | null; isFallback: boolean };
type Participant = { phone: string; name?: string; isAdmin: boolean; isSuperAdmin: boolean };
type ZapiMeta = { id: string; subject: string; invitationLink?: string; participants: Participant[] };

const NONE = "__none__";
const REGION_OPTIONS = Object.entries(PR_REGION_LABEL) as [PRRegion, string][];

export function ZapiGroupsLive() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [groups, setGroups] = useState<ZapiGroup[]>([]);
  const [orphans, setOrphans] = useState<Orphan[]>([]);

  // Sheet de participantes
  const [active, setActive] = useState<ZapiGroup | null>(null);
  const [meta, setMeta] = useState<ZapiMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/zapi/groups");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error ?? `Erro ${res.status} ao consultar a Z-API`);
        return;
      }
      setGroups(data.groups ?? []);
      setOrphans(data.orphans ?? []);
    } catch {
      setErrorMsg("Erro de conexão ao consultar os grupos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setRouteConfig(g: ZapiGroup, patch: { region?: PRRegion | null; isFallback?: boolean }) {
    setActing(g.id);
    try {
      const res = await fetch(`/api/zapi/groups/${encodeURIComponent(g.id)}/route-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao configurar roteamento");
        return;
      }
      toast.success("Roteamento atualizado — link real do grupo salvo");
      await load(true);
    } catch {
      toast.error("Erro de conexão ao configurar roteamento");
    } finally {
      setActing(null);
    }
  }

  async function deleteOrphan(o: Orphan) {
    if (!confirm(`Excluir o cadastro manual "${o.name}"?`)) return;
    setActing(o.id);
    try {
      const res = await fetch(`/api/groups/${o.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erro ao excluir");
        return;
      }
      toast.success("Cadastro manual excluído");
      setOrphans((os) => os.filter((x) => x.id !== o.id));
    } catch {
      toast.error("Erro de conexão ao excluir");
    } finally {
      setActing(null);
    }
  }

  async function openDetails(g: ZapiGroup) {
    setActive(g);
    setMeta(null);
    setNewPhone("");
    setMetaLoading(true);
    try {
      const res = await fetch(`/api/zapi/groups/${encodeURIComponent(g.id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao buscar dados do grupo");
        setActive(null);
        return;
      }
      setMeta(data);
    } catch {
      toast.error("Erro de conexão ao buscar o grupo");
      setActive(null);
    } finally {
      setMetaLoading(false);
    }
  }

  async function addParticipant() {
    if (!active || !newPhone.trim()) return;
    setActing("add");
    try {
      const res = await fetch(`/api/zapi/groups/${encodeURIComponent(active.id)}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: [newPhone] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao adicionar participante");
        return;
      }
      toast.success("Convite/adição enviado ao WhatsApp");
      setNewPhone("");
      await openDetails(active);
    } catch {
      toast.error("Erro de conexão ao adicionar participante");
    } finally {
      setActing(null);
    }
  }

  async function removeParticipant(phone: string) {
    if (!active) return;
    if (!confirm(`Remover ${phone} do grupo no WhatsApp?`)) return;
    setActing(phone);
    try {
      const res = await fetch(`/api/zapi/groups/${encodeURIComponent(active.id)}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: [phone] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao remover participante");
        return;
      }
      toast.success("Participante removido do grupo");
      setMeta((m) => m ? { ...m, participants: m.participants.filter((p) => p.phone !== phone) } : m);
    } catch {
      toast.error("Erro de conexão ao remover participante");
    } finally {
      setActing(null);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Link copiado!"))
      .catch(() => toast.error("Não foi possível copiar"));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5 border border-white/[0.08] space-y-3">
            <div className="h-4 animate-shimmer rounded w-2/5" />
            <div className="h-3 animate-shimmer rounded w-3/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20 space-y-3">
          <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">{errorMsg}</p>
          <Button variant="outline" onClick={() => load()} className="gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" /> Tentar de novo
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">Nenhum grupo no WhatsApp da campanha</p>
          <p className="text-sm text-muted-foreground">Crie grupos pelo WhatsApp do número conectado — eles aparecem aqui automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="glass-card rounded-xl p-4 sm:p-5 border border-white/[0.08] hover:border-primary/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate flex items-center gap-2">
                    {g.name}
                    {g.record?.isFallback && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Star className="w-2.5 h-2.5" /> fallback
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {g.record?.region
                      ? `Recebe leads: ${PR_REGION_LABEL[g.record.region]}`
                      : "Fora do roteamento automático"}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <Select
                    value={g.record?.region ?? NONE}
                    onValueChange={(v) => setRouteConfig(g, { region: v === NONE ? null : (v as PRRegion) })}
                    disabled={acting === g.id}
                  >
                    <SelectTrigger className="h-9 text-xs w-full sm:w-[210px]">
                      <SelectValue placeholder="Região do roteamento..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem região (fora do roteamento)</SelectItem>
                      {REGION_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <button
                    onClick={() => setRouteConfig(g, { isFallback: !g.record?.isFallback })}
                    disabled={acting === g.id}
                    aria-label={g.record?.isFallback ? "Remover como grupo fallback" : "Definir como grupo fallback"}
                    title={g.record?.isFallback ? "Grupo fallback (recebe leads sem região)" : "Definir como fallback"}
                    className={`p-2 rounded-lg border transition-colors shrink-0 disabled:opacity-50 ${
                      g.record?.isFallback
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-primary hover:border-primary/30"
                    }`}
                  >
                    <Star className="w-4 h-4" />
                  </button>

                  {g.record?.inviteLink && (
                    <button onClick={() => copy(g.record!.inviteLink!)} aria-label="Copiar link de convite"
                      className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.08] transition-colors shrink-0">
                      <Copy className="w-4 h-4" />
                    </button>
                  )}

                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => openDetails(g)}>
                    <Users className="w-3.5 h-3.5" /> Gerenciar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cadastros manuais antigos, sem grupo real vinculado */}
      {!errorMsg && orphans.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-amber-400">Cadastros manuais antigos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registros sem grupo real vinculado. Defina a região nos grupos ao vivo acima e exclua estes — o link antigo deixa de ser usado.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
            {orphans.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{o.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.region ? PR_REGION_LABEL[o.region] : "sem região"}{o.isFallback ? " · fallback" : ""}
                  </p>
                </div>
                <button
                  onClick={() => deleteOrphan(o)}
                  disabled={acting === o.id}
                  aria-label={`Excluir cadastro manual ${o.name}`}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sheet de participantes do grupo real */}
      <Sheet open={!!active} onOpenChange={(v) => { if (!v) setActive(null); }}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
            <SheetTitle className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-400" />
              {meta?.subject ?? active?.name}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {metaLoading ? "Carregando..." : `${meta?.participants.length ?? 0} participantes no WhatsApp`}
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {metaLoading ? (
              <div className="space-y-2 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-white/[0.04]" />
                ))}
              </div>
            ) : meta && (
              <>
                {meta.invitationLink && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Link de convite (real)</p>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-muted-foreground font-mono truncate rounded-xl px-3 py-2 bg-white/[0.03] border border-white/[0.08]">
                        {meta.invitationLink}
                      </span>
                      <button onClick={() => copy(meta.invitationLink!)} aria-label="Copiar link de convite"
                        className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.08] transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a href={meta.invitationLink} target="_blank" rel="noopener noreferrer" aria-label="Abrir grupo"
                        className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {active && <WhatsappComposer to={active.id} />}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adicionar participante</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="(41) 99999-9999"
                      inputMode="tel"
                      className="h-9 text-sm flex-1"
                    />
                    <Button size="sm" onClick={addParticipant} disabled={!newPhone.trim() || acting === "add"} className="gap-1.5 shrink-0">
                      <UserPlus className="w-3.5 h-3.5" /> {acting === "add" ? "..." : "Adicionar"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Participantes</p>
                  <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
                    {meta.participants.map((p) => (
                      <div key={p.phone} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate flex items-center gap-1.5">
                            {p.name ?? p.phone}
                            {(p.isAdmin || p.isSuperAdmin) && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                <Crown className="w-2.5 h-2.5" /> admin
                              </span>
                            )}
                          </p>
                          {p.name && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                        </div>
                        {!p.isSuperAdmin && (
                          <button
                            onClick={() => removeParticipant(p.phone)}
                            disabled={acting === p.phone}
                            aria-label={`Remover ${p.name ?? p.phone} do grupo`}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
