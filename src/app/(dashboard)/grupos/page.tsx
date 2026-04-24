"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Plus, ExternalLink, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Group = { id: string; name: string; inviteLink?: string; description?: string; zoneId?: string; zone?: { id: string; name: string }; _count: { members: number } };
type Zone = { id: string; name: string; type: string };

export default function GruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: "", inviteLink: "", description: "", zoneId: "" });
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const [gr, zr] = await Promise.all([fetch("/api/groups"), fetch("/api/zones")]);
    if (gr.ok) setGroups(await gr.json());
    if (zr.ok) setZones(await zr.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

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
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, inviteLink: form.inviteLink || null, description: form.description || null, zoneId: form.zoneId || null }) });
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
                      <Copy className="w-3 h-3" /> Copiar link
                    </button>
                  </>
                )}
                <button onClick={() => openEdit(g)} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-muted-foreground border border-white/[0.08] hover:bg-white/[0.08] transition-colors">Editar</button>
                <button onClick={() => handleDelete(g.id, g.name)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Grupo" : "Novo Grupo WhatsApp"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Líderes Curitiba" /></div>
            <div><Label>Link de Convite</Label><Input value={form.inviteLink} onChange={(e) => setForm((f) => ({ ...f, inviteLink: e.target.value }))} placeholder="https://chat.whatsapp.com/..." /></div>
            <div><Label>Zona (opcional)</Label>
              <Select value={form.zoneId} onValueChange={(v) => setForm((f) => ({ ...f, zoneId: v }))}>
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
