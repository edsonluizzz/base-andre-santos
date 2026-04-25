"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Plus, ExternalLink, Users, Copy, Settings2, Phone, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_LABEL: Record<string, string> = {
  COORD_GERAL: "Coord. Geral", COORD_REGIONAL: "Coord. Regional",
  LIDER_MUNICIPAL: "Líder Municipal", LIDER_BAIRRO: "Líder de Bairro", VOLUNTARIO: "Voluntário",
};

type Group = {
  id: string; name: string; inviteLink?: string; description?: string;
  zoneId?: string; zone?: { id: string; name: string }; _count: { members: number };
};
type Zone = { id: string; name: string; type: string };
type Member = { id: string; collaborator: { id: string; name: string; phone?: string; city?: string; campaignRole: string } };
type Collaborator = { id: string; name: string; phone?: string; city?: string; campaignRole: string };

export default function GruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: "", inviteLink: "", description: "", zoneId: "" });
  const [saving, setSaving] = useState(false);

  // Sheet de membros
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Collaborator[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const [gr, zr] = await Promise.all([fetch("/api/groups"), fetch("/api/zones")]);
    if (gr.ok) setGroups(await gr.json());
    if (zr.ok) setZones(await zr.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function fetchMembers(groupId: string) {
    setMembersLoading(true);
    const res = await fetch(`/api/groups/${groupId}/members`);
    if (res.ok) setMembers(await res.json());
    setMembersLoading(false);
  }

  function openManage(g: Group) {
    setActiveGroup(g);
    setSearch("");
    setSearchResults([]);
    fetchMembers(g.id);
  }

  // Busca colaboradores para adicionar
  useEffect(() => {
    if (!search.trim() || !activeGroup) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/collaborators?q=${encodeURIComponent(search)}&status=ACTIVE`);
      if (res.ok) {
        const all: Collaborator[] = await res.json();
        const memberIds = new Set(members.map((m) => m.collaborator.id));
        setSearchResults(all.filter((c) => !memberIds.has(c.id)).slice(0, 8));
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, members, activeGroup]);

  async function addMember(collaboratorId: string) {
    if (!activeGroup) return;
    setAdding(collaboratorId);
    const res = await fetch(`/api/groups/${activeGroup.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId }),
    });
    if (res.ok) {
      await fetchMembers(activeGroup.id);
      setGroups((gs) => gs.map((g) => g.id === activeGroup.id ? { ...g, _count: { members: g._count.members + 1 } } : g));
      setSearch("");
      setSearchResults([]);
      toast.success("Membro adicionado");
    } else toast.error("Erro ao adicionar");
    setAdding(null);
  }

  async function removeMember(collaboratorId: string) {
    if (!activeGroup) return;
    setRemoving(collaboratorId);
    const res = await fetch(`/api/groups/${activeGroup.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId }),
    });
    if (res.ok) {
      setMembers((ms) => ms.filter((m) => m.collaborator.id !== collaboratorId));
      setGroups((gs) => gs.map((g) => g.id === activeGroup.id ? { ...g, _count: { members: Math.max(0, g._count.members - 1) } } : g));
      toast.success("Membro removido");
    } else toast.error("Erro ao remover");
    setRemoving(null);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", inviteLink: "", description: "", zoneId: "" });
    setDialogOpen(true);
  }

  function openEdit(g: Group) {
    setEditing(g);
    setForm({ name: g.name, inviteLink: g.inviteLink ?? "", description: g.description ?? "", zoneId: g.zoneId ?? "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/groups/${editing.id}` : "/api/groups";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, inviteLink: form.inviteLink || null, description: form.description || null, zoneId: form.zoneId || null }),
    });
    setSaving(false);
    if (res.ok) { setDialogOpen(false); fetchGroups(); toast.success(editing ? "Grupo atualizado" : "Grupo criado"); }
    else toast.error("Erro ao salvar");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir grupo "${name}"?`)) return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) { fetchGroups(); toast.success("Grupo removido"); }
    else toast.error("Erro ao excluir");
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  }

  const whatsappHref = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grupos WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">{groups.length} grupos cadastrados</p>
        </div>
        <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Novo Grupo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : groups.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum grupo cadastrado</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="glass-card rounded-xl p-5 border border-white/[0.08] hover:border-primary/20 transition-colors space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{g.name}</p>
                  {g.zone && <p className="text-xs text-muted-foreground mt-0.5">{g.zone.name}</p>}
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Users className="w-3 h-3" /> {g._count.members}
                </span>
              </div>
              {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
              <div className="flex gap-2 flex-wrap">
                {g.inviteLink && (
                  <>
                    <a href={g.inviteLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                      <ExternalLink className="w-3 h-3" /> Entrar
                    </a>
                    <button onClick={() => copyLink(g.inviteLink!)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-muted-foreground border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </>
                )}
                <button onClick={() => openManage(g)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                  <Settings2 className="w-3 h-3" /> Gerenciar
                </button>
                <button onClick={() => openEdit(g)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-muted-foreground border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
                  Editar
                </button>
                <button onClick={() => handleDelete(g.id, g.name)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheet de gerenciamento de membros */}
      <Sheet open={!!activeGroup} onOpenChange={(v) => { if (!v) setActiveGroup(null); }}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              {activeGroup?.name}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">{members.length} membro{members.length !== 1 ? "s" : ""}</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Adicionar membro */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adicionar membro</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar colaborador..."
                  className="pl-8 h-9 text-sm"
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground">Buscando...</p>}
              {searchResults.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
                  {searchResults.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.03] transition-colors">
                      <div>
                        <p className="text-sm text-foreground font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{ROLE_LABEL[c.campaignRole]}{c.city ? ` · ${c.city}` : ""}</p>
                      </div>
                      <button
                        onClick={() => addMember(c.id)}
                        disabled={adding === c.id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        <UserPlus className="w-3 h-3" />
                        {adding === c.id ? "..." : "Add"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de membros */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Membros atuais</p>
              {membersLoading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Carregando...</p>
              ) : members.length === 0 ? (
                <div className="rounded-xl border border-white/[0.08] p-6 text-center">
                  <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum membro ainda</p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-colors">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">{m.collaborator.name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium truncate">{m.collaborator.name}</p>
                        <p className="text-xs text-muted-foreground">{ROLE_LABEL[m.collaborator.campaignRole]}{m.collaborator.city ? ` · ${m.collaborator.city}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {m.collaborator.phone && (
                          <a href={whatsappHref(m.collaborator.phone)} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => removeMember(m.collaborator.id)}
                          disabled={removing === m.collaborator.id}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {activeGroup?.inviteLink && (
            <div className="px-5 py-4 border-t border-white/[0.07]">
              <a href={activeGroup.inviteLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors text-sm font-medium">
                <ExternalLink className="w-4 h-4" /> Abrir grupo no WhatsApp
              </a>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog criar/editar grupo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Grupo" : "Novo Grupo WhatsApp"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Líderes Curitiba" /></div>
            <div><Label>Link de Convite</Label><Input value={form.inviteLink} onChange={(e) => setForm((f) => ({ ...f, inviteLink: e.target.value }))} placeholder="https://chat.whatsapp.com/..." /></div>
            <div>
              <Label>Zona (opcional)</Label>
              <Select value={form.zoneId} onValueChange={(v) => setForm((f) => ({ ...f, zoneId: v ?? f.zoneId }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Objetivo do grupo..." /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
