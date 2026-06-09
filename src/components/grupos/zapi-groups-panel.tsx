"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Smartphone, RefreshCw, Users, Copy, ExternalLink, UserPlus, X,
  Link2, Crown, Download, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LinkedTo = { id: string; name: string } | null;
type ZapiGroup = { id: string; name: string; linkedTo: LinkedTo };
type Participant = { phone: string; name?: string; isAdmin: boolean; isSuperAdmin: boolean };
type ZapiMeta = {
  id: string; subject: string; description?: string;
  invitationLink?: string; participants: Participant[];
};
type RegisteredGroup = { id: string; name: string };

export function ZapiGroupsPanel({
  registeredGroups,
  onChanged,
}: {
  /** Registros WhatsAppGroup do roteamento regional (para vincular) */
  registeredGroups: RegisteredGroup[];
  /** Chamado quando um grupo é importado/vinculado (refaz fetch da lista principal) */
  onChanged: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zapiGroups, setZapiGroups] = useState<ZapiGroup[]>([]);

  // Sheet de detalhes
  const [active, setActive] = useState<ZapiGroup | null>(null);
  const [meta, setMeta] = useState<ZapiMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [acting, setActing] = useState<string | null>(null); // phone em ação ou "add"/"import"/"link"
  const [linkTarget, setLinkTarget] = useState("");

  async function loadGroups() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/zapi/groups");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error ?? `Erro ${res.status} ao consultar a Z-API`);
        return;
      }
      setZapiGroups(data.groups ?? []);
      setLoaded(true);
    } catch {
      setErrorMsg("Erro de conexão ao consultar os grupos");
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(g: ZapiGroup) {
    setActive(g);
    setMeta(null);
    setNewPhone("");
    setLinkTarget("");
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

  async function importGroup(g: ZapiGroup, linkToGroupId?: string) {
    setActing(linkToGroupId ? "link" : "import");
    try {
      const res = await fetch(`/api/zapi/groups/${encodeURIComponent(g.id)}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(linkToGroupId ? { linkToGroupId } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao importar grupo");
        return;
      }
      toast.success(
        data.mode === "linked"
          ? "Grupo vinculado — link de convite atualizado com o real"
          : "Grupo importado como novo registro"
      );
      onChanged();
      await loadGroups();
      setActive(null);
    } catch {
      toast.error("Erro de conexão ao importar grupo");
    } finally {
      setActing(null);
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
      await openDetails(active); // recarrega participantes
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
      .then(() => toast.success("Copiado!"))
      .catch(() => toast.error("Não foi possível copiar"));
  }

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-green-400" /> Grupos do WhatsApp da campanha
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">ao vivo</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Grupos reais do número conectado (Z-API): veja participantes, adicione/remova pessoas e importe o link de convite.
          </p>
        </div>
        <Button
          onClick={loadGroups}
          disabled={loading}
          variant="outline"
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Consultando..." : loaded ? "Atualizar" : "Carregar grupos"}
        </Button>
      </div>

      {errorMsg && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-red-500/[0.06] border border-red-500/20">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
      )}

      {loaded && !errorMsg && (
        zapiGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum grupo encontrado na instância — o número da campanha não participa de grupos.
          </p>
        ) : (
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
            {zapiGroups.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                  {g.linkedTo ? (
                    <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                      <Link2 className="w-3 h-3" /> Vinculado a “{g.linkedTo.name}”
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Não vinculado ao roteamento</p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => openDetails(g)}>
                  <Users className="w-3.5 h-3.5" /> Gerenciar
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Sheet de detalhes do grupo real */}
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
                {/* Link de convite real */}
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

                {/* Vincular ao roteamento */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Roteamento regional</p>
                  {active?.linkedTo ? (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Vinculado a “{active.linkedTo.name}” — o welcome do WF2 usa o link deste grupo
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {registeredGroups.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Select value={linkTarget} onValueChange={setLinkTarget}>
                            <SelectTrigger className="h-9 text-xs flex-1">
                              <SelectValue placeholder="Vincular a um grupo cadastrado..." />
                            </SelectTrigger>
                            <SelectContent>
                              {registeredGroups.map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" disabled={!linkTarget || acting === "link"}
                            onClick={() => active && importGroup(active, linkTarget)} className="gap-1.5 shrink-0">
                            <Link2 className="w-3.5 h-3.5" /> {acting === "link" ? "..." : "Vincular"}
                          </Button>
                        </div>
                      )}
                      <Button variant="outline" size="sm" disabled={acting === "import"}
                        onClick={() => active && importGroup(active)} className="gap-1.5 w-full">
                        <Download className="w-3.5 h-3.5" />
                        {acting === "import" ? "Importando..." : "Importar como novo grupo cadastrado"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Adicionar participante */}
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

                {/* Participantes reais */}
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
